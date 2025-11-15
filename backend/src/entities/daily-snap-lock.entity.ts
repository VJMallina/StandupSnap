import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sprint } from './sprint.entity';
import { User } from './user.entity';

@Entity('daily_snap_locks')
export class DailySnapLock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sprint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint;

  @Column({ name: 'sprint_id' })
  sprintId: string;

  // The date that was locked
  @Column({ type: 'date' })
  lockDate: Date;

  // Who locked it (null if auto-locked)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'locked_by' })
  lockedBy: User;

  @Column({ name: 'locked_by', nullable: true })
  lockedById: string;

  // Whether it was manually locked or auto-locked
  @Column({ default: false })
  isAutoLocked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
