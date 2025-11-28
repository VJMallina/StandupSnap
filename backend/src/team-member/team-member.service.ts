import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';
import { Project } from '../entities/project.entity';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { AddToProjectDto } from './dto/add-to-project.dto';

@Injectable()
export class TeamMemberService {
  constructor(
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(createTeamMemberDto: CreateTeamMemberDto): Promise<TeamMember> {
    const teamMember = this.teamMemberRepository.create(createTeamMemberDto);
    return this.teamMemberRepository.save(teamMember);
  }

  async findAll(): Promise<TeamMember[]> {
    return this.teamMemberRepository.find({
      relations: ['projects'],
      order: { fullName: 'ASC' },
    });
  }

  async findOne(id: string): Promise<TeamMember> {
    const teamMember = await this.teamMemberRepository.findOne({
      where: { id },
      relations: ['projects'],
    });

    if (!teamMember) {
      throw new NotFoundException(`Team member with ID ${id} not found`);
    }

    return teamMember;
  }

  async update(id: string, updateTeamMemberDto: UpdateTeamMemberDto): Promise<TeamMember> {
    const teamMember = await this.findOne(id);
    Object.assign(teamMember, updateTeamMemberDto);
    return this.teamMemberRepository.save(teamMember);
  }

  async remove(id: string): Promise<void> {
    const teamMember = await this.findOne(id);
    await this.teamMemberRepository.remove(teamMember);
  }

  // Get all team members for a specific project
  async getProjectTeam(projectId: string): Promise<any[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['teamMembers', 'productOwner', 'pmo', 'members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const teamMembers: any[] = [];

    // Add regular team members
    if (project.teamMembers) {
      teamMembers.push(...project.teamMembers.map(tm => ({
        id: tm.id,
        fullName: tm.fullName,
        displayName: tm.displayName,
        designationRole: tm.designationRole,
        type: 'team_member',
      })));
    }

    // Add Product Owner if exists
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

    // Add PMO if exists
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

    // Add Scrum Master from project members
    if (project.members) {
      const scrumMasters = project.members.filter(
        member => member.role.toLowerCase().includes('scrum') && member.isActive
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

  // Get team members NOT assigned to a specific project
  async getAvailableTeamMembers(projectId: string): Promise<TeamMember[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['teamMembers'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const assignedIds = project.teamMembers.map((tm) => tm.id);

    if (assignedIds.length === 0) {
      return this.teamMemberRepository.find({
        order: { fullName: 'ASC' },
      });
    }

    return this.teamMemberRepository.find({
      where: {
        id: Not(In(assignedIds)),
      },
      order: { fullName: 'ASC' },
    });
  }

  // Add team members to a project
  async addToProject(projectId: string, addToProjectDto: AddToProjectDto): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['teamMembers'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (project.isArchived) {
      throw new BadRequestException('Cannot modify team in archived project');
    }

    const teamMembers = await this.teamMemberRepository.findBy({
      id: In(addToProjectDto.teamMemberIds),
    });

    if (teamMembers.length !== addToProjectDto.teamMemberIds.length) {
      throw new NotFoundException('One or more team members not found');
    }

    // Check for duplicates
    const existingIds = new Set(project.teamMembers.map((tm) => tm.id));
    const duplicates = teamMembers.filter((tm) => existingIds.has(tm.id));

    if (duplicates.length > 0) {
      throw new ConflictException(
        `Team member(s) already assigned to project: ${duplicates.map((d) => d.fullName).join(', ')}`,
      );
    }

    project.teamMembers = [...project.teamMembers, ...teamMembers];
    return this.projectRepository.save(project);
  }

  // Remove a team member from a project
  async removeFromProject(projectId: string, teamMemberId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
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
      throw new NotFoundException(`Team member not found in this project`);
    }

    project.teamMembers.splice(memberIndex, 1);
    return this.projectRepository.save(project);
  }
}
