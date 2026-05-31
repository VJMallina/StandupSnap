import { Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleTask, SchedulingMode } from '../entities/schedule-task.entity';
import { Schedule } from '../entities/schedule.entity';
import { TaskDependency, DependencyType } from '../entities/task-dependency.entity';
import { CalendarService } from './calendar.service';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class AutoScheduleService {
  constructor(
    private tenantService: TenantService,
    private calendarService: CalendarService,
  ) {}

  async autoScheduleAll(scheduleId: string): Promise<void> {
    const [scheduleRepo, taskRepo] = await Promise.all([
      this.tenantService.getRepository(Schedule),
      this.tenantService.getRepository(ScheduleTask),
    ]);

    const schedule = await scheduleRepo.findOne({ where: { id: scheduleId }, relations: ['calendar'] });
    if (!schedule) throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);

    const calendarId = schedule.calendar?.id;

    const tasks = await taskRepo.find({
      where: { schedule: { id: scheduleId } },
      relations: ['predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
      order: { orderIndex: 'ASC' },
    });

    if (tasks.length === 0) return;

    const taskMap = new Map<string, ScheduleTask>();
    tasks.forEach(task => taskMap.set(task.id, task));

    const scheduled = new Set<string>();

    const scheduleTask = async (task: ScheduleTask): Promise<void> => {
      if (scheduled.has(task.id)) return;

      if (task.schedulingMode === SchedulingMode.MANUAL) {
        scheduled.add(task.id);
        return;
      }

      if (!task.predecessors || task.predecessors.length === 0) {
        task.startDate = new Date(schedule.scheduleStartDate);
        task.endDate = await this.addDays(task.startDate, task.durationDays, calendarId);
        scheduled.add(task.id);
        return;
      }

      for (const dep of task.predecessors) {
        const predTask = taskMap.get(dep.predecessorTask.id);
        if (predTask && !scheduled.has(predTask.id)) await scheduleTask(predTask);
      }

      const startCandidates: Date[] = [];
      for (const dep of task.predecessors) {
        const predTask = taskMap.get(dep.predecessorTask.id);
        if (!predTask) continue;
        startCandidates.push(await this.calculateStartDate(dep.dependencyType, predTask.startDate, predTask.endDate, task.durationDays, dep.lagDays, calendarId));
      }

      if (startCandidates.length > 0) {
        task.startDate = new Date(Math.max(...startCandidates.map(d => d.getTime())));
        task.endDate = await this.addDays(task.startDate, task.durationDays, calendarId);
      }

      scheduled.add(task.id);
    };

    for (const task of tasks) await scheduleTask(task);
    await taskRepo.save(tasks);
  }

  async autoScheduleTask(taskId: string): Promise<void> {
    const [scheduleRepo, taskRepo] = await Promise.all([
      this.tenantService.getRepository(Schedule),
      this.tenantService.getRepository(ScheduleTask),
    ]);

    const task = await taskRepo.findOne({
      where: { id: taskId },
      relations: ['schedule', 'schedule.calendar', 'predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
    });
    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found`);

    const calendarId = task.schedule.calendar?.id;

    const allTasks = await taskRepo.find({
      where: { schedule: { id: task.schedule.id } },
      relations: ['predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
    });

    const taskMap = new Map<string, ScheduleTask>();
    allTasks.forEach(t => taskMap.set(t.id, t));

    if (task.schedulingMode === SchedulingMode.AUTO) {
      await this.updateTaskDates(task, taskMap, calendarId, scheduleRepo);
    }

    await this.propagateToSuccessors(task, taskMap, calendarId, scheduleRepo);
    await taskRepo.save(Array.from(taskMap.values()));
  }

  private async updateTaskDates(task: ScheduleTask, taskMap: Map<string, ScheduleTask>, calendarId?: string, scheduleRepo?: any): Promise<void> {
    if (task.schedulingMode === SchedulingMode.MANUAL) return;

    if (!task.predecessors || task.predecessors.length === 0) {
      const repo = scheduleRepo || await this.tenantService.getRepository(Schedule);
      const schedule = await repo.findOne({ where: { id: task.schedule.id } });
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
      startCandidates.push(await this.calculateStartDate(dep.dependencyType, predTask.startDate, predTask.endDate, task.durationDays, dep.lagDays, calendarId));
    }

    if (startCandidates.length > 0) {
      task.startDate = new Date(Math.max(...startCandidates.map(d => d.getTime())));
      task.endDate = await this.addDays(task.startDate, task.durationDays, calendarId);
    }
  }

  private async propagateToSuccessors(task: ScheduleTask, taskMap: Map<string, ScheduleTask>, calendarId?: string, scheduleRepo?: any): Promise<void> {
    if (!task.successors || task.successors.length === 0) return;

    const processed = new Set<string>();

    const propagate = async (currentTask: ScheduleTask): Promise<void> => {
      if (!currentTask.successors) return;

      for (const dep of currentTask.successors) {
        const succTask = taskMap.get(dep.successorTask.id);
        if (!succTask || processed.has(succTask.id)) continue;

        if (succTask.schedulingMode === SchedulingMode.AUTO) {
          await this.updateTaskDates(succTask, taskMap, calendarId, scheduleRepo);
          processed.add(succTask.id);
          await propagate(succTask);
        }
      }
    };

    await propagate(task);
  }

  private async calculateStartDate(depType: DependencyType, predStart: Date, predFinish: Date, successorDuration: number, lagDays: number, calendarId?: string): Promise<Date> {
    switch (depType) {
      case DependencyType.FINISH_TO_START:
        return this.addDays(predFinish, lagDays, calendarId);
      case DependencyType.START_TO_START:
        return this.addDays(predStart, lagDays, calendarId);
      case DependencyType.FINISH_TO_FINISH:
        return this.subtractDays(await this.addDays(predFinish, lagDays, calendarId), successorDuration, calendarId);
      case DependencyType.START_TO_FINISH:
        return this.subtractDays(await this.addDays(predStart, lagDays, calendarId), successorDuration, calendarId);
      default:
        return predFinish;
    }
  }

  private async addDays(date: Date, days: number, calendarId?: string): Promise<Date> {
    if (calendarId) return this.calendarService.addWorkingDays(date, days, calendarId);
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private async subtractDays(date: Date, days: number, calendarId?: string): Promise<Date> {
    if (calendarId) return this.calendarService.subtractWorkingDays(date, days, calendarId);
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }
}
