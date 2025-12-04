import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';
import { FormInstance } from './form-instance.entity';

export enum TemplateCategory {
  GOVERNANCE = 'GOVERNANCE',
  PLANNING = 'PLANNING',
  REPORTING = 'REPORTING',
  COMMUNICATION = 'COMMUNICATION',
  CUSTOM = 'CUSTOM',
}

export enum TemplateStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum TemplateVisibility {
  PUBLIC = 'PUBLIC', // Visible to all project members
  PRIVATE = 'PRIVATE', // Visible only to creator (SM)
}

export enum FieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  DROPDOWN = 'DROPDOWN',
  YES_NO = 'YES_NO',
  DATE = 'DATE',
  NUMBER = 'NUMBER',
  TAG = 'TAG',
  TABLE = 'TABLE',
  AI_ASSIST = 'AI_ASSIST',
  FILE_UPLOAD = 'FILE_UPLOAD',
  SECTION_HEADER = 'SECTION_HEADER',
  DESCRIPTION = 'DESCRIPTION',
  DIVIDER = 'DIVIDER',
  COLLAPSIBLE = 'COLLAPSIBLE',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  RATING = 'RATING',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  MULTI_SELECT = 'MULTI_SELECT',
  DATE_RANGE = 'DATE_RANGE',
  SLIDER = 'SLIDER',
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customValidation?: string;
}

export interface FieldProperties {
  // For SELECT, RADIO, CHECKBOX, MULTI_SELECT
  options?: FieldOption[];

  // For TEXT, TEXTAREA, NUMBER
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;

  // For FILE_UPLOAD
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
  allowMultiple?: boolean;

  // For RATING
  maxRating?: number;
  ratingIcon?: string;

  // For TABLE
  columns?: Array<{
    id: string;
    label: string;
    type: string;
  }>;

  // For AI_ASSIST
  aiPrompt?: string;
  aiContext?: string;

  // For TEXTAREA
  enableMarkdown?: boolean;
  rows?: number;

  // For SLIDER
  step?: number;
  showValue?: boolean;

  // Layout
  width?: 'FULL' | 'HALF' | 'THIRD';
  columnStart?: number;
  columnSpan?: number;
}

export interface ConditionalLogic {
  show: boolean;
  when?: {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
    value: any;
  };
}

export interface FormField {
  id: string; // UUID
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  helpText?: string;
  required: boolean;
  order: number;
  defaultValue?: any;

  // Properties specific to field type
  properties?: FieldProperties;

  // Validation rules
  validation?: FieldValidation;

  // Conditional logic
  conditional?: ConditionalLogic;
}

export interface TemplateSettings {
  allowAnonymous?: boolean;
  allowMultipleSubmissions?: boolean;
  showProgressBar?: boolean;
  enableAutoSave?: boolean;
  submitButtonText?: string;
  successMessage?: string;
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
  };
}

@Entity('form_templates')
export class FormTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TemplateCategory, default: TemplateCategory.CUSTOM })
  category: TemplateCategory;

  @Column({ type: 'enum', enum: TemplateStatus, default: TemplateStatus.DRAFT })
  status: TemplateStatus;

  @Column({ type: 'enum', enum: TemplateVisibility, default: TemplateVisibility.PUBLIC })
  visibility: TemplateVisibility;

  @Column({ type: 'int', default: 1 })
  version: number;

  // JSON column to store form fields structure
  @Column({ type: 'jsonb' })
  fields: FormField[];

  // JSON column for template settings
  @Column({ type: 'jsonb', nullable: true })
  settings: TemplateSettings;

  // Archive management
  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  // Relationships
  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => FormInstance, (instance) => instance.template)
  instances: FormInstance[];

  // Audit fields
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
