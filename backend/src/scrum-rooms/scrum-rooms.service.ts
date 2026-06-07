import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ScrumRoom,
  RoomType,
  RoomStatus,
  DeckType,
  PlanningPokerData,
  RetrospectiveData,
  SprintPlanningData,
  RefinementData,
} from '../entities/scrum-room.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomDataDto } from './dto/update-room-data.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class ScrumRoomsService {
  constructor(private readonly tenantService: TenantService) {}

  // ========== ROOM MANAGEMENT ==========

  async createRoom(dto: CreateRoomDto, userId: string, organizationId?: string): Promise<ScrumRoom> {
    const roomRepo = await this.tenantService.getRepository(ScrumRoom);

    if (dto.projectId) {
      const projectRepo = await this.tenantService.getRepository(Project);
      const project = await projectRepo.findOne({ where: { id: dto.projectId } });
      if (!project) throw new NotFoundException('Project not found');
    }

    let initialData: any = null;
    switch (dto.type) {
      case RoomType.PLANNING_POKER:
        initialData = { deckType: DeckType.FIBONACCI, rounds: [], participants: [userId] } as PlanningPokerData;
        break;
      case RoomType.RETROSPECTIVE:
        initialData = {
          columns: [
            { columnId: '1', title: 'What Went Well', order: 0, items: [] },
            { columnId: '2', title: "What Didn't Go Well", order: 1, items: [] },
            { columnId: '3', title: 'Improvements', order: 2, items: [] },
            { columnId: '4', title: 'Kudos', order: 3, items: [] },
          ],
          votingEnabled: true,
          maxVotesPerPerson: 3,
        } as RetrospectiveData;
        break;
      case RoomType.SPRINT_PLANNING:
        initialData = { capacity: 0, items: [], sprintGoals: [], actualWorkload: 0 } as SprintPlanningData;
        break;
      case RoomType.REFINEMENT:
        initialData = { items: [] } as RefinementData;
        break;
    }

    const room = roomRepo.create({
      name: dto.name,
      type: dto.type,
      description: dto.description,
      data: dto.data || initialData,
      project: dto.projectId ? ({ id: dto.projectId } as Project) : null,
      status: RoomStatus.ACTIVE,
      organizationId: organizationId || null,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await roomRepo.save(room);
    return this.findById(saved.id);
  }

  async findById(id: string, organizationId?: string): Promise<ScrumRoom> {
    const roomRepo = await this.tenantService.getRepository(ScrumRoom);
    const where: any = { id };
    if (organizationId) where.organizationId = organizationId;
    const room = await roomRepo.findOne({ where, relations: ['project', 'createdBy', 'updatedBy'] });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async findAll(filters?: {
    projectId?: string;
    type?: RoomType;
    status?: RoomStatus;
    includeArchived?: boolean;
    organizationId?: string;
  }): Promise<ScrumRoom[]> {
    const roomRepo = await this.tenantService.getRepository(ScrumRoom);
    const qb = roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.project', 'project')
      .leftJoinAndSelect('room.createdBy', 'createdBy')
      .leftJoinAndSelect('room.updatedBy', 'updatedBy');

    if (filters?.projectId) qb.andWhere('room.project_id = :projectId', { projectId: filters.projectId });
    if (filters?.type) qb.andWhere('room.type = :type', { type: filters.type });
    if (filters?.status) qb.andWhere('room.status = :status', { status: filters.status });
    if (!filters?.includeArchived) qb.andWhere('room.isArchived = :isArchived', { isArchived: false });

    qb.orderBy('room.updatedAt', 'DESC');
    return qb.getMany();
  }

  async updateRoom(id: string, dto: UpdateRoomDto, userId: string): Promise<ScrumRoom> {
    const roomRepo = await this.tenantService.getRepository(ScrumRoom);
    const room = await this.findById(id);

    if (dto.name !== undefined) room.name = dto.name;
    if (dto.description !== undefined) room.description = dto.description;
    if (dto.status !== undefined) {
      room.status = dto.status;
      if (dto.status === RoomStatus.COMPLETED && !room.completedAt) {
        room.completedAt = new Date();
      }
    }
    if (dto.data !== undefined) room.data = dto.data;
    room.updatedBy = { id: userId } as User;

    await roomRepo.save(room);
    return this.findById(id);
  }

  async updateRoomData(id: string, dto: UpdateRoomDataDto, userId: string): Promise<ScrumRoom> {
    const roomRepo = await this.tenantService.getRepository(ScrumRoom);
    const room = await this.findById(id);
    room.data = dto.data;
    room.updatedBy = { id: userId } as User;
    await roomRepo.save(room);
    return this.findById(id);
  }

  async archiveRoom(id: string, userId: string): Promise<ScrumRoom> {
    const roomRepo = await this.tenantService.getRepository(ScrumRoom);
    const room = await this.findById(id);
    room.isArchived = true;
    room.archivedAt = new Date();
    room.status = RoomStatus.ARCHIVED;
    room.updatedBy = { id: userId } as User;
    await roomRepo.save(room);
    return this.findById(id);
  }

  async restoreRoom(id: string, userId: string): Promise<ScrumRoom> {
    const roomRepo = await this.tenantService.getRepository(ScrumRoom);
    const room = await this.findById(id);
    if (!room.isArchived) throw new BadRequestException('Room is not archived');
    room.isArchived = false;
    room.archivedAt = null;
    room.status = RoomStatus.ACTIVE;
    room.updatedBy = { id: userId } as User;
    await roomRepo.save(room);
    return this.findById(id);
  }

  async deleteRoom(id: string): Promise<void> {
    const roomRepo = await this.tenantService.getRepository(ScrumRoom);
    await this.findById(id);
    await roomRepo.delete(id);
  }

  async completeRoom(id: string, userId: string): Promise<ScrumRoom> {
    const roomRepo = await this.tenantService.getRepository(ScrumRoom);
    const room = await this.findById(id);
    room.status = RoomStatus.COMPLETED;
    room.completedAt = new Date();
    room.updatedBy = { id: userId } as User;
    await roomRepo.save(room);
    return this.findById(id);
  }

  // ========== PLANNING POKER SPECIFIC ==========

  calculatePlanningPokerStats(votes: Record<string, string | number>): {
    mean: number;
    median: number;
    mode: string | number;
  } {
    const numericVotes = Object.values(votes)
      .map((v) => (typeof v === 'string' ? parseFloat(v) : v))
      .filter((v) => !isNaN(v));

    if (numericVotes.length === 0) return { mean: 0, median: 0, mode: 0 };

    const mean = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const frequency: Record<string, number> = {};
    Object.values(votes).forEach((vote) => {
      const key = String(vote);
      frequency[key] = (frequency[key] || 0) + 1;
    });
    const mode = Object.keys(frequency).reduce((a, b) => (frequency[a] > frequency[b] ? a : b));

    return { mean: Math.round(mean * 10) / 10, median, mode };
  }

}
