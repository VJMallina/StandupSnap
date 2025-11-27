import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Sprint } from './sprint.entity';
import { User } from './user.entity';

@Entity('daily_locks')
@Unique(['sprint', 'date', 'slotNumber'])
export class DailyLock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sprint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint;

  @Column({ type: 'date' })
  date: Date;

  // Slot number: null = entire day locked, number = specific slot locked
  @Column({ type: 'int', nullable: true })
  slotNumber: number;

  @Column({ default: true })
  isLocked: boolean;

  @Column({ type: 'text', nullable: true })
  dailySummaryDone: string;

  @Column({ type: 'text', nullable: true })
  dailySummaryToDo: string;

  @Column({ type: 'text', nullable: true })
  dailySummaryBlockers: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'locked_by' })
  lockedBy: User;

  @CreateDateColumn()
  lockedAt: Date;
}
