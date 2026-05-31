import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkflowTemplate } from './workflow-template.entity';

export enum LaneType {
  TODO = 'todo',
  ACTIVE = 'active',
  DONE = 'done',
}

// Default lane definitions seeded per project on creation
export const DEFAULT_LANES: Array<{
  name: string;
  order: number;
  color: string;
  laneType: LaneType;
  isFinalLane: boolean;
}> = [
  { name: 'To Do',       order: 1, color: '#6B7280', laneType: LaneType.TODO,   isFinalLane: false },
  { name: 'In Progress', order: 2, color: '#3B82F6', laneType: LaneType.ACTIVE, isFinalLane: false },
  { name: 'QA',          order: 3, color: '#8B5CF6', laneType: LaneType.ACTIVE, isFinalLane: false },
  { name: 'Done',        order: 4, color: '#10B981', laneType: LaneType.DONE,   isFinalLane: true  },
];

@Entity('workflow_lanes')
export class WorkflowLane {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workflowTemplateId: string;

  @ManyToOne(() => WorkflowTemplate, (wt) => wt.lanes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_template_id' })
  workflowTemplate: WorkflowTemplate;

  @Column()
  name: string;

  // Position in the board (left to right)
  @Column({ type: 'int' })
  order: number;

  // Hex color for the lane header
  @Column({ default: '#6B7280' })
  color: string;

  @Column({
    type: 'enum',
    enum: LaneType,
    default: LaneType.TODO,
  })
  laneType: LaneType;

  // The lane that marks a card as "completed" for RAG & sprint closure purposes
  @Column({ default: false })
  isFinalLane: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
