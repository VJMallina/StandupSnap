import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum IncidentRoleType {
  COMMANDER = 'COMMANDER',
  TECH_LEAD = 'TECH_LEAD',
  COMMS_LEAD = 'COMMS_LEAD',
  RESPONDER = 'RESPONDER',
}

@Entity('incident_roles')
export class IncidentRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  incidentId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  userName: string;

  @Column({ type: 'enum', enum: IncidentRoleType })
  role: IncidentRoleType;

  @CreateDateColumn()
  assignedAt: Date;
}
