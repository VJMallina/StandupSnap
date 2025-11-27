import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { StandupBookService } from './standup-book.service';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { Snap } from '../entities/snap.entity';
import { Card } from '../entities/card.entity';
import { DailyLock } from '../entities/daily-lock.entity';

describe('StandupBookService', () => {
  let service: StandupBookService;
  let sprintRepository: Repository<Sprint>;
  let snapRepository: Repository<Snap>;
  let cardRepository: Repository<Card>;
  let dailyLockRepository: Repository<DailyLock>;

  const mockSprintRepository = {
    findOne: jest.fn(),
  };

  const mockSnapRepository = {
    find: jest.fn(),
  };

  const mockCardRepository = {};

  const mockDailyLockRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StandupBookService,
        { provide: getRepositoryToken(Sprint), useValue: mockSprintRepository },
        { provide: getRepositoryToken(Snap), useValue: mockSnapRepository },
        { provide: getRepositoryToken(Card), useValue: mockCardRepository },
        { provide: getRepositoryToken(DailyLock), useValue: mockDailyLockRepository },
      ],
    }).compile();

    service = module.get<StandupBookService>(StandupBookService);
    sprintRepository = module.get<Repository<Sprint>>(getRepositoryToken(Sprint));
    snapRepository = module.get<Repository<Snap>>(getRepositoryToken(Snap));
    cardRepository = module.get<Repository<Card>>(getRepositoryToken(Card));
    dailyLockRepository = module.get<Repository<DailyLock>>(getRepositoryToken(DailyLock));

    jest.clearAllMocks();
  });

  describe('getActiveSprint', () => {
    it('should return active sprint for a project', async () => {
      const mockSprint = {
        id: 'sprint-1',
        name: 'Sprint 1',
        status: SprintStatus.ACTIVE,
        project: { id: 'project-1', name: 'Project 1' },
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);

      const result = await service.getActiveSprint('project-1');

      expect(result).toEqual(mockSprint);
      expect(mockSprintRepository.findOne).toHaveBeenCalledWith({
        where: {
          project: { id: 'project-1' },
          status: SprintStatus.ACTIVE,
        },
        relations: ['project'],
      });
    });

    it('should return null if no active sprint exists', async () => {
      mockSprintRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveSprint('project-1');

      expect(result).toBeNull();
    });
  });

  describe('getDayMetadata', () => {
    it('should return day metadata with correct status', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
        dailyStandupCount: 2,
      };

      const mockSnaps = [
        { id: 'snap-1', card: { id: 'card-1' } },
        { id: 'snap-2', card: { id: 'card-1' } },
        { id: 'snap-3', card: { id: 'card-2' } },
      ];

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockSnapRepository.find.mockResolvedValue(mockSnaps);

      const result = await service.getDayMetadata('sprint-1', '2025-01-05');

      expect(result.dayNumber).toBe(4); // Jan 5 - Jan 1 = 4 days, but day calculation is 0-indexed + 1
      expect(result.totalSnaps).toBe(3);
      expect(result.totalCards).toBe(2);
      expect(result.standupSlotCount).toBe(2);
      expect(result.isLocked).toBe(false);
    });

    it('should return completed status when day is locked', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
        dailyStandupCount: 1,
      };

      const mockDailyLock = {
        id: 'lock-1',
        isLocked: true,
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(mockDailyLock);
      mockSnapRepository.find.mockResolvedValue([]);

      const result = await service.getDayMetadata('sprint-1', '2025-01-05');

      expect(result.dayStatus).toBe('completed');
      expect(result.isLocked).toBe(true);
    });

    it('should throw NotFoundException if sprint not found', async () => {
      mockSprintRepository.findOne.mockResolvedValue(null);

      await expect(service.getDayMetadata('invalid-sprint', '2025-01-05')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSnapsForDay', () => {
    it('should return all snaps for a specific day', async () => {
      const mockSnaps = [
        {
          id: 'snap-1',
          snapDate: new Date('2025-01-05'),
          card: { id: 'card-1', assignee: { id: 'user-1' } },
        },
        {
          id: 'snap-2',
          snapDate: new Date('2025-01-05'),
          card: { id: 'card-2', assignee: { id: 'user-2' } },
        },
      ];

      mockSnapRepository.find.mockResolvedValue(mockSnaps);

      const result = await service.getSnapsForDay('sprint-1', '2025-01-05');

      expect(result).toEqual(mockSnaps);
      expect(mockSnapRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: { sprint: { id: 'sprint-1' } },
          }),
          relations: ['card', 'card.assignee'],
        }),
      );
    });
  });

  describe('getSnapsGroupedBySlots', () => {
    it('should return snaps grouped by slot number', async () => {
      const mockSprint = {
        id: 'sprint-1',
        dailyStandupCount: 3,
      };

      const mockSnaps = [
        { id: 'snap-1', slotNumber: 1, card: { id: 'card-1' } },
        { id: 'snap-2', slotNumber: 1, card: { id: 'card-2' } },
        { id: 'snap-3', slotNumber: 2, card: { id: 'card-3' } },
      ];

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockSnapRepository.find.mockResolvedValue(mockSnaps);

      const result = await service.getSnapsGroupedBySlots('sprint-1', '2025-01-05');

      expect(result).toHaveLength(3);
      expect(result[0].slotNumber).toBe(1);
      expect(result[0].snaps).toHaveLength(2);
      expect(result[1].slotNumber).toBe(2);
      expect(result[1].snaps).toHaveLength(1);
      expect(result[2].slotNumber).toBe(3);
      expect(result[2].snaps).toHaveLength(0);
    });

    it('should include all slots even if empty', async () => {
      const mockSprint = {
        id: 'sprint-1',
        dailyStandupCount: 4,
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockSnapRepository.find.mockResolvedValue([]);

      const result = await service.getSnapsGroupedBySlots('sprint-1', '2025-01-05');

      expect(result).toHaveLength(4);
      expect(result[0].snaps).toHaveLength(0);
      expect(result[1].snaps).toHaveLength(0);
      expect(result[2].snaps).toHaveLength(0);
      expect(result[3].snaps).toHaveLength(0);
    });

    it('should throw NotFoundException if sprint not found', async () => {
      mockSprintRepository.findOne.mockResolvedValue(null);

      await expect(service.getSnapsGroupedBySlots('invalid-sprint', '2025-01-05')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSprintDays', () => {
    it('should return all days in sprint with accessibility', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-05'),
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);

      const result = await service.getSprintDays('sprint-1');

      expect(result).toHaveLength(5);
      expect(result[0]).toMatchObject({
        date: '2025-01-01',
        dayNumber: 1,
      });
      expect(result[4]).toMatchObject({
        date: '2025-01-05',
        dayNumber: 5,
      });
    });

    it('should mark future days as not accessible', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date(),
        endDate: futureDate,
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);

      const result = await service.getSprintDays('sprint-1');

      const futureDays = result.filter((day) => !day.isAccessible);
      expect(futureDays.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException if sprint not found', async () => {
      mockSprintRepository.findOne.mockResolvedValue(null);

      await expect(service.getSprintDays('invalid-sprint')).rejects.toThrow(NotFoundException);
    });
  });
});
