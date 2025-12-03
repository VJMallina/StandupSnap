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

export enum IssueStatus {
  OPEN = 'OPEN',
  MITIGATED = 'MITIGATED',
  CLOSED = 'CLOSED',
}

export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('issues')
export class Issue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: IssueStatus, default: IssueStatus.OPEN })
  status: IssueStatus;

  @ManyToOne(() => TeamMember, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: TeamMember;

  @Column({ type: 'enum', enum: IssueSeverity })
  severity: IssueSeverity;

  @Column({ type: 'text', nullable: true })
  impactSummary: string;

  @Column({ type: 'text', nullable: true })
  resolutionPlan: string;

  @Column({ type: 'date', nullable: true })
  targetResolutionDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  closureDate: Date;

  // Archive flag
  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  archivedDate: Date;

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
