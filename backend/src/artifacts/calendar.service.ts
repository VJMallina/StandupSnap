import { Injectable } from '@nestjs/common';
import { WorkingCalendar } from '../entities/working-calendar.entity';
import { CalendarException, ExceptionType } from '../entities/calendar-exception.entity';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class CalendarService {
  constructor(private tenantService: TenantService) {}

  async addWorkingDays(startDate: Date, daysToAdd: number, calendarId?: string): Promise<Date> {
    const calendarRepo = await this.tenantService.getRepository(WorkingCalendar);
    const calendar = calendarId ? await calendarRepo.findOne({ where: { id: calendarId }, relations: ['exceptions'] }) : null;
    const workingDays = calendar?.workingDays || [1, 2, 3, 4, 5];
    const exceptions = calendar?.exceptions || [];

    let currentDate = new Date(startDate);
    let daysAdded = 0;
    while (daysAdded < daysToAdd) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (await this.isWorkingDay(currentDate, workingDays, exceptions)) daysAdded++;
    }
    return currentDate;
  }

  async subtractWorkingDays(startDate: Date, daysToSubtract: number, calendarId?: string): Promise<Date> {
    const calendarRepo = await this.tenantService.getRepository(WorkingCalendar);
    const calendar = calendarId ? await calendarRepo.findOne({ where: { id: calendarId }, relations: ['exceptions'] }) : null;
    const workingDays = calendar?.workingDays || [1, 2, 3, 4, 5];
    const exceptions = calendar?.exceptions || [];

    let currentDate = new Date(startDate);
    let daysSubtracted = 0;
    while (daysSubtracted < daysToSubtract) {
      currentDate.setDate(currentDate.getDate() - 1);
      if (await this.isWorkingDay(currentDate, workingDays, exceptions)) daysSubtracted++;
    }
    return currentDate;
  }

  async getWorkingDaysBetween(startDate: Date, endDate: Date, calendarId?: string): Promise<number> {
    const calendarRepo = await this.tenantService.getRepository(WorkingCalendar);
    const calendar = calendarId ? await calendarRepo.findOne({ where: { id: calendarId }, relations: ['exceptions'] }) : null;
    const workingDays = calendar?.workingDays || [1, 2, 3, 4, 5];
    const exceptions = calendar?.exceptions || [];

    let count = 0;
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    while (currentDate <= end) {
      if (await this.isWorkingDay(currentDate, workingDays, exceptions)) count++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return count;
  }

  private async isWorkingDay(date: Date, workingDays: number[], exceptions: CalendarException[]): Promise<boolean> {
    const exception = this.findException(date, exceptions);
    if (exception) return exception.type === ExceptionType.WORKING;
    return workingDays.includes(date.getDay());
  }

  private findException(date: Date, exceptions: CalendarException[]): CalendarException | undefined {
    const dateStr = this.toDateString(date);
    for (const exception of exceptions) {
      const exceptionDateStr = this.toDateString(exception.date);
      if (exceptionDateStr === dateStr) return exception;
      if (exception.isRecurring) {
        const exceptionDate = new Date(exception.date);
        if (date.getMonth() === exceptionDate.getMonth() && date.getDate() === exceptionDate.getDate()) return exception;
      }
    }
    return undefined;
  }

  private toDateString(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getNextWorkingDay(date: Date, calendarId?: string): Promise<Date> {
    return this.addWorkingDays(date, 1, calendarId);
  }

  async getPreviousWorkingDay(date: Date, calendarId?: string): Promise<Date> {
    return this.subtractWorkingDays(date, 1, calendarId);
  }

  async createDefaultCalendar(projectId: string, userId: string): Promise<WorkingCalendar> {
    const calendarRepo = await this.tenantService.getRepository(WorkingCalendar);
    const calendar = calendarRepo.create({
      project: { id: projectId } as any,
      name: 'Default Calendar',
      description: 'Standard working days (Monday-Friday, 8 hours/day)',
      workingDays: [1, 2, 3, 4, 5],
      hoursPerDay: 8.0,
      defaultStartTime: '09:00',
      defaultEndTime: '17:00',
      timezone: 'UTC',
      isDefault: true,
      createdBy: { id: userId } as any,
    });
    return calendarRepo.save(calendar);
  }

  async createCalendar(
    projectId: string,
    data: { name: string; description?: string; workingDays?: number[]; hoursPerDay?: number; defaultStartTime?: string; defaultEndTime?: string; timezone?: string; isDefault?: boolean },
    userId: string,
  ): Promise<WorkingCalendar> {
    const calendarRepo = await this.tenantService.getRepository(WorkingCalendar);
    const calendar = calendarRepo.create({
      project: { id: projectId } as any,
      name: data.name,
      description: data.description || '',
      workingDays: data.workingDays || [1, 2, 3, 4, 5],
      hoursPerDay: data.hoursPerDay || 8.0,
      defaultStartTime: data.defaultStartTime || '09:00',
      defaultEndTime: data.defaultEndTime || '17:00',
      timezone: data.timezone || 'UTC',
      isDefault: data.isDefault || false,
      createdBy: { id: userId } as any,
    });
    return calendarRepo.save(calendar);
  }

  async getCalendarsByProject(projectId: string): Promise<WorkingCalendar[]> {
    const calendarRepo = await this.tenantService.getRepository(WorkingCalendar);
    return calendarRepo.find({
      where: { project: { id: projectId } },
      relations: ['exceptions'],
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async getCalendarById(calendarId: string): Promise<WorkingCalendar | null> {
    const calendarRepo = await this.tenantService.getRepository(WorkingCalendar);
    return calendarRepo.findOne({ where: { id: calendarId }, relations: ['exceptions', 'project'] });
  }

  async updateCalendar(
    calendarId: string,
    data: { name?: string; description?: string; workingDays?: number[]; hoursPerDay?: number; defaultStartTime?: string; defaultEndTime?: string; timezone?: string; isDefault?: boolean },
    userId: string,
  ): Promise<WorkingCalendar> {
    const calendarRepo = await this.tenantService.getRepository(WorkingCalendar);
    const calendar = await calendarRepo.findOne({ where: { id: calendarId } });
    if (!calendar) throw new Error(`Calendar with ID ${calendarId} not found`);

    Object.assign(calendar, data);
    calendar.updatedBy = { id: userId } as any;
    return calendarRepo.save(calendar);
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    const calendarRepo = await this.tenantService.getRepository(WorkingCalendar);
    await calendarRepo.delete(calendarId);
  }

  async addException(
    calendarId: string,
    data: { date: Date; type: any; name?: string; description?: string; isRecurring?: boolean; workingHours?: number },
    userId: string,
  ): Promise<CalendarException> {
    const exceptionRepo = await this.tenantService.getRepository(CalendarException);
    const exception = exceptionRepo.create({
      calendar: { id: calendarId } as any,
      date: data.date,
      type: data.type,
      name: data.name || '',
      description: data.description || '',
      isRecurring: data.isRecurring || false,
      workingHours: data.workingHours,
      createdBy: { id: userId } as any,
    });
    return exceptionRepo.save(exception);
  }

  async getExceptions(calendarId: string): Promise<CalendarException[]> {
    const exceptionRepo = await this.tenantService.getRepository(CalendarException);
    return exceptionRepo.find({ where: { calendar: { id: calendarId } }, order: { date: 'ASC' } });
  }

  async updateException(
    exceptionId: string,
    data: { date?: Date; type?: any; name?: string; description?: string; isRecurring?: boolean; workingHours?: number },
    userId: string,
  ): Promise<CalendarException> {
    const exceptionRepo = await this.tenantService.getRepository(CalendarException);
    const exception = await exceptionRepo.findOne({ where: { id: exceptionId } });
    if (!exception) throw new Error(`Calendar exception with ID ${exceptionId} not found`);

    Object.assign(exception, data);
    exception.updatedBy = { id: userId } as any;
    return exceptionRepo.save(exception);
  }

  async deleteException(exceptionId: string): Promise<void> {
    const exceptionRepo = await this.tenantService.getRepository(CalendarException);
    await exceptionRepo.delete(exceptionId);
  }
}
