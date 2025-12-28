import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleTask } from '../entities/schedule-task.entity';
import { Schedule } from '../entities/schedule.entity';
import { TaskDependency, DependencyType } from '../entities/task-dependency.entity';
import { CalendarService } from './calendar.service';

@Injectable()
export class CriticalPathService {
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
   * Main orchestration method - Recalculates entire schedule
   * 1. Forward Pass (Early dates)
   * 2. Backward Pass (Late dates)
   * 3. Calculate Float
   * 4. Identify Critical Path
   */
  async recalculateSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);
    }

    // Get all tasks with dependencies
    const tasks = await this.taskRepository.find({
      where: { schedule: { id: scheduleId } },
      relations: ['predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
      order: { orderIndex: 'ASC' },
    });

    if (tasks.length === 0) {
      return; // Nothing to calculate
    }

    // Step 1: Forward Pass (Calculate Early Start & Early Finish)
    await this.calculateForwardPass(tasks, schedule);

    // Step 2: Backward Pass (Calculate Late Start & Late Finish)
    await this.calculateBackwardPass(tasks, schedule.calendar?.id);

    // Step 3: Calculate Float (Total Float & Free Float)
    await this.calculateFloat(tasks, schedule.calendar?.id);

    // Step 4: Identify Critical Path
    await this.identifyCriticalPath(tasks);

    // Save all updated tasks
    await this.taskRepository.save(tasks);
  }

  /**
   * Forward Pass: Calculate Early Start (ES) and Early Finish (EF) for all tasks
   * ES = MAX(predecessor EF + lag) for all predecessors
   * EF = ES + Duration
   */
  private async calculateForwardPass(tasks: ScheduleTask[], schedule: Schedule): Promise<void> {
    const calendarId = schedule.calendar?.id;

    // Build task map for quick lookups
    const taskMap = new Map<string, ScheduleTask>();
    tasks.forEach(task => taskMap.set(task.id, task));

    // Track which tasks have been calculated
    const calculated = new Set<string>();

    // Recursive function to calculate early dates
    const calculateEarlyDates = async (task: ScheduleTask): Promise<void> => {
      if (calculated.has(task.id)) {
        return; // Already calculated
      }

      // If task has no predecessors, early start = schedule start date
      if (!task.predecessors || task.predecessors.length === 0) {
        task.earlyStart = new Date(schedule.scheduleStartDate);
        task.earlyFinish = await this.addDays(task.earlyStart, task.durationDays, calendarId);
        calculated.add(task.id);
        return;
      }

      // Calculate early start based on all predecessors
      const earlyStartCandidates: Date[] = [];

      for (const dep of task.predecessors) {
        const predTask = taskMap.get(dep.predecessorTask.id);
        if (!predTask) continue;

        // Ensure predecessor is calculated first
        if (!calculated.has(predTask.id)) {
          await calculateEarlyDates(predTask);
        }

        // Calculate early start based on dependency type
        const candidateDate = await this.calculateDependentDate(
          dep.dependencyType,
          predTask.earlyStart!,
          predTask.earlyFinish!,
          task.durationDays,
          dep.lagDays,
          true, // isForward
          calendarId,
        );

        earlyStartCandidates.push(candidateDate);
      }

      // Early start = latest of all predecessor constraints
      task.earlyStart = new Date(Math.max(...earlyStartCandidates.map(d => d.getTime())));
      task.earlyFinish = await this.addDays(task.earlyStart, task.durationDays, calendarId);
      calculated.add(task.id);
    };

    // Calculate for all tasks
    for (const task of tasks) {
      await calculateEarlyDates(task);
    }
  }

  /**
   * Backward Pass: Calculate Late Start (LS) and Late Finish (LF) for all tasks
   * LF = MIN(successor LS - lag) for all successors
   * LS = LF - Duration
   */
  private async calculateBackwardPass(tasks: ScheduleTask[], calendarId?: string): Promise<void> {
    // Build task map
    const taskMap = new Map<string, ScheduleTask>();
    tasks.forEach(task => taskMap.set(task.id, task));

    // Find project end date (latest early finish)
    const projectEnd = new Date(Math.max(...tasks.map(t => t.earlyFinish!.getTime())));

    // Track which tasks have been calculated
    const calculated = new Set<string>();

    // Recursive function to calculate late dates
    const calculateLateDates = async (task: ScheduleTask): Promise<void> => {
      if (calculated.has(task.id)) {
        return; // Already calculated
      }

      // If task has no successors, late finish = project end date
      if (!task.successors || task.successors.length === 0) {
        task.lateFinish = projectEnd;
        task.lateStart = await this.subtractDays(task.lateFinish, task.durationDays, calendarId);
        calculated.add(task.id);
        return;
      }

      // Calculate late finish based on all successors
      const lateFinishCandidates: Date[] = [];

      for (const dep of task.successors) {
        const succTask = taskMap.get(dep.successorTask.id);
        if (!succTask) continue;

        // Ensure successor is calculated first
        if (!calculated.has(succTask.id)) {
          await calculateLateDates(succTask);
        }

        // Calculate late finish based on dependency type
        const candidateDate = await this.calculateDependentDate(
          dep.dependencyType,
          succTask.lateStart!,
          succTask.lateFinish!,
          task.durationDays,
          dep.lagDays,
          false, // isBackward
          calendarId,
        );

        lateFinishCandidates.push(candidateDate);
      }

      // Late finish = earliest of all successor constraints
      task.lateFinish = new Date(Math.min(...lateFinishCandidates.map(d => d.getTime())));
      task.lateStart = await this.subtractDays(task.lateFinish, task.durationDays, calendarId);
      calculated.add(task.id);
    };

    // Calculate for all tasks (start from end)
    for (const task of tasks.reverse()) {
      await calculateLateDates(task);
    }
  }

  /**
   * Calculate Float/Slack for all tasks
   * Total Float = LS - ES (or LF - EF)
   * Free Float = MIN(successor ES) - EF
   */
  private async calculateFloat(tasks: ScheduleTask[], calendarId?: string): Promise<void> {
    const taskMap = new Map<string, ScheduleTask>();
    tasks.forEach(task => taskMap.set(task.id, task));

    for (const task of tasks) {
      // Total Float = Late Start - Early Start (in working days)
      task.totalFloat = await this.getDaysBetween(task.earlyStart!, task.lateStart!, calendarId);

      // Free Float = MIN(successor Early Start) - Early Finish
      if (!task.successors || task.successors.length === 0) {
        task.freeFloat = task.totalFloat; // No successors = free float = total float
      } else {
        const successorEarlyStarts = task.successors
          .map(dep => taskMap.get(dep.successorTask.id)?.earlyStart)
          .filter(date => date !== undefined) as Date[];

        if (successorEarlyStarts.length > 0) {
          const minSuccessorES = new Date(Math.min(...successorEarlyStarts.map(d => d.getTime())));
          task.freeFloat = await this.getDaysBetween(task.earlyFinish!, minSuccessorES, calendarId);
        } else {
          task.freeFloat = task.totalFloat;
        }
      }
    }
  }

  /**
   * Identify Critical Path - tasks where Total Float = 0
   */
  private async identifyCriticalPath(tasks: ScheduleTask[]): Promise<void> {
    for (const task of tasks) {
      task.isCriticalPath = task.totalFloat === 0;
    }
  }

  /**
   * Get all critical path tasks for a schedule
   */
  async getCriticalPathTasks(scheduleId: string): Promise<ScheduleTask[]> {
    const tasks = await this.taskRepository.find({
      where: { schedule: { id: scheduleId }, isCriticalPath: true },
      relations: ['assignee', 'predecessors', 'successors'],
      order: { orderIndex: 'ASC' },
    });

    return tasks;
  }

  /**
   * Calculate dependent date based on dependency type
   */
  private async calculateDependentDate(
    depType: DependencyType,
    predStart: Date,
    predFinish: Date,
    successorDuration: number,
    lagDays: number,
    isForward: boolean,
    calendarId?: string,
  ): Promise<Date> {
    if (isForward) {
      // Forward pass - calculating early start of successor
      switch (depType) {
        case DependencyType.FINISH_TO_START:
          return await this.addDays(predFinish, lagDays, calendarId);
        case DependencyType.START_TO_START:
          return await this.addDays(predStart, lagDays, calendarId);
        case DependencyType.FINISH_TO_FINISH:
          return await this.subtractDays(predFinish, successorDuration - lagDays, calendarId);
        case DependencyType.START_TO_FINISH:
          return await this.subtractDays(predStart, successorDuration - lagDays, calendarId);
        default:
          return predFinish;
      }
    } else {
      // Backward pass - calculating late finish of predecessor
      switch (depType) {
        case DependencyType.FINISH_TO_START:
          return await this.subtractDays(predStart, lagDays, calendarId);
        case DependencyType.START_TO_START:
          return await this.subtractDays(predStart, lagDays, calendarId);
        case DependencyType.FINISH_TO_FINISH:
          return await this.addDays(predFinish, successorDuration - lagDays, calendarId);
        case DependencyType.START_TO_FINISH:
          return await this.addDays(predStart, successorDuration - lagDays, calendarId);
        default:
          return predStart;
      }
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

  /**
   * Helper: Get number of working days between two dates
   */
  private async getDaysBetween(start: Date, end: Date, calendarId?: string): Promise<number> {
    if (calendarId) {
      return await this.calendarService.getWorkingDaysBetween(start, end, calendarId);
    }
    // Fallback to calendar days if no calendar
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = end.getTime() - start.getTime();
    return Math.round(diff / msPerDay);
  }
}
