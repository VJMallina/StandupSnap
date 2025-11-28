import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RaciMatrix } from './raci-matrix.entity';
import { TeamMember } from './team-member.entity';

export enum RaciRole {
  RESPONSIBLE = 'R',
  ACCOUNTABLE = 'A',
  CONSULTED = 'C',
  INFORMED = 'I',
}

@Entity('raci_entries')
export class RaciEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RaciMatrix, (matrix) => matrix.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'raci_matrix_id' })
  raciMatrix: RaciMatrix;

  @Column({ type: 'int' })
  rowOrder: number; // For maintaining task order

  @Column({ type: 'varchar', length: 500 })
  taskName: string;

  @Column({ type: 'text', nullable: true })
  taskDescription: string;

  @ManyToOne(() => TeamMember, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'team_member_id' })
  teamMember: TeamMember;

  @Column({ type: 'varchar', length: 255, nullable: true })
  memberId: string; // Stores ID for both regular team members and special roles (user-{id})

  @Column({
    type: 'enum',
    enum: RaciRole,
    nullable: true,
  })
  raciRole: RaciRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
