import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { Snap } from '../entities/snap.entity';
import { Card } from '../entities/card.entity';
import { DailyLock } from '../entities/daily-lock.entity';

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
  constructor(
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
    @InjectRepository(Snap)
    private snapRepository: Repository<Snap>,
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @InjectRepository(DailyLock)
    private dailyLockRepository: Repository<DailyLock>,
  ) {}

  /**
   * SB-UC01: Get active sprint for a project
   */
  async getActiveSprint(projectId: string): Promise<Sprint | null> {
    return this.sprintRepository.findOne({
      where: {
        project: { id: projectId },
        status: SprintStatus.ACTIVE,
      },
      relations: ['project'],
    });
  }

  /**
   * SB-UC02 & SB-UC03: Get day metadata for a sprint day
   */
  async getDayMetadata(sprintId: string, date: string): Promise<DayMetadata> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const targetDate = new Date(date);
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    // Calculate day number
    const dayNumber = Math.floor(
      (targetDate.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // Check if day is locked
    const dayLock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate },
    });

    // Get snaps for this day
    const snaps = await this.snapRepository.find({
      where: {
        card: { sprint: { id: sprintId } },
        snapDate: targetDate,
      },
      relations: ['card'],
    });

    // Get unique cards with snaps
    const uniqueCardIds = [...new Set(snaps.map((snap) => snap.card.id))];

    // Determine day status
    let dayStatus: 'not_started' | 'in_progress' | 'completed';
    if (dayLock?.isLocked) {
      dayStatus = 'completed';
    } else if (targetDate.getTime() === today.getTime()) {
      dayStatus = 'in_progress';
    } else {
      dayStatus = 'not_started';
    }

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

  /**
   * SB-UC04 & SB-UC05: Get all snaps for a specific day
   */
  async getSnapsForDay(sprintId: string, date: string): Promise<Snap[]> {
    const targetDate = new Date(date);

    return this.snapRepository.find({
      where: {
        card: { sprint: { id: sprintId } },
        snapDate: targetDate,
      },
      relations: ['card', 'card.assignee'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * MS-UC02 & MS-UC03: Group snaps into slots based on stored slotNumber
   * Always returns all configured slots (even if empty)
   */
  async getSnapsGroupedBySlots(sprintId: string, date: string): Promise<SlotGroup[]> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const snaps = await this.getSnapsForDay(sprintId, date);
    const totalSlots = sprint.dailyStandupCount || 1;

    // Group snaps by their stored slotNumber
    const slotMap = new Map<number, Snap[]>();

    // Initialize all slots
    for (let i = 1; i <= totalSlots; i++) {
      slotMap.set(i, []);
    }

    // Group snaps by their assigned slot number
    snaps.forEach((snap) => {
      const slotNum = snap.slotNumber || 1; // Default to slot 1 if not set
      if (slotMap.has(slotNum)) {
        slotMap.get(slotNum)!.push(snap);
      }
    });

    // Convert to SlotGroup array
    const allSlots: SlotGroup[] = [];
    for (let i = 1; i <= totalSlots; i++) {
      const slotSnaps = slotMap.get(i) || [];
      allSlots.push({
        slotNumber: i,
        snaps: slotSnaps,
        cardIds: [...new Set(slotSnaps.map((s) => s.card.id))],
      });
    }

    return allSlots;
  }

  /**
   * SB-UC02: Get all valid sprint days
   */
  async getSprintDays(sprintId: string): Promise<{ date: string; dayNumber: number; isAccessible: boolean }[]> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const sprintStart = new Date(sprint.startDate);
    const sprintEnd = new Date(sprint.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { date: string; dayNumber: number; isAccessible: boolean }[] = [];
    let currentDate = new Date(sprintStart);
    let dayNumber = 1;

    while (currentDate <= sprintEnd) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const isAccessible = currentDate <= today;

      days.push({
        date: dateStr,
        dayNumber,
        isAccessible,
      });

      currentDate.setDate(currentDate.getDate() + 1);
      dayNumber++;
    }

    return days;
  }
}
