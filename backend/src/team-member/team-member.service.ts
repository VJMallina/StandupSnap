import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { OrgUser } from '../entities/org-user.entity';
import { User } from '../entities/user.entity';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { AddToProjectDto } from './dto/add-to-project.dto';
import { TenantService } from '../tenant/tenant.service';
import { getCurrentTenant } from '../tenant/tenant.context';

@Injectable()
export class TeamMemberService {
  constructor(
    private tenantService: TenantService,
    @InjectRepository(OrgUser)
    private orgUserRepository: Repository<OrgUser>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createTeamMemberDto: CreateTeamMemberDto): Promise<TeamMember> {
    const repo = await this.tenantService.getRepository(TeamMember);
    const teamMember = repo.create(createTeamMemberDto);
    return repo.save(teamMember);
  }

  async findAll(): Promise<TeamMember[]> {
    const repo = await this.tenantService.getRepository(TeamMember);
    return repo.find({ relations: ['projects'], order: { fullName: 'ASC' } });
  }

  async findOne(id: string): Promise<TeamMember> {
    const repo = await this.tenantService.getRepository(TeamMember);
    const teamMember = await repo.findOne({ where: { id }, relations: ['projects'] });
    if (!teamMember) {
      throw new NotFoundException(`Team member with ID ${id} not found`);
    }
    return teamMember;
  }

  async update(id: string, updateTeamMemberDto: UpdateTeamMemberDto): Promise<TeamMember> {
    const repo = await this.tenantService.getRepository(TeamMember);
    const teamMember = await this.findOne(id);
    Object.assign(teamMember, updateTeamMemberDto);
    return repo.save(teamMember);
  }

  async remove(id: string): Promise<void> {
    const repo = await this.tenantService.getRepository(TeamMember);
    const teamMember = await this.findOne(id);
    await repo.remove(teamMember);
  }

  /**
   * Returns all ProjectMembers for a project (real org users assigned to this project).
   * PO and PMO are shown separately in the Project Leads section, not here.
   */
  async getProjectTeam(projectId: string): Promise<any[]> {
    const projectRepo = await this.tenantService.getRepository(Project);
    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ['members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (!project.members) return [];

    return project.members
      .filter((m) => m.isActive && m.user)
      .map((m) => ({
        id: m.id,
        fullName: m.user.name,
        displayName: m.user.email,
        designationRole: m.role,
        type: 'project_member',
        userId: m.user.id,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  /**
   * Returns active org members NOT already assigned to this project.
   * Source of truth: public.org_users (accepted org members).
   */
  async getAvailableTeamMembers(projectId: string): Promise<any[]> {
    const tenant = getCurrentTenant();
    if (!tenant) return [];

    const projectRepo = await this.tenantService.getRepository(Project);
    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ['members', 'members.user', 'productOwner', 'pmo'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const assignedUserIds = new Set<string>();
    project.members?.forEach((m) => m.user?.id && assignedUserIds.add(m.user.id));
    if (project.productOwner?.id) assignedUserIds.add(project.productOwner.id);
    if (project.pmo?.id) assignedUserIds.add(project.pmo.id);

    const orgUsers = await this.orgUserRepository.find({
      where: { organizationId: tenant.orgId, isActive: true, deletedAt: IsNull() },
      relations: ['user'],
    });

    return orgUsers
      .filter((ou) => ou.user?.isActive && !assignedUserIds.has(ou.user.id))
      .map((ou) => ({
        id: ou.user.id,
        fullName: ou.user.name,
        displayName: ou.user.email,
        designationRole: null,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  /**
   * Adds org members to a project by creating ProjectMember records.
   */
  async addToProject(projectId: string, addToProjectDto: AddToProjectDto): Promise<any[]> {
    const [projectRepo, projectMemberRepo] = await Promise.all([
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(ProjectMember),
    ]);

    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ['members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    if (project.isArchived) {
      throw new BadRequestException('Cannot modify team in archived project');
    }

    const existingUserIds = new Set(
      (project.members ?? []).map((m) => m.user?.id).filter(Boolean),
    );

    const results: ProjectMember[] = [];
    for (const userId of addToProjectDto.userIds) {
      if (existingUserIds.has(userId)) {
        throw new ConflictException(`User is already a member of this project`);
      }
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

      const member = projectMemberRepo.create({
        project,
        user,
        role: addToProjectDto.designationRole || 'Team Member',
        organizationId: project.organizationId,
        startDate: new Date(),
        isActive: true,
      });
      results.push(await projectMemberRepo.save(member));
    }

    return results;
  }

  /**
   * Updates the designation role of a project team member.
   */
  async updateTeamMemberRole(
    projectId: string,
    memberId: string,
    role: string,
  ): Promise<ProjectMember> {
    const projectMemberRepo = await this.tenantService.getRepository(ProjectMember);
    const member = await projectMemberRepo.findOne({
      where: { id: memberId, project: { id: projectId } },
    });
    if (!member) throw new NotFoundException('Team member not found in this project');
    member.role = role;
    return projectMemberRepo.save(member);
  }

  /**
   * Removes a ProjectMember from a project.
   */
  async removeFromProject(projectId: string, memberId: string): Promise<void> {
    const projectMemberRepo = await this.tenantService.getRepository(ProjectMember);
    const member = await projectMemberRepo.findOne({
      where: { id: memberId, project: { id: projectId } },
    });
    if (!member) throw new NotFoundException('Team member not found in this project');
    await projectMemberRepo.remove(member);
  }
}
