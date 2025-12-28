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
import { ArtifactTemplate } from './artifact-template.entity';
import { Project } from './project.entity';
import { User } from './user.entity';
import { ArtifactVersion } from './artifact-version.entity';

export enum ArtifactStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('artifact_instances')
export class ArtifactInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ArtifactTemplate, (template) => template.instances, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: ArtifactTemplate;

  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ArtifactStatus,
    default: ArtifactStatus.DRAFT,
  })
  status: ArtifactStatus;

  @ManyToOne(() => ArtifactVersion, { nullable: true })
  @JoinColumn({ name: 'current_version_id' })
  currentVersion: ArtifactVersion;

  @Column({ name: 'current_version_id', nullable: true })
  currentVersionId: string;

  @OneToMany(() => ArtifactVersion, (version) => version.instance, {
    cascade: true,
  })
  versions: ArtifactVersion[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
