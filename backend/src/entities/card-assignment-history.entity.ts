import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Card } from './card.entity';
import { User } from './user.entity';
import { WorkflowLane } from './workflow-lane.entity';

@Entity('card_assignment_history')
export class CardAssignmentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  cardId: string;

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  // The user who was assigned (null = unassigned)
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // Which lane the card was in when this assignment started
  @Column({ type: 'uuid', nullable: true })
  laneId: string | null;

  @ManyToOne(() => WorkflowLane, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lane_id' })
  lane: WorkflowLane | null;

  // Who made this assignment (SM or another admin)
  @Column({ type: 'uuid', nullable: true })
  assignedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy: User | null;

  // When this assignment ended (null = still current)
  @Column({ type: 'timestamp', nullable: true })
  unassignedAt: Date | null;

  @CreateDateColumn()
  assignedAt: Date;
}
