import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { StandupUpdate } from './standup-update.entity';

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

  @OneToMany(() => StandupUpdate, (standupUpdate) => standupUpdate.sprint)
  standupUpdates: StandupUpdate[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
