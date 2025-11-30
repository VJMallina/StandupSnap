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
import { Sprint } from './sprint.entity';
import { User } from './user.entity';

export enum StandaloneMeetingType {
  PLANNING = 'Planning',
  GROOMING = 'Grooming',
  RETRO = 'Retrospective',
  STAKEHOLDER = 'Stakeholder Meeting',
  GENERAL = 'General Meeting',
  CUSTOM = 'Custom',
  OTHER = 'Other',
}

@Entity('standalone_moms')
export class StandaloneMom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Sprint, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'date' })
  meetingDate: Date;

  @Column({ type: 'varchar', length: 100 })
  meetingType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  customMeetingType: string | null;

  @Column({ type: 'text', nullable: true })
  rawNotes: string | null;

  @Column({ type: 'text', nullable: true })
  agenda: string | null;

  @Column({ type: 'text', nullable: true })
  discussionSummary: string | null;

  @Column({ type: 'text', nullable: true })
  decisions: string | null;

  @Column({ type: 'text', nullable: true })
  actionItems: string | null;

  @Column({ default: false })
  archived: boolean;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
