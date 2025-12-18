import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Resource, ResourceRAGStatus, ResourceRole } from '../entities/resource.entity';
import { ResourceWorkload } from '../entities/resource-workload.entity';
import { Project } from '../entities/project.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { CreateResourceWorkloadDto, UpdateResourceWorkloadDto } from './dto/resource-workload.dto';

@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceWorkload)
    private workloadRepository: Repository<ResourceWorkload>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  /**
   * RT-UC07: Auto Calculate Load % and RAG Status
   */
  private calculateLoadAndRAG(availability: number, workload: number): { loadPercentage: number; ragStatus: ResourceRAGStatus } {
    if (availability <= 0) {
      return { loadPercentage: 0, ragStatus: ResourceRAGStatus.GREEN };
    }

    const loadPercentage = (workload / availability) * 100;

    let ragStatus: ResourceRAGStatus;
    if (loadPercentage < 80) {
      ragStatus = ResourceRAGStatus.GREEN;
    } else if (loadPercentage >= 80 && loadPercentage <= 100) {
      ragStatus = ResourceRAGStatus.AMBER;
    } else {
      ragStatus = ResourceRAGStatus.RED;
    }

    return { loadPercentage: Math.round(loadPercentage * 100) / 100, ragStatus };
  }

  /**
   * RT-UC01: Create Resource Entry
   */
  async create(createResourceDto: CreateResourceDto): Promise<Resource> {
    const { projectId, name, role, customRoleName, skills, weeklyAvailability, weeklyWorkload, notes } = createResourceDto;

    // Verify project exists
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Check for duplicate resource name within project (optional)
    const existingResource = await this.resourceRepository.findOne({
      where: { project: { id: projectId }, name },
    });
    if (existingResource) {
      throw new ConflictException(`Resource with name "${name}" already exists in this project`);
    }

    // Validate: if role is 'Other', customRoleName must be provided
    if (role === ResourceRole.OTHER && !customRoleName) {
      throw new ConflictException('Custom role name is required when role is "Other"');
    }

    // Set defaults
    const availability = weeklyAvailability ?? 40.0;
    const workload = weeklyWorkload ?? 0.0;

    // Calculate load% and RAG
    const { loadPercentage, ragStatus } = this.calculateLoadAndRAG(availability, workload);

    // Create resource
    const resource = this.resourceRepository.create({
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

    return this.resourceRepository.save(resource);
  }

  /**
   * RT-UC02: Edit Resource Details
   */
  async update(id: string, updateResourceDto: UpdateResourceDto): Promise<Resource> {
    const resource = await this.resourceRepository.findOne({ where: { id }, relations: ['project'] });
    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    const { name, role, customRoleName, skills, weeklyAvailability, weeklyWorkload, notes, isArchived } = updateResourceDto;

    // Update fields if provided
    if (name !== undefined) resource.name = name;
    if (role !== undefined) {
      resource.role = role;
      if (role === ResourceRole.OTHER && !customRoleName) {
        throw new ConflictException('Custom role name is required when role is "Other"');
      }
      resource.customRoleName = role === ResourceRole.OTHER ? customRoleName : null;
    }
    if (customRoleName !== undefined && resource.role === ResourceRole.OTHER) {
      resource.customRoleName = customRoleName;
    }
    if (skills !== undefined) resource.skills = skills;
    if (notes !== undefined) resource.notes = notes;
    if (isArchived !== undefined) resource.isArchived = isArchived;

    // RT-UC05 & RT-UC06: Update availability or workload
    if (weeklyAvailability !== undefined || weeklyWorkload !== undefined) {
      const availability = weeklyAvailability ?? resource.weeklyAvailability;
      const workload = weeklyWorkload ?? resource.weeklyWorkload;

      // Recalculate load% and RAG
      const { loadPercentage, ragStatus } = this.calculateLoadAndRAG(availability, workload);

      resource.weeklyAvailability = availability;
      resource.weeklyWorkload = workload;
      resource.loadPercentage = loadPercentage;
      resource.ragStatus = ragStatus;
    }

    return this.resourceRepository.save(resource);
  }

  /**
   * RT-UC03 & RT-UC17: Archive Resource
   */
  async archive(id: string): Promise<Resource> {
    return this.update(id, { isArchived: true });
  }

  /**
   * RT-UC04: View Resource Register Table
   */
  async findAll(projectId: string, includeArchived: boolean = false): Promise<Resource[]> {
    const where: any = { project: { id: projectId } };

    if (!includeArchived) {
      where.isArchived = false;
    }

    return this.resourceRepository.find({
      where,
      relations: ['project'],
      order: { name: 'ASC' },
    });
  }

  /**
   * RT-UC16: View Resource Details
   */
  async findOne(id: string): Promise<Resource> {
    const resource = await this.resourceRepository.findOne({
      where: { id },
      relations: ['project', 'workloads'],
    });

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }

    return resource;
  }

  /**
   * RT-UC14: Filter Resources
   */
  async filter(
    projectId: string,
    filters: {
      role?: ResourceRole;
      name?: string;
      minLoad?: number;
      maxLoad?: number;
      isArchived?: boolean;
    },
  ): Promise<Resource[]> {
    const queryBuilder = this.resourceRepository
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.project', 'project')
      .where('project.id = :projectId', { projectId });

    if (filters.role) {
      queryBuilder.andWhere('resource.role = :role', { role: filters.role });
    }

    if (filters.name) {
      queryBuilder.andWhere('resource.name ILIKE :name', { name: `%${filters.name}%` });
    }

    if (filters.minLoad !== undefined) {
      queryBuilder.andWhere('resource.loadPercentage >= :minLoad', { minLoad: filters.minLoad });
    }

    if (filters.maxLoad !== undefined) {
      queryBuilder.andWhere('resource.loadPercentage <= :maxLoad', { maxLoad: filters.maxLoad });
    }

    if (filters.isArchived !== undefined) {
      queryBuilder.andWhere('resource.isArchived = :isArchived', { isArchived: filters.isArchived });
    }

    return queryBuilder.orderBy('resource.name', 'ASC').getMany();
  }

  /**
   * RT-UC19: Manage Resource Workload (Create/Update Weekly Workload)
   */
  async createOrUpdateWeeklyWorkload(createDto: CreateResourceWorkloadDto): Promise<ResourceWorkload> {
    const { resourceId, weekStartDate, availability, workload, notes } = createDto;

    // Verify resource exists
    const resource = await this.resourceRepository.findOne({ where: { id: resourceId } });
    if (!resource) {
      throw new NotFoundException(`Resource with ID ${resourceId} not found`);
    }

    if (resource.isArchived) {
      throw new ConflictException('Cannot assign workload to an archived resource');
    }

    // Calculate week end date (6 days after start)
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    // Check if workload entry already exists for this week
    const existingWorkload = await this.workloadRepository.findOne({
      where: { resource: { id: resourceId }, weekStartDate: startDate },
    });

    // Calculate load% and RAG
    const { loadPercentage, ragStatus } = this.calculateLoadAndRAG(availability, workload);

    if (existingWorkload) {
      // Update existing
      existingWorkload.availability = availability;
      existingWorkload.workload = workload;
      existingWorkload.loadPercentage = loadPercentage;
      existingWorkload.ragStatus = ragStatus;
      if (notes !== undefined) existingWorkload.notes = notes;

      return this.workloadRepository.save(existingWorkload);
    } else {
      // Create new
      const newWorkload = this.workloadRepository.create({
        resource,
        weekStartDate: startDate,
        weekEndDate: endDate,
        availability,
        workload,
        loadPercentage,
        ragStatus,
        notes,
      });

      return this.workloadRepository.save(newWorkload);
    }
  }

  /**
   * Get Resource Workload Data (for populating the modal)
   */
  async getResourceWorkload(resourceId: string): Promise<any> {
    try {
      console.log(`[ResourceService] getResourceWorkload called for resource: ${resourceId}`);

      // Get all workload entries for this resource
      const workloads = await this.workloadRepository.find({
        where: { resource: { id: resourceId } },
        order: { weekStartDate: 'ASC' },
      });

      console.log(`[ResourceService] Found ${workloads.length} workload entries for resource ${resourceId}`);

      return workloads.map(w => ({
        weekStartDate: w.weekStartDate,
        weekEndDate: w.weekEndDate,
        availability: w.availability,
        workload: w.workload,
        loadPercentage: w.loadPercentage,
        ragStatus: w.ragStatus,
        notes: w.notes,
      }));
    } catch (error) {
      console.error('[ResourceService] Error in getResourceWorkload:', error);
      throw error;
    }
  }

  /**
   * RT-UC09/RT-UC10/RT-UC11: Get Heatmap Data (Monthly, Weekly, Daily)
   */
  async getHeatmapData(projectId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      console.log(`[ResourceService] getHeatmapData called with projectId: ${projectId}, startDate: ${startDate}, endDate: ${endDate}`);

      const resources = await this.findAll(projectId, false);
      console.log(`[ResourceService] Found ${resources.length} resources for project ${projectId}`);

      const workloads = await this.workloadRepository
        .createQueryBuilder('workload')
        .leftJoinAndSelect('workload.resource', 'resource')
        .leftJoin('resource.project', 'project')
        .where('project.id = :projectId', { projectId })
        .andWhere('workload.weekStartDate >= :startDate', { startDate })
        .andWhere('workload.weekStartDate <= :endDate', { endDate })
        .orderBy('workload.weekStartDate', 'ASC')
        .getMany();

      console.log(`[ResourceService] Found ${workloads.length} workload entries`);

      // Group workloads by resource
      const heatmapData = resources.map((resource) => {
        const resourceWorkloads = workloads.filter((w) => w.resource.id === resource.id);
        console.log(`[ResourceService] Resource ${resource.name} has ${resourceWorkloads.length} workload entries`);

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

      console.log(`[ResourceService] Returning heatmap data with ${heatmapData.length} resources`);
      return heatmapData;
    } catch (error) {
      console.error('[ResourceService] Error in getHeatmapData:', error);
      throw error;
    }
  }

  /**
   * Get Resource Capacity Summary (for dashboard widgets)
   */
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

    return {
      totalResources: resources.length,
      underutilized,
      ideal,
      overloaded,
      ragDistribution,
    };
  }

  /**
   * Delete Resource (not in MVP but useful for testing)
   */
  async remove(id: string): Promise<void> {
    const resource = await this.findOne(id);
    await this.resourceRepository.remove(resource);
  }
}
