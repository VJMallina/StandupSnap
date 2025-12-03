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

export enum DecisionStatus {
  PENDING = 'PENDING',
  FINALIZED = 'FINALIZED',
}

export enum ImpactedArea {
  SCHEDULE = 'SCHEDULE',
  SCOPE = 'SCOPE',
  COST = 'COST',
  RESOURCES = 'RESOURCES',
}

@Entity('decisions')
export class Decision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => TeamMember, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: TeamMember;

  @Column({ type: 'enum', enum: DecisionStatus, default: DecisionStatus.PENDING })
  status: DecisionStatus;

  @Column({ type: 'text', nullable: true })
  decisionTaken: string;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'simple-array', nullable: true })
  impactedAreas: ImpactedArea[];

  @Column({ type: 'text', nullable: true })
  supportingNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  finalizedDate: Date;

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
