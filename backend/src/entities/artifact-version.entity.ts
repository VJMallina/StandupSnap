import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ArtifactInstance } from './artifact-instance.entity';
import { User } from './user.entity';

@Entity('artifact_versions')
export class ArtifactVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ArtifactInstance, (instance) => instance.versions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'instance_id' })
  instance: ArtifactInstance;

  @Column({ name: 'instance_id' })
  instanceId: string;

  @Column({ length: 20 })
  versionNumber: string; // "1.0", "1.1", "2.0"

  @Column({ type: 'jsonb', default: {} })
  data: any; // Actual filled form data

  @Column({ type: 'text', nullable: true })
  changeSummary: string; // What changed in this version

  @Column({ default: false })
  isMajorVersion: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
