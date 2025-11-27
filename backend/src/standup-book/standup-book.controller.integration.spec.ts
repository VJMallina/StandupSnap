import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StandupBookController } from './standup-book.controller';
import { StandupBookService } from './standup-book.service';
import { MomService } from './mom.service';
import { DailyLockService } from './daily-lock.service';
import { Mom } from '../entities/mom.entity';
import { DailyLock } from '../entities/daily-lock.entity';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { Snap } from '../entities/snap.entity';
import { Card } from '../entities/card.entity';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe('StandupBookController (Integration)', () => {
  let app: INestApplication;
  let sprintRepository: Repository<Sprint>;
  let snapRepository: Repository<Snap>;
  let momRepository: Repository<Mom>;
  let dailyLockRepository: Repository<DailyLock>;

  // Mock data with valid UUIDs
  const mockProject = { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Test Project' };
  const mockSprint = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Sprint 1',
    status: SprintStatus.ACTIVE,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-14'),
    dailyStandupCount: 2,
    project: mockProject,
  };
  const mockUser = {
    userId: 'user-1',
    username: 'testuser',
    roles: ['SCRUM_MASTER'],
  };

  // Mock repositories
  const mockSprintRepository = {
    findOne: jest.fn(),
  };

  const mockSnapRepository = {
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockMomRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockDailyLockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCardRepository = {};
  const mockUserRepository = {};

  // Mock guards to bypass authentication
  const mockJwtAuthGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      request.user = mockUser;
      return true;
    }),
  };

  const mockPermissionsGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GROQ_API_KEY') return '';
      if (key === 'GROQ_MODEL') return 'llama-3.3-70b-versatile';
      return '';
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StandupBookController],
      providers: [
        StandupBookService,
        MomService,
        DailyLockService,
        { provide: getRepositoryToken(Sprint), useValue: mockSprintRepository },
        { provide: getRepositoryToken(Snap), useValue: mockSnapRepository },
        { provide: getRepositoryToken(Mom), useValue: mockMomRepository },
        { provide: getRepositoryToken(DailyLock), useValue: mockDailyLockRepository },
        { provide: getRepositoryToken(Card), useValue: mockCardRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    sprintRepository = moduleFixture.get<Repository<Sprint>>(getRepositoryToken(Sprint));
    snapRepository = moduleFixture.get<Repository<Snap>>(getRepositoryToken(Snap));
    momRepository = moduleFixture.get<Repository<Mom>>(getRepositoryToken(Mom));
    dailyLockRepository = moduleFixture.get<Repository<DailyLock>>(getRepositoryToken(DailyLock));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /standup-book/active-sprint/:projectId', () => {
    it('should return active sprint for project', async () => {
      mockSprintRepository.findOne.mockResolvedValue(mockSprint);

      const response = await request(app.getHttpServer())
        .get(`/standup-book/active-sprint/${mockProject.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: mockSprint.id,
        name: 'Sprint 1',
        status: SprintStatus.ACTIVE,
      });
    });

    it('should return null if no active sprint', async () => {
      mockSprintRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/standup-book/active-sprint/project-1')
        .expect(200);

      // NestJS serializes null as empty object in some cases
      expect(response.body === null || Object.keys(response.body).length === 0).toBeTruthy();
    });
  });

  describe('GET /standup-book/sprint-days/:sprintId', () => {
    it('should return all sprint days', async () => {
      mockSprintRepository.findOne.mockResolvedValue(mockSprint);

      const response = await request(app.getHttpServer())
        .get(`/standup-book/sprint-days/${mockSprint.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('date');
      expect(response.body[0]).toHaveProperty('dayNumber');
      expect(response.body[0]).toHaveProperty('isAccessible');
    });

    it('should return 404 if sprint not found', async () => {
      mockSprintRepository.findOne.mockResolvedValue(null);

      // Use a valid UUID format that doesn't exist
      await request(app.getHttpServer())
        .get('/standup-book/sprint-days/550e8400-e29b-41d4-a716-446655440099')
        .expect(404);
    });
  });

  describe('GET /standup-book/day-metadata/:sprintId', () => {
    it('should return day metadata', async () => {
      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockSnapRepository.find.mockResolvedValue([
        { id: 'snap-1', card: { id: 'card-1' } },
        { id: 'snap-2', card: { id: 'card-2' } },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/standup-book/day-metadata/${mockSprint.id}?date=2025-01-05`)
        .expect(200);

      expect(response.body).toMatchObject({
        dayNumber: expect.any(Number),
        date: expect.any(String),
        dayStatus: expect.stringMatching(/not_started|in_progress|completed/),
        isLocked: false,
        totalSnaps: 2,
        totalCards: 2,
        standupSlotCount: 2,
      });
    });
  });

  describe('GET /standup-book/snaps/:sprintId', () => {
    it('should return snaps for a day', async () => {
      const mockSnaps = [
        { id: 'snap-1', snapDate: new Date('2025-01-05'), card: { id: 'card-1' } },
        { id: 'snap-2', snapDate: new Date('2025-01-05'), card: { id: 'card-2' } },
      ];

      mockSnapRepository.find.mockResolvedValue(mockSnaps);

      const response = await request(app.getHttpServer())
        .get(`/standup-book/snaps/${mockSprint.id}?date=2025-01-05`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /standup-book/snaps-by-slots/:sprintId', () => {
    it('should return snaps grouped by slots', async () => {
      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockSnapRepository.find.mockResolvedValue([
        { id: 'snap-1', slotNumber: 1, card: { id: 'card-1' } },
        { id: 'snap-2', slotNumber: 2, card: { id: 'card-2' } },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/standup-book/snaps-by-slots/${mockSprint.id}?date=2025-01-05`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('slotNumber');
      expect(response.body[0]).toHaveProperty('snaps');
      expect(response.body[0]).toHaveProperty('cardIds');
    });
  });

  describe('POST /standup-book/lock-day', () => {
    it('should successfully lock a day', async () => {
      const lockDayDto = {
        sprintId: mockSprint.id,
        date: '2025-01-05',
      };

      const mockLockResult = {
        id: 'lock-1',
        sprint: mockSprint,
        date: new Date('2025-01-05'),
        slotNumber: null,
        isLocked: true,
        dailySummaryDone: 'No updates',
        dailySummaryToDo: 'No updates',
        dailySummaryBlockers: 'None',
        lockedBy: { id: 'user-1' },
        lockedAt: new Date(),
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockSnapRepository.find.mockResolvedValue([]);
      mockDailyLockRepository.create.mockReturnValue(mockLockResult);
      mockDailyLockRepository.save.mockResolvedValue(mockLockResult);

      const response = await request(app.getHttpServer())
        .post('/standup-book/lock-day')
        .send(lockDayDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'lock-1',
        isLocked: true,
      });
    });

    it('should return 400 if day already locked', async () => {
      const lockDayDto = {
        sprintId: mockSprint.id,
        date: '2025-01-05',
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue({ id: 'lock-1', isLocked: true });

      await request(app.getHttpServer()).post('/standup-book/lock-day').send(lockDayDto).expect(400);
    });
  });

  describe('POST /standup-book/mom', () => {
    it('should successfully create a MOM', async () => {
      const createMomDto = {
        sprintId: mockSprint.id,
        date: '2025-01-05',
        agenda: 'Sprint planning',
        keyDiscussionPoints: 'Discussed priorities',
        decisionsTaken: 'Backend first',
        actionItems: 'John: API work',
      };

      const mockMom = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        sprint: mockSprint,
        date: new Date('2025-01-05'),
        agenda: createMomDto.agenda,
        keyDiscussionPoints: createMomDto.keyDiscussionPoints,
        decisionsTaken: createMomDto.decisionsTaken,
        actionItems: createMomDto.actionItems,
        createdBy: { id: 'user-1' },
        updatedBy: { id: 'user-1' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSprintRepository.findOne.mockResolvedValue(mockSprint);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockMomRepository.findOne.mockResolvedValue(null);
      mockMomRepository.create.mockReturnValue(mockMom);
      mockMomRepository.save.mockResolvedValue(mockMom);

      const response = await request(app.getHttpServer())
        .post('/standup-book/mom')
        .send(createMomDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: mockMom.id,
        agenda: 'Sprint planning',
      });
    });

    it('should return 400 if validation fails', async () => {
      const invalidDto = {
        sprintId: 'not-a-uuid',
        date: 'invalid-date',
      };

      await request(app.getHttpServer()).post('/standup-book/mom').send(invalidDto).expect(400);
    });
  });

  describe('PUT /standup-book/mom/:id', () => {
    it('should successfully update a MOM', async () => {
      const updateMomDto = {
        agenda: 'Updated agenda',
      };

      const mockMom = {
        id: 'mom-1',
        sprint: { id: 'sprint-1' },
        date: new Date('2025-01-05'),
        agenda: 'Old agenda',
      };

      mockMomRepository.findOne.mockResolvedValue(mockMom);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockMomRepository.save.mockResolvedValue({ ...mockMom, ...updateMomDto });

      const response = await request(app.getHttpServer())
        .put('/standup-book/mom/mom-1')
        .send(updateMomDto)
        .expect(200);

      expect(response.body.agenda).toBe('Updated agenda');
    });
  });

  describe('GET /standup-book/mom/:sprintId', () => {
    it('should return MOM for a specific day', async () => {
      const mockMom = {
        id: 'mom-1',
        sprint: { id: mockSprint.id },
        date: new Date('2025-01-05'),
        agenda: 'Sprint planning',
      };

      mockMomRepository.findOne.mockResolvedValue(mockMom);

      const response = await request(app.getHttpServer())
        .get(`/standup-book/mom/${mockSprint.id}?date=2025-01-05`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'mom-1',
        agenda: 'Sprint planning',
      });
    });
  });

  describe('GET /standup-book/moms/:sprintId', () => {
    it('should return all MOMs for a sprint', async () => {
      const mockMoms = [
        { id: 'mom-1', date: new Date('2025-01-05') },
        { id: 'mom-2', date: new Date('2025-01-06') },
      ];

      mockMomRepository.find.mockResolvedValue(mockMoms);

      const response = await request(app.getHttpServer())
        .get(`/standup-book/moms/${mockSprint.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('DELETE /standup-book/mom/:id', () => {
    it('should successfully delete a MOM', async () => {
      const mockMom = {
        id: 'mom-1',
        sprint: { id: mockSprint.id },
        date: new Date('2025-01-05'),
      };

      mockMomRepository.findOne.mockResolvedValue(mockMom);
      mockDailyLockRepository.findOne.mockResolvedValue(null);
      mockMomRepository.remove.mockResolvedValue(mockMom);

      await request(app.getHttpServer()).delete('/standup-book/mom/mom-1').expect(200);
    });
  });

  describe('GET /standup-book/mom/:id/download', () => {
    it('should download MOM as text file', async () => {
      const mockMom = {
        id: 'mom-1',
        date: new Date('2025-01-05'),
        agenda: 'Sprint planning',
        keyDiscussionPoints: 'Discussed priorities',
        decisionsTaken: 'Backend first',
        actionItems: 'John: API work',
      };

      mockMomRepository.findOne.mockResolvedValue(mockMom);

      const response = await request(app.getHttpServer())
        .get('/standup-book/mom/mom-1/download?format=txt')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.headers['content-disposition']).toContain('MOM_2025-01-05.txt');
      expect(response.text).toContain('Sprint planning');
    });
  });
});
