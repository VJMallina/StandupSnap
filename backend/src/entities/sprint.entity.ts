import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { StandupUpdate } from './standup-update.entity';
import { Organization } from './organization.entity';

export enum SprintStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

export enum SprintCreationType {
  MANUAL = 'manual',
  AUTO_GENERATED = 'auto_generated',
}

@Entity('sprints')
export class Sprint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * FK to organization - tenant isolation
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Project, (project) => project.sprints, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  goal: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: SprintStatus,
    default: SprintStatus.UPCOMING,
  })
  status: SprintStatus;

  @Column({
    type: 'enum',
    enum: SprintCreationType,
    default: SprintCreationType.MANUAL,
  })
  creationType: SprintCreationType;

  @Column({ default: false })
  isClosed: boolean;

  @Column({ type: 'int', default: 1 })
  dailyStandupCount: number;

  @Column({ type: 'jsonb', nullable: true })
  slotTimes: Record<string, string>;

  @OneToMany(() => StandupUpdate, (standupUpdate) => standupUpdate.sprint)
  standupUpdates: StandupUpdate[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
