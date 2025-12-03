import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decision, DecisionStatus, ImpactedArea } from '../entities/decision.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';

@Injectable()
export class DecisionService {
  constructor(
    @InjectRepository(Decision)
    private readonly decisionRepository: Repository<Decision>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  async create(dto: CreateDecisionDto, userId: string): Promise<Decision> {
    // Validate project exists
    const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate owner
    if (dto.ownerId.startsWith('user-')) {
      throw new BadRequestException(
        'Decision owner must be a regular team member. Please add team members to the project and select one as the owner.'
      );
    }

    const owner = await this.teamMemberRepository.findOne({
      where: { id: dto.ownerId },
      relations: ['projects'],
    });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    const isInProject = owner.projects?.some(p => p.id === dto.projectId);
    if (!isInProject) {
      throw new BadRequestException('Owner not part of this project');
    }

    // Create decision entity
    const decision = this.decisionRepository.create({
      project: { id: dto.projectId } as Project,
      title: dto.title,
      description: dto.description,
      owner,
      status: dto.status || DecisionStatus.PENDING,
      decisionTaken: dto.decisionTaken,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      impactedAreas: dto.impactedAreas || [],
      supportingNotes: dto.supportingNotes,
      isArchived: false,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.decisionRepository.save(decision);
    return this.findById(saved.id);
  }

  async findById(id: string): Promise<Decision> {
    const decision = await this.decisionRepository.findOne({
      where: { id },
      relations: ['project', 'owner', 'createdBy', 'updatedBy'],
    });
    if (!decision) {
      throw new NotFoundException('Decision not found');
    }
    return decision;
  }

  async findByProject(
    projectId: string,
    filters?: {
      status?: DecisionStatus;
      ownerId?: string;
      includeArchived?: boolean;
      search?: string;
    },
  ): Promise<Decision[]> {
    const qb = this.decisionRepository
      .createQueryBuilder('decision')
      .leftJoinAndSelect('decision.owner', 'owner')
      .leftJoinAndSelect('decision.createdBy', 'createdBy')
      .leftJoinAndSelect('decision.updatedBy', 'updatedBy')
      .where('decision.project_id = :projectId', { projectId });

    // By default, exclude archived decisions
    if (!filters?.includeArchived) {
      qb.andWhere('decision.isArchived = :isArchived', { isArchived: false });
    }

    // Apply filters
    if (filters?.status) {
      qb.andWhere('decision.status = :status', { status: filters.status });
    }
    if (filters?.ownerId) {
      qb.andWhere('decision.owner_id = :ownerId', { ownerId: filters.ownerId });
    }
    if (filters?.search) {
      qb.andWhere(
        '(decision.title ILIKE :q OR decision.description ILIKE :q OR decision.decisionTaken ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }

    // Order by status (PENDING first), then by creation date
    qb.orderBy('decision.status', 'ASC').addOrderBy('decision.createdAt', 'DESC');

    return qb.getMany();
  }

  async update(id: string, dto: UpdateDecisionDto, userId?: string): Promise<Decision> {
    const decision = await this.findById(id);

    if (decision.isArchived) {
      throw new BadRequestException('Archived decisions cannot be modified');
    }

    // Finalized decisions are read-only except for supporting notes
    if (decision.status === DecisionStatus.FINALIZED) {
      // Only allow updating supportingNotes for finalized decisions
      if (Object.keys(dto).length > 1 || (Object.keys(dto).length === 1 && !dto.supportingNotes)) {
        throw new BadRequestException('Finalized decisions can only have supporting notes updated');
      }
      if (dto.supportingNotes !== undefined) {
        decision.supportingNotes = dto.supportingNotes;
      }
    } else {
      // Validate owner if provided
      if (dto.ownerId) {
        if (dto.ownerId.startsWith('user-')) {
          throw new BadRequestException(
            'Decision owner must be a regular team member.'
          );
        }

        const owner = await this.teamMemberRepository.findOne({
          where: { id: dto.ownerId },
          relations: ['projects'],
        });
        if (!owner) {
          throw new NotFoundException('Owner not found');
        }
        const isInProject = owner.projects?.some(p => p.id === decision.project.id);
        if (!isInProject) {
          throw new BadRequestException('Owner not part of this project');
        }
        decision.owner = owner;
      }

      // Update fields
      if (dto.title !== undefined) decision.title = dto.title;
      if (dto.description !== undefined) decision.description = dto.description;
      if (dto.decisionTaken !== undefined) decision.decisionTaken = dto.decisionTaken;
      if (dto.dueDate !== undefined) {
        decision.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      }
      if (dto.impactedAreas !== undefined) decision.impactedAreas = dto.impactedAreas;
      if (dto.supportingNotes !== undefined) decision.supportingNotes = dto.supportingNotes;

      // Handle status change
      if (dto.status !== undefined) {
        decision.status = dto.status;

        // Set finalized date when status becomes FINALIZED
        if (dto.status === DecisionStatus.FINALIZED) {
          decision.finalizedDate = new Date();
        }
      }
    }

    // Update audit fields
    if (userId) {
      decision.updatedBy = { id: userId } as User;
    }

    await this.decisionRepository.save(decision);
    return this.findById(id);
  }

  async archive(id: string, userId?: string): Promise<Decision> {
    const decision = await this.findById(id);

    if (decision.isArchived) {
      throw new BadRequestException('This decision is already archived');
    }

    decision.isArchived = true;
    decision.archivedDate = new Date();
    if (userId) {
      decision.updatedBy = { id: userId } as User;
    }

    await this.decisionRepository.save(decision);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const decision = await this.decisionRepository.findOne({ where: { id } });
    if (!decision) {
      throw new NotFoundException('Decision not found');
    }
    await this.decisionRepository.remove(decision);
  }

  async exportToCSV(decisions: Decision[]): Promise<string> {
    const headers = [
      'ID',
      'Title',
      'Description',
      'Owner',
      'Status',
      'Decision Taken',
      'Due Date',
      'Impacted Areas',
      'Supporting Notes',
      'Finalized Date',
      'Created By',
      'Created At',
      'Updated By',
      'Updated At',
      'Is Archived',
      'Archived Date'
    ];

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatDate = (date: Date | string | null | undefined): string => {
      if (!date) return '';
      return new Date(date).toISOString().split('T')[0];
    };

    const rows = decisions.map(decision => [
      decision.id,
      decision.title,
      decision.description || '',
      decision.owner?.fullName || decision.owner?.displayName || '',
      decision.status,
      decision.decisionTaken || '',
      formatDate(decision.dueDate),
      decision.impactedAreas?.join('; ') || '',
      decision.supportingNotes || '',
      formatDate(decision.finalizedDate),
      decision.createdBy?.username || '',
      formatDate(decision.createdAt),
      decision.updatedBy?.username || '',
      formatDate(decision.updatedAt),
      decision.isArchived ? 'Yes' : 'No',
      formatDate(decision.archivedDate)
    ].map(escapeCSV));

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }
}
