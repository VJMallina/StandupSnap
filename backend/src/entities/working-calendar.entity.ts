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
import { CalendarException } from './calendar-exception.entity';
import { User } from './user.entity';

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

@Entity('working_calendars')
export class WorkingCalendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Working days (array of day numbers: 0=Sunday, 1=Monday, etc.)
  // Stored as JSON array
  @Column({ type: 'json', default: '[1,2,3,4,5]' }) // Default: Mon-Fri
  workingDays: number[];

  // Working hours per day
  @Column({ type: 'decimal', precision: 4, scale: 2, default: 8.0 })
  hoursPerDay: number;

  // Default work time (e.g., "09:00")
  @Column({ type: 'varchar', length: 5, default: '09:00' })
  defaultStartTime: string;

  // Default end time (e.g., "17:00")
  @Column({ type: 'varchar', length: 5, default: '17:00' })
  defaultEndTime: string;

  // Timezone
  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  // Is this the default calendar for the project?
  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  // Calendar exceptions (holidays, special working days)
  @OneToMany(() => CalendarException, (exception) => exception.calendar)
  exceptions: CalendarException[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
