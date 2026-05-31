import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Assumption, AssumptionStatus } from '../entities/assumption.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateAssumptionDto } from './dto/create-assumption.dto';
import { UpdateAssumptionDto } from './dto/update-assumption.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class AssumptionService {
  constructor(private tenantService: TenantService) {}

  async create(dto: CreateAssumptionDto, userId: string, orgId?: string): Promise<Assumption> {
    const [assumptionRepo, projectRepo, teamMemberRepo] = await Promise.all([
      this.tenantService.getRepository(Assumption),
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(TeamMember),
    ]);

    const project = await projectRepo.findOne({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Project not found');

    let owner: TeamMember | null = null;
    if (dto.ownerId) {
      if (dto.ownerId.startsWith('user-')) {
        throw new BadRequestException(
          'Assumption owner must be a regular team member. Please add team members to the project and select one as the owner.'
        );
      }

      owner = await teamMemberRepo.findOne({ where: { id: dto.ownerId }, relations: ['projects'] });
      if (!owner) throw new NotFoundException('Owner not found');
      const isInProject = owner.projects?.some(p => p.id === dto.projectId);
      if (!isInProject) throw new BadRequestException('Owner not part of this project');
    }

    const assumption = assumptionRepo.create({
      project: { id: dto.projectId } as Project,
      title: dto.title,
      description: dto.description,
      owner,
      status: dto.status || AssumptionStatus.OPEN,
      notes: dto.notes,
      isArchived: false,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
      ...(orgId ? { organizationId: orgId } : {}),
    });

    const saved = await assumptionRepo.save(assumption);
    return this.findById(saved.id);
  }

  async findById(id: string): Promise<Assumption> {
    const assumptionRepo = await this.tenantService.getRepository(Assumption);
    const assumption = await assumptionRepo.findOne({
      where: { id },
      relations: ['project', 'owner', 'createdBy', 'updatedBy'],
    });
    if (!assumption) throw new NotFoundException('Assumption not found');
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
    const assumptionRepo = await this.tenantService.getRepository(Assumption);
    const qb = assumptionRepo
      .createQueryBuilder('assumption')
      .leftJoinAndSelect('assumption.owner', 'owner')
      .leftJoinAndSelect('assumption.createdBy', 'createdBy')
      .leftJoinAndSelect('assumption.updatedBy', 'updatedBy')
      .where('assumption.project_id = :projectId', { projectId });

    if (!filters?.includeArchived) {
      qb.andWhere('assumption.isArchived = :isArchived', { isArchived: false });
    }

    if (filters?.status) qb.andWhere('assumption.status = :status', { status: filters.status });
    if (filters?.ownerId) qb.andWhere('assumption.owner_id = :ownerId', { ownerId: filters.ownerId });
    if (filters?.search) {
      qb.andWhere('(assumption.title ILIKE :q OR assumption.description ILIKE :q)', { q: `%${filters.search}%` });
    }
    if (filters?.startDate) qb.andWhere('assumption.createdAt >= :startDate', { startDate: filters.startDate });
    if (filters?.endDate) qb.andWhere('assumption.createdAt <= :endDate', { endDate: filters.endDate });

    qb.orderBy('assumption.createdAt', 'DESC');
    return qb.getMany();
  }

  async update(id: string, dto: UpdateAssumptionDto, userId?: string): Promise<Assumption> {
    const [assumptionRepo, teamMemberRepo] = await Promise.all([
      this.tenantService.getRepository(Assumption),
      this.tenantService.getRepository(TeamMember),
    ]);

    const assumption = await this.findById(id);

    if (assumption.status !== AssumptionStatus.OPEN && !assumption.isArchived) {
      throw new BadRequestException('Only assumptions with status "Open" can be edited');
    }
    if (assumption.isArchived) throw new BadRequestException('Archived assumptions cannot be modified');

    if (dto.ownerId !== undefined) {
      if (dto.ownerId === null) {
        assumption.owner = null;
      } else {
        if (dto.ownerId.startsWith('user-')) {
          throw new BadRequestException(
            'Assumption owner must be a regular team member. Please add team members to the project and select one as the owner.'
          );
        }

        const owner = await teamMemberRepo.findOne({ where: { id: dto.ownerId }, relations: ['projects'] });
        if (!owner) throw new NotFoundException('Owner not found');
        const isInProject = owner.projects?.some(p => p.id === assumption.project.id);
        if (!isInProject) throw new BadRequestException('Owner not part of this project');
        assumption.owner = owner;
      }
    }

    if (dto.title !== undefined) assumption.title = dto.title;
    if (dto.description !== undefined) assumption.description = dto.description;
    if (dto.status !== undefined) assumption.status = dto.status;

    if (dto.notes !== undefined && dto.notes) {
      assumption.notes = assumption.notes ? `${assumption.notes}\n\n${dto.notes}` : dto.notes;
    }

    if (userId) assumption.updatedBy = { id: userId } as User;

    await assumptionRepo.save(assumption);
    return this.findById(id);
  }

  async archive(id: string, userId?: string): Promise<Assumption> {
    const assumptionRepo = await this.tenantService.getRepository(Assumption);
    const assumption = await this.findById(id);

    if (assumption.isArchived) throw new BadRequestException('This assumption is already archived');

    assumption.isArchived = true;
    if (userId) assumption.updatedBy = { id: userId } as User;

    await assumptionRepo.save(assumption);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const assumptionRepo = await this.tenantService.getRepository(Assumption);
    const assumption = await assumptionRepo.findOne({ where: { id } });
    if (!assumption) throw new NotFoundException('Assumption not found');
    await assumptionRepo.remove(assumption);
  }

  async exportToCSV(assumptions: Assumption[]): Promise<string> {
    const headers = ['ID', 'Title', 'Description', 'Status', 'Owner', 'Notes', 'Created By', 'Created At', 'Updated By', 'Updated At', 'Is Archived'];

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
      assumption.isArchived ? 'Yes' : 'No',
    ].map(escapeCSV));

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
