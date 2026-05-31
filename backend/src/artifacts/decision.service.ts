import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Decision, DecisionStatus, ImpactedArea } from '../entities/decision.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class DecisionService {
  constructor(private tenantService: TenantService) {}

  async create(dto: CreateDecisionDto, userId: string, orgId?: string): Promise<Decision> {
    const [decisionRepo, projectRepo, teamMemberRepo] = await Promise.all([
      this.tenantService.getRepository(Decision),
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(TeamMember),
    ]);

    const project = await projectRepo.findOne({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Project not found');

    if (dto.ownerId.startsWith('user-')) {
      throw new BadRequestException(
        'Decision owner must be a regular team member. Please add team members to the project and select one as the owner.'
      );
    }

    const owner = await teamMemberRepo.findOne({ where: { id: dto.ownerId }, relations: ['projects'] });
    if (!owner) throw new NotFoundException('Owner not found');
    const isInProject = owner.projects?.some(p => p.id === dto.projectId);
    if (!isInProject) throw new BadRequestException('Owner not part of this project');

    const decision = decisionRepo.create({
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
      ...(orgId ? { organizationId: orgId } : {}),
    });

    const saved = await decisionRepo.save(decision);
    return this.findById(saved.id);
  }

  async findById(id: string): Promise<Decision> {
    const decisionRepo = await this.tenantService.getRepository(Decision);
    const decision = await decisionRepo.findOne({
      where: { id },
      relations: ['project', 'owner', 'createdBy', 'updatedBy'],
    });
    if (!decision) throw new NotFoundException('Decision not found');
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
    const decisionRepo = await this.tenantService.getRepository(Decision);
    const qb = decisionRepo
      .createQueryBuilder('decision')
      .leftJoinAndSelect('decision.owner', 'owner')
      .leftJoinAndSelect('decision.createdBy', 'createdBy')
      .leftJoinAndSelect('decision.updatedBy', 'updatedBy')
      .where('decision.project_id = :projectId', { projectId });

    if (!filters?.includeArchived) qb.andWhere('decision.isArchived = :isArchived', { isArchived: false });
    if (filters?.status) qb.andWhere('decision.status = :status', { status: filters.status });
    if (filters?.ownerId) qb.andWhere('decision.owner_id = :ownerId', { ownerId: filters.ownerId });
    if (filters?.search) {
      qb.andWhere(
        '(decision.title ILIKE :q OR decision.description ILIKE :q OR decision.decisionTaken ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }

    qb.orderBy('decision.status', 'ASC').addOrderBy('decision.createdAt', 'DESC');
    return qb.getMany();
  }

  async update(id: string, dto: UpdateDecisionDto, userId?: string): Promise<Decision> {
    const [decisionRepo, teamMemberRepo] = await Promise.all([
      this.tenantService.getRepository(Decision),
      this.tenantService.getRepository(TeamMember),
    ]);

    const decision = await this.findById(id);
    if (decision.isArchived) throw new BadRequestException('Archived decisions cannot be modified');

    if (decision.status === DecisionStatus.FINALIZED) {
      if (Object.keys(dto).length > 1 || (Object.keys(dto).length === 1 && !dto.supportingNotes)) {
        throw new BadRequestException('Finalized decisions can only have supporting notes updated');
      }
      if (dto.supportingNotes !== undefined) decision.supportingNotes = dto.supportingNotes;
    } else {
      if (dto.ownerId) {
        if (dto.ownerId.startsWith('user-')) {
          throw new BadRequestException('Decision owner must be a regular team member.');
        }

        const owner = await teamMemberRepo.findOne({ where: { id: dto.ownerId }, relations: ['projects'] });
        if (!owner) throw new NotFoundException('Owner not found');
        const isInProject = owner.projects?.some(p => p.id === decision.project.id);
        if (!isInProject) throw new BadRequestException('Owner not part of this project');
        decision.owner = owner;
      }

      if (dto.title !== undefined) decision.title = dto.title;
      if (dto.description !== undefined) decision.description = dto.description;
      if (dto.decisionTaken !== undefined) decision.decisionTaken = dto.decisionTaken;
      if (dto.dueDate !== undefined) decision.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      if (dto.impactedAreas !== undefined) decision.impactedAreas = dto.impactedAreas;
      if (dto.supportingNotes !== undefined) decision.supportingNotes = dto.supportingNotes;

      if (dto.status !== undefined) {
        decision.status = dto.status;
        if (dto.status === DecisionStatus.FINALIZED) decision.finalizedDate = new Date();
      }
    }

    if (userId) decision.updatedBy = { id: userId } as User;

    await decisionRepo.save(decision);
    return this.findById(id);
  }

  async archive(id: string, userId?: string): Promise<Decision> {
    const decisionRepo = await this.tenantService.getRepository(Decision);
    const decision = await this.findById(id);

    if (decision.isArchived) throw new BadRequestException('This decision is already archived');

    decision.isArchived = true;
    decision.archivedDate = new Date();
    if (userId) decision.updatedBy = { id: userId } as User;

    await decisionRepo.save(decision);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const decisionRepo = await this.tenantService.getRepository(Decision);
    const decision = await decisionRepo.findOne({ where: { id } });
    if (!decision) throw new NotFoundException('Decision not found');
    await decisionRepo.remove(decision);
  }

  async exportToCSV(decisions: Decision[]): Promise<string> {
    const headers = ['ID', 'Title', 'Description', 'Owner', 'Status', 'Decision Taken', 'Due Date', 'Impacted Areas', 'Supporting Notes', 'Finalized Date', 'Created By', 'Created At', 'Updated By', 'Updated At', 'Is Archived', 'Archived Date'];

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
      formatDate(decision.archivedDate),
    ].map(escapeCSV));

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
