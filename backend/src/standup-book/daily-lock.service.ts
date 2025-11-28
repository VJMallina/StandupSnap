import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyLock } from '../entities/daily-lock.entity';
import { Sprint } from '../entities/sprint.entity';
import { Snap } from '../entities/snap.entity';
import { User } from '../entities/user.entity';
import { LockDayDto } from './dto/lock-day.dto';
import { IsNull } from 'typeorm';

@Injectable()
export class DailyLockService {
  constructor(
    @InjectRepository(DailyLock)
    private dailyLockRepository: Repository<DailyLock>,
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
    @InjectRepository(Snap)
    private snapRepository: Repository<Snap>,
  ) {}

  /**
   * Lock a sprint day (entire day, not slot-specific)
   * This locks the entire day and prevents all future snap operations
   */
  async lockDay(lockDayDto: LockDayDto, userId: string): Promise<DailyLock> {
    const { sprintId, date } = lockDayDto;

    // Find sprint
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
    }

    // Validate date is within sprint range
    const targetDate = new Date(date);
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);

    if (targetDate < sprintStart || targetDate > sprintEnd) {
      throw new BadRequestException('Date must be within sprint date range');
    }

    // Check if entire day already locked (slotNumber = null)
    const existingLock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
    });

    if (existingLock) {
      throw new BadRequestException('This day is already locked');
    }

    // Get all snaps for this day to mark as locked
    const snaps = await this.snapRepository.find({
      where: { card: { sprint: { id: sprintId } }, snapDate: targetDate },
      relations: ['card'],
    });

    // Generate daily summary from snaps
    const summary = await this.generateDailySummary(sprintId, targetDate);

    // Create day-level lock (slotNumber = null means entire day)
    const dailyLock = this.dailyLockRepository.create({
      sprint,
      date: targetDate,
      slotNumber: null, // null = entire day locked
      isLocked: true,
      dailySummaryDone: summary.done,
      dailySummaryToDo: summary.toDo,
      dailySummaryBlockers: summary.blockers,
    });

    // Mark all snaps for this day as locked
    for (const snap of snaps) {
      snap.isLocked = true;
    }
    await this.snapRepository.save(snaps);

    return this.dailyLockRepository.save(dailyLock);
  }

  /**
   * Lock a specific slot (allows progressive locking)
   */
  async lockSlot(sprintId: string, date: string, slotNumber: number, userId: string): Promise<DailyLock> {
    // Find sprint
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
    }

    const targetDate = new Date(date);

    // Check if slot already locked
    const existingLock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber },
    });

    if (existingLock) {
      throw new BadRequestException(`Slot ${slotNumber} is already locked`);
    }

    // Check if entire day is locked
    const dayLock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
    });

    if (dayLock) {
      throw new BadRequestException('Entire day is already locked');
    }

    // Generate summary for this slot
    const snaps = await this.snapRepository.find({
      where: { card: { sprint: { id: sprintId } }, snapDate: targetDate, slotNumber },
      relations: ['card'],
    });

    const summary = this.generateSummaryFromSnaps(snaps);

    // Create slot-level lock
    const slotLock = this.dailyLockRepository.create({
      sprint,
      date: targetDate,
      slotNumber,
      isLocked: true,
      dailySummaryDone: summary.done,
      dailySummaryToDo: summary.toDo,
      dailySummaryBlockers: summary.blockers,
    });

    // Mark all snaps in this slot as locked
    for (const snap of snaps) {
      snap.isLocked = true;
    }
    await this.snapRepository.save(snaps);

    return this.dailyLockRepository.save(slotLock);
  }

  /**
   * Check if a specific day/slot is locked (slot-aware)
   */
  async isDayLocked(sprintId: string, date: string, slotNumber?: number): Promise<boolean> {
    const targetDate = new Date(date);

    // Check if entire day is locked
    const dayLock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
    });

    if (dayLock && dayLock.isLocked) {
      return true;
    }

    // If checking specific slot, check slot-level lock
    if (slotNumber !== undefined) {
      const slotLock = await this.dailyLockRepository.findOne({
        where: { sprint: { id: sprintId }, date: targetDate, slotNumber },
      });

      if (slotLock && slotLock.isLocked) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get daily lock for a specific day (returns day-level lock)
   */
  async getDailyLock(sprintId: string, date: string): Promise<DailyLock | null> {
    const targetDate = new Date(date);

    // Return day-level lock (slotNumber = null)
    return this.dailyLockRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
      relations: ['sprint', 'lockedBy'],
    });
  }

  /**
   * Get all locks for a specific day (including slot-level locks)
   */
  async getAllLocksForDay(sprintId: string, date: string): Promise<DailyLock[]> {
    const targetDate = new Date(date);

    return this.dailyLockRepository.find({
      where: { sprint: { id: sprintId }, date: targetDate },
      relations: ['sprint', 'lockedBy'],
      order: { slotNumber: 'ASC' },
    });
  }

  /**
   * Generate daily summary from all snaps for the day
   */
  private async generateDailySummary(
    sprintId: string,
    date: Date,
  ): Promise<{ done: string; toDo: string; blockers: string }> {
    // Get all snaps for this day
    const snaps = await this.snapRepository.find({
      where: { card: { sprint: { id: sprintId } }, snapDate: date },
      relations: ['card'],
    });

    if (snaps.length === 0) {
      return {
        done: 'No updates recorded',
        toDo: 'No updates recorded',
        blockers: 'None',
      };
    }

    // Aggregate all done, toDo, and blockers
    const doneList: string[] = [];
    const toDoList: string[] = [];
    const blockersList: string[] = [];

    snaps.forEach((snap) => {
      if (snap.done) doneList.push(`- ${snap.done}`);
      if (snap.toDo) toDoList.push(`- ${snap.toDo}`);
      if (snap.blockers) blockersList.push(`- ${snap.blockers}`);
    });

    return {
      done: doneList.length > 0 ? doneList.join('\n') : 'No updates',
      toDo: toDoList.length > 0 ? toDoList.join('\n') : 'No updates',
      blockers: blockersList.length > 0 ? blockersList.join('\n') : 'None',
    };
  }

  /**
   * Generate summary from a list of snaps (helper for slot locking)
   */
  private generateSummaryFromSnaps(snaps: Snap[]): { done: string; toDo: string; blockers: string } {
    if (snaps.length === 0) {
      return {
        done: 'No updates recorded',
        toDo: 'No updates recorded',
        blockers: 'None',
      };
    }

    const doneList: string[] = [];
    const toDoList: string[] = [];
    const blockersList: string[] = [];

    snaps.forEach((snap) => {
      if (snap.done) doneList.push(`- ${snap.done}`);
      if (snap.toDo) toDoList.push(`- ${snap.toDo}`);
      if (snap.blockers) blockersList.push(`- ${snap.blockers}`);
    });

    return {
      done: doneList.length > 0 ? doneList.join('\n') : 'No updates',
      toDo: toDoList.length > 0 ? toDoList.join('\n') : 'No updates',
      blockers: blockersList.length > 0 ? blockersList.join('\n') : 'None',
    };
  }

  /**
   * Unlock a day (admin function - use with caution)
   */
  async unlockDay(sprintId: string, date: string): Promise<void> {
    const targetDate = new Date(date);

    const lock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate },
    });

    if (!lock) {
      throw new NotFoundException('No lock found for this day');
    }

    await this.dailyLockRepository.remove(lock);
  }
}
