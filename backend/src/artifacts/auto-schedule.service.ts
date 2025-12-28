import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleTask, SchedulingMode } from '../entities/schedule-task.entity';
import { Schedule } from '../entities/schedule.entity';
import { TaskDependency, DependencyType } from '../entities/task-dependency.entity';
import { CalendarService } from './calendar.service';

@Injectable()
export class AutoScheduleService {
  constructor(
    @InjectRepository(ScheduleTask)
    private taskRepository: Repository<ScheduleTask>,
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(TaskDependency)
    private dependencyRepository: Repository<TaskDependency>,
    private calendarService: CalendarService,
  ) {}

  /**
   * Auto-schedule all tasks in a schedule that are in AUTO mode
   */
  async autoScheduleAll(scheduleId: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: ['calendar'],
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);
    }

    const calendarId = schedule.calendar?.id;

    // Get all tasks with dependencies
    const tasks = await this.taskRepository.find({
      where: { schedule: { id: scheduleId } },
      relations: ['predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
      order: { orderIndex: 'ASC' },
    });

    if (tasks.length === 0) {
      return;
    }

    // Build task map for quick lookups
    const taskMap = new Map<string, ScheduleTask>();
    tasks.forEach(task => taskMap.set(task.id, task));

    // Track which tasks have been scheduled
    const scheduled = new Set<string>();

    // Recursive function to schedule a task
    const scheduleTask = async (task: ScheduleTask): Promise<void> => {
      if (scheduled.has(task.id)) {
        return; // Already scheduled
      }

      // If task is in MANUAL mode, skip auto-scheduling
      if (task.schedulingMode === SchedulingMode.MANUAL) {
        scheduled.add(task.id);
        return;
      }

      // If task has no predecessors, use schedule start date
      if (!task.predecessors || task.predecessors.length === 0) {
        task.startDate = new Date(schedule.scheduleStartDate);
        task.endDate = await this.addDays(task.startDate, task.durationDays, calendarId);
        scheduled.add(task.id);
        return;
      }

      // Schedule all predecessors first
      for (const dep of task.predecessors) {
        const predTask = taskMap.get(dep.predecessorTask.id);
        if (predTask && !scheduled.has(predTask.id)) {
          await scheduleTask(predTask);
        }
      }

      // Calculate start date based on all predecessors
      const startCandidates: Date[] = [];

      for (const dep of task.predecessors) {
        const predTask = taskMap.get(dep.predecessorTask.id);
        if (!predTask) continue;

        const candidateDate = await this.calculateStartDate(
          dep.dependencyType,
          predTask.startDate,
          predTask.endDate,
          task.durationDays,
          dep.lagDays,
          calendarId,
        );

        startCandidates.push(candidateDate);
      }

      // Start date = latest of all predecessor constraints
      if (startCandidates.length > 0) {
        task.startDate = new Date(Math.max(...startCandidates.map(d => d.getTime())));
        task.endDate = await this.addDays(task.startDate, task.durationDays, calendarId);
      }

      scheduled.add(task.id);
    };

    // Schedule all tasks
    for (const task of tasks) {
      await scheduleTask(task);
    }

    // Save all updated tasks
    await this.taskRepository.save(tasks);
  }

  /**
   * Auto-schedule a specific task and all its successors
   */
  async autoScheduleTask(taskId: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['schedule', 'schedule.calendar', 'predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const calendarId = task.schedule.calendar?.id;

    // Get all tasks in the schedule
    const allTasks = await this.taskRepository.find({
      where: { schedule: { id: task.schedule.id } },
      relations: ['predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
    });

    const taskMap = new Map<string, ScheduleTask>();
    allTasks.forEach(t => taskMap.set(t.id, t));

    // Update this task if it's in AUTO mode
    if (task.schedulingMode === SchedulingMode.AUTO) {
      await this.updateTaskDates(task, taskMap, calendarId);
    }

    // Propagate changes to all successors in AUTO mode
    await this.propagateToSuccessors(task, taskMap, calendarId);

    // Save all updated tasks
    await this.taskRepository.save(Array.from(taskMap.values()));
  }

  /**
   * Update a single task's dates based on its predecessors
   */
  private async updateTaskDates(
    task: ScheduleTask,
    taskMap: Map<string, ScheduleTask>,
    calendarId?: string,
  ): Promise<void> {
    if (task.schedulingMode === SchedulingMode.MANUAL) {
      return;
    }

    if (!task.predecessors || task.predecessors.length === 0) {
      // No predecessors - use schedule start date
      const schedule = await this.scheduleRepository.findOne({
        where: { id: task.schedule.id },
      });
      if (schedule) {
        task.startDate = new Date(schedule.scheduleStartDate);
        task.endDate = await this.addDays(task.startDate, task.durationDays, calendarId);
      }
      return;
    }

    const startCandidates: Date[] = [];

    for (const dep of task.predecessors) {
      const predTask = taskMap.get(dep.predecessorTask.id);
      if (!predTask) continue;

      const candidateDate = await this.calculateStartDate(
        dep.dependencyType,
        predTask.startDate,
        predTask.endDate,
        task.durationDays,
        dep.lagDays,
        calendarId,
      );

      startCandidates.push(candidateDate);
    }

    if (startCandidates.length > 0) {
      task.startDate = new Date(Math.max(...startCandidates.map(d => d.getTime())));
      task.endDate = await this.addDays(task.startDate, task.durationDays, calendarId);
    }
  }

  /**
   * Propagate date changes to all successor tasks in AUTO mode
   */
  private async propagateToSuccessors(
    task: ScheduleTask,
    taskMap: Map<string, ScheduleTask>,
    calendarId?: string,
  ): Promise<void> {
    if (!task.successors || task.successors.length === 0) {
      return;
    }

    const processed = new Set<string>();

    const propagate = async (currentTask: ScheduleTask): Promise<void> => {
      if (!currentTask.successors) return;

      for (const dep of currentTask.successors) {
        const succTask = taskMap.get(dep.successorTask.id);
        if (!succTask || processed.has(succTask.id)) continue;

        if (succTask.schedulingMode === SchedulingMode.AUTO) {
          await this.updateTaskDates(succTask, taskMap, calendarId);
          processed.add(succTask.id);
          await propagate(succTask);
        }
      }
    };

    await propagate(task);
  }

  /**
   * Calculate start date based on dependency type
   */
  private async calculateStartDate(
    depType: DependencyType,
    predStart: Date,
    predFinish: Date,
    successorDuration: number,
    lagDays: number,
    calendarId?: string,
  ): Promise<Date> {
    switch (depType) {
      case DependencyType.FINISH_TO_START:
        // Successor starts after predecessor finishes
        return await this.addDays(predFinish, lagDays, calendarId);

      case DependencyType.START_TO_START:
        // Successor starts when predecessor starts
        return await this.addDays(predStart, lagDays, calendarId);

      case DependencyType.FINISH_TO_FINISH:
        // Successor finishes when predecessor finishes
        // So start = finish - duration
        return await this.subtractDays(
          await this.addDays(predFinish, lagDays, calendarId),
          successorDuration,
          calendarId
        );

      case DependencyType.START_TO_FINISH:
        // Successor finishes when predecessor starts
        // So start = finish - duration
        return await this.subtractDays(
          await this.addDays(predStart, lagDays, calendarId),
          successorDuration,
          calendarId
        );

      default:
        return predFinish;
    }
  }

  /**
   * Helper: Add working days to a date
   */
  private async addDays(date: Date, days: number, calendarId?: string): Promise<Date> {
    if (calendarId) {
      return await this.calendarService.addWorkingDays(date, days, calendarId);
    }
    // Fallback to calendar days if no calendar
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Helper: Subtract working days from a date
   */
  private async subtractDays(date: Date, days: number, calendarId?: string): Promise<Date> {
    if (calendarId) {
      return await this.calendarService.subtractWorkingDays(date, days, calendarId);
    }
    // Fallback to calendar days if no calendar
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }
}
