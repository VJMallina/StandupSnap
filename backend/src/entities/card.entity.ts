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
import { Sprint } from './sprint.entity';
import { Project } from './project.entity';
import { Snap } from './snap.entity';
import { Organization } from './organization.entity';
import { WorkflowLane } from './workflow-lane.entity';
import { User } from './user.entity';

export enum CardType {
  EPIC    = 'epic',
  CARD    = 'card',
  SUB_CARD = 'sub_card',
}

export enum CardStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED   = 'completed',
  CLOSED      = 'closed',
}

export enum CardPriority {
  LOW      = 'low',
  MEDIUM   = 'medium',
  HIGH     = 'high',
  CRITICAL = 'critical',
}

export enum CardRAG {
  RED   = 'red',
  AMBER = 'amber',
  GREEN = 'green',
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // Sprint is nullable — null means the card is in the Backlog
  @Column({ type: 'uuid', nullable: true, name: 'sprint_id' })
  sprintId: string | null;

  @ManyToOne(() => Sprint, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint | null;

  // ── Card hierarchy ──────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: CardType,
    default: CardType.CARD,
  })
  cardType: CardType;

  // For CARD → parent is an EPIC; for SUB_CARD → parent is a CARD
  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId: string | null;

  @ManyToOne(() => Card, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: Card | null;

  @OneToMany(() => Card, (card) => card.parent)
  children: Card[];

  // ── Workflow lane ────────────────────────────────────────────
  @Column({ type: 'uuid', nullable: true, name: 'lane_id' })
  laneId: string | null;

  @ManyToOne(() => WorkflowLane, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'lane_id' })
  lane: WorkflowLane | null;

  // ── Assignee ─────────────────────────────────────────────────
  // createForeignKeyConstraints: false — assignee is a cross-schema reference
  // (tenant card → public.users); DB-level FK would violate on old TeamMember UUIDs.
  // Referential integrity is enforced at the application layer.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', createForeignKeyConstraints: false })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User | null;

  // Reporter — who raised the card
  @Column({ type: 'uuid', nullable: true })
  reporterId: string | null;

  // Optional link back to the War Room incident that spawned this card
  @Column({ type: 'uuid', nullable: true })
  sourceIncidentId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', createForeignKeyConstraints: false })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User | null;

  // ── Core fields ───────────────────────────────────────────────
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Auto-generated sequential number per project, e.g. 1, 2, 3 …
  @Column({ type: 'int', nullable: true })
  cardNumber: number | null;

  // Human-readable ID composed as {project.key}-{cardNumber}, e.g. "STDN-42"
  @Column({ nullable: true })
  externalId: string;

  @Column({
    type: 'enum',
    enum: CardPriority,
    default: CardPriority.MEDIUM,
  })
  priority: CardPriority;

  // Effort estimate in story points (Fibonacci scale — mapping to hours defined at project level later)
  @Column({ type: 'int', nullable: true })
  storyPoints: number | null;

  // Estimated time in hours (kept alongside story points)
  @Column({ type: 'int', nullable: true })
  estimatedTime: number | null;

  // Definition of done — what must be true before this card is accepted
  @Column({ type: 'text', nullable: true })
  acceptanceCriteria: string | null;

  // Free-form labels e.g. ["frontend", "bug", "tech-debt"]
  @Column({ type: 'simple-array', nullable: true })
  labels: string[] | null;

  // Optional deadline within the sprint
  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  // ── Status (synced from lane type, source of truth is laneId) ─
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

  // When the card first moved out of a TODO-type lane
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @OneToMany(() => Snap, (snap) => snap.card)
  snaps: Snap[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
