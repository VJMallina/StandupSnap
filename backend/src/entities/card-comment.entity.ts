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
import { Card } from './card.entity';
import { User } from './user.entity';

export enum CardCommentType {
  COMMENT = 'comment',   // user-written comment
  SYSTEM  = 'system',    // auto-generated activity entry
}

@Entity('card_comments')
export class CardComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  cardId: string;

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @Column({ type: 'uuid', nullable: true })
  authorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author: User | null;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: CardCommentType,
    default: CardCommentType.COMMENT,
  })
  commentType: CardCommentType;

  // Tracks whether a COMMENT has been edited after posting
  @Column({ default: false })
  isEdited: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
