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
import { User } from './user.entity';

export enum RoomType {
  PLANNING_POKER = 'planning_poker',
  RETROSPECTIVE = 'retrospective',
  SPRINT_PLANNING = 'sprint_planning',
  REFINEMENT = 'refinement',
  MOM = 'mom',
}

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

// Planning Poker specific types
export enum DeckType {
  FIBONACCI = 'fibonacci',
  MODIFIED_FIBONACCI = 'modified_fibonacci',
  T_SHIRT = 't_shirt',
  CUSTOM = 'custom',
}

export interface PlanningPokerVote {
  userId: string;
  userName: string;
  vote: string | number;
}

export interface PlanningPokerRound {
  roundId: string;
  itemName?: string;
  votes: Record<string, string | number>; // userId -> vote
  revealed: boolean;
  finalValue: string | number | null;
  mean?: number;
  median?: number;
  mode?: string | number;
  timestamp: string;
}

export interface PlanningPokerData {
  deckType: DeckType;
  customDeck?: string[];
  rounds: PlanningPokerRound[];
  participants: string[]; // userIds
}

// Retrospective specific types
export interface RetroColumn {
  columnId: string;
  title: string;
  order: number;
  items: RetroItem[];
}

export interface RetroItem {
  itemId: string;
  content: string;
  createdBy: string;
  createdByName: string;
  votes: string[]; // userIds who voted
  discussion?: string;
  actionItem?: boolean;
  timestamp: string;
}

export interface RetrospectiveData {
  columns: RetroColumn[];
  votingEnabled: boolean;
  maxVotesPerPerson?: number;
}

// MOM specific types
export interface MOMData {
  rawInput: string;
  summary: string;
  decisions: string[];
  actionItems: Array<{
    id: string;
    description: string;
    assignee?: string;
    dueDate?: string;
  }>;
  attendees: string[];
  aiGenerated: boolean;
}

// Sprint Planning specific types
export interface SprintPlanningItem {
  itemId: string;
  title: string;
  estimate: number;
  status: 'ready' | 'in_scope' | 'out_of_scope';
  order: number;
}

export interface SprintPlanningData {
  capacity: number;
  items: SprintPlanningItem[];
  sprintGoals: string[];
  actualWorkload: number;
}

// Refinement specific types
export interface RefinementItem {
  itemId: string;
  title: string;
  notes: string[];
  acceptanceCriteria: string[];
  aiSuggestions?: string[];
  estimate?: number;
}

export interface RefinementData {
  items: RefinementItem[];
}

@Entity('scrum_rooms')
export class ScrumRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: RoomType })
  type: RoomType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.ACTIVE })
  status: RoomStatus;

  // Store room-specific data as JSON
  @Column({ type: 'jsonb', nullable: true })
  data:
    | PlanningPokerData
    | RetrospectiveData
    | MOMData
    | SprintPlanningData
    | RefinementData
    | null;

  // Optional project association
  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // Archive management
  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

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
