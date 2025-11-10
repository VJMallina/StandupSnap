import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Sprint } from './sprint.entity';

@Entity('standup_updates')
export class StandupUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.standupUpdates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Sprint, (sprint) => sprint.standupUpdates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint;

  @Column({ type: 'date' })
  updateDate: Date;

  @Column({ type: 'text', nullable: true })
  rawInput: string;

  @Column({ type: 'text', nullable: true })
  yesterday: string;

  @Column({ type: 'text', nullable: true })
  today: string;

  @Column({ type: 'text', nullable: true })
  blockers: string;

  @Column({ type: 'text', nullable: true })
  formattedOutput: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
