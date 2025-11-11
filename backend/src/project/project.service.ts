import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { User } from '../entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create(createProjectDto);
    return this.projectRepository.save(project);
  }

  async findAll(isActive?: boolean): Promise<Project[]> {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.projectRepository.find({
      where,
      relations: ['members', 'members.user', 'sprints'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members', 'members.user', 'sprints'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepository.remove(project);
  }

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    await this.findOne(projectId); // Ensure project exists

    return this.projectMemberRepository.find({
      where: { project: { id: projectId } },
      relations: ['user', 'user.roles'],
      order: { createdAt: 'ASC' },
    });
  }

  async addMember(projectId: string, addMemberDto: AddMemberDto): Promise<ProjectMember> {
    const project = await this.findOne(projectId);
    const user = await this.userRepository.findOne({
      where: { id: addMemberDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${addMemberDto.userId} not found`);
    }

    // Check if user is already a member
    const existingMember = await this.projectMemberRepository.findOne({
      where: {
        project: { id: projectId },
        user: { id: addMemberDto.userId },
        isActive: true,
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this project');
    }

    const member = this.projectMemberRepository.create({
      project,
      user,
      role: addMemberDto.role,
      startDate: addMemberDto.startDate ? new Date(addMemberDto.startDate) : new Date(),
      endDate: addMemberDto.endDate ? new Date(addMemberDto.endDate) : null,
    });

    return this.projectMemberRepository.save(member);
  }

  async removeMember(projectId: string, memberId: string): Promise<void> {
    await this.findOne(projectId); // Ensure project exists

    const member = await this.projectMemberRepository.findOne({
      where: {
        id: memberId,
        project: { id: projectId },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found in this project`);
    }

    await this.projectMemberRepository.remove(member);
  }
}
