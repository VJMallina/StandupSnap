import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sprint } from '../entities/sprint.entity';
import { Project } from '../entities/project.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { GenerateSprintsDto } from './dto/generate-sprints.dto';

@Injectable()
export class SprintService {
  constructor(
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(createSprintDto: CreateSprintDto): Promise<Sprint> {
    const { projectId, name, description, startDate, durationWeeks, status } =
      createSprintDto;

    // Find the project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Calculate end date based on duration
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + durationWeeks * 7);

    // Validate timeline
    await this.validateSprintTimeline(start, endDate, project);

    // Create sprint
    const sprint = this.sprintRepository.create({
      name,
      description,
      startDate: start,
      endDate,
      status: status || 'planned',
      project,
    });

    return this.sprintRepository.save(sprint);
  }

  async findAll(projectId?: string): Promise<Sprint[]> {
    if (projectId) {
      return this.sprintRepository.find({
        where: { project: { id: projectId } },
        relations: ['project'],
        order: { startDate: 'ASC' },
      });
    }

    return this.sprintRepository.find({
      relations: ['project'],
      order: { startDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${id} not found`);
    }

    return sprint;
  }

  async update(id: string, updateSprintDto: UpdateSprintDto): Promise<Sprint> {
    const sprint = await this.findOne(id);

    const { startDate, durationWeeks, ...otherUpdates } = updateSprintDto;

    // If start date or duration is being updated, recalculate end date and validate
    if (startDate || durationWeeks) {
      const newStartDate = startDate
        ? new Date(startDate)
        : sprint.startDate;
      const newDurationWeeks = durationWeeks || this.calculateDurationWeeks(sprint.startDate, sprint.endDate);
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + newDurationWeeks * 7);

      // Validate new timeline
      await this.validateSprintTimeline(
        newStartDate,
        newEndDate,
        sprint.project,
      );

      sprint.startDate = newStartDate;
      sprint.endDate = newEndDate;
    }

    // Apply other updates
    Object.assign(sprint, otherUpdates);

    return this.sprintRepository.save(sprint);
  }

  async remove(id: string): Promise<void> {
    const sprint = await this.findOne(id);
    await this.sprintRepository.remove(sprint);
  }

  async generateSprints(
    generateSprintsDto: GenerateSprintsDto,
  ): Promise<Sprint[]> {
    const { projectId, sprintDurationWeeks } = generateSprintsDto;

    // Find the project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Delete existing sprints for this project
    await this.sprintRepository.delete({ project: { id: projectId } });

    const sprints: Sprint[] = [];
    let sprintNumber = 1;
    let currentStartDate = new Date(project.startDate);
    const projectEndDate = new Date(project.endDate);

    while (currentStartDate < projectEndDate) {
      // Calculate end date for this sprint
      const sprintEndDate = new Date(currentStartDate);
      sprintEndDate.setDate(
        sprintEndDate.getDate() + sprintDurationWeeks * 7,
      );

      // If sprint end date exceeds project end date, adjust it
      const finalEndDate =
        sprintEndDate > projectEndDate ? projectEndDate : sprintEndDate;

      // Create sprint
      const sprint = this.sprintRepository.create({
        name: `Sprint ${sprintNumber}`,
        description: `Auto-generated sprint ${sprintNumber}`,
        startDate: currentStartDate,
        endDate: finalEndDate,
        status: 'planned',
        project,
      });

      sprints.push(sprint);

      // Move to next sprint start date
      currentStartDate = new Date(finalEndDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);

      sprintNumber++;

      // Safety check to prevent infinite loops
      if (sprintNumber > 100) {
        throw new BadRequestException(
          'Cannot generate more than 100 sprints',
        );
      }
    }

    // Save all sprints
    return this.sprintRepository.save(sprints);
  }

  private async validateSprintTimeline(
    startDate: Date,
    endDate: Date,
    project: Project,
  ): Promise<void> {
    const projectStartDate = new Date(project.startDate);
    const projectEndDate = new Date(project.endDate);

    // Check if sprint start date is before project start date
    if (startDate < projectStartDate) {
      throw new BadRequestException(
        `Sprint start date (${startDate.toDateString()}) cannot be before project start date (${projectStartDate.toDateString()})`,
      );
    }

    // Check if sprint end date is after project end date
    if (endDate > projectEndDate) {
      throw new BadRequestException(
        `Sprint end date (${endDate.toDateString()}) cannot be after project end date (${projectEndDate.toDateString()})`,
      );
    }

    // Check if start date is before end date
    if (startDate >= endDate) {
      throw new BadRequestException(
        'Sprint start date must be before end date',
      );
    }
  }

  private calculateDurationWeeks(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  }
}
