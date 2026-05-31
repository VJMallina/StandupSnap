import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Not, In } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';
import { Project } from '../entities/project.entity';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { AddToProjectDto } from './dto/add-to-project.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class TeamMemberService {
  constructor(private tenantService: TenantService) {}

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

  async getProjectTeam(projectId: string): Promise<any[]> {
    const projectRepo = await this.tenantService.getRepository(Project);
    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ['teamMembers', 'productOwner', 'pmo', 'members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const teamMembers: any[] = [];

    if (project.teamMembers) {
      teamMembers.push(
        ...project.teamMembers.map((tm) => ({
          id: tm.id,
          fullName: tm.fullName,
          displayName: tm.displayName,
          designationRole: tm.designationRole,
          type: 'team_member',
        })),
      );
    }

    if (project.productOwner) {
      teamMembers.push({
        id: `user-${project.productOwner.id}`,
        fullName: project.productOwner.name,
        displayName: project.productOwner.name,
        designationRole: 'Product Owner',
        type: 'special_role',
        userId: project.productOwner.id,
      });
    }

    if (project.pmo) {
      teamMembers.push({
        id: `user-${project.pmo.id}`,
        fullName: project.pmo.name,
        displayName: project.pmo.name,
        designationRole: 'PMO',
        type: 'special_role',
        userId: project.pmo.id,
      });
    }

    if (project.members) {
      const scrumMasters = project.members.filter(
        (member) => member.role.toLowerCase().includes('scrum') && member.isActive,
      );
      for (const sm of scrumMasters) {
        if (sm.user) {
          teamMembers.push({
            id: `user-${sm.user.id}`,
            fullName: sm.user.name,
            displayName: sm.user.name,
            designationRole: 'Scrum Master',
            type: 'special_role',
            userId: sm.user.id,
          });
        }
      }
    }

    return teamMembers;
  }

  async getAvailableTeamMembers(projectId: string): Promise<TeamMember[]> {
    const [teamMemberRepo, projectRepo] = await Promise.all([
      this.tenantService.getRepository(TeamMember),
      this.tenantService.getRepository(Project),
    ]);

    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ['teamMembers'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const assignedIds = project.teamMembers.map((tm) => tm.id);
    if (assignedIds.length === 0) {
      return teamMemberRepo.find({ order: { fullName: 'ASC' } });
    }

    return teamMemberRepo.find({
      where: { id: Not(In(assignedIds)) },
      order: { fullName: 'ASC' },
    });
  }

  async addToProject(projectId: string, addToProjectDto: AddToProjectDto): Promise<Project> {
    const [teamMemberRepo, projectRepo] = await Promise.all([
      this.tenantService.getRepository(TeamMember),
      this.tenantService.getRepository(Project),
    ]);

    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ['teamMembers'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    if (project.isArchived) {
      throw new BadRequestException('Cannot modify team in archived project');
    }

    const teamMembers = await teamMemberRepo.findBy({ id: In(addToProjectDto.teamMemberIds) });
    if (teamMembers.length !== addToProjectDto.teamMemberIds.length) {
      throw new NotFoundException('One or more team members not found');
    }

    const existingIds = new Set(project.teamMembers.map((tm) => tm.id));
    const duplicates = teamMembers.filter((tm) => existingIds.has(tm.id));
    if (duplicates.length > 0) {
      throw new ConflictException(
        `Team member(s) already assigned to project: ${duplicates.map((d) => d.fullName).join(', ')}`,
      );
    }

    project.teamMembers = [...project.teamMembers, ...teamMembers];
    return projectRepo.save(project);
  }

  async removeFromProject(projectId: string, teamMemberId: string): Promise<Project> {
    const projectRepo = await this.tenantService.getRepository(Project);

    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ['teamMembers'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    if (project.isArchived) {
      throw new BadRequestException('Cannot modify team in archived project');
    }

    const memberIndex = project.teamMembers.findIndex((tm) => tm.id === teamMemberId);
    if (memberIndex === -1) {
      throw new NotFoundException('Team member not found in this project');
    }

    project.teamMembers.splice(memberIndex, 1);
    return projectRepo.save(project);
  }
}
