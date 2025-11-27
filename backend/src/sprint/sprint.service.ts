import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Sprint, SprintStatus, SprintCreationType } from '../entities/sprint.entity';
import { Project } from '../entities/project.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { GenerateSprintsDto, PreviewSprintsDto } from './dto/generate-sprints.dto';
import { CardService } from '../card/card.service';

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
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @Inject(forwardRef(() => CardService))
    private cardService: CardService,
  ) {}

  /**
   * M6-UC01: Create Sprint (Manual)
   * Business Validations:
   * - Dates within project start/end
   * - End Date >= Start Date
   * - No sprint overlap across ALL sprints (manual or auto)
   * - Sprint name unique
   */
  async create(createSprintDto: CreateSprintDto): Promise<Sprint> {
    const { projectId, name, goal, startDate, endDate, dailyStandupCount, slotTimes } = createSprintDto;

    // Find the project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Validate project is not archived
    if (project.isArchived) {
      throw new BadRequestException('Cannot create sprints in archived project');
    }

    // Validate project has valid start & end dates
    if (!project.startDate || !project.endDate) {
      throw new BadRequestException('Project must have valid start and end dates');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate sprint dates
    await this.validateSprintDates(start, end, project, null);

    // Validate unique sprint name within project
    await this.validateUniqueSprintName(name, projectId, null);

    // Create sprint
    const sprint = this.sprintRepository.create({
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
    });

    return this.sprintRepository.save(sprint);
  }

  /**
   * M6-UC01: Generate Sprints Preview
   * Returns a preview of sprints that would be created
   */
  async previewSprints(previewDto: PreviewSprintsDto): Promise<SprintPreview[]> {
    const { projectId, sprintDurationWeeks, namePrefix, dailyStandupCount } = previewDto;

    // Find the project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Validate project has end date for auto-generation
    if (!project.endDate) {
      throw new BadRequestException('Project must have an end date for auto-generation');
    }

    const previews: SprintPreview[] = [];
    let sprintNumber = 1;
    let currentStartDate = new Date(project.startDate);
    const projectEndDate = new Date(project.endDate);
    const prefix = namePrefix || 'Sprint';

    while (currentStartDate < projectEndDate) {
      // Calculate end date for this sprint
      const sprintEndDate = new Date(currentStartDate);
      sprintEndDate.setDate(sprintEndDate.getDate() + sprintDurationWeeks * 7 - 1);

      // If sprint end date exceeds project end date, adjust it
      const finalEndDate = sprintEndDate > projectEndDate ? projectEndDate : sprintEndDate;

      // Calculate duration in days
      const durationDays = Math.ceil((finalEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      previews.push({
        name: `${prefix} ${sprintNumber}`,
        startDate: new Date(currentStartDate),
        endDate: finalEndDate,
        durationDays,
        dailyStandupCount: dailyStandupCount || 1,
      });

      // Move to next sprint start date
      currentStartDate = new Date(finalEndDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);

      sprintNumber++;

      // Safety check to prevent infinite loops
      if (sprintNumber > 100) {
        throw new BadRequestException('Cannot generate more than 100 sprints');
      }
    }

    return previews;
  }

  /**
   * M6-UC01: Auto-Generate Sprints
   * Business Validations:
   * - Auto-generated sprints do not overlap with existing sprints
   * - Duration fits inside project timeline
   * - Project has valid end date
   */
  async generateSprints(generateDto: GenerateSprintsDto): Promise<Sprint[]> {
    const { projectId, sprintDurationWeeks, namePrefix, dailyStandupCount, slotTimes } = generateDto;

    // Find the project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Validate project is not archived
    if (project.isArchived) {
      throw new BadRequestException('Cannot generate sprints in archived project');
    }

    // Validate project has end date
    if (!project.endDate) {
      throw new BadRequestException('Auto-generation requires project end date');
    }

    // Get existing sprints to check for overlaps
    const existingSprints = await this.sprintRepository.find({
      where: { project: { id: projectId } },
      order: { startDate: 'ASC' },
    });

    const sprints: Sprint[] = [];
    let sprintNumber = 1;
    let currentStartDate = new Date(project.startDate);
    const projectEndDate = new Date(project.endDate);
    const prefix = namePrefix || 'Sprint';

    while (currentStartDate < projectEndDate) {
      // Calculate end date for this sprint
      const sprintEndDate = new Date(currentStartDate);
      sprintEndDate.setDate(sprintEndDate.getDate() + sprintDurationWeeks * 7 - 1);

      // If sprint end date exceeds project end date, adjust it
      const finalEndDate = sprintEndDate > projectEndDate ? projectEndDate : sprintEndDate;

      // Check for overlap with existing sprints
      const hasOverlap = this.checkSprintOverlap(
        currentStartDate,
        finalEndDate,
        existingSprints,
        null,
      );

      if (hasOverlap) {
        throw new BadRequestException(
          `Auto-generated sprint would overlap with existing sprint. Resolve conflicts before auto-generating.`,
        );
      }

      // Create sprint
      const sprint = this.sprintRepository.create({
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
      });

      sprints.push(sprint);

      // Move to next sprint start date
      currentStartDate = new Date(finalEndDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);

      sprintNumber++;

      // Safety check to prevent infinite loops
      if (sprintNumber > 100) {
        throw new BadRequestException('Cannot generate more than 100 sprints');
      }
    }

    // Validate duration fits
    if (sprints.length === 0) {
      throw new BadRequestException('Cannot generate sprints with selected duration');
    }

    // Save all sprints in one batch
    return this.sprintRepository.save(sprints);
  }

  /**
   * M6-UC02 & M6-UC07: Find all sprints with filtering and search
   */
  async findAll(
    projectId?: string,
    status?: SprintStatus,
    search?: string,
  ): Promise<Sprint[]> {
    const queryBuilder = this.sprintRepository
      .createQueryBuilder('sprint')
      .leftJoinAndSelect('sprint.project', 'project')
      .orderBy('sprint.startDate', 'ASC');

    // Filter by project if provided
    if (projectId) {
      queryBuilder.andWhere('sprint.project.id = :projectId', { projectId });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('sprint.status = :status', { status });
    }

    // Search by name
    if (search) {
      queryBuilder.andWhere('LOWER(sprint.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    const sprints = await queryBuilder.getMany();

    // Update sprint statuses based on current date
    return this.updateSprintStatuses(sprints);
  }

  /**
   * M6-UC02: Find one sprint with details
   */
  async findOne(id: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${id} not found`);
    }

    // Update status based on current date
    sprint.status = this.calculateSprintStatus(sprint.startDate, sprint.endDate, sprint.isClosed);
    await this.sprintRepository.save(sprint);

    return sprint;
  }

  /**
   * M6-UC03: Update Sprint Details
   * Business Validations:
   * - Start Date >= Project Start Date
   * - End Date <= Project End Date
   * - End Date >= Start Date
   * - Updated dates do NOT overlap with ANY other sprint
   * - Sprint Name remains unique
   */
  async update(id: string, updateSprintDto: UpdateSprintDto): Promise<Sprint> {
    const sprint = await this.findOne(id);

    // Validate project is not archived
    if (sprint.project.isArchived) {
      throw new BadRequestException('Cannot update sprints in archived project');
    }

    // Validate sprint is not closed
    if (sprint.isClosed) {
      throw new BadRequestException('Closed sprint cannot be edited');
    }

    const { name, goal, startDate, endDate, dailyStandupCount, slotTimes } = updateSprintDto;

    // If dates are being updated, validate them
    if (startDate || endDate) {
      const newStartDate = startDate ? new Date(startDate) : sprint.startDate;
      const newEndDate = endDate ? new Date(endDate) : sprint.endDate;

      await this.validateSprintDates(newStartDate, newEndDate, sprint.project, id);

      sprint.startDate = newStartDate;
      sprint.endDate = newEndDate;
      sprint.status = this.calculateSprintStatus(newStartDate, newEndDate, sprint.isClosed);
    }

    // If name is being updated, validate uniqueness
    if (name && name !== sprint.name) {
      await this.validateUniqueSprintName(name, sprint.project.id, id);
      sprint.name = name;
    }

    // Update goal if provided
    if (goal !== undefined) {
      sprint.goal = goal;
    }

    // Update dailyStandupCount if provided
    if (dailyStandupCount !== undefined) {
      sprint.dailyStandupCount = dailyStandupCount;
    }

    // Update slotTimes if provided
    if (slotTimes !== undefined) {
      sprint.slotTimes = slotTimes;
    }

    return this.sprintRepository.save(sprint);
  }

  /**
   * M6-UC04: Delete Sprint
   * Business Validations:
   * - Sprint cannot be deleted if it contains cards
   * - Sprint cannot be deleted if it contains snap history
   * - Sprint cannot be deleted if active today
   * - Project must not be archived
   */
  async remove(id: string): Promise<void> {
    const sprint = await this.sprintRepository.findOne({
      where: { id },
      relations: ['project', 'standupUpdates'],
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${id} not found`);
    }

    // Validate project is not archived
    if (sprint.project.isArchived) {
      throw new BadRequestException('Cannot delete sprints in archived project');
    }

    // Validate sprint has no snap history
    if (sprint.standupUpdates && sprint.standupUpdates.length > 0) {
      throw new BadRequestException('Sprint contains snap history. Sprint cannot be deleted.');
    }

    // Validate sprint is not currently active
    const status = this.calculateSprintStatus(sprint.startDate, sprint.endDate, sprint.isClosed);
    if (status === SprintStatus.ACTIVE) {
      throw new BadRequestException('Active sprint cannot be deleted');
    }

    // TODO: Add validation for cards when Card module is implemented
    // For now, we'll assume this check will be added later

    await this.sprintRepository.remove(sprint);
  }

  /**
   * M6-UC06: Close Sprint
   * Business Validations:
   * - Sprint is Active or Completed (NOT Upcoming)
   * - No active cards exist in this sprint
   * - Only SM/PO can close sprint
   * - Project not archived
   */
  async closeSprint(id: string): Promise<Sprint> {
    const sprint = await this.findOne(id);

    // Validate project is not archived
    if (sprint.project.isArchived) {
      throw new BadRequestException('Cannot close sprints in archived project');
    }

    // Validate sprint is not already closed
    if (sprint.isClosed) {
      throw new BadRequestException('Sprint is already closed');
    }

    // Validate sprint is Active or Completed
    const status = this.calculateSprintStatus(sprint.startDate, sprint.endDate, sprint.isClosed);
    if (status === SprintStatus.UPCOMING) {
      throw new BadRequestException('Upcoming sprints cannot be closed');
    }

    // M7-UC06: Validate all cards are completed
    const allCardsCompleted = await this.cardService.areAllCardsCompleted(id);
    if (!allCardsCompleted) {
      throw new BadRequestException('Sprint contains active cards. Complete or move all active cards before closing the sprint.');
    }

    sprint.isClosed = true;
    sprint.status = SprintStatus.CLOSED;

    // M7-UC06: Mark all completed cards as closed
    await this.cardService.closeAllCardsInSprint(id);

    return this.sprintRepository.save(sprint);
  }

  /**
   * Helper: Validate sprint dates
   */
  private async validateSprintDates(
    startDate: Date,
    endDate: Date,
    project: Project,
    excludeSprintId: string | null,
  ): Promise<void> {
    const projectStartDate = new Date(project.startDate);
    const projectEndDate = new Date(project.endDate);

    // Normalize dates to midnight for comparison
    const normalizeDate = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const normalizedStart = normalizeDate(startDate);
    const normalizedEnd = normalizeDate(endDate);
    const normalizedProjectStart = normalizeDate(projectStartDate);
    const normalizedProjectEnd = normalizeDate(projectEndDate);

    // Check if sprint start date is before project start date
    if (normalizedStart < normalizedProjectStart) {
      throw new BadRequestException('Sprint must lie within project timeline');
    }

    // Check if sprint end date is after project end date
    if (normalizedEnd > normalizedProjectEnd) {
      throw new BadRequestException('Sprint must lie within project timeline');
    }

    // Check if start date is before end date
    if (normalizedStart > normalizedEnd) {
      throw new BadRequestException('Sprint start date must be before or equal to end date');
    }

    // Check for overlap with existing sprints
    const existingSprints = await this.sprintRepository.find({
      where: { project: { id: project.id } },
    });

    const hasOverlap = this.checkSprintOverlap(
      normalizedStart,
      normalizedEnd,
      existingSprints,
      excludeSprintId,
    );

    if (hasOverlap) {
      throw new BadRequestException('Sprint overlaps with existing sprint');
    }
  }

  /**
   * Helper: Check if sprint dates overlap with existing sprints
   */
  private checkSprintOverlap(
    startDate: Date,
    endDate: Date,
    existingSprints: Sprint[],
    excludeSprintId: string | null,
  ): boolean {
    const normalizeDate = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const newStart = normalizeDate(startDate).getTime();
    const newEnd = normalizeDate(endDate).getTime();

    for (const sprint of existingSprints) {
      // Skip the sprint being edited
      if (excludeSprintId && sprint.id === excludeSprintId) {
        continue;
      }

      const existingStart = normalizeDate(sprint.startDate).getTime();
      const existingEnd = normalizeDate(sprint.endDate).getTime();

      // Check if there's any overlap
      if (newStart <= existingEnd && newEnd >= existingStart) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper: Validate unique sprint name
   */
  private async validateUniqueSprintName(
    name: string,
    projectId: string,
    excludeSprintId: string | null,
  ): Promise<void> {
    const queryBuilder = this.sprintRepository
      .createQueryBuilder('sprint')
      .where('sprint.project.id = :projectId', { projectId })
      .andWhere('LOWER(sprint.name) = LOWER(:name)', { name });

    if (excludeSprintId) {
      queryBuilder.andWhere('sprint.id != :excludeSprintId', { excludeSprintId });
    }

    const existingSprint = await queryBuilder.getOne();

    if (existingSprint) {
      throw new BadRequestException('Sprint name must be unique within project');
    }
  }

  /**
   * M6-UC05: Calculate sprint status based on dates
   */
  private calculateSprintStatus(startDate: Date, endDate: Date, isClosed: boolean = false): SprintStatus {
    if (isClosed) {
      return SprintStatus.CLOSED;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    if (today < start) {
      return SprintStatus.UPCOMING;
    } else if (today >= start && today <= end) {
      return SprintStatus.ACTIVE;
    } else {
      return SprintStatus.COMPLETED;
    }
  }

  /**
   * Helper: Update sprint statuses for a list of sprints
   */
  private async updateSprintStatuses(sprints: Sprint[]): Promise<Sprint[]> {
    const updatedSprints: Sprint[] = [];

    for (const sprint of sprints) {
      const newStatus = this.calculateSprintStatus(sprint.startDate, sprint.endDate, sprint.isClosed);
      if (sprint.status !== newStatus) {
        sprint.status = newStatus;
        await this.sprintRepository.save(sprint);
      }
      updatedSprints.push(sprint);
    }

    return updatedSprints;
  }
}
