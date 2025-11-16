import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Card, CardRAG } from './card.entity';
import { User } from './user.entity';

@Entity('card_rag_history')
@Index(['cardId', 'date'], { unique: true }) // One entry per card per day
export class CardRAGHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @Column({ name: 'card_id' })
  cardId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: CardRAG,
  })
  ragStatus: CardRAG;

  @Column({ default: false })
  isOverridden: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'overridden_by' })
  overriddenBy: User;

  @Column({ name: 'overridden_by', nullable: true })
  overriddenById: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
