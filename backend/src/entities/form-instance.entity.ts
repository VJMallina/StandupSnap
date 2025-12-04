import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FormTemplate } from './form-template.entity';
import { Project } from './project.entity';
import { User } from './user.entity';

export enum InstanceStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export interface InstanceMetadata {
  ipAddress?: string;
  userAgent?: string;
  submissionTime?: number; // Time taken to complete in seconds
  deviceType?: string;
  location?: string;
}

@Entity('form_instances')
export class FormInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string; // e.g., "Project Charter for Project A", "MOM for Sprint Review Jan 12"

  @ManyToOne(() => FormTemplate, (template) => template.instances, {
    onDelete: 'RESTRICT',
    eager: true,
  })
  @JoinColumn({ name: 'template_id' })
  template: FormTemplate;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'int', default: 1 })
  version: number; // Track version history of this instance

  // JSON column to store form field values
  // Structure: { "field-id": value, "field-id-2": value }
  @Column({ type: 'jsonb' })
  values: Record<string, any>;

  @Column({ type: 'enum', enum: InstanceStatus, default: InstanceStatus.DRAFT })
  status: InstanceStatus;

  // Store template version used to create this instance
  @Column({ type: 'int' })
  templateVersion: number;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: InstanceMetadata;

  // Archive management
  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  // Approval tracking
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy: User;

  @Column({ type: 'text', nullable: true })
  approvalNotes: string;

  // Audit fields
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'submitted_by' })
  submittedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
