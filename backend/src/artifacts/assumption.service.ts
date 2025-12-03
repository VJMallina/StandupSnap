import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assumption, AssumptionStatus } from '../entities/assumption.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateAssumptionDto } from './dto/create-assumption.dto';
import { UpdateAssumptionDto } from './dto/update-assumption.dto';

@Injectable()
export class AssumptionService {
  constructor(
    @InjectRepository(Assumption)
    private readonly assumptionRepository: Repository<Assumption>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  async create(dto: CreateAssumptionDto, userId: string): Promise<Assumption> {
    // Validate project exists
    const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate owner if provided
    let owner: TeamMember | null = null;
    if (dto.ownerId) {
      // Handle both team member IDs and user-prefixed IDs
      if (dto.ownerId.startsWith('user-')) {
        throw new BadRequestException(
          'Assumption owner must be a regular team member. Please add team members to the project and select one as the owner.'
        );
      }

      owner = await this.teamMemberRepository.findOne({
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
    }

    // Create assumption entity
    const assumption = this.assumptionRepository.create({
      project: { id: dto.projectId } as Project,
      title: dto.title,
      description: dto.description,
      owner,
      status: dto.status || AssumptionStatus.OPEN,
      notes: dto.notes,
      isArchived: false,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.assumptionRepository.save(assumption);
    return this.findById(saved.id);
  }

  async findById(id: string): Promise<Assumption> {
    const assumption = await this.assumptionRepository.findOne({
      where: { id },
      relations: ['project', 'owner', 'createdBy', 'updatedBy'],
    });
    if (!assumption) {
      throw new NotFoundException('Assumption not found');
    }
    return assumption;
  }

  async findByProject(
    projectId: string,
    filters?: {
      status?: AssumptionStatus;
      ownerId?: string;
      includeArchived?: boolean;
      search?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<Assumption[]> {
    const qb = this.assumptionRepository
      .createQueryBuilder('assumption')
      .leftJoinAndSelect('assumption.owner', 'owner')
      .leftJoinAndSelect('assumption.createdBy', 'createdBy')
      .leftJoinAndSelect('assumption.updatedBy', 'updatedBy')
      .where('assumption.project_id = :projectId', { projectId });

    // By default, exclude archived assumptions unless explicitly requested
    if (!filters?.includeArchived) {
      qb.andWhere('assumption.isArchived = :isArchived', { isArchived: false });
    }

    // Apply filters
    if (filters?.status) {
      qb.andWhere('assumption.status = :status', { status: filters.status });
    }
    if (filters?.ownerId) {
      qb.andWhere('assumption.owner_id = :ownerId', { ownerId: filters.ownerId });
    }
    if (filters?.search) {
      qb.andWhere(
        '(assumption.title ILIKE :q OR assumption.description ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }
    if (filters?.startDate) {
      qb.andWhere('assumption.createdAt >= :startDate', { startDate: filters.startDate });
    }
    if (filters?.endDate) {
      qb.andWhere('assumption.createdAt <= :endDate', { endDate: filters.endDate });
    }

    // Order by creation date (newest first)
    qb.orderBy('assumption.createdAt', 'DESC');

    return qb.getMany();
  }

  async update(id: string, dto: UpdateAssumptionDto, userId?: string): Promise<Assumption> {
    const assumption = await this.findById(id);

    // Per use case A-UC04: Only allow editing if status is OPEN
    if (assumption.status !== AssumptionStatus.OPEN && !assumption.isArchived) {
      throw new BadRequestException('Only assumptions with status "Open" can be edited');
    }

    // Archived assumptions are read-only
    if (assumption.isArchived) {
      throw new BadRequestException('Archived assumptions cannot be modified');
    }

    // Validate owner if provided
    if (dto.ownerId !== undefined) {
      if (dto.ownerId === null) {
        assumption.owner = null;
      } else {
        // Check if it's a user-based role (not allowed)
        if (dto.ownerId.startsWith('user-')) {
          throw new BadRequestException(
            'Assumption owner must be a regular team member. Please add team members to the project and select one as the owner.'
          );
        }

        const owner = await this.teamMemberRepository.findOne({
          where: { id: dto.ownerId },
          relations: ['projects'],
        });
        if (!owner) {
          throw new NotFoundException('Owner not found');
        }
        const isInProject = owner.projects?.some(p => p.id === assumption.project.id);
        if (!isInProject) {
          throw new BadRequestException('Owner not part of this project');
        }
        assumption.owner = owner;
      }
    }

    // Update fields
    if (dto.title !== undefined) assumption.title = dto.title;
    if (dto.description !== undefined) assumption.description = dto.description;
    if (dto.status !== undefined) assumption.status = dto.status;

    // Notes are append-only - concatenate if provided
    if (dto.notes !== undefined && dto.notes) {
      if (assumption.notes) {
        assumption.notes = `${assumption.notes}\n\n${dto.notes}`;
      } else {
        assumption.notes = dto.notes;
      }
    }

    // Update audit fields
    if (userId) {
      assumption.updatedBy = { id: userId } as User;
    }

    await this.assumptionRepository.save(assumption);
    return this.findById(id);
  }

  async archive(id: string, userId?: string): Promise<Assumption> {
    const assumption = await this.findById(id);

    // Check if already archived
    if (assumption.isArchived) {
      throw new BadRequestException('This assumption is already archived');
    }

    assumption.isArchived = true;
    if (userId) {
      assumption.updatedBy = { id: userId } as User;
    }

    await this.assumptionRepository.save(assumption);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const assumption = await this.assumptionRepository.findOne({ where: { id } });
    if (!assumption) {
      throw new NotFoundException('Assumption not found');
    }
    await this.assumptionRepository.remove(assumption);
  }

  /**
   * Export assumptions to CSV format
   */
  async exportToCSV(assumptions: Assumption[]): Promise<string> {
    // Define CSV headers
    const headers = [
      'ID',
      'Title',
      'Description',
      'Status',
      'Owner',
      'Notes',
      'Created By',
      'Created At',
      'Updated By',
      'Updated At',
      'Is Archived'
    ];

    // Helper to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper to format date
    const formatDate = (date: Date | string | null | undefined): string => {
      if (!date) return '';
      return new Date(date).toISOString().split('T')[0];
    };

    // Build CSV rows
    const rows = assumptions.map(assumption => [
      assumption.id,
      assumption.title,
      assumption.description || '',
      assumption.status,
      assumption.owner?.fullName || assumption.owner?.displayName || '',
      assumption.notes || '',
      assumption.createdBy?.username || '',
      formatDate(assumption.createdAt),
      assumption.updatedBy?.username || '',
      formatDate(assumption.updatedAt),
      assumption.isArchived ? 'Yes' : 'No'
    ].map(escapeCSV));

    // Combine headers and rows
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }
}
