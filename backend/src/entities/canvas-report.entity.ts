import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export interface SlideData {
  id: string;
  order: number;
  fabricJson: Record<string, any>;
  thumbnail?: string;
}

export type ReportType = 'weekly' | 'biweekly' | 'monthly' | 'custom';

@Entity('canvas_reports')
export class CanvasReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 50, default: 'custom' })
  reportType: ReportType;

  @Column({ type: 'jsonb', default: '[]' })
  slides: SlideData[];

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
