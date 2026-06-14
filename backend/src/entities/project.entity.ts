import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { ProjectMember } from './project-member.entity';
import { Sprint } from './sprint.entity';
import { User } from './user.entity';
import { TeamMember } from './team-member.entity';
import { Organization } from './organization.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * FK to organization - tenant isolation
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  name: string;

  // Short uppercase key used as card ID prefix, e.g. "STDN" → card IDs become STDN-1, STDN-2
  @Column({ type: 'varchar', length: 6, nullable: true })
  key: string | null;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isArchived: boolean;

  /**
   * Confidential projects require explicit membership even for PMO users
   * Only ORG_ADMIN can set this flag
   */
  @Column({ default: false })
  isConfidential: boolean;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'product_owner_id' })
  productOwner: User;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'pmo_id' })
  pmo: User;

  @OneToMany(() => ProjectMember, (projectMember) => projectMember.project)
  members: ProjectMember[];

  @OneToMany(() => Sprint, (sprint) => sprint.project)
  sprints: Sprint[];

  @ManyToMany(() => TeamMember, (teamMember) => teamMember.projects)
  @JoinTable({
    name: 'project_team_members',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_member_id', referencedColumnName: 'id' },
  })
  teamMembers: TeamMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
