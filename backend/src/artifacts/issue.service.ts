import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issue, IssueStatus, IssueSeverity } from '../entities/issue.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class IssueService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  async create(dto: CreateIssueDto, userId: string): Promise<Issue> {
    // Validate project exists
    const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate owner
    if (dto.ownerId.startsWith('user-')) {
      throw new BadRequestException(
        'Issue owner must be a regular team member. Please add team members to the project and select one as the owner.'
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

    // Create issue entity
    const issue = this.issueRepository.create({
      project: { id: dto.projectId } as Project,
      title: dto.title,
      description: dto.description,
      status: dto.status || IssueStatus.OPEN,
      owner,
      severity: dto.severity,
      impactSummary: dto.impactSummary,
      resolutionPlan: dto.resolutionPlan,
      targetResolutionDate: dto.targetResolutionDate ? new Date(dto.targetResolutionDate) : null,
      isArchived: false,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.issueRepository.save(issue);
    return this.findById(saved.id);
  }

  async findById(id: string): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id },
      relations: ['project', 'owner', 'createdBy', 'updatedBy'],
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    return issue;
  }

  async findByProject(
    projectId: string,
    filters?: {
      status?: IssueStatus;
      severity?: IssueSeverity;
      ownerId?: string;
      includeArchived?: boolean;
      search?: string;
    },
  ): Promise<Issue[]> {
    const qb = this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.owner', 'owner')
      .leftJoinAndSelect('issue.createdBy', 'createdBy')
      .leftJoinAndSelect('issue.updatedBy', 'updatedBy')
      .where('issue.project_id = :projectId', { projectId });

    // By default, exclude archived issues
    if (!filters?.includeArchived) {
      qb.andWhere('issue.isArchived = :isArchived', { isArchived: false });
    }

    // Apply filters
    if (filters?.status) {
      qb.andWhere('issue.status = :status', { status: filters.status });
    }
    if (filters?.severity) {
      qb.andWhere('issue.severity = :severity', { severity: filters.severity });
    }
    if (filters?.ownerId) {
      qb.andWhere('issue.owner_id = :ownerId', { ownerId: filters.ownerId });
    }
    if (filters?.search) {
      qb.andWhere(
        '(issue.title ILIKE :q OR issue.description ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }

    // Order by severity (most severe first), then by creation date
    qb.orderBy('issue.severity', 'DESC').addOrderBy('issue.createdAt', 'DESC');

    return qb.getMany();
  }

  async update(id: string, dto: UpdateIssueDto, userId?: string): Promise<Issue> {
    const issue = await this.findById(id);

    if (issue.isArchived) {
      throw new BadRequestException('Archived issues cannot be modified');
    }

    // Validate owner if provided
    if (dto.ownerId) {
      if (dto.ownerId.startsWith('user-')) {
        throw new BadRequestException(
          'Issue owner must be a regular team member.'
        );
      }

      const owner = await this.teamMemberRepository.findOne({
        where: { id: dto.ownerId },
        relations: ['projects'],
      });
      if (!owner) {
        throw new NotFoundException('Owner not found');
      }
      const isInProject = owner.projects?.some(p => p.id === issue.project.id);
      if (!isInProject) {
        throw new BadRequestException('Owner not part of this project');
      }
      issue.owner = owner;
    }

    // Update fields
    if (dto.title !== undefined) issue.title = dto.title;
    if (dto.description !== undefined) issue.description = dto.description;
    if (dto.severity !== undefined) issue.severity = dto.severity;
    if (dto.impactSummary !== undefined) issue.impactSummary = dto.impactSummary;
    if (dto.resolutionPlan !== undefined) issue.resolutionPlan = dto.resolutionPlan;
    if (dto.targetResolutionDate !== undefined) {
      issue.targetResolutionDate = dto.targetResolutionDate ? new Date(dto.targetResolutionDate) : null;
    }

    // Handle status change
    if (dto.status !== undefined) {
      const oldStatus = issue.status;
      issue.status = dto.status;

      // Set closure date when status becomes CLOSED
      if (dto.status === IssueStatus.CLOSED && oldStatus !== IssueStatus.CLOSED) {
        issue.closureDate = new Date();
      }
    }

    // Update audit fields
    if (userId) {
      issue.updatedBy = { id: userId } as User;
    }

    await this.issueRepository.save(issue);
    return this.findById(id);
  }

  async archive(id: string, userId?: string): Promise<Issue> {
    const issue = await this.findById(id);

    if (issue.isArchived) {
      throw new BadRequestException('This issue is already archived');
    }

    issue.isArchived = true;
    issue.archivedDate = new Date();
    if (userId) {
      issue.updatedBy = { id: userId } as User;
    }

    await this.issueRepository.save(issue);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const issue = await this.issueRepository.findOne({ where: { id } });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    await this.issueRepository.remove(issue);
  }

  async exportToCSV(issues: Issue[]): Promise<string> {
    const headers = [
      'ID',
      'Title',
      'Description',
      'Status',
      'Severity',
      'Owner',
      'Impact Summary',
      'Resolution Plan',
      'Target Resolution Date',
      'Closure Date',
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

    const rows = issues.map(issue => [
      issue.id,
      issue.title,
      issue.description || '',
      issue.status,
      issue.severity,
      issue.owner?.fullName || issue.owner?.displayName || '',
      issue.impactSummary || '',
      issue.resolutionPlan || '',
      formatDate(issue.targetResolutionDate),
      formatDate(issue.closureDate),
      issue.createdBy?.username || '',
      formatDate(issue.createdAt),
      issue.updatedBy?.username || '',
      formatDate(issue.updatedAt),
      issue.isArchived ? 'Yes' : 'No',
      formatDate(issue.archivedDate)
    ].map(escapeCSV));

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }
}
