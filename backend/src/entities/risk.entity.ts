import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { TeamMember } from './team-member.entity';
import { User } from './user.entity';

export enum RiskType {
  THREAT = 'THREAT',
  OPPORTUNITY = 'OPPORTUNITY',
}

export enum ImpactLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum ProbabilityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum RiskSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum RiskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  MITIGATED = 'MITIGATED',
  CLOSED = 'CLOSED',
}

export enum RiskStrategy {
  AVOID = 'AVOID',
  MITIGATE = 'MITIGATE',
  ACCEPT = 'ACCEPT',
  TRANSFER = 'TRANSFER',
  EXPLOIT = 'EXPLOIT',
}

@Entity('risks')
export class Risk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // A. Identification Section
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'enum', enum: RiskType })
  riskType: RiskType;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'date' })
  dateIdentified: Date;

  @Column({ type: 'text' })
  riskStatement: string;

  @Column({ type: 'text', nullable: true })
  currentStatusAssumptions: string;

  // B. Assessment Section
  @Column({ type: 'enum', enum: ProbabilityLevel })
  probability: ProbabilityLevel;

  @Column({ type: 'enum', enum: ImpactLevel, nullable: true })
  costImpact: ImpactLevel;

  @Column({ type: 'enum', enum: ImpactLevel, nullable: true })
  timeImpact: ImpactLevel;

  @Column({ type: 'enum', enum: ImpactLevel, nullable: true })
  scheduleImpact: ImpactLevel;

  // Auto-calculated fields
  @Column({ type: 'int' })
  probabilityScore: number; // 1-4

  @Column({ type: 'int' })
  impactScore: number; // 1-4 (max of all impacts)

  @Column({ type: 'int' })
  riskScore: number; // probabilityScore × impactScore (1-16)

  @Column({ type: 'enum', enum: RiskSeverity })
  severity: RiskSeverity;

  @Column({ type: 'text', nullable: true })
  rationale: string;

  // C. Response & Ownership Section
  @Column({ type: 'enum', enum: RiskStrategy })
  strategy: RiskStrategy;

  @Column({ type: 'text', nullable: true })
  mitigationPlan: string;

  @Column({ type: 'text', nullable: true })
  contingencyPlan: string;

  @ManyToOne(() => TeamMember, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: TeamMember;

  @Column({ type: 'date', nullable: true })
  targetClosureDate: Date;

  // D. Status Tracking Section
  @Column({ type: 'enum', enum: RiskStatus, default: RiskStatus.OPEN })
  status: RiskStatus;

  @Column({ type: 'text', nullable: true })
  progressNotes: string;

  // Archive flag
  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  // Audit fields
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
