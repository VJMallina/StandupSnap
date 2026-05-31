import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DailyLock } from '../entities/daily-lock.entity';
import { Sprint } from '../entities/sprint.entity';
import { Snap } from '../entities/snap.entity';
import { LockDayDto } from './dto/lock-day.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class DailyLockService {
  constructor(private tenantService: TenantService) {}

  async lockDay(lockDayDto: LockDayDto, userId: string): Promise<DailyLock> {
    const { sprintId, date } = lockDayDto;
    const [dailyLockRepo, sprintRepo, snapRepo] = await Promise.all([
      this.tenantService.getRepository(DailyLock),
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(Snap),
    ]);

    const sprint = await sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException(`Sprint with ID ${sprintId} not found`);

    const targetDate = new Date(date);
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);
    if (targetDate < sprintStart || targetDate > sprintEnd) {
      throw new BadRequestException('Date must be within sprint date range');
    }

    const existingLock = await dailyLockRepo.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
    });
    if (existingLock) throw new BadRequestException('This day is already locked');

    const snaps = await snapRepo.find({
      where: { card: { sprint: { id: sprintId } }, snapDate: targetDate },
      relations: ['card'],
    });

    const summary = await this.generateDailySummary(sprintId, targetDate);

    const dailyLock = dailyLockRepo.create({
      sprint,
      date: targetDate,
      slotNumber: null,
      isLocked: true,
      dailySummaryDone: summary.done,
      dailySummaryToDo: summary.toDo,
      dailySummaryBlockers: summary.blockers,
    });

    for (const snap of snaps) snap.isLocked = true;
    await snapRepo.save(snaps);

    return dailyLockRepo.save(dailyLock);
  }

  async lockSlot(sprintId: string, date: string, slotNumber: number, userId: string): Promise<DailyLock> {
    const [dailyLockRepo, sprintRepo, snapRepo] = await Promise.all([
      this.tenantService.getRepository(DailyLock),
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(Snap),
    ]);

    const sprint = await sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException(`Sprint with ID ${sprintId} not found`);

    const targetDate = new Date(date);

    const existingLock = await dailyLockRepo.findOne({ where: { sprint: { id: sprintId }, date: targetDate, slotNumber } });
    if (existingLock) throw new BadRequestException(`Slot ${slotNumber} is already locked`);

    const dayLock = await dailyLockRepo.findOne({ where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() } });
    if (dayLock) throw new BadRequestException('Entire day is already locked');

    const snaps = await snapRepo.find({
      where: { card: { sprint: { id: sprintId } }, snapDate: targetDate, slotNumber },
      relations: ['card'],
    });

    const summary = this.generateSummaryFromSnaps(snaps);

    const slotLock = dailyLockRepo.create({
      sprint,
      date: targetDate,
      slotNumber,
      isLocked: true,
      dailySummaryDone: summary.done,
      dailySummaryToDo: summary.toDo,
      dailySummaryBlockers: summary.blockers,
    });

    for (const snap of snaps) snap.isLocked = true;
    await snapRepo.save(snaps);

    return dailyLockRepo.save(slotLock);
  }

  async isDayLocked(sprintId: string, date: string, slotNumber?: number): Promise<boolean> {
    const dailyLockRepo = await this.tenantService.getRepository(DailyLock);
    const targetDate = new Date(date);

    const dayLock = await dailyLockRepo.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
    });
    if (dayLock && dayLock.isLocked) return true;

    if (slotNumber !== undefined) {
      const slotLock = await dailyLockRepo.findOne({ where: { sprint: { id: sprintId }, date: targetDate, slotNumber } });
      if (slotLock && slotLock.isLocked) return true;
    }

    return false;
  }

  async getDailyLock(sprintId: string, date: string): Promise<DailyLock | null> {
    const dailyLockRepo = await this.tenantService.getRepository(DailyLock);
    const targetDate = new Date(date);
    return dailyLockRepo.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
      relations: ['sprint', 'lockedBy'],
    });
  }

  async getAllLocksForDay(sprintId: string, date: string): Promise<DailyLock[]> {
    const dailyLockRepo = await this.tenantService.getRepository(DailyLock);
    const targetDate = new Date(date);
    return dailyLockRepo.find({
      where: { sprint: { id: sprintId }, date: targetDate },
      relations: ['sprint', 'lockedBy'],
      order: { slotNumber: 'ASC' },
    });
  }

  private async generateDailySummary(
    sprintId: string,
    date: Date,
  ): Promise<{ done: string; toDo: string; blockers: string }> {
    const snapRepo = await this.tenantService.getRepository(Snap);
    const snaps = await snapRepo.find({
      where: { card: { sprint: { id: sprintId } }, snapDate: date },
      relations: ['card'],
    });
    return this.generateSummaryFromSnaps(snaps);
  }

  private generateSummaryFromSnaps(snaps: Snap[]): { done: string; toDo: string; blockers: string } {
    if (snaps.length === 0) return { done: 'No updates recorded', toDo: 'No updates recorded', blockers: 'None' };

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

  async unlockDay(sprintId: string, date: string): Promise<void> {
    const dailyLockRepo = await this.tenantService.getRepository(DailyLock);
    const targetDate = new Date(date);
    const lock = await dailyLockRepo.findOne({ where: { sprint: { id: sprintId }, date: targetDate } });
    if (!lock) throw new NotFoundException('No lock found for this day');
    await dailyLockRepo.remove(lock);
  }
}
