import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkingCalendar } from './working-calendar.entity';
import { User } from './user.entity';

export enum ExceptionType {
  NON_WORKING = 'NON_WORKING', // Holiday, day off
  WORKING = 'WORKING',         // Special working day on normally non-working day
}

@Entity('calendar_exceptions')
export class CalendarException {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkingCalendar, (calendar) => calendar.exceptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'calendar_id' })
  calendar: WorkingCalendar;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: ExceptionType })
  type: ExceptionType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string; // e.g., "Christmas Day", "Emergency Work Day"

  @Column({ type: 'text', nullable: true })
  description: string;

  // For WORKING exceptions, specify hours available
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  workingHours: number;

  // Recurring yearly? (e.g., Christmas is always Dec 25)
  @Column({ type: 'boolean', default: false })
  isRecurring: boolean;

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
