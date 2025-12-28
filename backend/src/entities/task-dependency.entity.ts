import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScheduleTask } from './schedule-task.entity';

export enum DependencyType {
  FINISH_TO_START = 'FINISH_TO_START',
  START_TO_START = 'START_TO_START',
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',
  START_TO_FINISH = 'START_TO_FINISH',
}

@Entity('task_dependencies')
export class TaskDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ScheduleTask, (task) => task.successors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'predecessor_task_id' })
  predecessorTask: ScheduleTask;

  @ManyToOne(() => ScheduleTask, (task) => task.predecessors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'successor_task_id' })
  successorTask: ScheduleTask;

  @Column({ type: 'enum', enum: DependencyType, default: DependencyType.FINISH_TO_START })
  dependencyType: DependencyType;

  @Column({ type: 'int', default: 0 })
  lagDays: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
