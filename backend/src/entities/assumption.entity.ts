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

export enum AssumptionStatus {
  OPEN = 'OPEN',
  VALIDATED = 'VALIDATED',
  INVALIDATED = 'INVALIDATED',
}

@Entity('assumptions')
export class Assumption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => TeamMember, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: TeamMember;

  @Column({ type: 'enum', enum: AssumptionStatus, default: AssumptionStatus.OPEN })
  status: AssumptionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

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
