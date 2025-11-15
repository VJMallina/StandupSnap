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
import { Sprint } from './sprint.entity';
import { TeamMember } from './team-member.entity';
import { Project } from './project.entity';
import { Snap } from './snap.entity';

export enum CardStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

export enum CardPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum CardRAG {
  RED = 'red',
  AMBER = 'amber',
  GREEN = 'green',
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Sprint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint;

  @ManyToOne(() => TeamMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignee_id' })
  assignee: TeamMember;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  externalId: string; // Jira Ticket ID, etc.

  @Column({
    type: 'enum',
    enum: CardPriority,
    default: CardPriority.MEDIUM,
  })
  priority: CardPriority;

  @Column({ type: 'int' })
  estimatedTime: number; // ET in hours (MANDATORY)

  @Column({
    type: 'enum',
    enum: CardStatus,
    default: CardStatus.NOT_STARTED,
  })
  status: CardStatus;

  @Column({
    type: 'enum',
    enum: CardRAG,
    nullable: true,
  })
  ragStatus: CardRAG;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @OneToMany(() => Snap, (snap) => snap.card)
  snaps: Snap[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
