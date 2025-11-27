import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MomService } from './mom.service';
import { Mom } from '../entities/mom.entity';
import { Sprint } from '../entities/sprint.entity';
import { DailyLock } from '../entities/daily-lock.entity';
import { User } from '../entities/user.entity';

describe('MomService', () => {
  let service: MomService;
  let momRepository: Repository<Mom>;
  let sprintRepository: Repository<Sprint>;
  let dailyLockRepository: Repository<DailyLock>;

  const mockMomRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockSprintRepository = {
    findOne: jest.fn(),
  };

  const mockDailyLockRepository = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MomService,
        { provide: getRepositoryToken(Mom), useValue: mockMomRepository },
        { provide: getRepositoryToken(Sprint), useValue: mockSprintRepository },
        { provide: getRepositoryToken(DailyLock), useValue: mockDailyLockRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MomService>(MomService);
    momRepository = module.get<Repository<Mom>>(getRepositoryToken(Mom));
    sprintRepository = module.get<Repository<Sprint>>(getRepositoryToken(Sprint));
    dailyLockRepository = module.get<Repository<DailyLock>>(getRepositoryToken(DailyLock));

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createMomDto = {
      sprintId: 'sprint-1',
      date: '2025-01-05',
      agenda: 'Sprint planning',
      keyDiscussionPoints: 'Discussed priorities',
      decisionsTaken: 'Backend first',
      actionItems: 'John: API work',
    };

    it('should successfully create a MOM', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
        project: { id: 'project-1' },
      };

      const mockMom = {
        id: 'mom-1',
        ...createMomDto,
        sprint: mockSprint,
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockMomRepository.findOne.mockResolvedValue(null);
      mockMomRepository.create.mockReturnValue(mockMom);
      mockMomRepository.save.mockResolvedValue(mockMom);

      const result = await service.create(createMomDto, 'user-1');

      expect(result).toEqual(mockMom);
      expect(mockMomRepository.create).toHaveBeenCalled();
      expect(mockMomRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if sprint not found', async () => {
      mockSprintRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createMomDto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if date outside sprint range', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);

      const invalidDto = { ...createMomDto, date: '2025-02-01' };

      await expect(service.create(invalidDto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if day is locked', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
      };

      const mockLock = {
        id: 'lock-1',
        isLocked: true,
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(mockLock);

      await expect(service.create(createMomDto, 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if MOM already exists', async () => {
      const mockSprint = {
        id: 'sprint-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
      };

      const existingMom = { id: 'mom-1' };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockMomRepository.findOne.mockResolvedValue(existingMom);

      await expect(service.create(createMomDto, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateMomDto = {
      agenda: 'Updated agenda',
      keyDiscussionPoints: 'Updated discussion',
    };

    it('should successfully update a MOM', async () => {
      const mockMom = {
        id: 'mom-1',
        sprint: { id: 'sprint-1' },
        date: new Date('2025-01-05'),
        agenda: 'Old agenda',
      };

      mockMomRepository.findOne.mockResolvedValue(mockMom);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockMomRepository.save.mockResolvedValue({ ...mockMom, ...updateMomDto });

      const result = await service.update('mom-1', updateMomDto, 'user-1');

      expect(result.agenda).toBe(updateMomDto.agenda);
      expect(mockMomRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if MOM not found', async () => {
      mockMomRepository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateMomDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if day is locked', async () => {
      const mockMom = {
        id: 'mom-1',
        sprint: { id: 'sprint-1' },
        date: new Date('2025-01-05'),
      };

      const mockLock = {
        id: 'lock-1',
        isLocked: true,
      };

      mockMomRepository.findOne.mockResolvedValue(mockMom);
      mockDailyLockRepository.findOne.mockResolvedValue(mockLock);

      await expect(service.update('mom-1', updateMomDto, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findBySprintAndDate', () => {
    it('should return MOM for a specific sprint and date', async () => {
      const mockMom = {
        id: 'mom-1',
        sprint: { id: 'sprint-1' },
        date: new Date('2025-01-05'),
      };

      mockMomRepository.findOne.mockResolvedValue(mockMom);

      const result = await service.findBySprintAndDate('sprint-1', '2025-01-05');

      expect(result).toEqual(mockMom);
    });

    it('should return null if no MOM found', async () => {
      mockMomRepository.findOne.mockResolvedValue(null);

      const result = await service.findBySprintAndDate('sprint-1', '2025-01-05');

      expect(result).toBeNull();
    });
  });

  describe('findAllBySprint', () => {
    it('should return all MOMs for a sprint', async () => {
      const mockMoms = [
        { id: 'mom-1', date: new Date('2025-01-05') },
        { id: 'mom-2', date: new Date('2025-01-06') },
      ];

      mockMomRepository.find.mockResolvedValue(mockMoms);

      const result = await service.findAllBySprint('sprint-1');

      expect(result).toEqual(mockMoms);
      expect(result).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('should successfully delete a MOM', async () => {
      const mockMom = {
        id: 'mom-1',
        sprint: { id: 'sprint-1' },
        date: new Date('2025-01-05'),
      };

      mockMomRepository.findOne.mockResolvedValue(mockMom);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockMomRepository.remove.mockResolvedValue(mockMom);

      await service.remove('mom-1');

      expect(mockMomRepository.remove).toHaveBeenCalledWith(mockMom);
    });

    it('should throw NotFoundException if MOM not found', async () => {
      mockMomRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if day is locked', async () => {
      const mockMom = {
        id: 'mom-1',
        sprint: { id: 'sprint-1' },
        date: new Date('2025-01-05'),
      };

      const mockLock = {
        id: 'lock-1',
        isLocked: true,
      };

      mockMomRepository.findOne.mockResolvedValue(mockMom);
      mockDailyLockRepository.findOne.mockResolvedValue(mockLock);

      await expect(service.remove('mom-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generateMomWithAI', () => {
    it('should use fallback parsing when API call fails', async () => {
      const generateDto = {
        rawInput: 'Meeting notes here',
      };

      mockConfigService.get.mockReturnValue('');

      const result = await service.generateMomWithAI(generateDto);

      expect(result).toHaveProperty('agenda');
      expect(result).toHaveProperty('keyDiscussionPoints');
      expect(result).toHaveProperty('decisionsTaken');
      expect(result).toHaveProperty('actionItems');
      expect(result.keyDiscussionPoints).toBe(generateDto.rawInput);
    });
  });
});
