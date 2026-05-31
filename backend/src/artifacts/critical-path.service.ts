import { Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleTask } from '../entities/schedule-task.entity';
import { Schedule } from '../entities/schedule.entity';
import { TaskDependency, DependencyType } from '../entities/task-dependency.entity';
import { CalendarService } from './calendar.service';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class CriticalPathService {
  constructor(
    private tenantService: TenantService,
    private calendarService: CalendarService,
  ) {}

  async recalculateSchedule(scheduleId: string): Promise<void> {
    const [scheduleRepo, taskRepo] = await Promise.all([
      this.tenantService.getRepository(Schedule),
      this.tenantService.getRepository(ScheduleTask),
    ]);

    const schedule = await scheduleRepo.findOne({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);

    const tasks = await taskRepo.find({
      where: { schedule: { id: scheduleId } },
      relations: ['predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
      order: { orderIndex: 'ASC' },
    });

    if (tasks.length === 0) return;

    await this.calculateForwardPass(tasks, schedule);
    await this.calculateBackwardPass(tasks, schedule.calendar?.id);
    await this.calculateFloat(tasks, schedule.calendar?.id);
    await this.identifyCriticalPath(tasks);

    await taskRepo.save(tasks);
  }

  private async calculateForwardPass(tasks: ScheduleTask[], schedule: Schedule): Promise<void> {
    const calendarId = schedule.calendar?.id;
    const taskMap = new Map<string, ScheduleTask>();
    tasks.forEach(task => taskMap.set(task.id, task));
    const calculated = new Set<string>();

    const calculateEarlyDates = async (task: ScheduleTask): Promise<void> => {
      if (calculated.has(task.id)) return;

      if (!task.predecessors || task.predecessors.length === 0) {
        task.earlyStart = new Date(schedule.scheduleStartDate);
        task.earlyFinish = await this.addDays(task.earlyStart, task.durationDays, calendarId);
        calculated.add(task.id);
        return;
      }

      const earlyStartCandidates: Date[] = [];
      for (const dep of task.predecessors) {
        const predTask = taskMap.get(dep.predecessorTask.id);
        if (!predTask) continue;
        if (!calculated.has(predTask.id)) await calculateEarlyDates(predTask);
        earlyStartCandidates.push(await this.calculateDependentDate(dep.dependencyType, predTask.earlyStart!, predTask.earlyFinish!, task.durationDays, dep.lagDays, true, calendarId));
      }

      task.earlyStart = new Date(Math.max(...earlyStartCandidates.map(d => d.getTime())));
      task.earlyFinish = await this.addDays(task.earlyStart, task.durationDays, calendarId);
      calculated.add(task.id);
    };

    for (const task of tasks) await calculateEarlyDates(task);
  }

  private async calculateBackwardPass(tasks: ScheduleTask[], calendarId?: string): Promise<void> {
    const taskMap = new Map<string, ScheduleTask>();
    tasks.forEach(task => taskMap.set(task.id, task));
    const projectEnd = new Date(Math.max(...tasks.map(t => t.earlyFinish!.getTime())));
    const calculated = new Set<string>();

    const calculateLateDates = async (task: ScheduleTask): Promise<void> => {
      if (calculated.has(task.id)) return;

      if (!task.successors || task.successors.length === 0) {
        task.lateFinish = projectEnd;
        task.lateStart = await this.subtractDays(task.lateFinish, task.durationDays, calendarId);
        calculated.add(task.id);
        return;
      }

      const lateFinishCandidates: Date[] = [];
      for (const dep of task.successors) {
        const succTask = taskMap.get(dep.successorTask.id);
        if (!succTask) continue;
        if (!calculated.has(succTask.id)) await calculateLateDates(succTask);
        lateFinishCandidates.push(await this.calculateDependentDate(dep.dependencyType, succTask.lateStart!, succTask.lateFinish!, task.durationDays, dep.lagDays, false, calendarId));
      }

      task.lateFinish = new Date(Math.min(...lateFinishCandidates.map(d => d.getTime())));
      task.lateStart = await this.subtractDays(task.lateFinish, task.durationDays, calendarId);
      calculated.add(task.id);
    };

    for (const task of tasks.reverse()) await calculateLateDates(task);
  }

  private async calculateFloat(tasks: ScheduleTask[], calendarId?: string): Promise<void> {
    const taskMap = new Map<string, ScheduleTask>();
    tasks.forEach(task => taskMap.set(task.id, task));

    for (const task of tasks) {
      task.totalFloat = await this.getDaysBetween(task.earlyStart!, task.lateStart!, calendarId);

      if (!task.successors || task.successors.length === 0) {
        task.freeFloat = task.totalFloat;
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

  private async identifyCriticalPath(tasks: ScheduleTask[]): Promise<void> {
    for (const task of tasks) task.isCriticalPath = task.totalFloat === 0;
  }

  async getCriticalPathTasks(scheduleId: string): Promise<ScheduleTask[]> {
    const taskRepo = await this.tenantService.getRepository(ScheduleTask);
    return taskRepo.find({
      where: { schedule: { id: scheduleId }, isCriticalPath: true },
      relations: ['assignee', 'predecessors', 'successors'],
      order: { orderIndex: 'ASC' },
    });
  }

  private async calculateDependentDate(depType: DependencyType, predStart: Date, predFinish: Date, successorDuration: number, lagDays: number, isForward: boolean, calendarId?: string): Promise<Date> {
    if (isForward) {
      switch (depType) {
        case DependencyType.FINISH_TO_START: return this.addDays(predFinish, lagDays, calendarId);
        case DependencyType.START_TO_START: return this.addDays(predStart, lagDays, calendarId);
        case DependencyType.FINISH_TO_FINISH: return this.subtractDays(predFinish, successorDuration - lagDays, calendarId);
        case DependencyType.START_TO_FINISH: return this.subtractDays(predStart, successorDuration - lagDays, calendarId);
        default: return predFinish;
      }
    } else {
      switch (depType) {
        case DependencyType.FINISH_TO_START: return this.subtractDays(predStart, lagDays, calendarId);
        case DependencyType.START_TO_START: return this.subtractDays(predStart, lagDays, calendarId);
        case DependencyType.FINISH_TO_FINISH: return this.addDays(predFinish, successorDuration - lagDays, calendarId);
        case DependencyType.START_TO_FINISH: return this.addDays(predStart, successorDuration - lagDays, calendarId);
        default: return predStart;
      }
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

  private async getDaysBetween(start: Date, end: Date, calendarId?: string): Promise<number> {
    if (calendarId) return this.calendarService.getWorkingDaysBetween(start, end, calendarId);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((end.getTime() - start.getTime()) / msPerDay);
  }
}
