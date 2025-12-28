import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkingCalendar } from '../entities/working-calendar.entity';
import { CalendarException, ExceptionType } from '../entities/calendar-exception.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(WorkingCalendar)
    private calendarRepository: Repository<WorkingCalendar>,
    @InjectRepository(CalendarException)
    private exceptionRepository: Repository<CalendarException>,
  ) {}

  /**
   * Add working days to a date, skipping non-working days and exceptions
   */
  async addWorkingDays(
    startDate: Date,
    daysToAdd: number,
    calendarId?: string,
  ): Promise<Date> {
    const calendar = calendarId
      ? await this.calendarRepository.findOne({
          where: { id: calendarId },
          relations: ['exceptions'],
        })
      : null;

    const workingDays = calendar?.workingDays || [1, 2, 3, 4, 5]; // Default: Mon-Fri
    const exceptions = calendar?.exceptions || [];

    let currentDate = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < daysToAdd) {
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);

      // Check if this day is a working day
      if (await this.isWorkingDay(currentDate, workingDays, exceptions)) {
        daysAdded++;
      }
    }

    return currentDate;
  }

  /**
   * Subtract working days from a date, skipping non-working days and exceptions
   */
  async subtractWorkingDays(
    startDate: Date,
    daysToSubtract: number,
    calendarId?: string,
  ): Promise<Date> {
    const calendar = calendarId
      ? await this.calendarRepository.findOne({
          where: { id: calendarId },
          relations: ['exceptions'],
        })
      : null;

    const workingDays = calendar?.workingDays || [1, 2, 3, 4, 5];
    const exceptions = calendar?.exceptions || [];

    let currentDate = new Date(startDate);
    let daysSubtracted = 0;

    while (daysSubtracted < daysToSubtract) {
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);

      // Check if this day is a working day
      if (await this.isWorkingDay(currentDate, workingDays, exceptions)) {
        daysSubtracted++;
      }
    }

    return currentDate;
  }

  /**
   * Get number of working days between two dates
   */
  async getWorkingDaysBetween(
    startDate: Date,
    endDate: Date,
    calendarId?: string,
  ): Promise<number> {
    const calendar = calendarId
      ? await this.calendarRepository.findOne({
          where: { id: calendarId },
          relations: ['exceptions'],
        })
      : null;

    const workingDays = calendar?.workingDays || [1, 2, 3, 4, 5];
    const exceptions = calendar?.exceptions || [];

    let count = 0;
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      if (await this.isWorkingDay(currentDate, workingDays, exceptions)) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  /**
   * Check if a specific date is a working day
   */
  private async isWorkingDay(
    date: Date,
    workingDays: number[],
    exceptions: CalendarException[],
  ): Promise<boolean> {
    const dayOfWeek = date.getDay();

    // Check for calendar exceptions first
    const exception = this.findException(date, exceptions);
    if (exception) {
      return exception.type === ExceptionType.WORKING;
    }

    // Otherwise, check if it's a normal working day
    return workingDays.includes(dayOfWeek);
  }

  /**
   * Find calendar exception for a specific date
   */
  private findException(
    date: Date,
    exceptions: CalendarException[],
  ): CalendarException | undefined {
    const dateStr = this.toDateString(date);

    for (const exception of exceptions) {
      const exceptionDateStr = this.toDateString(exception.date);

      // Exact match
      if (exceptionDateStr === dateStr) {
        return exception;
      }

      // Recurring yearly exceptions (same month and day)
      if (exception.isRecurring) {
        const exceptionDate = new Date(exception.date);
        if (
          date.getMonth() === exceptionDate.getMonth() &&
          date.getDate() === exceptionDate.getDate()
        ) {
          return exception;
        }
      }
    }

    return undefined;
  }

  /**
   * Convert date to string for comparison
   */
  private toDateString(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get next working day from a given date
   */
  async getNextWorkingDay(
    date: Date,
    calendarId?: string,
  ): Promise<Date> {
    return this.addWorkingDays(date, 1, calendarId);
  }

  /**
   * Get previous working day from a given date
   */
  async getPreviousWorkingDay(
    date: Date,
    calendarId?: string,
  ): Promise<Date> {
    return this.subtractWorkingDays(date, 1, calendarId);
  }

  /**
   * Create default calendar for a project
   */
  async createDefaultCalendar(
    projectId: string,
    userId: string,
  ): Promise<WorkingCalendar> {
    const calendar = this.calendarRepository.create({
      project: { id: projectId } as any,
      name: 'Default Calendar',
      description: 'Standard working days (Monday-Friday, 8 hours/day)',
      workingDays: [1, 2, 3, 4, 5], // Mon-Fri
      hoursPerDay: 8.0,
      defaultStartTime: '09:00',
      defaultEndTime: '17:00',
      timezone: 'UTC',
      isDefault: true,
      createdBy: { id: userId } as any,
    });

    return await this.calendarRepository.save(calendar);
  }

  /**
   * Create a new working calendar
   */
  async createCalendar(
    projectId: string,
    data: {
      name: string;
      description?: string;
      workingDays?: number[];
      hoursPerDay?: number;
      defaultStartTime?: string;
      defaultEndTime?: string;
      timezone?: string;
      isDefault?: boolean;
    },
    userId: string,
  ): Promise<WorkingCalendar> {
    const calendar = this.calendarRepository.create({
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

    return await this.calendarRepository.save(calendar);
  }

  /**
   * Get all calendars for a project
   */
  async getCalendarsByProject(projectId: string): Promise<WorkingCalendar[]> {
    return await this.calendarRepository.find({
      where: { project: { id: projectId } },
      relations: ['exceptions'],
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Get calendar by ID
   */
  async getCalendarById(calendarId: string): Promise<WorkingCalendar | null> {
    return await this.calendarRepository.findOne({
      where: { id: calendarId },
      relations: ['exceptions', 'project'],
    });
  }

  /**
   * Update calendar
   */
  async updateCalendar(
    calendarId: string,
    data: {
      name?: string;
      description?: string;
      workingDays?: number[];
      hoursPerDay?: number;
      defaultStartTime?: string;
      defaultEndTime?: string;
      timezone?: string;
      isDefault?: boolean;
    },
    userId: string,
  ): Promise<WorkingCalendar> {
    const calendar = await this.calendarRepository.findOne({
      where: { id: calendarId },
    });

    if (!calendar) {
      throw new Error(`Calendar with ID ${calendarId} not found`);
    }

    Object.assign(calendar, data);
    calendar.updatedBy = { id: userId } as any;

    return await this.calendarRepository.save(calendar);
  }

  /**
   * Delete calendar
   */
  async deleteCalendar(calendarId: string): Promise<void> {
    await this.calendarRepository.delete(calendarId);
  }

  /**
   * Add calendar exception
   */
  async addException(
    calendarId: string,
    data: {
      date: Date;
      type: any;
      name?: string;
      description?: string;
      isRecurring?: boolean;
      workingHours?: number;
    },
    userId: string,
  ): Promise<CalendarException> {
    const exception = this.exceptionRepository.create({
      calendar: { id: calendarId } as any,
      date: data.date,
      type: data.type,
      name: data.name || '',
      description: data.description || '',
      isRecurring: data.isRecurring || false,
      workingHours: data.workingHours,
      createdBy: { id: userId } as any,
    });

    return await this.exceptionRepository.save(exception);
  }

  /**
   * Get calendar exceptions
   */
  async getExceptions(calendarId: string): Promise<CalendarException[]> {
    return await this.exceptionRepository.find({
      where: { calendar: { id: calendarId } },
      order: { date: 'ASC' },
    });
  }

  /**
   * Update calendar exception
   */
  async updateException(
    exceptionId: string,
    data: {
      date?: Date;
      type?: any;
      name?: string;
      description?: string;
      isRecurring?: boolean;
      workingHours?: number;
    },
    userId: string,
  ): Promise<CalendarException> {
    const exception = await this.exceptionRepository.findOne({
      where: { id: exceptionId },
    });

    if (!exception) {
      throw new Error(`Calendar exception with ID ${exceptionId} not found`);
    }

    Object.assign(exception, data);
    exception.updatedBy = { id: userId } as any;

    return await this.exceptionRepository.save(exception);
  }

  /**
   * Delete calendar exception
   */
  async deleteException(exceptionId: string): Promise<void> {
    await this.exceptionRepository.delete(exceptionId);
  }
}
