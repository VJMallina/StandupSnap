import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';
import { ArtifactInstance } from './artifact-instance.entity';

export enum ArtifactCategory {
  PROJECT_GOVERNANCE = 'PROJECT_GOVERNANCE',
  PLANNING_BUDGETING = 'PLANNING_BUDGETING',
  EXECUTION_MONITORING = 'EXECUTION_MONITORING',
  RISK_QUALITY = 'RISK_QUALITY',
  CLOSURE_REPORTING = 'CLOSURE_REPORTING',
  CUSTOM = 'CUSTOM',
}

@Entity('artifact_templates')
export class ArtifactTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ArtifactCategory,
    default: ArtifactCategory.CUSTOM,
  })
  category: ArtifactCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  templateStructure: any; // Field definitions from form builder

  @Column({ default: false })
  isSystemTemplate: boolean;

  @Column({ default: false })
  isPublished: boolean;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id', nullable: true })
  projectId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @OneToMany(() => ArtifactInstance, (instance) => instance.template)
  instances: ArtifactInstance[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
