import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Stakeholder,
  PowerLevel,
  InterestLevel,
  StakeholderQuadrant
} from '../entities/stakeholder.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateStakeholderDto } from './dto/create-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';

@Injectable()
export class StakeholderService {
  constructor(
    @InjectRepository(Stakeholder)
    private readonly stakeholderRepository: Repository<Stakeholder>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  /**
   * Calculate the Power-Interest quadrant based on power and interest levels
   */
  private calculateQuadrant(powerLevel: PowerLevel, interestLevel: InterestLevel): StakeholderQuadrant {
    const isHighPower = powerLevel === PowerLevel.HIGH;
    const isHighInterest = interestLevel === InterestLevel.HIGH;

    if (isHighPower && isHighInterest) {
      return StakeholderQuadrant.MANAGE_CLOSELY;
    } else if (isHighPower && !isHighInterest) {
      return StakeholderQuadrant.KEEP_SATISFIED;
    } else if (!isHighPower && isHighInterest) {
      return StakeholderQuadrant.KEEP_INFORMED;
    } else {
      return StakeholderQuadrant.MONITOR;
    }
  }

  async create(dto: CreateStakeholderDto, userId: string): Promise<Stakeholder> {
    // Validate project exists
    const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate owner if provided
    let owner = null;
    if (dto.ownerId) {
      if (dto.ownerId.startsWith('user-')) {
        throw new BadRequestException(
          'Stakeholder owner must be a regular team member. Please add team members to the project and select one as the owner.'
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

    // Check for duplicate stakeholder name + role combination
    const existingStakeholder = await this.stakeholderRepository.findOne({
      where: {
        project: { id: dto.projectId },
        stakeholderName: dto.stakeholderName,
        role: dto.role,
      },
    });
    if (existingStakeholder) {
      throw new BadRequestException(
        'A stakeholder with this name and role already exists in this project'
      );
    }

    // Calculate quadrant
    const quadrant = this.calculateQuadrant(dto.powerLevel, dto.interestLevel);

    // Create stakeholder entity
    const stakeholder = this.stakeholderRepository.create({
      project: { id: dto.projectId } as Project,
      stakeholderName: dto.stakeholderName,
      role: dto.role,
      powerLevel: dto.powerLevel,
      interestLevel: dto.interestLevel,
      engagementStrategy: dto.engagementStrategy,
      communicationFrequency: dto.communicationFrequency,
      email: dto.email,
      phone: dto.phone,
      notes: dto.notes,
      owner,
      quadrant,
      isArchived: false,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.stakeholderRepository.save(stakeholder);
    return this.findById(saved.id);
  }

  async findById(id: string): Promise<Stakeholder> {
    const stakeholder = await this.stakeholderRepository.findOne({
      where: { id },
      relations: ['project', 'owner', 'createdBy', 'updatedBy'],
    });
    if (!stakeholder) {
      throw new NotFoundException('Stakeholder not found');
    }
    return stakeholder;
  }

  async findByProject(
    projectId: string,
    filters?: {
      powerLevel?: PowerLevel;
      interestLevel?: InterestLevel;
      includeArchived?: boolean;
      search?: string;
    },
  ): Promise<Stakeholder[]> {
    const qb = this.stakeholderRepository
      .createQueryBuilder('stakeholder')
      .leftJoinAndSelect('stakeholder.owner', 'owner')
      .leftJoinAndSelect('stakeholder.createdBy', 'createdBy')
      .leftJoinAndSelect('stakeholder.updatedBy', 'updatedBy')
      .where('stakeholder.project_id = :projectId', { projectId });

    // By default, exclude archived stakeholders
    if (!filters?.includeArchived) {
      qb.andWhere('stakeholder.isArchived = :isArchived', { isArchived: false });
    }

    // Apply filters
    if (filters?.powerLevel) {
      qb.andWhere('stakeholder.powerLevel = :powerLevel', { powerLevel: filters.powerLevel });
    }
    if (filters?.interestLevel) {
      qb.andWhere('stakeholder.interestLevel = :interestLevel', { interestLevel: filters.interestLevel });
    }
    if (filters?.search) {
      qb.andWhere(
        '(stakeholder.stakeholderName ILIKE :q OR stakeholder.role ILIKE :q OR stakeholder.email ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }

    // Order by last updated (desc)
    qb.orderBy('stakeholder.updatedAt', 'DESC');

    return qb.getMany();
  }

  async update(id: string, dto: UpdateStakeholderDto, userId?: string): Promise<Stakeholder> {
    const stakeholder = await this.findById(id);

    if (stakeholder.isArchived) {
      throw new BadRequestException('Archived stakeholders cannot be modified');
    }

    // Validate owner if provided
    if (dto.ownerId !== undefined) {
      if (dto.ownerId) {
        if (dto.ownerId.startsWith('user-')) {
          throw new BadRequestException(
            'Stakeholder owner must be a regular team member.'
          );
        }

        const owner = await this.teamMemberRepository.findOne({
          where: { id: dto.ownerId },
          relations: ['projects'],
        });
        if (!owner) {
          throw new NotFoundException('Owner not found');
        }
        const isInProject = owner.projects?.some(p => p.id === stakeholder.project.id);
        if (!isInProject) {
          throw new BadRequestException('Owner not part of this project');
        }
        stakeholder.owner = owner;
      } else {
        stakeholder.owner = null;
      }
    }

    // Check for duplicate name + role if either is being updated
    if (dto.stakeholderName || dto.role) {
      const newName = dto.stakeholderName || stakeholder.stakeholderName;
      const newRole = dto.role || stakeholder.role;

      if (newName !== stakeholder.stakeholderName || newRole !== stakeholder.role) {
        const existingStakeholder = await this.stakeholderRepository.findOne({
          where: {
            project: { id: stakeholder.project.id },
            stakeholderName: newName,
            role: newRole,
          },
        });
        if (existingStakeholder && existingStakeholder.id !== id) {
          throw new BadRequestException(
            'A stakeholder with this name and role already exists in this project'
          );
        }
      }
    }

    // Update fields
    if (dto.stakeholderName !== undefined) stakeholder.stakeholderName = dto.stakeholderName;
    if (dto.role !== undefined) stakeholder.role = dto.role;
    if (dto.powerLevel !== undefined) stakeholder.powerLevel = dto.powerLevel;
    if (dto.interestLevel !== undefined) stakeholder.interestLevel = dto.interestLevel;
    if (dto.engagementStrategy !== undefined) stakeholder.engagementStrategy = dto.engagementStrategy;
    if (dto.communicationFrequency !== undefined) stakeholder.communicationFrequency = dto.communicationFrequency;
    if (dto.email !== undefined) stakeholder.email = dto.email;
    if (dto.phone !== undefined) stakeholder.phone = dto.phone;
    if (dto.notes !== undefined) stakeholder.notes = dto.notes;

    // Recalculate quadrant if power or interest changed
    if (dto.powerLevel !== undefined || dto.interestLevel !== undefined) {
      stakeholder.quadrant = this.calculateQuadrant(
        stakeholder.powerLevel,
        stakeholder.interestLevel
      );
    }

    // Update audit fields
    if (userId) {
      stakeholder.updatedBy = { id: userId } as User;
    }

    await this.stakeholderRepository.save(stakeholder);
    return this.findById(id);
  }

  async archive(id: string, userId?: string): Promise<Stakeholder> {
    const stakeholder = await this.findById(id);

    if (stakeholder.isArchived) {
      throw new BadRequestException('This stakeholder is already archived');
    }

    stakeholder.isArchived = true;
    stakeholder.archivedDate = new Date();
    if (userId) {
      stakeholder.updatedBy = { id: userId } as User;
    }

    await this.stakeholderRepository.save(stakeholder);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const stakeholder = await this.stakeholderRepository.findOne({ where: { id } });
    if (!stakeholder) {
      throw new NotFoundException('Stakeholder not found');
    }
    await this.stakeholderRepository.remove(stakeholder);
  }

  async exportToCSV(stakeholders: Stakeholder[]): Promise<string> {
    const headers = [
      'ID',
      'Stakeholder Name',
      'Role',
      'Power Level',
      'Interest Level',
      'Quadrant',
      'Engagement Strategy',
      'Communication Frequency',
      'Email',
      'Phone',
      'Notes',
      'Owner',
      'Status',
      'Created By',
      'Created At',
      'Updated By',
      'Updated At',
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

    const formatQuadrant = (quadrant: StakeholderQuadrant): string => {
      const quadrantLabels = {
        [StakeholderQuadrant.MANAGE_CLOSELY]: 'Manage Closely',
        [StakeholderQuadrant.KEEP_SATISFIED]: 'Keep Satisfied',
        [StakeholderQuadrant.KEEP_INFORMED]: 'Keep Informed',
        [StakeholderQuadrant.MONITOR]: 'Monitor',
      };
      return quadrantLabels[quadrant] || quadrant;
    };

    const rows = stakeholders.map(stakeholder => [
      stakeholder.id,
      stakeholder.stakeholderName,
      stakeholder.role,
      stakeholder.powerLevel,
      stakeholder.interestLevel,
      formatQuadrant(stakeholder.quadrant),
      stakeholder.engagementStrategy || '',
      stakeholder.communicationFrequency || '',
      stakeholder.email || '',
      stakeholder.phone || '',
      stakeholder.notes || '',
      stakeholder.owner?.fullName || stakeholder.owner?.displayName || '',
      stakeholder.isArchived ? 'Archived' : 'Active',
      stakeholder.createdBy?.username || '',
      formatDate(stakeholder.createdAt),
      stakeholder.updatedBy?.username || '',
      formatDate(stakeholder.updatedAt),
      formatDate(stakeholder.archivedDate)
    ].map(escapeCSV));

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }
}
