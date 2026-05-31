import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Not } from 'typeorm';
import { Sprint, SprintStatus, SprintCreationType } from '../entities/sprint.entity';
import { Project } from '../entities/project.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { GenerateSprintsDto, PreviewSprintsDto } from './dto/generate-sprints.dto';
import { CardService } from '../card/card.service';
import { TenantService } from '../tenant/tenant.service';

export interface SprintPreview {
  name: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  dailyStandupCount: number;
}

@Injectable()
export class SprintService {
  constructor(
    private tenantService: TenantService,
    @Inject(forwardRef(() => CardService))
    private cardService: CardService,
  ) {}

  async create(createSprintDto: CreateSprintDto, orgId?: string): Promise<Sprint> {
    const [sprintRepo, projectRepo] = await Promise.all([
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(Project),
    ]);

    const { projectId, name, goal, startDate, endDate, dailyStandupCount, slotTimes } = createSprintDto;
    const project = await projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);
    if (project.isArchived) throw new BadRequestException('Cannot create sprints in archived project');
    if (!project.startDate || !project.endDate) throw new BadRequestException('Project must have valid start and end dates');

    const start = new Date(startDate);
    const end = new Date(endDate);
    await this.validateSprintDates(start, end, project, null);
    await this.validateUniqueSprintName(name, projectId, null);

    const sprint = sprintRepo.create({
      name,
      goal,
      startDate: start,
      endDate: end,
      status: this.calculateSprintStatus(start, end),
      creationType: SprintCreationType.MANUAL,
      isClosed: false,
      dailyStandupCount: dailyStandupCount || 1,
      slotTimes: slotTimes || null,
      project,
      ...(orgId ? { organizationId: orgId } : {}),
    });

    return sprintRepo.save(sprint);
  }

  async previewSprints(previewDto: PreviewSprintsDto): Promise<SprintPreview[]> {
    const projectRepo = await this.tenantService.getRepository(Project);
    const { projectId, sprintDurationWeeks, namePrefix, dailyStandupCount } = previewDto;

    const project = await projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);
    if (!project.endDate) throw new BadRequestException('Project must have an end date for auto-generation');

    const previews: SprintPreview[] = [];
    let sprintNumber = 1;
    let currentStartDate = new Date(project.startDate);
    const projectEndDate = new Date(project.endDate);
    const prefix = namePrefix || 'Sprint';

    while (currentStartDate < projectEndDate) {
      const sprintEndDate = new Date(currentStartDate);
      sprintEndDate.setDate(sprintEndDate.getDate() + sprintDurationWeeks * 7 - 1);
      const finalEndDate = sprintEndDate > projectEndDate ? projectEndDate : sprintEndDate;
      const durationDays = Math.ceil((finalEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      previews.push({ name: `${prefix} ${sprintNumber}`, startDate: new Date(currentStartDate), endDate: finalEndDate, durationDays, dailyStandupCount: dailyStandupCount || 1 });

      currentStartDate = new Date(finalEndDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);
      sprintNumber++;
      if (sprintNumber > 100) throw new BadRequestException('Cannot generate more than 100 sprints');
    }

    return previews;
  }

  async generateSprints(generateDto: GenerateSprintsDto, orgId?: string): Promise<Sprint[]> {
    const [sprintRepo, projectRepo] = await Promise.all([
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(Project),
    ]);

    const { projectId, sprintDurationWeeks, namePrefix, dailyStandupCount, slotTimes } = generateDto;
    const project = await projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);
    if (project.isArchived) throw new BadRequestException('Cannot generate sprints in archived project');
    if (!project.endDate) throw new BadRequestException('Auto-generation requires project end date');

    const existingSprints = await sprintRepo.find({ where: { project: { id: projectId } }, order: { startDate: 'ASC' } });

    const sprints: Sprint[] = [];
    let sprintNumber = 1;
    let currentStartDate = new Date(project.startDate);
    const projectEndDate = new Date(project.endDate);
    const prefix = namePrefix || 'Sprint';

    while (currentStartDate < projectEndDate) {
      const sprintEndDate = new Date(currentStartDate);
      sprintEndDate.setDate(sprintEndDate.getDate() + sprintDurationWeeks * 7 - 1);
      const finalEndDate = sprintEndDate > projectEndDate ? projectEndDate : sprintEndDate;

      const hasOverlap = this.checkSprintOverlap(currentStartDate, finalEndDate, existingSprints, null);
      if (hasOverlap) throw new BadRequestException('Auto-generated sprint would overlap with existing sprint. Resolve conflicts before auto-generating.');

      const sprint = sprintRepo.create({
        name: `${prefix} ${sprintNumber}`,
        goal: `Auto-generated sprint ${sprintNumber}`,
        startDate: currentStartDate,
        endDate: finalEndDate,
        status: this.calculateSprintStatus(currentStartDate, finalEndDate),
        creationType: SprintCreationType.AUTO_GENERATED,
        isClosed: false,
        dailyStandupCount: dailyStandupCount || 1,
        slotTimes: slotTimes || null,
        project,
        ...(orgId ? { organizationId: orgId } : {}),
      });

      sprints.push(sprint);
      currentStartDate = new Date(finalEndDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);
      sprintNumber++;
      if (sprintNumber > 100) throw new BadRequestException('Cannot generate more than 100 sprints');
    }

    if (sprints.length === 0) throw new BadRequestException('Cannot generate sprints with selected duration');
    return sprintRepo.save(sprints);
  }

  async findAll(projectId?: string, status?: SprintStatus, search?: string, orgId?: string): Promise<Sprint[]> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const qb = sprintRepo
      .createQueryBuilder('sprint')
      .leftJoinAndSelect('sprint.project', 'project')
      .orderBy('sprint.startDate', 'ASC');

    if (projectId) qb.andWhere('sprint.project.id = :projectId', { projectId });
    if (status) qb.andWhere('sprint.status = :status', { status });
    if (search) qb.andWhere('LOWER(sprint.name) LIKE LOWER(:search)', { search: `%${search}%` });

    const sprints = await qb.getMany();
    return this.updateSprintStatuses(sprints);
  }

  async findOne(id: string, organizationId?: string): Promise<Sprint> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const sprint = await sprintRepo.findOne({ where: { id }, relations: ['project'] });
    if (!sprint) throw new NotFoundException(`Sprint with ID ${id} not found`);

    sprint.status = this.calculateSprintStatus(sprint.startDate, sprint.endDate, sprint.isClosed);
    await sprintRepo.save(sprint);
    return sprint;
  }

  async update(id: string, updateSprintDto: UpdateSprintDto, organizationId?: string): Promise<Sprint> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const sprint = await this.findOne(id);
    if (sprint.project.isArchived) throw new BadRequestException('Cannot update sprints in archived project');
    if (sprint.isClosed) throw new BadRequestException('Closed sprint cannot be edited');

    const { name, goal, startDate, endDate, dailyStandupCount, slotTimes } = updateSprintDto;

    if (startDate || endDate) {
      const newStartDate = startDate ? new Date(startDate) : sprint.startDate;
      const newEndDate = endDate ? new Date(endDate) : sprint.endDate;
      await this.validateSprintDates(newStartDate, newEndDate, sprint.project, id);
      sprint.startDate = newStartDate;
      sprint.endDate = newEndDate;
      sprint.status = this.calculateSprintStatus(newStartDate, newEndDate, sprint.isClosed);
    }

    if (name && name !== sprint.name) {
      await this.validateUniqueSprintName(name, sprint.project.id, id);
      sprint.name = name;
    }

    if (goal !== undefined) sprint.goal = goal;
    if (dailyStandupCount !== undefined) sprint.dailyStandupCount = dailyStandupCount;
    if (slotTimes !== undefined) sprint.slotTimes = slotTimes;

    return sprintRepo.save(sprint);
  }

  async remove(id: string, organizationId?: string): Promise<void> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const sprint = await sprintRepo.findOne({ where: { id }, relations: ['project', 'standupUpdates'] });
    if (!sprint) throw new NotFoundException(`Sprint with ID ${id} not found`);
    if (sprint.project.isArchived) throw new BadRequestException('Cannot delete sprints in archived project');
    if (sprint.standupUpdates && sprint.standupUpdates.length > 0) throw new BadRequestException('Sprint contains snap history. Sprint cannot be deleted.');

    const status = this.calculateSprintStatus(sprint.startDate, sprint.endDate, sprint.isClosed);
    if (status === SprintStatus.ACTIVE) throw new BadRequestException('Active sprint cannot be deleted');

    await sprintRepo.remove(sprint);
  }

  async closeSprint(id: string, organizationId?: string): Promise<Sprint> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const sprint = await this.findOne(id);
    if (sprint.project.isArchived) throw new BadRequestException('Cannot close sprints in archived project');
    if (sprint.isClosed) throw new BadRequestException('Sprint is already closed');

    const status = this.calculateSprintStatus(sprint.startDate, sprint.endDate, sprint.isClosed);
    if (status === SprintStatus.UPCOMING) throw new BadRequestException('Upcoming sprints cannot be closed');

    const allCardsCompleted = await this.cardService.areAllCardsCompleted(id);
    if (!allCardsCompleted) throw new BadRequestException('Sprint contains active cards. Complete or move all active cards before closing the sprint.');

    sprint.isClosed = true;
    sprint.status = SprintStatus.CLOSED;
    await this.cardService.closeAllCardsInSprint(id);

    return sprintRepo.save(sprint);
  }

  private async validateSprintDates(startDate: Date, endDate: Date, project: Project, excludeSprintId: string | null): Promise<void> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const normalizeDate = (date: Date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; };

    const normalizedStart = normalizeDate(startDate);
    const normalizedEnd = normalizeDate(endDate);
    const normalizedProjectStart = normalizeDate(new Date(project.startDate));
    const normalizedProjectEnd = normalizeDate(new Date(project.endDate));

    if (normalizedStart < normalizedProjectStart) throw new BadRequestException('Sprint must lie within project timeline');
    if (normalizedEnd > normalizedProjectEnd) throw new BadRequestException('Sprint must lie within project timeline');
    if (normalizedStart > normalizedEnd) throw new BadRequestException('Sprint start date must be before or equal to end date');

    const existingSprints = await sprintRepo.find({ where: { project: { id: project.id } } });
    if (this.checkSprintOverlap(normalizedStart, normalizedEnd, existingSprints, excludeSprintId)) {
      throw new BadRequestException('Sprint overlaps with existing sprint');
    }
  }

  private checkSprintOverlap(startDate: Date, endDate: Date, existingSprints: Sprint[], excludeSprintId: string | null): boolean {
    const normalizeDate = (date: Date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; };
    const newStart = normalizeDate(startDate).getTime();
    const newEnd = normalizeDate(endDate).getTime();

    for (const sprint of existingSprints) {
      if (excludeSprintId && sprint.id === excludeSprintId) continue;
      const existingStart = normalizeDate(sprint.startDate).getTime();
      const existingEnd = normalizeDate(sprint.endDate).getTime();
      if (newStart <= existingEnd && newEnd >= existingStart) return true;
    }
    return false;
  }

  private async validateUniqueSprintName(name: string, projectId: string, excludeSprintId: string | null): Promise<void> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const qb = sprintRepo.createQueryBuilder('sprint').where('sprint.project.id = :projectId', { projectId }).andWhere('LOWER(sprint.name) = LOWER(:name)', { name });
    if (excludeSprintId) qb.andWhere('sprint.id != :excludeSprintId', { excludeSprintId });
    const existingSprint = await qb.getOne();
    if (existingSprint) throw new BadRequestException('Sprint name must be unique within project');
  }

  private calculateSprintStatus(startDate: Date, endDate: Date, isClosed = false): SprintStatus {
    if (isClosed) return SprintStatus.CLOSED;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    if (today < start) return SprintStatus.UPCOMING;
    if (today >= start && today <= end) return SprintStatus.ACTIVE;
    return SprintStatus.COMPLETED;
  }

  private async updateSprintStatuses(sprints: Sprint[]): Promise<Sprint[]> {
    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const updatedSprints: Sprint[] = [];
    for (const sprint of sprints) {
      const newStatus = this.calculateSprintStatus(sprint.startDate, sprint.endDate, sprint.isClosed);
      if (sprint.status !== newStatus) {
        sprint.status = newStatus;
        await sprintRepo.save(sprint);
      }
      updatedSprints.push(sprint);
    }
    return updatedSprints;
  }
}
