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
import { Schedule } from './schedule.entity';
import { TeamMember } from './team-member.entity';
import { TaskDependency } from './task-dependency.entity';

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

export enum SchedulingMode {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
}

@Entity('schedule_tasks')
export class ScheduleTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Schedule, (schedule) => schedule.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;

  // Basic Fields
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'int' })
  durationDays: number;

  // WBS Hierarchy Fields
  @ManyToOne(() => ScheduleTask, (task) => task.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask: ScheduleTask | null;

  @OneToMany(() => ScheduleTask, (task) => task.parentTask)
  children: ScheduleTask[];

  @Column({ type: 'varchar', length: 50 })
  wbsCode: string;

  @Column({ type: 'int', default: 0 })
  level: number;

  @Column({ type: 'int' })
  orderIndex: number;

  // Assignment Fields
  @ManyToOne(() => TeamMember, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee: TeamMember | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedHours: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  actualHours: number;

  // Status Fields
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.NOT_STARTED })
  status: TaskStatus;

  @Column({ type: 'int', default: 0 })
  progress: number;

  // Scheduling Mode
  @Column({ type: 'enum', enum: SchedulingMode, default: SchedulingMode.MANUAL })
  schedulingMode: SchedulingMode;

  // Milestone Flag
  @Column({ type: 'boolean', default: false })
  isMilestone: boolean;

  // Baseline Tracking (Optional)
  @Column({ type: 'date', nullable: true })
  baselineStartDate: Date | null;

  @Column({ type: 'date', nullable: true })
  baselineEndDate: Date | null;

  @Column({ type: 'int', nullable: true })
  baselineDuration: number | null;

  // Critical Path & Scheduling Fields
  @Column({ type: 'date', nullable: true })
  earlyStart: Date | null;

  @Column({ type: 'date', nullable: true })
  earlyFinish: Date | null;

  @Column({ type: 'date', nullable: true })
  lateStart: Date | null;

  @Column({ type: 'date', nullable: true })
  lateFinish: Date | null;

  @Column({ type: 'int', default: 0 })
  totalFloat: number; // Total slack (delay without affecting project end)

  @Column({ type: 'int', default: 0 })
  freeFloat: number; // Free slack (delay without affecting successors)

  @Column({ type: 'boolean', default: false })
  isCriticalPath: boolean; // Auto-calculated: totalFloat === 0

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Dependencies
  @OneToMany(() => TaskDependency, (dep) => dep.successorTask)
  predecessors: TaskDependency[];

  @OneToMany(() => TaskDependency, (dep) => dep.predecessorTask)
  successors: TaskDependency[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
