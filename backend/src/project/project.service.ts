import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { User } from '../entities/user.entity';
import { Card } from '../entities/card.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { WorkflowService } from '../workflow/workflow.service';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tenantService: TenantService,
    private workflowService: WorkflowService,
  ) {}

  async create(createProjectDto: CreateProjectDto, creatorUserId: string, orgId?: string): Promise<Project> {
    const [projectRepo, projectMemberRepo] = await Promise.all([
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(ProjectMember),
    ]);

    const { productOwnerId, pmoId, ...projectData } = createProjectDto;
    const project = projectRepo.create({ ...projectData, ...(orgId ? { organizationId: orgId } : {}) });

    if (productOwnerId) {
      const productOwner = await this.userRepository.findOne({ where: { id: productOwnerId } });
      if (!productOwner) throw new NotFoundException(`Product Owner with ID ${productOwnerId} not found`);
      project.productOwner = productOwner;
    }

    if (pmoId) {
      const pmo = await this.userRepository.findOne({ where: { id: pmoId } });
      if (!pmo) throw new NotFoundException(`PMO with ID ${pmoId} not found`);
      project.pmo = pmo;
    }

    const savedProject = await projectRepo.save(project);

    try {
      await this.workflowService.seedDefaultWorkflow(savedProject.id, savedProject.organizationId || orgId || '');
    } catch {
      // Non-fatal — workflow can be created later if seeding fails
    }

    const creator = await this.userRepository.findOne({ where: { id: creatorUserId } });
    if (creator) {
      const projectMember = projectMemberRepo.create({
        project: savedProject,
        user: creator,
        role: 'Scrum Master',
        ...(orgId ? { organizationId: orgId } : {}),
        startDate: new Date(),
        isActive: true,
      });
      await projectMemberRepo.save(projectMember);
    }

    return savedProject;
  }

  async findAll(orgId?: string, isActive?: boolean, isArchived?: boolean): Promise<Project[]> {
    const projectRepo = await this.tenantService.getRepository(Project);
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (isArchived !== undefined) where.isArchived = isArchived;

    return projectRepo.find({
      where,
      relations: ['members', 'members.user', 'sprints', 'productOwner', 'pmo', 'teamMembers'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, orgId?: string): Promise<Project & { cards?: any[] }> {
    const [projectRepo, cardRepo] = await Promise.all([
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(Card),
    ]);

    const project = await projectRepo.findOne({
      where: { id },
      relations: ['members', 'members.user', 'sprints', 'productOwner', 'pmo', 'teamMembers'],
    });

    if (!project) throw new NotFoundException(`Project with ID ${id} not found`);

    const cards = await cardRepo.find({ where: { project: { id } } });
    return { ...project, cards };
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const projectRepo = await this.tenantService.getRepository(Project);
    const project = await this.findOne(id);
    const { productOwnerId, pmoId, ...projectData } = updateProjectDto as any;
    Object.assign(project, projectData);

    if (productOwnerId !== undefined) {
      if (productOwnerId === null) {
        project.productOwner = null;
      } else {
        const productOwner = await this.userRepository.findOne({ where: { id: productOwnerId } });
        if (!productOwner) throw new NotFoundException(`Product Owner with ID ${productOwnerId} not found`);
        project.productOwner = productOwner;
      }
    }

    if (pmoId !== undefined) {
      if (pmoId === null) {
        project.pmo = null;
      } else {
        const pmo = await this.userRepository.findOne({ where: { id: pmoId } });
        if (!pmo) throw new NotFoundException(`PMO with ID ${pmoId} not found`);
        project.pmo = pmo;
      }
    }

    return projectRepo.save(project);
  }

  async remove(id: string): Promise<void> {
    const projectRepo = await this.tenantService.getRepository(Project);
    const project = await this.findOne(id);
    await projectRepo.remove(project);
  }

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    const projectMemberRepo = await this.tenantService.getRepository(ProjectMember);
    await this.findOne(projectId);
    return projectMemberRepo.find({
      where: { project: { id: projectId } },
      relations: ['user', 'user.roles'],
      order: { createdAt: 'ASC' },
    });
  }

  async addMember(projectId: string, addMemberDto: AddMemberDto): Promise<ProjectMember> {
    const projectMemberRepo = await this.tenantService.getRepository(ProjectMember);
    const project = await this.findOne(projectId);
    const user = await this.userRepository.findOne({ where: { id: addMemberDto.userId } });
    if (!user) throw new NotFoundException(`User with ID ${addMemberDto.userId} not found`);

    const existingMember = await projectMemberRepo.findOne({
      where: { project: { id: projectId }, user: { id: addMemberDto.userId }, isActive: true },
    });
    if (existingMember) throw new ConflictException('User is already a member of this project');

    const member = projectMemberRepo.create({
      project,
      user,
      role: addMemberDto.role,
      startDate: addMemberDto.startDate ? new Date(addMemberDto.startDate) : new Date(),
      endDate: addMemberDto.endDate ? new Date(addMemberDto.endDate) : null,
    });

    return projectMemberRepo.save(member);
  }

  async removeMember(projectId: string, memberId: string): Promise<void> {
    const projectMemberRepo = await this.tenantService.getRepository(ProjectMember);
    await this.findOne(projectId);

    const member = await projectMemberRepo.findOne({ where: { id: memberId, project: { id: projectId } } });
    if (!member) throw new NotFoundException(`Member with ID ${memberId} not found in this project`);

    await projectMemberRepo.remove(member);
  }

  async isNameUnique(name: string, orgId?: string, excludeId?: string): Promise<boolean> {
    const projectRepo = await this.tenantService.getRepository(Project);
    const project = await projectRepo.findOne({ where: { name } });
    if (!project) return true;
    if (excludeId && project.id === excludeId) return true;
    return false;
  }

  async archive(id: string): Promise<Project> {
    const projectRepo = await this.tenantService.getRepository(Project);
    const project = await this.findOne(id);
    project.isArchived = true;
    project.isActive = false;
    return projectRepo.save(project);
  }

  async findOrphanedProjects(): Promise<{ id: string; name: string; productOwnerId: string | null; pmoId: string | null }[]> {
    const projectRepo = await this.tenantService.getRepository(Project);
    const validUsers = await this.userRepository.find({ select: ['id'] });
    const validIds = validUsers.map((u) => u.id);

    const all = await projectRepo
      .createQueryBuilder('p')
      .select(['p.id', 'p.name'])
      .addSelect('p.product_owner_id', 'productOwnerId')
      .addSelect('p.pmo_id', 'pmoId')
      .where('p.deleted_at IS NULL')
      .getRawMany();

    return all.filter(
      (row) =>
        (row.productOwnerId && !validIds.includes(row.productOwnerId)) ||
        (row.pmoId && !validIds.includes(row.pmoId)),
    );
  }

  async reassignOwner(dto: {
    fromUserId?: string;
    toUserId: string;
  }): Promise<{ productOwnerUpdated: number; pmoUpdated: number }> {
    const projectRepo = await this.tenantService.getRepository(Project);

    const toUser = await this.userRepository.findOne({ where: { id: dto.toUserId } });
    if (!toUser) throw new NotFoundException(`User ${dto.toUserId} not found`);

    let targetIds: string[] | null = null;
    if (dto.fromUserId) {
      targetIds = [dto.fromUserId];
    } else {
      const validUsers = await this.userRepository.find({ select: ['id'] });
      const validIds = validUsers.map((u) => u.id);
      const all = await projectRepo
        .createQueryBuilder('p')
        .select(['p.id'])
        .addSelect('p.product_owner_id', 'productOwnerId')
        .addSelect('p.pmo_id', 'pmoId')
        .where('p.deleted_at IS NULL')
        .getRawMany();

      const orphanOwnerIds = [...new Set(
        all
          .filter((r) => r.productOwnerId && !validIds.includes(r.productOwnerId))
          .map((r) => r.productOwnerId as string),
      )];
      const orphanPmoIds = [...new Set(
        all
          .filter((r) => r.pmoId && !validIds.includes(r.pmoId))
          .map((r) => r.pmoId as string),
      )];
      targetIds = [...new Set([...orphanOwnerIds, ...orphanPmoIds])];
    }

    if (!targetIds.length) {
      return { productOwnerUpdated: 0, pmoUpdated: 0 };
    }

    const poResult = await projectRepo
      .createQueryBuilder()
      .update(Project)
      .set({ productOwner: toUser })
      .where('product_owner_id IN (:...ids)', { ids: targetIds })
      .execute();

    const pmoResult = await projectRepo
      .createQueryBuilder()
      .update(Project)
      .set({ pmo: toUser })
      .where('pmo_id IN (:...ids)', { ids: targetIds })
      .execute();

    return {
      productOwnerUpdated: poResult.affected ?? 0,
      pmoUpdated: pmoResult.affected ?? 0,
    };
  }
}
