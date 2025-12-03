import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { TeamMember } from './team-member.entity';
import { User } from './user.entity';

export enum ChangeType {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  EMERGENCY = 'EMERGENCY',
  STANDARD = 'STANDARD',
}

export enum ChangePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ChangeStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  IMPLEMENTED = 'IMPLEMENTED',
  CLOSED = 'CLOSED',
}

@Entity('changes')
export class Change {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: ChangeType,
    default: ChangeType.STANDARD,
  })
  changeType: ChangeType;

  @Column({
    type: 'enum',
    enum: ChangePriority,
    default: ChangePriority.MEDIUM,
  })
  priority: ChangePriority;

  @Column({
    type: 'enum',
    enum: ChangeStatus,
    default: ChangeStatus.DRAFT,
  })
  status: ChangeStatus;

  @Column('text', { nullable: true })
  impactAssessment: string | null;

  @Column('text', { nullable: true })
  rollbackPlan: string | null;

  @Column('text', { nullable: true })
  testingRequirements: string | null;

  @Column('simple-array', { nullable: true })
  affectedSystems: string[] | null;

  @Column({ type: 'date', nullable: true })
  implementationDate: Date | null;

  @Column({ length: 100, nullable: true })
  implementationWindow: string | null;

  @ManyToOne(() => TeamMember, { nullable: true })
  @JoinColumn({ name: 'requestorId' })
  requestor: TeamMember | null;

  @Column({ nullable: true })
  requestorId: string | null;

  @ManyToOne(() => TeamMember, { nullable: true })
  @JoinColumn({ name: 'approverId' })
  approver: TeamMember | null;

  @Column({ nullable: true })
  approverId: string | null;

  @Column('text', { nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  implementedDate: Date | null;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  archivedDate: Date | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User;

  @Column()
  updatedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
