import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Risk } from './risk.entity';
import { User } from './user.entity';

export enum RiskChangeType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  ARCHIVED = 'ARCHIVED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  OWNER_CHANGED = 'OWNER_CHANGED',
  SEVERITY_CHANGED = 'SEVERITY_CHANGED',
}

@Entity('risk_history')
export class RiskHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Risk, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'risk_id' })
  risk: Risk;

  @Column({ type: 'enum', enum: RiskChangeType })
  changeType: RiskChangeType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  changedFields: Record<string, { old: any; new: any }>;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
