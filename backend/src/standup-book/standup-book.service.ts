import { Injectable, NotFoundException } from '@nestjs/common';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { Snap } from '../entities/snap.entity';
import { Card } from '../entities/card.entity';
import { DailyLock } from '../entities/daily-lock.entity';
import { TenantService } from '../tenant/tenant.service';

export interface DayMetadata {
  dayNumber: number;
  date: string;
  dayStatus: 'not_started' | 'in_progress' | 'completed';
  isLocked: boolean;
  totalSnaps: number;
  totalCards: number;
  standupSlotCount: number;
}

export interface SlotGroup {
  slotNumber: number;
  snaps: Snap[];
  cardIds: string[];
}

@Injectable()
export class StandupBookService {
  constructor(private tenantService: TenantService) {}

  async getActiveSprint(projectId: string): Promise<Sprint | null> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sprint = await sprintRepo
      .createQueryBuilder('sprint')
      .leftJoinAndSelect('sprint.project', 'project')
      .where('sprint.project.id = :projectId', { projectId })
      .andWhere('sprint.isClosed = :isClosed', { isClosed: false })
      .andWhere('CAST(sprint.startDate AS date) <= CAST(:today AS date)', { today })
      .andWhere('CAST(sprint.endDate AS date) >= CAST(:today AS date)', { today })
      .getOne();

    if (sprint && sprint.status !== SprintStatus.ACTIVE) {
      sprint.status = SprintStatus.ACTIVE;
      await sprintRepo.save(sprint);
    }

    return sprint;
  }

  async getDayMetadata(sprintId: string, date: string): Promise<DayMetadata> {
    const [sprintRepo, snapRepo, dailyLockRepo] = await Promise.all([
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(Snap),
      this.tenantService.getRepository(DailyLock),
    ]);

    const sprint = await sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found');

    const targetDate = new Date(date);
    const sprintStart = new Date(sprint.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const dayNumber = Math.floor((targetDate.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const dayLock = await dailyLockRepo.findOne({ where: { sprint: { id: sprintId }, date: targetDate } });

    const snaps = await snapRepo.find({
      where: { card: { sprint: { id: sprintId } }, snapDate: targetDate },
      relations: ['card'],
    });

    const uniqueCardIds = [...new Set(snaps.map((snap) => snap.card.id))];

    let dayStatus: 'not_started' | 'in_progress' | 'completed';
    if (dayLock?.isLocked) dayStatus = 'completed';
    else if (targetDate.getTime() === today.getTime()) dayStatus = 'in_progress';
    else dayStatus = 'not_started';

    return {
      dayNumber,
      date: targetDate.toISOString().split('T')[0],
      dayStatus,
      isLocked: dayLock?.isLocked || false,
      totalSnaps: snaps.length,
      totalCards: uniqueCardIds.length,
      standupSlotCount: sprint.dailyStandupCount || 1,
    };
  }

  async getSnapsForDay(sprintId: string, date: string): Promise<Snap[]> {
    const snapRepo = await this.tenantService.getRepository(Snap);
    const targetDate = new Date(date);
    return snapRepo.find({
      where: { card: { sprint: { id: sprintId } }, snapDate: targetDate },
      relations: ['card', 'card.assignee'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSnapsGroupedBySlots(sprintId: string, date: string): Promise<SlotGroup[]> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const sprint = await sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found');

    const snaps = await this.getSnapsForDay(sprintId, date);
    const totalSlots = sprint.dailyStandupCount || 1;

    const slotMap = new Map<number, Snap[]>();
    for (let i = 1; i <= totalSlots; i++) slotMap.set(i, []);

    snaps.forEach((snap) => {
      const slotNum = snap.slotNumber || 1;
      if (slotMap.has(slotNum)) slotMap.get(slotNum)!.push(snap);
    });

    const allSlots: SlotGroup[] = [];
    for (let i = 1; i <= totalSlots; i++) {
      const slotSnaps = slotMap.get(i) || [];
      allSlots.push({ slotNumber: i, snaps: slotSnaps, cardIds: [...new Set(slotSnaps.map((s) => s.card.id))] });
    }

    return allSlots;
  }

  async getSprintDays(sprintId: string): Promise<{ date: string; dayNumber: number; isAccessible: boolean }[]> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const sprint = await sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found');

    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { date: string; dayNumber: number; isAccessible: boolean }[] = [];
    let currentDate = new Date(sprintStart);
    let dayNumber = 1;

    while (currentDate <= sprintEnd) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const normalizedCurrentDate = new Date(currentDate);
      normalizedCurrentDate.setHours(0, 0, 0, 0);
      days.push({ date: dateStr, dayNumber, isAccessible: normalizedCurrentDate <= today });
      currentDate.setDate(currentDate.getDate() + 1);
      dayNumber++;
    }

    return days;
  }
}
