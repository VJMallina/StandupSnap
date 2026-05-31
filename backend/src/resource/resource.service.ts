import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Resource, ResourceRAGStatus, ResourceRole } from '../entities/resource.entity';
import { ResourceWorkload } from '../entities/resource-workload.entity';
import { Project } from '../entities/project.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { CreateResourceWorkloadDto } from './dto/resource-workload.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class ResourceService {
  constructor(private tenantService: TenantService) {}

  private calculateLoadAndRAG(
    availability: number,
    workload: number,
  ): { loadPercentage: number; ragStatus: ResourceRAGStatus } {
    if (availability <= 0) return { loadPercentage: 0, ragStatus: ResourceRAGStatus.GREEN };
    const loadPercentage = (workload / availability) * 100;
    let ragStatus: ResourceRAGStatus;
    if (loadPercentage < 80) ragStatus = ResourceRAGStatus.GREEN;
    else if (loadPercentage <= 100) ragStatus = ResourceRAGStatus.AMBER;
    else ragStatus = ResourceRAGStatus.RED;
    return { loadPercentage: Math.round(loadPercentage * 100) / 100, ragStatus };
  }

  async create(createResourceDto: CreateResourceDto): Promise<Resource> {
    const { projectId, name, role, customRoleName, skills, weeklyAvailability, weeklyWorkload, notes } = createResourceDto;
    const [resourceRepo, projectRepo] = await Promise.all([
      this.tenantService.getRepository(Resource),
      this.tenantService.getRepository(Project),
    ]);

    const project = await projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);

    const existingResource = await resourceRepo.findOne({ where: { project: { id: projectId }, name } });
    if (existingResource) throw new ConflictException(`Resource with name "${name}" already exists in this project`);

    if (role === ResourceRole.OTHER && !customRoleName) {
      throw new ConflictException('Custom role name is required when role is "Other"');
    }

    const availability = weeklyAvailability ?? 40.0;
    const workload = weeklyWorkload ?? 0.0;
    const { loadPercentage, ragStatus } = this.calculateLoadAndRAG(availability, workload);

    const resource = resourceRepo.create({
      project,
      name,
      role,
      customRoleName: role === ResourceRole.OTHER ? customRoleName : null,
      skills: skills || [],
      weeklyAvailability: availability,
      weeklyWorkload: workload,
      loadPercentage,
      ragStatus,
      notes,
      isArchived: false,
    });

    return resourceRepo.save(resource);
  }

  async update(id: string, updateResourceDto: UpdateResourceDto): Promise<Resource> {
    const resourceRepo = await this.tenantService.getRepository(Resource);
    const resource = await resourceRepo.findOne({ where: { id }, relations: ['project'] });
    if (!resource) throw new NotFoundException(`Resource with ID ${id} not found`);

    const { name, role, customRoleName, skills, weeklyAvailability, weeklyWorkload, notes, isArchived } = updateResourceDto;

    if (name !== undefined) resource.name = name;
    if (role !== undefined) {
      resource.role = role;
      if (role === ResourceRole.OTHER && !customRoleName) {
        throw new ConflictException('Custom role name is required when role is "Other"');
      }
      resource.customRoleName = role === ResourceRole.OTHER ? customRoleName : null;
    }
    if (customRoleName !== undefined && resource.role === ResourceRole.OTHER) resource.customRoleName = customRoleName;
    if (skills !== undefined) resource.skills = skills;
    if (notes !== undefined) resource.notes = notes;
    if (isArchived !== undefined) resource.isArchived = isArchived;

    if (weeklyAvailability !== undefined || weeklyWorkload !== undefined) {
      const availability = weeklyAvailability ?? resource.weeklyAvailability;
      const workload = weeklyWorkload ?? resource.weeklyWorkload;
      const { loadPercentage, ragStatus } = this.calculateLoadAndRAG(availability, workload);
      resource.weeklyAvailability = availability;
      resource.weeklyWorkload = workload;
      resource.loadPercentage = loadPercentage;
      resource.ragStatus = ragStatus;
    }

    return resourceRepo.save(resource);
  }

  async archive(id: string): Promise<Resource> {
    return this.update(id, { isArchived: true });
  }

  async findAll(projectId: string, includeArchived = false): Promise<Resource[]> {
    const resourceRepo = await this.tenantService.getRepository(Resource);
    const where: any = { project: { id: projectId } };
    if (!includeArchived) where.isArchived = false;
    return resourceRepo.find({ where, relations: ['project'], order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Resource> {
    const resourceRepo = await this.tenantService.getRepository(Resource);
    const resource = await resourceRepo.findOne({ where: { id }, relations: ['project', 'workloads'] });
    if (!resource) throw new NotFoundException(`Resource with ID ${id} not found`);
    return resource;
  }

  async filter(
    projectId: string,
    filters: { role?: ResourceRole; name?: string; minLoad?: number; maxLoad?: number; isArchived?: boolean },
  ): Promise<Resource[]> {
    const resourceRepo = await this.tenantService.getRepository(Resource);
    const qb = resourceRepo
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.project', 'project')
      .where('project.id = :projectId', { projectId });

    if (filters.role) qb.andWhere('resource.role = :role', { role: filters.role });
    if (filters.name) qb.andWhere('resource.name ILIKE :name', { name: `%${filters.name}%` });
    if (filters.minLoad !== undefined) qb.andWhere('resource.loadPercentage >= :minLoad', { minLoad: filters.minLoad });
    if (filters.maxLoad !== undefined) qb.andWhere('resource.loadPercentage <= :maxLoad', { maxLoad: filters.maxLoad });
    if (filters.isArchived !== undefined) qb.andWhere('resource.isArchived = :isArchived', { isArchived: filters.isArchived });

    return qb.orderBy('resource.name', 'ASC').getMany();
  }

  async createOrUpdateWeeklyWorkload(createDto: CreateResourceWorkloadDto): Promise<ResourceWorkload> {
    const { resourceId, weekStartDate, availability, workload, notes } = createDto;
    const [resourceRepo, workloadRepo] = await Promise.all([
      this.tenantService.getRepository(Resource),
      this.tenantService.getRepository(ResourceWorkload),
    ]);

    const resource = await resourceRepo.findOne({ where: { id: resourceId } });
    if (!resource) throw new NotFoundException(`Resource with ID ${resourceId} not found`);
    if (resource.isArchived) throw new ConflictException('Cannot assign workload to an archived resource');

    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const existingWorkload = await workloadRepo.findOne({ where: { resource: { id: resourceId }, weekStartDate: startDate } });
    const { loadPercentage, ragStatus } = this.calculateLoadAndRAG(availability, workload);

    if (existingWorkload) {
      existingWorkload.availability = availability;
      existingWorkload.workload = workload;
      existingWorkload.loadPercentage = loadPercentage;
      existingWorkload.ragStatus = ragStatus;
      if (notes !== undefined) existingWorkload.notes = notes;
      return workloadRepo.save(existingWorkload);
    }

    const newWorkload = workloadRepo.create({
      resource,
      weekStartDate: startDate,
      weekEndDate: endDate,
      availability,
      workload,
      loadPercentage,
      ragStatus,
      notes,
    });
    return workloadRepo.save(newWorkload);
  }

  async getResourceWorkload(resourceId: string): Promise<any> {
    const workloadRepo = await this.tenantService.getRepository(ResourceWorkload);
    const workloads = await workloadRepo.find({
      where: { resource: { id: resourceId } },
      order: { weekStartDate: 'ASC' },
    });
    return workloads.map((w) => ({
      weekStartDate: w.weekStartDate,
      weekEndDate: w.weekEndDate,
      availability: w.availability,
      workload: w.workload,
      loadPercentage: w.loadPercentage,
      ragStatus: w.ragStatus,
      notes: w.notes,
    }));
  }

  async getHeatmapData(projectId: string, startDate: Date, endDate: Date): Promise<any> {
    const workloadRepo = await this.tenantService.getRepository(ResourceWorkload);
    const resources = await this.findAll(projectId, false);

    const workloads = await workloadRepo
      .createQueryBuilder('workload')
      .leftJoinAndSelect('workload.resource', 'resource')
      .leftJoin('resource.project', 'project')
      .where('project.id = :projectId', { projectId })
      .andWhere('workload.weekStartDate >= :startDate', { startDate })
      .andWhere('workload.weekStartDate <= :endDate', { endDate })
      .orderBy('workload.weekStartDate', 'ASC')
      .getMany();

    return resources.map((resource) => {
      const resourceWorkloads = workloads.filter((w) => w.resource.id === resource.id);
      return {
        resourceId: resource.id,
        resourceName: resource.name,
        role: resource.role,
        weeklyData: resourceWorkloads.map((w) => ({
          weekStartDate: w.weekStartDate,
          weekEndDate: w.weekEndDate,
          availability: w.availability,
          workload: w.workload,
          loadPercentage: w.loadPercentage,
          ragStatus: w.ragStatus,
          notes: w.notes,
        })),
      };
    });
  }

  async getCapacitySummary(projectId: string): Promise<any> {
    const resources = await this.findAll(projectId, false);
    const underutilized = resources.filter((r) => r.loadPercentage < 80).length;
    const ideal = resources.filter((r) => r.loadPercentage >= 80 && r.loadPercentage <= 100).length;
    const overloaded = resources.filter((r) => r.loadPercentage > 100).length;
    const ragDistribution = {
      green: resources.filter((r) => r.ragStatus === ResourceRAGStatus.GREEN).length,
      amber: resources.filter((r) => r.ragStatus === ResourceRAGStatus.AMBER).length,
      red: resources.filter((r) => r.ragStatus === ResourceRAGStatus.RED).length,
    };
    return { totalResources: resources.length, underutilized, ideal, overloaded, ragDistribution };
  }

  async remove(id: string): Promise<void> {
    const resourceRepo = await this.tenantService.getRepository(Resource);
    const resource = await this.findOne(id);
    await resourceRepo.remove(resource);
  }
}
