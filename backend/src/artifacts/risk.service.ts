import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Risk, RiskImpact, RiskLikelihood, RiskStatus } from '../entities/risk.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';

@Injectable()
export class RiskService {
  constructor(
    @InjectRepository(Risk)
    private readonly riskRepository: Repository<Risk>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  private async touchUpdatedBy(riskId: string, userId?: string): Promise<void> {
    if (!userId) return;
    const risk = await this.riskRepository.findOne({ where: { id: riskId } });
    if (!risk) return;
    risk.updatedBy = { id: userId } as User;
    if (!risk.createdBy) {
      risk.createdBy = { id: userId } as User;
    }
    await this.riskRepository.save(risk);
  }

  async create(dto: CreateRiskDto, userId: string): Promise<Risk> {
    const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    let owner: TeamMember = null;
    if (dto.ownerId) {
      owner = await this.teamMemberRepository.findOne({ where: { id: dto.ownerId }, relations: ['projects'] });
      if (!owner) throw new NotFoundException('Owner not found');
      const isInProject = owner.projects?.some(p => p.id === dto.projectId);
      if (!isInProject) throw new BadRequestException('Owner not part of this project');
    }

    const risk = this.riskRepository.create({
      project: { id: dto.projectId } as Project,
      title: dto.title,
      description: dto.description,
      impact: dto.impact || RiskImpact.MEDIUM,
      likelihood: dto.likelihood || RiskLikelihood.MEDIUM,
      status: dto.status || RiskStatus.OPEN,
      owner,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      category: dto.category,
      mitigationPlan: dto.mitigationPlan,
      contingencyPlan: dto.contingencyPlan,
      tags: dto.tags || [],
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.riskRepository.save(risk);
    return this.findById(saved.id);
  }

  async findById(id: string): Promise<Risk> {
    const risk = await this.riskRepository.findOne({
      where: { id },
      relations: ['project', 'owner', 'createdBy', 'updatedBy'],
    });
    if (!risk) throw new NotFoundException('Risk not found');
    return risk;
  }

  async findByProject(projectId: string, filters?: { status?: RiskStatus; impact?: RiskImpact; likelihood?: RiskLikelihood; ownerId?: string; search?: string }): Promise<Risk[]> {
    const qb = this.riskRepository
      .createQueryBuilder('risk')
      .leftJoinAndSelect('risk.owner', 'owner')
      .where('risk.project_id = :projectId', { projectId })
      .orderBy('risk.createdAt', 'DESC');

    if (filters?.status) qb.andWhere('risk.status = :status', { status: filters.status });
    if (filters?.impact) qb.andWhere('risk.impact = :impact', { impact: filters.impact });
    if (filters?.likelihood) qb.andWhere('risk.likelihood = :likelihood', { likelihood: filters.likelihood });
    if (filters?.ownerId) qb.andWhere('risk.owner_id = :ownerId', { ownerId: filters.ownerId });
    if (filters?.search) {
      qb.andWhere('(risk.title ILIKE :q OR risk.description ILIKE :q)', { q: `%${filters.search}%` });
    }

    return qb.getMany();
  }

  async update(id: string, dto: UpdateRiskDto, userId?: string): Promise<Risk> {
    const risk = await this.findById(id);

    if (dto.ownerId) {
      const owner = await this.teamMemberRepository.findOne({ where: { id: dto.ownerId }, relations: ['projects'] });
      if (!owner) throw new NotFoundException('Owner not found');
      const isInProject = owner.projects?.some(p => p.id === risk.project.id);
      if (!isInProject) throw new BadRequestException('Owner not part of this project');
      risk.owner = owner;
    } else if (dto.ownerId === null) {
      risk.owner = null;
    }

    if (dto.title !== undefined) risk.title = dto.title;
    if (dto.description !== undefined) risk.description = dto.description;
    if (dto.impact !== undefined) risk.impact = dto.impact;
    if (dto.likelihood !== undefined) risk.likelihood = dto.likelihood;
    if (dto.status !== undefined) risk.status = dto.status;
    if (dto.dueDate !== undefined) risk.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.category !== undefined) risk.category = dto.category;
    if (dto.mitigationPlan !== undefined) risk.mitigationPlan = dto.mitigationPlan;
    if (dto.contingencyPlan !== undefined) risk.contingencyPlan = dto.contingencyPlan;
    if (dto.tags !== undefined) risk.tags = dto.tags;

    await this.riskRepository.save(risk);
    await this.touchUpdatedBy(id, userId);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const risk = await this.riskRepository.findOne({ where: { id } });
    if (!risk) throw new NotFoundException('Risk not found');
    await this.riskRepository.remove(risk);
  }
}
