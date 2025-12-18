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
import { ResourceWorkload } from './resource-workload.entity';

export enum ResourceRole {
  DEVELOPER = 'Developer',
  QA = 'QA',
  BA = 'BA',
  DESIGNER = 'Designer',
  ARCHITECT = 'Architect',
  PROJECT_COORDINATOR = 'Project Coordinator',
  OTHER = 'Other',
}

export enum ResourceRAGStatus {
  GREEN = 'green',
  AMBER = 'amber',
  RED = 'red',
}

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ResourceRole,
    default: ResourceRole.DEVELOPER,
  })
  role: ResourceRole;

  @Column({ nullable: true })
  customRoleName: string; // Used when role = 'Other'

  @Column('simple-array', { nullable: true })
  skills: string[]; // Array of skill tags

  @Column({ type: 'float', default: 40.0 })
  weeklyAvailability: number; // Default 40 hours

  @Column({ type: 'float', default: 0.0 })
  weeklyWorkload: number; // Default 0 hours

  @Column({ type: 'float', default: 0.0 })
  loadPercentage: number; // Auto-calculated: (workload / availability) * 100

  @Column({
    type: 'enum',
    enum: ResourceRAGStatus,
    default: ResourceRAGStatus.GREEN,
  })
  ragStatus: ResourceRAGStatus; // Green < 80%, Amber 80-100%, Red > 100%

  @Column({ type: 'text', nullable: true })
  notes: string; // Constraints, availability notes, etc.

  @Column({ default: false })
  isArchived: boolean;

  @OneToMany(() => ResourceWorkload, (workload) => workload.resource)
  workloads: ResourceWorkload[]; // Weekly workload tracking

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
