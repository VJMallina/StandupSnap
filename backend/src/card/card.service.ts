import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card, CardStatus, CardRAG, CardPriority } from '../entities/card.entity';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Project } from '../entities/project.entity';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  /**
   * M7-UC01: Create Card
   * Business Validations:
   * - ET is MANDATORY
   * - Sprint exists and is not Closed
   * - Assignee is in Project Team
   * - Mandatory fields present
   */
  async create(createCardDto: CreateCardDto): Promise<Card> {
    const { projectId, sprintId, assigneeId, title, description, externalId, priority, estimatedTime } = createCardDto;

    // Find and validate project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (project.isArchived) {
      throw new BadRequestException('Cannot create cards in archived project');
    }

    // Find and validate sprint
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
      relations: ['project'],
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
    }

    if (sprint.project.id !== projectId) {
      throw new BadRequestException('Sprint does not belong to the specified project');
    }

    if (sprint.isClosed) {
      throw new BadRequestException('Cannot create cards in a closed sprint');
    }

    // Validate ET is provided (mandatory)
    if (!estimatedTime || estimatedTime < 1) {
      throw new BadRequestException('Estimated Time is required and must be at least 1 hour');
    }

    // Find and validate assignee
    const assignee = await this.teamMemberRepository.findOne({
      where: { id: assigneeId },
      relations: ['projects'],
    });

    if (!assignee) {
      throw new NotFoundException(`Team member with ID ${assigneeId} not found`);
    }

    // Verify assignee is part of the project team
    const isInProject = assignee.projects.some(p => p.id === projectId);
    if (!isInProject) {
      throw new BadRequestException('Assignee must be a member of the project team');
    }

    // Create the card
    const card = this.cardRepository.create({
      title,
      description,
      externalId,
      priority: priority || CardPriority.MEDIUM,
      estimatedTime,
      status: CardStatus.NOT_STARTED,
      ragStatus: null, // Will be calculated when snaps are added
      project,
      sprint,
      assignee,
    });

    return this.cardRepository.save(card);
  }

  /**
   * M7-UC05: Find all cards with filtering and search
   */
  async findAll(
    projectId?: string,
    sprintId?: string,
    assigneeId?: string,
    ragStatus?: CardRAG,
    status?: CardStatus,
    priority?: CardPriority,
    search?: string,
  ): Promise<Card[]> {
    const queryBuilder = this.cardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.project', 'project')
      .leftJoinAndSelect('card.sprint', 'sprint')
      .leftJoinAndSelect('card.assignee', 'assignee')
      .orderBy('sprint.startDate', 'ASC')
      .addOrderBy('card.title', 'ASC');

    // Filter by project
    if (projectId) {
      queryBuilder.andWhere('card.project.id = :projectId', { projectId });
    }

    // Filter by sprint
    if (sprintId) {
      queryBuilder.andWhere('card.sprint.id = :sprintId', { sprintId });
    }

    // Filter by assignee
    if (assigneeId) {
      queryBuilder.andWhere('card.assignee.id = :assigneeId', { assigneeId });
    }

    // Filter by RAG status
    if (ragStatus) {
      queryBuilder.andWhere('card.ragStatus = :ragStatus', { ragStatus });
    }

    // Filter by card status
    if (status) {
      queryBuilder.andWhere('card.status = :status', { status });
    }

    // Filter by priority
    if (priority) {
      queryBuilder.andWhere('card.priority = :priority', { priority });
    }

    // Search by title or external ID
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(card.title) LIKE LOWER(:search) OR LOWER(card.externalId) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    return queryBuilder.getMany();
  }

  /**
   * M7-UC04: Find one card with details
   */
  async findOne(id: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: ['project', 'sprint', 'assignee'],
    });

    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }

    return card;
  }

  /**
   * M7-UC02: Update Card
   * Business Validations:
   * - ET must be present if updating
   * - Sprint must not be Closed
   * - Assignee must belong to project team
   * - Sprint change restrictions apply
   */
  async update(id: string, updateCardDto: UpdateCardDto): Promise<Card> {
    const card = await this.findOne(id);

    // Validate project is not archived
    if (card.project.isArchived) {
      throw new BadRequestException('Cannot update cards in archived project');
    }

    // Validate sprint is not closed
    if (card.sprint.isClosed) {
      throw new BadRequestException('Cannot edit card in a closed sprint');
    }

    const { title, description, externalId, priority, estimatedTime, assigneeId, sprintId } = updateCardDto;

    // Update basic fields
    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (externalId !== undefined) card.externalId = externalId;
    if (priority !== undefined) card.priority = priority;

    // Validate and update ET (must be present if provided)
    if (estimatedTime !== undefined) {
      if (estimatedTime < 1) {
        throw new BadRequestException('Estimated Time must be at least 1 hour');
      }
      card.estimatedTime = estimatedTime;
    }

    // Update assignee if provided
    if (assigneeId) {
      const newAssignee = await this.teamMemberRepository.findOne({
        where: { id: assigneeId },
        relations: ['projects'],
      });

      if (!newAssignee) {
        throw new NotFoundException(`Team member with ID ${assigneeId} not found`);
      }

      // Verify assignee is part of the project team
      const isInProject = newAssignee.projects.some(p => p.id === card.project.id);
      if (!isInProject) {
        throw new BadRequestException('Assignee must be a member of the project team');
      }

      card.assignee = newAssignee;
    }

    // Handle sprint change with restrictions
    if (sprintId && sprintId !== card.sprint.id) {
      const newSprint = await this.sprintRepository.findOne({
        where: { id: sprintId },
        relations: ['project'],
      });

      if (!newSprint) {
        throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
      }

      if (newSprint.project.id !== card.project.id) {
        throw new BadRequestException('Cannot move card to a sprint in a different project');
      }

      // Cannot move to a closed sprint
      if (newSprint.isClosed) {
        throw new BadRequestException('Cannot move card to a closed sprint');
      }

      // TODO: Add validation when Snap module is implemented
      // - Cannot move card if it has snaps
      // - Cannot move card to a completed sprint if it has snaps

      card.sprint = newSprint;
    }

    // Save and return updated card
    const updatedCard = await this.cardRepository.save(card);

    // TODO: Recalculate RAG when Snap module is implemented
    // this.recalculateRAG(updatedCard.id);

    return this.findOne(updatedCard.id);
  }

  /**
   * M7-UC03: Delete Card
   * Business Validations:
   * - Sprint is not Closed
   * - User has permission (handled by controller)
   * - Deletes card AND all associated snaps
   */
  async remove(id: string): Promise<void> {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: ['project', 'sprint'],
    });

    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }

    // Validate project is not archived
    if (card.project.isArchived) {
      throw new BadRequestException('Cannot delete cards in archived project');
    }

    // Validate sprint is not closed
    if (card.sprint.isClosed) {
      throw new BadRequestException('Cards in a closed sprint cannot be deleted');
    }

    // TODO: When Snap module is implemented, snaps will be cascade deleted via entity relation
    // For now, just delete the card
    await this.cardRepository.remove(card);
  }

  /**
   * M7-UC06: Mark Card as Completed
   * Only SM can manually change card state to Completed
   */
  async markAsCompleted(id: string): Promise<Card> {
    const card = await this.findOne(id);

    // Validate project is not archived
    if (card.project.isArchived) {
      throw new BadRequestException('Cannot update cards in archived project');
    }

    // Validate sprint is not closed
    if (card.sprint.isClosed) {
      throw new BadRequestException('Cannot update card in a closed sprint');
    }

    // Validate card is not already completed or closed
    if (card.status === CardStatus.COMPLETED || card.status === CardStatus.CLOSED) {
      throw new BadRequestException('Card is already completed or closed');
    }

    card.status = CardStatus.COMPLETED;
    card.completedAt = new Date();

    return this.cardRepository.save(card);
  }

  /**
   * M7-UC06: Auto-transition from NOT_STARTED to IN_PROGRESS when first snap is created
   * This will be called by Snap service when creating the first snap
   */
  async markAsInProgress(id: string): Promise<Card> {
    const card = await this.findOne(id);

    if (card.status === CardStatus.NOT_STARTED) {
      card.status = CardStatus.IN_PROGRESS;
      return this.cardRepository.save(card);
    }

    return card;
  }

  /**
   * Helper: Get cards by sprint for sprint closure validation
   */
  async getCardsBySprintId(sprintId: string): Promise<Card[]> {
    return this.cardRepository.find({
      where: { sprint: { id: sprintId } },
      relations: ['sprint', 'assignee'],
    });
  }

  /**
   * Helper: Check if all cards in sprint are completed (for sprint closure)
   */
  async areAllCardsCompleted(sprintId: string): Promise<boolean> {
    const cards = await this.getCardsBySprintId(sprintId);

    if (cards.length === 0) {
      return true; // Empty sprint can be closed
    }

    return cards.every(card => card.status === CardStatus.COMPLETED);
  }

  /**
   * Helper: Mark all cards in a sprint as closed (when sprint is closed)
   */
  async closeAllCardsInSprint(sprintId: string): Promise<void> {
    const cards = await this.getCardsBySprintId(sprintId);

    for (const card of cards) {
      if (card.status === CardStatus.COMPLETED) {
        card.status = CardStatus.CLOSED;
        await this.cardRepository.save(card);
      }
    }
  }
}
