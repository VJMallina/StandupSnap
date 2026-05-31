import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { Organization } from './organization.entity';
import { WorkflowLane } from './workflow-lane.entity';

export enum TransitionMode {
  FREE = 'free',
  SEQUENTIAL = 'sequential',
  FORWARD = 'forward',
}

@Entity('workflow_templates')
export class WorkflowTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Index()
  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  name: string;

  // Only one workflow can be default per project
  @Column({ default: true })
  isDefault: boolean;

  @Column({ type: 'enum', enum: TransitionMode, default: TransitionMode.FREE })
  transitionMode: TransitionMode;

  @OneToMany(() => WorkflowLane, (lane) => lane.workflowTemplate, {
    cascade: true,
    eager: false,
  })
  lanes: WorkflowLane[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
