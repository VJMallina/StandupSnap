import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';
import { ScheduleTask } from './schedule-task.entity';
import { WorkingCalendar } from './working-calendar.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  scheduleStartDate: Date;

  @Column({ type: 'date' })
  scheduleEndDate: Date;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @ManyToOne(() => WorkingCalendar, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'calendar_id' })
  calendar: WorkingCalendar | null;

  @OneToMany(() => ScheduleTask, (task) => task.schedule)
  tasks: ScheduleTask[];

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
