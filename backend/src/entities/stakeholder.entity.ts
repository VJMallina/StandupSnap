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

export enum PowerLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum InterestLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum CommunicationFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  AD_HOC = 'AD_HOC',
}

export enum StakeholderQuadrant {
  MANAGE_CLOSELY = 'MANAGE_CLOSELY',       // High Power + High Interest
  KEEP_SATISFIED = 'KEEP_SATISFIED',       // High Power + Low Interest
  KEEP_INFORMED = 'KEEP_INFORMED',         // Low Power + High Interest
  MONITOR = 'MONITOR',                     // Low Power + Low Interest
}

@Entity('stakeholders')
export class Stakeholder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // Mandatory Fields
  @Column({ type: 'varchar', length: 255 })
  stakeholderName: string;

  @Column({ type: 'varchar', length: 255 })
  role: string;

  @Column({ type: 'enum', enum: PowerLevel })
  powerLevel: PowerLevel;

  @Column({ type: 'enum', enum: InterestLevel })
  interestLevel: InterestLevel;

  // Optional Fields
  @Column({ type: 'text', nullable: true })
  engagementStrategy: string;

  @Column({ type: 'enum', enum: CommunicationFrequency, nullable: true })
  communicationFrequency: CommunicationFrequency;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // System Fields
  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  archivedDate: Date;

  // Auto-calculated field
  @Column({ type: 'enum', enum: StakeholderQuadrant })
  quadrant: StakeholderQuadrant;

  // Owner (optional - team member responsible for managing this stakeholder relationship)
  @ManyToOne(() => TeamMember, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: TeamMember;

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
