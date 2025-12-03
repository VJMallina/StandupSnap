import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Change, ChangeStatus } from '../entities/change.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateChangeDto } from './dto/create-change.dto';
import { UpdateChangeDto } from './dto/update-change.dto';

@Injectable()
export class ChangeService {
  constructor(
    @InjectRepository(Change)
    private changeRepo: Repository<Change>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(TeamMember)
    private teamMemberRepo: Repository<TeamMember>,
  ) {}

  async create(dto: CreateChangeDto, userId: string): Promise<Change> {
    const project = await this.projectRepo.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    let requestor: TeamMember | null = null;
    if (dto.requestorId) {
      requestor = await this.teamMemberRepo.findOne({ where: { id: dto.requestorId } });
      if (!requestor) {
        throw new NotFoundException(`Requestor with ID ${dto.requestorId} not found`);
      }
      if (requestor.id.startsWith('user-')) {
        throw new BadRequestException('Requestor must be a team member, not a user role');
      }
    }

    let approver: TeamMember | null = null;
    if (dto.approverId) {
      approver = await this.teamMemberRepo.findOne({ where: { id: dto.approverId } });
      if (!approver) {
        throw new NotFoundException(`Approver with ID ${dto.approverId} not found`);
      }
      if (approver.id.startsWith('user-')) {
        throw new BadRequestException('Approver must be a team member, not a user role');
      }
    }

    const change = this.changeRepo.create({
      project,
      title: dto.title,
      description: dto.description,
      changeType: dto.changeType,
      priority: dto.priority,
      status: dto.status || ChangeStatus.DRAFT,
      impactAssessment: dto.impactAssessment || null,
      rollbackPlan: dto.rollbackPlan || null,
      testingRequirements: dto.testingRequirements || null,
      affectedSystems: dto.affectedSystems || null,
      implementationDate: dto.implementationDate ? new Date(dto.implementationDate) : null,
      implementationWindow: dto.implementationWindow || null,
      requestor,
      approver,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    return this.changeRepo.save(change);
  }

  async update(id: string, dto: UpdateChangeDto, userId: string): Promise<Change> {
    const change = await this.changeRepo.findOne({
      where: { id, isArchived: false },
      relations: ['project', 'requestor', 'approver', 'createdBy', 'updatedBy'],
    });

    if (!change) {
      throw new NotFoundException(`Change with ID ${id} not found`);
    }

    if (dto.requestorId !== undefined) {
      if (dto.requestorId) {
        const requestor = await this.teamMemberRepo.findOne({ where: { id: dto.requestorId } });
        if (!requestor) {
          throw new NotFoundException(`Requestor with ID ${dto.requestorId} not found`);
        }
        if (requestor.id.startsWith('user-')) {
          throw new BadRequestException('Requestor must be a team member, not a user role');
        }
        change.requestor = requestor;
      } else {
        change.requestor = null;
      }
    }

    if (dto.approverId !== undefined) {
      if (dto.approverId) {
        const approver = await this.teamMemberRepo.findOne({ where: { id: dto.approverId } });
        if (!approver) {
          throw new NotFoundException(`Approver with ID ${dto.approverId} not found`);
        }
        if (approver.id.startsWith('user-')) {
          throw new BadRequestException('Approver must be a team member, not a user role');
        }
        change.approver = approver;
      } else {
        change.approver = null;
      }
    }

    if (dto.title !== undefined) change.title = dto.title;
    if (dto.description !== undefined) change.description = dto.description;
    if (dto.changeType !== undefined) change.changeType = dto.changeType;
    if (dto.priority !== undefined) change.priority = dto.priority;
    if (dto.impactAssessment !== undefined) change.impactAssessment = dto.impactAssessment || null;
    if (dto.rollbackPlan !== undefined) change.rollbackPlan = dto.rollbackPlan || null;
    if (dto.testingRequirements !== undefined) change.testingRequirements = dto.testingRequirements || null;
    if (dto.affectedSystems !== undefined) change.affectedSystems = dto.affectedSystems || null;
    if (dto.implementationDate !== undefined) {
      change.implementationDate = dto.implementationDate ? new Date(dto.implementationDate) : null;
    }
    if (dto.implementationWindow !== undefined) change.implementationWindow = dto.implementationWindow || null;
    if (dto.rejectionReason !== undefined) change.rejectionReason = dto.rejectionReason || null;

    // Auto-set dates based on status changes
    const oldStatus = change.status;
    if (dto.status !== undefined && dto.status !== oldStatus) {
      change.status = dto.status;

      if (dto.status === ChangeStatus.APPROVED && oldStatus !== ChangeStatus.APPROVED) {
        change.approvedDate = new Date();
      }

      if (dto.status === ChangeStatus.IMPLEMENTED && oldStatus !== ChangeStatus.IMPLEMENTED) {
        change.implementedDate = new Date();
      }
    }

    change.updatedBy = { id: userId } as User;
    return this.changeRepo.save(change);
  }

  async findOne(id: string): Promise<Change> {
    const change = await this.changeRepo.findOne({
      where: { id, isArchived: false },
      relations: ['project', 'requestor', 'approver', 'createdBy', 'updatedBy'],
    });

    if (!change) {
      throw new NotFoundException(`Change with ID ${id} not found`);
    }

    return change;
  }

  async findByProject(projectId: string, includeArchived = false): Promise<Change[]> {
    const query = this.changeRepo
      .createQueryBuilder('change')
      .leftJoinAndSelect('change.project', 'project')
      .leftJoinAndSelect('change.requestor', 'requestor')
      .leftJoinAndSelect('change.approver', 'approver')
      .leftJoinAndSelect('change.createdBy', 'createdBy')
      .leftJoinAndSelect('change.updatedBy', 'updatedBy')
      .where('change.projectId = :projectId', { projectId });

    if (!includeArchived) {
      query.andWhere('change.isArchived = :isArchived', { isArchived: false });
    }

    query.orderBy('change.createdAt', 'DESC');

    return query.getMany();
  }

  async archive(id: string, userId: string): Promise<Change> {
    const change = await this.findOne(id);

    if (change.status !== ChangeStatus.CLOSED && change.status !== ChangeStatus.IMPLEMENTED) {
      throw new BadRequestException('Only CLOSED or IMPLEMENTED changes can be archived');
    }

    change.isArchived = true;
    change.archivedDate = new Date();
    change.updatedBy = { id: userId } as User;

    return this.changeRepo.save(change);
  }

  async exportCsv(projectId: string): Promise<string> {
    const changes = await this.findByProject(projectId, false);

    const headers = [
      'ID',
      'Title',
      'Type',
      'Priority',
      'Status',
      'Requestor',
      'Approver',
      'Implementation Date',
      'Created At',
      'Updated At',
    ];

    const rows = changes.map((change) => [
      change.id,
      `"${change.title.replace(/"/g, '""')}"`,
      change.changeType,
      change.priority,
      change.status,
      change.requestor ? change.requestor.fullName || change.requestor.displayName : 'N/A',
      change.approver ? change.approver.fullName || change.approver.displayName : 'N/A',
      change.implementationDate ? new Date(change.implementationDate).toISOString().split('T')[0] : 'N/A',
      new Date(change.createdAt).toISOString(),
      new Date(change.updatedAt).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
