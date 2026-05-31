import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Stakeholder,
  PowerLevel,
  InterestLevel,
  StakeholderQuadrant,
} from '../entities/stakeholder.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateStakeholderDto } from './dto/create-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class StakeholderService {
  constructor(private tenantService: TenantService) {}

  private calculateQuadrant(powerLevel: PowerLevel, interestLevel: InterestLevel): StakeholderQuadrant {
    const isHighPower = powerLevel === PowerLevel.HIGH;
    const isHighInterest = interestLevel === InterestLevel.HIGH;
    if (isHighPower && isHighInterest) return StakeholderQuadrant.MANAGE_CLOSELY;
    if (isHighPower && !isHighInterest) return StakeholderQuadrant.KEEP_SATISFIED;
    if (!isHighPower && isHighInterest) return StakeholderQuadrant.KEEP_INFORMED;
    return StakeholderQuadrant.MONITOR;
  }

  async create(dto: CreateStakeholderDto, userId: string, orgId?: string): Promise<Stakeholder> {
    const [stakeholderRepo, projectRepo, teamMemberRepo] = await Promise.all([
      this.tenantService.getRepository(Stakeholder),
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(TeamMember),
    ]);

    const project = await projectRepo.findOne({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Project not found');

    let owner = null;
    if (dto.ownerId) {
      if (dto.ownerId.startsWith('user-')) {
        throw new BadRequestException('Stakeholder owner must be a regular team member. Please add team members to the project and select one as the owner.');
      }

      owner = await teamMemberRepo.findOne({ where: { id: dto.ownerId }, relations: ['projects'] });
      if (!owner) throw new NotFoundException('Owner not found');
      const isInProject = owner.projects?.some(p => p.id === dto.projectId);
      if (!isInProject) throw new BadRequestException('Owner not part of this project');
    }

    const existingStakeholder = await stakeholderRepo.findOne({
      where: { project: { id: dto.projectId }, stakeholderName: dto.stakeholderName, role: dto.role },
    });
    if (existingStakeholder) {
      throw new BadRequestException('A stakeholder with this name and role already exists in this project');
    }

    const quadrant = this.calculateQuadrant(dto.powerLevel, dto.interestLevel);

    const stakeholder = stakeholderRepo.create({
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
      ...(orgId ? { organizationId: orgId } : {}),
    });

    const saved = await stakeholderRepo.save(stakeholder);
    return this.findById(saved.id);
  }

  async findById(id: string): Promise<Stakeholder> {
    const stakeholderRepo = await this.tenantService.getRepository(Stakeholder);
    const stakeholder = await stakeholderRepo.findOne({
      where: { id },
      relations: ['project', 'owner', 'createdBy', 'updatedBy'],
    });
    if (!stakeholder) throw new NotFoundException('Stakeholder not found');
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
    const stakeholderRepo = await this.tenantService.getRepository(Stakeholder);
    const qb = stakeholderRepo
      .createQueryBuilder('stakeholder')
      .leftJoinAndSelect('stakeholder.owner', 'owner')
      .leftJoinAndSelect('stakeholder.createdBy', 'createdBy')
      .leftJoinAndSelect('stakeholder.updatedBy', 'updatedBy')
      .where('stakeholder.project_id = :projectId', { projectId });

    if (!filters?.includeArchived) qb.andWhere('stakeholder.isArchived = :isArchived', { isArchived: false });
    if (filters?.powerLevel) qb.andWhere('stakeholder.powerLevel = :powerLevel', { powerLevel: filters.powerLevel });
    if (filters?.interestLevel) qb.andWhere('stakeholder.interestLevel = :interestLevel', { interestLevel: filters.interestLevel });
    if (filters?.search) {
      qb.andWhere(
        '(stakeholder.stakeholderName ILIKE :q OR stakeholder.role ILIKE :q OR stakeholder.email ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }

    qb.orderBy('stakeholder.updatedAt', 'DESC');
    return qb.getMany();
  }

  async update(id: string, dto: UpdateStakeholderDto, userId?: string): Promise<Stakeholder> {
    const [stakeholderRepo, teamMemberRepo] = await Promise.all([
      this.tenantService.getRepository(Stakeholder),
      this.tenantService.getRepository(TeamMember),
    ]);

    const stakeholder = await this.findById(id);
    if (stakeholder.isArchived) throw new BadRequestException('Archived stakeholders cannot be modified');

    if (dto.ownerId !== undefined) {
      if (dto.ownerId) {
        if (dto.ownerId.startsWith('user-')) throw new BadRequestException('Stakeholder owner must be a regular team member.');

        const owner = await teamMemberRepo.findOne({ where: { id: dto.ownerId }, relations: ['projects'] });
        if (!owner) throw new NotFoundException('Owner not found');
        const isInProject = owner.projects?.some(p => p.id === stakeholder.project.id);
        if (!isInProject) throw new BadRequestException('Owner not part of this project');
        stakeholder.owner = owner;
      } else {
        stakeholder.owner = null;
      }
    }

    if (dto.stakeholderName || dto.role) {
      const newName = dto.stakeholderName || stakeholder.stakeholderName;
      const newRole = dto.role || stakeholder.role;

      if (newName !== stakeholder.stakeholderName || newRole !== stakeholder.role) {
        const existingStakeholder = await stakeholderRepo.findOne({
          where: { project: { id: stakeholder.project.id }, stakeholderName: newName, role: newRole },
        });
        if (existingStakeholder && existingStakeholder.id !== id) {
          throw new BadRequestException('A stakeholder with this name and role already exists in this project');
        }
      }
    }

    if (dto.stakeholderName !== undefined) stakeholder.stakeholderName = dto.stakeholderName;
    if (dto.role !== undefined) stakeholder.role = dto.role;
    if (dto.powerLevel !== undefined) stakeholder.powerLevel = dto.powerLevel;
    if (dto.interestLevel !== undefined) stakeholder.interestLevel = dto.interestLevel;
    if (dto.engagementStrategy !== undefined) stakeholder.engagementStrategy = dto.engagementStrategy;
    if (dto.communicationFrequency !== undefined) stakeholder.communicationFrequency = dto.communicationFrequency;
    if (dto.email !== undefined) stakeholder.email = dto.email;
    if (dto.phone !== undefined) stakeholder.phone = dto.phone;
    if (dto.notes !== undefined) stakeholder.notes = dto.notes;

    if (dto.powerLevel !== undefined || dto.interestLevel !== undefined) {
      stakeholder.quadrant = this.calculateQuadrant(stakeholder.powerLevel, stakeholder.interestLevel);
    }

    if (userId) stakeholder.updatedBy = { id: userId } as User;

    await stakeholderRepo.save(stakeholder);
    return this.findById(id);
  }

  async archive(id: string, userId?: string): Promise<Stakeholder> {
    const stakeholderRepo = await this.tenantService.getRepository(Stakeholder);
    const stakeholder = await this.findById(id);

    if (stakeholder.isArchived) throw new BadRequestException('This stakeholder is already archived');

    stakeholder.isArchived = true;
    stakeholder.archivedDate = new Date();
    if (userId) stakeholder.updatedBy = { id: userId } as User;

    await stakeholderRepo.save(stakeholder);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const stakeholderRepo = await this.tenantService.getRepository(Stakeholder);
    const stakeholder = await stakeholderRepo.findOne({ where: { id } });
    if (!stakeholder) throw new NotFoundException('Stakeholder not found');
    await stakeholderRepo.remove(stakeholder);
  }

  async exportToCSV(stakeholders: Stakeholder[]): Promise<string> {
    const headers = ['ID', 'Stakeholder Name', 'Role', 'Power Level', 'Interest Level', 'Quadrant', 'Engagement Strategy', 'Communication Frequency', 'Email', 'Phone', 'Notes', 'Owner', 'Status', 'Created By', 'Created At', 'Updated By', 'Updated At', 'Archived Date'];

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
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
      stakeholder.id, stakeholder.stakeholderName, stakeholder.role,
      stakeholder.powerLevel, stakeholder.interestLevel, formatQuadrant(stakeholder.quadrant),
      stakeholder.engagementStrategy || '', stakeholder.communicationFrequency || '',
      stakeholder.email || '', stakeholder.phone || '', stakeholder.notes || '',
      stakeholder.owner?.fullName || stakeholder.owner?.displayName || '',
      stakeholder.isArchived ? 'Archived' : 'Active',
      stakeholder.createdBy?.username || '', formatDate(stakeholder.createdAt),
      stakeholder.updatedBy?.username || '', formatDate(stakeholder.updatedAt),
      formatDate(stakeholder.archivedDate),
    ].map(escapeCSV));

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
