import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  ScrumRoom,
  RoomType,
  RoomStatus,
  DeckType,
  PlanningPokerData,
  RetrospectiveData,
  MOMData,
  SprintPlanningData,
  RefinementData,
} from '../entities/scrum-room.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomDataDto } from './dto/update-room-data.dto';

@Injectable()
export class ScrumRoomsService {
  private groqApiKey: string;
  private groqModel: string;

  constructor(
    @InjectRepository(ScrumRoom)
    private readonly roomRepository: Repository<ScrumRoom>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly configService: ConfigService,
  ) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') || '';
    this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
  }

  // ========== ROOM MANAGEMENT ==========

  async createRoom(dto: CreateRoomDto, userId: string): Promise<ScrumRoom> {
    // Validate project if provided
    if (dto.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: dto.projectId },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    // Initialize default data based on room type
    let initialData: any = null;

    switch (dto.type) {
      case RoomType.PLANNING_POKER:
        initialData = {
          deckType: DeckType.FIBONACCI,
          rounds: [],
          participants: [userId],
        } as PlanningPokerData;
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

      case RoomType.MOM:
        initialData = {
          rawInput: '',
          summary: '',
          decisions: [],
          actionItems: [],
          attendees: [],
          aiGenerated: false,
        } as MOMData;
        break;

      case RoomType.SPRINT_PLANNING:
        initialData = {
          capacity: 0,
          items: [],
          sprintGoals: [],
          actualWorkload: 0,
        } as SprintPlanningData;
        break;

      case RoomType.REFINEMENT:
        initialData = {
          items: [],
        } as RefinementData;
        break;
    }

    const room = this.roomRepository.create({
      name: dto.name,
      type: dto.type,
      description: dto.description,
      data: dto.data || initialData,
      project: dto.projectId ? ({ id: dto.projectId } as Project) : null,
      status: RoomStatus.ACTIVE,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.roomRepository.save(room);
    return this.findById(saved.id);
  }

  async findById(id: string): Promise<ScrumRoom> {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ['project', 'createdBy', 'updatedBy'],
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async findAll(filters?: {
    projectId?: string;
    type?: RoomType;
    status?: RoomStatus;
    includeArchived?: boolean;
  }): Promise<ScrumRoom[]> {
    const qb = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.project', 'project')
      .leftJoinAndSelect('room.createdBy', 'createdBy')
      .leftJoinAndSelect('room.updatedBy', 'updatedBy');

    if (filters?.projectId) {
      qb.andWhere('room.project_id = :projectId', { projectId: filters.projectId });
    }

    if (filters?.type) {
      qb.andWhere('room.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      qb.andWhere('room.status = :status', { status: filters.status });
    }

    if (!filters?.includeArchived) {
      qb.andWhere('room.isArchived = :isArchived', { isArchived: false });
    }

    qb.orderBy('room.updatedAt', 'DESC');
    return qb.getMany();
  }

  async updateRoom(id: string, dto: UpdateRoomDto, userId: string): Promise<ScrumRoom> {
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

    await this.roomRepository.save(room);
    return this.findById(id);
  }

  async updateRoomData(
    id: string,
    dto: UpdateRoomDataDto,
    userId: string,
  ): Promise<ScrumRoom> {
    const room = await this.findById(id);

    room.data = dto.data;
    room.updatedBy = { id: userId } as User;

    await this.roomRepository.save(room);
    return this.findById(id);
  }

  async archiveRoom(id: string, userId: string): Promise<ScrumRoom> {
    const room = await this.findById(id);

    room.isArchived = true;
    room.archivedAt = new Date();
    room.status = RoomStatus.ARCHIVED;
    room.updatedBy = { id: userId } as User;

    await this.roomRepository.save(room);
    return this.findById(id);
  }

  async restoreRoom(id: string, userId: string): Promise<ScrumRoom> {
    const room = await this.findById(id);

    if (!room.isArchived) {
      throw new BadRequestException('Room is not archived');
    }

    room.isArchived = false;
    room.archivedAt = null;
    room.status = RoomStatus.ACTIVE;
    room.updatedBy = { id: userId } as User;

    await this.roomRepository.save(room);
    return this.findById(id);
  }

  async deleteRoom(id: string): Promise<void> {
    const room = await this.findById(id);
    await this.roomRepository.delete(id);
  }

  async completeRoom(id: string, userId: string): Promise<ScrumRoom> {
    const room = await this.findById(id);

    room.status = RoomStatus.COMPLETED;
    room.completedAt = new Date();
    room.updatedBy = { id: userId } as User;

    await this.roomRepository.save(room);
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

    if (numericVotes.length === 0) {
      return { mean: 0, median: 0, mode: 0 };
    }

    // Mean
    const mean = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;

    // Median
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    // Mode
    const frequency: Record<string, number> = {};
    Object.values(votes).forEach((vote) => {
      const key = String(vote);
      frequency[key] = (frequency[key] || 0) + 1;
    });
    const mode = Object.keys(frequency).reduce((a, b) =>
      frequency[a] > frequency[b] ? a : b,
    );

    return { mean: Math.round(mean * 10) / 10, median, mode };
  }

  // ========== MOM AI GENERATION ==========

  async generateMOMSummary(text: string): Promise<{
    summary: string;
    decisions: string[];
    actionItems: Array<{ id: string; description: string; assignee?: string; dueDate?: string }>;
  }> {
    if (!this.groqApiKey) {
      throw new BadRequestException('AI service not configured');
    }

    const systemPrompt = `You are an expert meeting minutes assistant. Parse meeting notes and extract:
1. Summary: A concise overview of the main discussions and topics
2. Decisions: All decisions made, agreements, or conclusions
3. Action Items: Tasks with owners and deadlines (if mentioned)

Return ONLY a JSON object with this structure:
{
  "summary": "Brief meeting summary",
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": [{"description": "Task description", "assignee": "Person name", "dueDate": "YYYY-MM-DD"}]
}

If a field is not found, use empty strings or arrays. Extract as much detail as possible.`;

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: this.groqModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      let parsed: any;

      try {
        parsed = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return this.fallbackMOMParse(text);
        parsed = JSON.parse(jsonMatch[0]);
      }

      const actionItems = (parsed.actionItems || parsed.action_items || []).map((item: any, idx: number) => ({
        id: `action-${Date.now()}-${idx}`,
        description: item.description || item.task || String(item),
        assignee: item.assignee || item.owner,
        dueDate: item.dueDate || item.due_date || item.deadline,
      }));

      return {
        summary: parsed.summary || 'Meeting discussion',
        decisions: Array.isArray(parsed.decisions)
          ? parsed.decisions
          : parsed.decisions
          ? [parsed.decisions]
          : [],
        actionItems,
      };
    } catch (error) {
      console.error('AI generation error:', error.response?.data || error.message);
      return this.fallbackMOMParse(text);
    }
  }

  private fallbackMOMParse(text: string) {
    return {
      summary: text.substring(0, 500),
      decisions: [],
      actionItems: [],
    };
  }
}
