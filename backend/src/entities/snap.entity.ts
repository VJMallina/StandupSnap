import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { User } from './user.entity';

export enum SnapRAG {
  GREEN = 'green',
  AMBER = 'amber',
  RED = 'red',
}

@Entity('snaps')
export class Snap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Card, (card) => card.snaps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @Column({ name: 'card_id' })
  cardId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  // Raw input text entered by SM
  @Column('text')
  rawInput: string;

  // AI-generated structured output
  @Column('text', { nullable: true })
  done: string;

  @Column('text', { nullable: true })
  toDo: string;

  @Column('text', { nullable: true })
  blockers: string;

  // RAG status (AI suggested, SM can override)
  @Column({
    type: 'enum',
    enum: SnapRAG,
    nullable: true,
  })
  suggestedRAG: SnapRAG;

  @Column({
    type: 'enum',
    enum: SnapRAG,
    nullable: true,
  })
  finalRAG: SnapRAG;

  // Date for the snap (not timestamp - just the date)
  @Column({ type: 'date' })
  snapDate: Date;

  // Whether this snap is locked (after daily lock)
  @Column({ default: false })
  isLocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
