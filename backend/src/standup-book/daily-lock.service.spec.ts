import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DailyLockService } from './daily-lock.service';
import { DailyLock } from '../entities/daily-lock.entity';
import { Sprint } from '../entities/sprint.entity';
import { Snap } from '../entities/snap.entity';

describe('DailyLockService', () => {
  let service: DailyLockService;
  let dailyLockRepository: Repository<DailyLock>;
  let sprintRepository: Repository<Sprint>;
  let snapRepository: Repository<Snap>;

  const mockDailyLockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockSprintRepository = {
    findOne: jest.fn(),
  };

  const mockSnapRepository = {
    find: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyLockService,
        { provide: getRepositoryToken(DailyLock), useValue: mockDailyLockRepository },
        { provide: getRepositoryToken(Sprint), useValue: mockSprintRepository },
        { provide: getRepositoryToken(Snap), useValue: mockSnapRepository },
      ],
    }).compile();

    service = module.get<DailyLockService>(DailyLockService);
    dailyLockRepository = module.get<Repository<DailyLock>>(getRepositoryToken(DailyLock));
    sprintRepository = module.get<Repository<Sprint>>(getRepositoryToken(Sprint));
    snapRepository = module.get<Repository<Snap>>(getRepositoryToken(Snap));

    jest.clearAllMocks();
  });

  describe('lockDay', () => {
    const lockDayDto = {
      sprintId: 'sprint-1',
      date: '2025-01-05',
    };

    it('should successfully lock a day', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
      };

      const mockSnaps = [
        {
          id: 'snap-1',
          done: 'Completed task A',
          toDo: 'Work on task B',
          blockers: 'None',
          card: { id: 'card-1' },
        },
      ];

      const mockLock = {
        id: 'lock-1',
        isLocked: true,
        dailySummaryDone: '- Completed task A',
        dailySummaryToDo: '- Work on task B',
        dailySummaryBlockers: 'None',
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockSnapRepository.find.mockResolvedValue(mockSnaps);
      mockDailyLockRepository.create.mockReturnValue(mockLock);
      mockDailyLockRepository.save.mockResolvedValue(mockLock);

      const result = await service.lockDay(lockDayDto, 'user-1');

      expect(result).toEqual(mockLock);
      expect(mockDailyLockRepository.create).toHaveBeenCalled();
      expect(mockDailyLockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if sprint not found', async () => {
      mockSprintRepository.findOne.mockResolvedValue(null);

      await expect(service.lockDay(lockDayDto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if date outside sprint range', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);

      const invalidDto = { ...lockDayDto, date: '2025-02-01' };

      await expect(service.lockDay(invalidDto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if day already locked', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
      };

      const existingLock = {
        id: 'lock-1',
        isLocked: true,
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(existingLock);

      await expect(service.lockDay(lockDayDto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should generate summary from snaps', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
      };

      const mockSnaps = [
        {
          id: 'snap-1',
          done: 'Task 1 done',
          toDo: 'Task 2 pending',
          blockers: 'Blocker 1',
          card: { id: 'card-1' },
        },
        {
          id: 'snap-2',
          done: 'Task 3 done',
          toDo: 'Task 4 pending',
          blockers: null,
          card: { id: 'card-2' },
        },
      ];

      const mockLock = {
        id: 'lock-1',
        isLocked: true,
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockSnapRepository.find.mockResolvedValue(mockSnaps);
      mockDailyLockRepository.create.mockImplementation((data) => data);
      mockDailyLockRepository.save.mockResolvedValue(mockLock);

      await service.lockDay(lockDayDto, 'user-1');

      expect(mockDailyLockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dailySummaryDone: expect.stringContaining('Task 1 done'),
          dailySummaryToDo: expect.stringContaining('Task 2 pending'),
          dailySummaryBlockers: expect.stringContaining('Blocker 1'),
        }),
      );
    });
  });

  describe('isDayLocked', () => {
    it('should return true if day is locked', async () => {
      const mockLock = {
        id: 'lock-1',
        isLocked: true,
      };

      mockDailyLockRepository.findOne.mockResolvedValue(mockLock);

      const result = await service.isDayLocked('sprint-1', '2025-01-05');

      expect(result).toBe(true);
    });

    it('should return false if day is not locked', async () => {
      mockDailyLockRepository.findOne.mockResolvedValue(null);

      const result = await service.isDayLocked('sprint-1', '2025-01-05');

      expect(result).toBe(false);
    });

    it('should check slot-level lock when slot number provided', async () => {
      mockDailyLockRepository.findOne
        .mockResolvedValueOnce(null) // day-level check
        .mockResolvedValueOnce({ id: 'lock-1', isLocked: true }); // slot-level check

      const result = await service.isDayLocked('sprint-1', '2025-01-05', 1);

      expect(result).toBe(true);
    });
  });

  describe('getDailyLock', () => {
    it('should return daily lock for a day', async () => {
      const mockLock = {
        id: 'lock-1',
        sprint: { id: 'sprint-1' },
        date: new Date('2025-01-05'),
        isLocked: true,
      };

      mockDailyLockRepository.findOne.mockResolvedValue(mockLock);

      const result = await service.getDailyLock('sprint-1', '2025-01-05');

      expect(result).toEqual(mockLock);
    });

    it('should return null if no lock exists', async () => {
      mockDailyLockRepository.findOne.mockResolvedValue(null);

      const result = await service.getDailyLock('sprint-1', '2025-01-05');

      expect(result).toBeNull();
    });
  });

  describe('unlockDay', () => {
    it('should successfully unlock a day', async () => {
      const mockLock = {
        id: 'lock-1',
        sprint: { id: 'sprint-1' },
        date: new Date('2025-01-05'),
      };

      mockDailyLockRepository.findOne.mockResolvedValue(mockLock);
      mockDailyLockRepository.remove.mockResolvedValue(mockLock);

      await service.unlockDay('sprint-1', '2025-01-05');

      expect(mockDailyLockRepository.remove).toHaveBeenCalledWith(mockLock);
    });

    it('should throw NotFoundException if no lock exists', async () => {
      mockDailyLockRepository.findOne.mockResolvedValue(null);

      await expect(service.unlockDay('sprint-1', '2025-01-05')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
