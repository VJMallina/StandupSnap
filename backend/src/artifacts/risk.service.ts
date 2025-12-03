import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Risk,
  ImpactLevel,
  ProbabilityLevel,
  RiskStatus,
  RiskSeverity,
  RiskType,
  RiskStrategy
} from '../entities/risk.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { RiskHistory, RiskChangeType } from '../entities/risk-history.entity';
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
    @InjectRepository(RiskHistory)
    private readonly riskHistoryRepository: Repository<RiskHistory>,
  ) {}

  /**
   * Calculate probability score from enum value
   * LOW = 1, MEDIUM = 2, HIGH = 3, VERY_HIGH = 4
   */
  private calculateProbabilityScore(probability: ProbabilityLevel): number {
    const scoreMap = {
      [ProbabilityLevel.LOW]: 1,
      [ProbabilityLevel.MEDIUM]: 2,
      [ProbabilityLevel.HIGH]: 3,
      [ProbabilityLevel.VERY_HIGH]: 4,
    };
    return scoreMap[probability];
  }

  /**
   * Calculate impact score from impact levels
   * Impact Score = MAX(costImpact, timeImpact, scheduleImpact)
   * LOW = 1, MEDIUM = 2, HIGH = 3, VERY_HIGH = 4
   */
  private calculateImpactScore(
    costImpact?: ImpactLevel,
    timeImpact?: ImpactLevel,
    scheduleImpact?: ImpactLevel,
  ): number {
    const scoreMap = {
      [ImpactLevel.LOW]: 1,
      [ImpactLevel.MEDIUM]: 2,
      [ImpactLevel.HIGH]: 3,
      [ImpactLevel.VERY_HIGH]: 4,
    };

    const scores: number[] = [];
    if (costImpact) scores.push(scoreMap[costImpact]);
    if (timeImpact) scores.push(scoreMap[timeImpact]);
    if (scheduleImpact) scores.push(scoreMap[scheduleImpact]);

    return scores.length > 0 ? Math.max(...scores) : 1; // Default to 1 if no impacts provided
  }

  /**
   * Calculate final risk score
   * Risk Score = Probability Score × Impact Score (1-16)
   */
  private calculateRiskScore(probabilityScore: number, impactScore: number): number {
    return probabilityScore * impactScore;
  }

  /**
   * Determine severity based on risk score
   * 1-3 = LOW, 4-6 = MEDIUM, 7-9 = HIGH, 10-16 = VERY_HIGH
   */
  private determineSeverity(riskScore: number): RiskSeverity {
    if (riskScore <= 3) return RiskSeverity.LOW;
    if (riskScore <= 6) return RiskSeverity.MEDIUM;
    if (riskScore <= 9) return RiskSeverity.HIGH;
    return RiskSeverity.VERY_HIGH;
  }

  /**
   * Calculate all scores and severity for a risk
   */
  private calculateRiskMetrics(
    probability: ProbabilityLevel,
    costImpact?: ImpactLevel,
    timeImpact?: ImpactLevel,
    scheduleImpact?: ImpactLevel,
  ): {
    probabilityScore: number;
    impactScore: number;
    riskScore: number;
    severity: RiskSeverity;
  } {
    const probabilityScore = this.calculateProbabilityScore(probability);
    const impactScore = this.calculateImpactScore(costImpact, timeImpact, scheduleImpact);
    const riskScore = this.calculateRiskScore(probabilityScore, impactScore);
    const severity = this.determineSeverity(riskScore);

    return { probabilityScore, impactScore, riskScore, severity };
  }

  /**
   * Log risk history
   */
  private async logHistory(
    riskId: string,
    changeType: RiskChangeType,
    description: string,
    userId?: string,
    changedFields?: Record<string, { old: any; new: any }>,
  ): Promise<void> {
    const history = this.riskHistoryRepository.create({
      risk: { id: riskId } as Risk,
      changeType,
      description,
      changedFields,
      changedBy: userId ? ({ id: userId } as User) : null,
    });

    await this.riskHistoryRepository.save(history);
  }

  async create(dto: CreateRiskDto, userId: string): Promise<Risk> {
    // Validate project exists
    const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Handle both team member IDs and user-prefixed IDs (for special roles like PO, PMO, Scrum Master)
    let ownerId = dto.ownerId;
    if (ownerId.startsWith('user-')) {
      // This is a user-based role, not a team member - not supported for risk ownership
      throw new BadRequestException(
        'Risk owner must be a regular team member. Please add team members to the project and select one as the risk owner.'
      );
    }

    // Validate owner exists and is part of project
    const owner = await this.teamMemberRepository.findOne({
      where: { id: ownerId },
      relations: ['projects'],
    });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    const isInProject = owner.projects?.some(p => p.id === dto.projectId);
    if (!isInProject) {
      throw new BadRequestException('Owner not part of this project');
    }

    // Validate date range if targetClosureDate provided
    if (dto.targetClosureDate && dto.dateIdentified) {
      const identifiedDate = new Date(dto.dateIdentified);
      const closureDate = new Date(dto.targetClosureDate);
      if (closureDate < identifiedDate) {
        throw new BadRequestException('Target closure date must be after date identified');
      }
    }

    // Calculate risk metrics
    const metrics = this.calculateRiskMetrics(
      dto.probability,
      dto.costImpact,
      dto.timeImpact,
      dto.scheduleImpact,
    );

    // Create risk entity
    const risk = this.riskRepository.create({
      project: { id: dto.projectId } as Project,

      // A. Identification
      title: dto.title,
      riskType: dto.riskType,
      category: dto.category,
      dateIdentified: dto.dateIdentified ? new Date(dto.dateIdentified) : new Date(),
      riskStatement: dto.riskStatement,
      currentStatusAssumptions: dto.currentStatusAssumptions,

      // B. Assessment
      probability: dto.probability,
      costImpact: dto.costImpact,
      timeImpact: dto.timeImpact,
      scheduleImpact: dto.scheduleImpact,
      probabilityScore: metrics.probabilityScore,
      impactScore: metrics.impactScore,
      riskScore: metrics.riskScore,
      severity: metrics.severity,
      rationale: dto.rationale,

      // C. Response & Ownership
      strategy: dto.strategy,
      mitigationPlan: dto.mitigationPlan,
      contingencyPlan: dto.contingencyPlan,
      owner,
      targetClosureDate: dto.targetClosureDate ? new Date(dto.targetClosureDate) : null,

      // D. Status Tracking
      status: dto.status || RiskStatus.OPEN,
      progressNotes: dto.progressNotes,

      // Archive flag
      isArchived: false,

      // Audit fields
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.riskRepository.save(risk);

    // Log history
    await this.logHistory(
      saved.id,
      RiskChangeType.CREATED,
      `Risk created: ${dto.title}`,
      userId,
    );

    return this.findById(saved.id);
  }

  async findById(id: string): Promise<Risk> {
    const risk = await this.riskRepository.findOne({
      where: { id },
      relations: ['project', 'owner', 'createdBy', 'updatedBy'],
    });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }
    return risk;
  }

  async findByProject(
    projectId: string,
    filters?: {
      status?: RiskStatus;
      category?: string;
      severity?: RiskSeverity;
      ownerId?: string;
      strategy?: RiskStrategy;
      riskType?: RiskType;
      includeArchived?: boolean;
      search?: string;
    },
  ): Promise<Risk[]> {
    const qb = this.riskRepository
      .createQueryBuilder('risk')
      .leftJoinAndSelect('risk.owner', 'owner')
      .leftJoinAndSelect('risk.createdBy', 'createdBy')
      .leftJoinAndSelect('risk.updatedBy', 'updatedBy')
      .where('risk.project_id = :projectId', { projectId });

    // By default, exclude archived risks unless explicitly requested
    if (!filters?.includeArchived) {
      qb.andWhere('risk.isArchived = :isArchived', { isArchived: false });
    }

    // Apply filters
    if (filters?.status) {
      qb.andWhere('risk.status = :status', { status: filters.status });
    }
    if (filters?.category) {
      qb.andWhere('risk.category = :category', { category: filters.category });
    }
    if (filters?.severity) {
      qb.andWhere('risk.severity = :severity', { severity: filters.severity });
    }
    if (filters?.ownerId) {
      qb.andWhere('risk.owner_id = :ownerId', { ownerId: filters.ownerId });
    }
    if (filters?.strategy) {
      qb.andWhere('risk.strategy = :strategy', { strategy: filters.strategy });
    }
    if (filters?.riskType) {
      qb.andWhere('risk.riskType = :riskType', { riskType: filters.riskType });
    }
    if (filters?.search) {
      qb.andWhere(
        '(risk.title ILIKE :q OR risk.riskStatement ILIKE :q OR risk.category ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }

    // Order by severity (most severe first), then by date identified
    qb.orderBy('risk.riskScore', 'DESC').addOrderBy('risk.dateIdentified', 'DESC');

    return qb.getMany();
  }

  async update(id: string, dto: UpdateRiskDto, userId?: string): Promise<Risk> {
    const risk = await this.findById(id);
    const changedFields: Record<string, { old: any; new: any }> = {};
    let description = 'Risk updated';

    // Validate owner if provided
    if (dto.ownerId) {
      // Check if it's a user-based role (not allowed)
      if (dto.ownerId.startsWith('user-')) {
        throw new BadRequestException(
          'Risk owner must be a regular team member. Please add team members to the project and select one as the risk owner.'
        );
      }

      const owner = await this.teamMemberRepository.findOne({
        where: { id: dto.ownerId },
        relations: ['projects'],
      });
      if (!owner) {
        throw new NotFoundException('Owner not found');
      }
      const isInProject = owner.projects?.some(p => p.id === risk.project.id);
      if (!isInProject) {
        throw new BadRequestException('Owner not part of this project');
      }

      // Track owner change
      if (risk.owner?.id !== owner.id) {
        changedFields.owner = {
          old: risk.owner?.fullName || risk.owner?.displayName,
          new: owner.fullName || owner.displayName,
        };
        description = `Owner changed to ${changedFields.owner.new}`;
      }

      risk.owner = owner;
    }

    // Update identification fields
    if (dto.title !== undefined) risk.title = dto.title;
    if (dto.riskType !== undefined) risk.riskType = dto.riskType;
    if (dto.category !== undefined) risk.category = dto.category;
    if (dto.dateIdentified !== undefined) {
      risk.dateIdentified = new Date(dto.dateIdentified);
    }
    if (dto.riskStatement !== undefined) risk.riskStatement = dto.riskStatement;
    if (dto.currentStatusAssumptions !== undefined) {
      risk.currentStatusAssumptions = dto.currentStatusAssumptions;
    }

    // Update assessment fields
    if (dto.probability !== undefined) risk.probability = dto.probability;
    if (dto.costImpact !== undefined) risk.costImpact = dto.costImpact;
    if (dto.timeImpact !== undefined) risk.timeImpact = dto.timeImpact;
    if (dto.scheduleImpact !== undefined) risk.scheduleImpact = dto.scheduleImpact;
    if (dto.rationale !== undefined) risk.rationale = dto.rationale;

    // Recalculate metrics if any assessment field changed
    if (
      dto.probability !== undefined ||
      dto.costImpact !== undefined ||
      dto.timeImpact !== undefined ||
      dto.scheduleImpact !== undefined
    ) {
      const metrics = this.calculateRiskMetrics(
        risk.probability,
        risk.costImpact,
        risk.timeImpact,
        risk.scheduleImpact,
      );
      risk.probabilityScore = metrics.probabilityScore;
      risk.impactScore = metrics.impactScore;
      risk.riskScore = metrics.riskScore;
      risk.severity = metrics.severity;
    }

    // Update response & ownership fields
    if (dto.strategy !== undefined) risk.strategy = dto.strategy;
    if (dto.mitigationPlan !== undefined) risk.mitigationPlan = dto.mitigationPlan;
    if (dto.contingencyPlan !== undefined) risk.contingencyPlan = dto.contingencyPlan;
    if (dto.targetClosureDate !== undefined) {
      risk.targetClosureDate = dto.targetClosureDate ? new Date(dto.targetClosureDate) : null;
    }

    // Validate date range
    if (risk.targetClosureDate && risk.dateIdentified) {
      if (risk.targetClosureDate < risk.dateIdentified) {
        throw new BadRequestException('Target closure date must be after date identified');
      }
    }

    // Update status tracking fields
    if (dto.status !== undefined) {
      if (risk.status !== dto.status) {
        changedFields.status = { old: risk.status, new: dto.status };
        description = `Status changed from ${risk.status} to ${dto.status}`;
      }
      risk.status = dto.status;
    }
    if (dto.progressNotes !== undefined) risk.progressNotes = dto.progressNotes;

    // Update audit fields
    if (userId) {
      risk.updatedBy = { id: userId } as User;
    }

    await this.riskRepository.save(risk);

    // Log history if there were changes
    if (Object.keys(changedFields).length > 0) {
      const changeType = changedFields.status
        ? RiskChangeType.STATUS_CHANGED
        : changedFields.owner
        ? RiskChangeType.OWNER_CHANGED
        : RiskChangeType.UPDATED;

      await this.logHistory(id, changeType, description, userId, changedFields);
    }

    return this.findById(id);
  }

  async archive(id: string, userId?: string): Promise<Risk> {
    const risk = await this.findById(id);

    // Validate status - only MITIGATED or CLOSED risks can be archived
    if (risk.status !== RiskStatus.MITIGATED && risk.status !== RiskStatus.CLOSED) {
      throw new BadRequestException('Only Mitigated or Closed risks can be archived');
    }

    // Check if already archived
    if (risk.isArchived) {
      throw new BadRequestException('This risk is already archived');
    }

    risk.isArchived = true;
    if (userId) {
      risk.updatedBy = { id: userId } as User;
    }

    await this.riskRepository.save(risk);

    // Log history
    await this.logHistory(
      id,
      RiskChangeType.ARCHIVED,
      `Risk archived`,
      userId,
    );

    return this.findById(id);
  }

  async getHistory(riskId: string): Promise<RiskHistory[]> {
    return this.riskHistoryRepository.find({
      where: { risk: { id: riskId } },
      relations: ['changedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string): Promise<void> {
    const risk = await this.riskRepository.findOne({ where: { id } });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }
    await this.riskRepository.remove(risk);
  }

  /**
   * Export risks to CSV format
   */
  async exportToCSV(risks: Risk[]): Promise<string> {
    // Define CSV headers
    const headers = [
      'ID',
      'Title',
      'Type',
      'Category',
      'Status',
      'Severity',
      'Risk Score',
      'Probability',
      'Probability Score',
      'Impact Score',
      'Cost Impact',
      'Time Impact',
      'Schedule Impact',
      'Strategy',
      'Owner',
      'Date Identified',
      'Target Closure Date',
      'Risk Statement',
      'Mitigation Plan',
      'Contingency Plan',
      'Current Status/Assumptions',
      'Rationale',
      'Progress Notes',
      'Created At',
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
    const rows = risks.map(risk => [
      risk.id,
      risk.title,
      risk.riskType,
      risk.category,
      risk.status,
      risk.severity,
      risk.riskScore,
      risk.probability,
      risk.probabilityScore,
      risk.impactScore,
      risk.costImpact || '',
      risk.timeImpact || '',
      risk.scheduleImpact || '',
      risk.strategy,
      risk.owner?.fullName || risk.owner?.displayName || '',
      formatDate(risk.dateIdentified),
      formatDate(risk.targetClosureDate),
      risk.riskStatement,
      risk.mitigationPlan || '',
      risk.contingencyPlan || '',
      risk.currentStatusAssumptions || '',
      risk.rationale || '',
      risk.progressNotes || '',
      formatDate(risk.createdAt),
      formatDate(risk.updatedAt),
      risk.isArchived ? 'Yes' : 'No'
    ].map(escapeCSV));

    // Combine headers and rows
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }
}
