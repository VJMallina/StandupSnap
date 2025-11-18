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

  async create(createProjectDto: CreateProjectDto, creatorUserId: string): Promise<Project> {
    const { productOwnerId, pmoId, ...projectData } = createProjectDto;

    const project = this.projectRepository.create(projectData);

    // Set Product Owner if provided
    if (productOwnerId) {
      const productOwner = await this.userRepository.findOne({
        where: { id: productOwnerId },
      });
      if (!productOwner) {
        throw new NotFoundException(`Product Owner with ID ${productOwnerId} not found`);
      }
      project.productOwner = productOwner;
    }

    // Set PMO if provided
    if (pmoId) {
      const pmo = await this.userRepository.findOne({
        where: { id: pmoId },
      });
      if (!pmo) {
        throw new NotFoundException(`PMO with ID ${pmoId} not found`);
      }
      project.pmo = pmo;
    }

    const savedProject = await this.projectRepository.save(project);

    // Automatically add the creator (Scrum Master) as a project member
    const creator = await this.userRepository.findOne({
      where: { id: creatorUserId },
    });

    if (creator) {
      const projectMember = this.projectMemberRepository.create({
        project: savedProject,
        user: creator,
        role: 'Scrum Master',
        startDate: new Date(),
        isActive: true,
      });

      await this.projectMemberRepository.save(projectMember);
    }

    return savedProject;
  }

  async findAll(isActive?: boolean, isArchived?: boolean): Promise<Project[]> {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (isArchived !== undefined) {
      where.isArchived = isArchived;
    }

    return this.projectRepository.find({
      where,
      relations: ['members', 'members.user', 'sprints', 'productOwner', 'pmo'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members', 'members.user', 'sprints', 'productOwner', 'pmo'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    const { productOwnerId, pmoId, ...projectData } = updateProjectDto as any;

    Object.assign(project, projectData);

    // Update Product Owner if provided
    if (productOwnerId !== undefined) {
      if (productOwnerId === null) {
        project.productOwner = null;
      } else {
        const productOwner = await this.userRepository.findOne({
          where: { id: productOwnerId },
        });
        if (!productOwner) {
          throw new NotFoundException(`Product Owner with ID ${productOwnerId} not found`);
        }
        project.productOwner = productOwner;
      }
    }

    // Update PMO if provided
    if (pmoId !== undefined) {
      if (pmoId === null) {
        project.pmo = null;
      } else {
        const pmo = await this.userRepository.findOne({
          where: { id: pmoId },
        });
        if (!pmo) {
          throw new NotFoundException(`PMO with ID ${pmoId} not found`);
        }
        project.pmo = pmo;
      }
    }

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

  async isNameUnique(name: string, excludeId?: string): Promise<boolean> {
    const where: any = { name };

    const project = await this.projectRepository.findOne({ where });

    if (!project) {
      return true; // No project with this name exists
    }

    // If excludeId is provided and matches the found project, name is still unique for that project
    if (excludeId && project.id === excludeId) {
      return true;
    }

    return false; // Name is already taken by another project
  }

  async archive(id: string): Promise<Project> {
    const project = await this.findOne(id);

    project.isArchived = true;
    project.isActive = false;

    return this.projectRepository.save(project);
  }
}
