import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { Card, CardStatus, CardRAG, CardPriority, CardType } from '../entities/card.entity';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { User } from '../entities/user.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { Project } from '../entities/project.entity';
import { WorkflowLane, LaneType } from '../entities/workflow-lane.entity';
import { WorkflowTemplate } from '../entities/workflow-template.entity';
import { CardAssignmentHistory } from '../entities/card-assignment-history.entity';
import { CardComment, CardCommentType } from '../entities/card-comment.entity';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class CardService {
  constructor(private tenantService: TenantService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private laneTypeToStatus(laneType: LaneType): CardStatus {
    if (laneType === LaneType.DONE) return CardStatus.COMPLETED;
    if (laneType === LaneType.ACTIVE) return CardStatus.IN_PROGRESS;
    return CardStatus.NOT_STARTED;
  }

  private async getDefaultFirstLane(projectId: string): Promise<WorkflowLane | null> {
    const [workflowRepo, laneRepo] = await Promise.all([
      this.tenantService.getRepository(WorkflowTemplate),
      this.tenantService.getRepository(WorkflowLane),
    ]);

    const template = await workflowRepo.findOne({
      where: { projectId, isDefault: true, deletedAt: IsNull() },
    });
    if (!template) return null;

    return laneRepo.findOne({
      where: { workflowTemplateId: template.id, laneType: LaneType.TODO, deletedAt: IsNull() },
      order: { order: 'ASC' },
    });
  }

  private async addActivity(cardId: string, body: string, actorId?: string): Promise<void> {
    const commentRepo = await this.tenantService.getRepository(CardComment);
    const comment = commentRepo.create({
      cardId,
      authorId: actorId || null,
      body,
      commentType: CardCommentType.SYSTEM,
    });
    await commentRepo.save(comment);
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateCardDto, actorId?: string): Promise<Card> {
    const [projectRepo, sprintRepo, projectMemberRepo, cardRepo, laneRepo, historyRepo] = await Promise.all([
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(ProjectMember),
      this.tenantService.getRepository(Card),
      this.tenantService.getRepository(WorkflowLane),
      this.tenantService.getRepository(CardAssignmentHistory),
    ]);

    const project = await projectRepo.findOne({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException(`Project ${dto.projectId} not found`);
    if (project.isArchived) throw new BadRequestException('Cannot create cards in an archived project');

    let sprint: Sprint | null = null;
    if (dto.sprintId) {
      sprint = await sprintRepo.findOne({ where: { id: dto.sprintId }, relations: ['project'] });
      if (!sprint) throw new NotFoundException(`Sprint ${dto.sprintId} not found`);
      if (sprint.project.id !== dto.projectId) throw new BadRequestException('Sprint does not belong to this project');
      if (sprint.isClosed) throw new BadRequestException('Cannot add cards to a closed sprint');
    }

    let assignee: User | null = null;
    if (dto.assigneeId) {
      const member = await projectMemberRepo.findOne({
        where: { user: { id: dto.assigneeId }, project: { id: dto.projectId } },
      });
      if (!member) throw new BadRequestException('Assignee must be a member of the project team');
      assignee = { id: dto.assigneeId } as User;
    }

    if (dto.parentId) {
      const parent = await cardRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent card not found');
      const cardType = dto.cardType || CardType.CARD;
      if (cardType === CardType.CARD && parent.cardType !== CardType.EPIC) {
        throw new BadRequestException('A CARD can only be a child of an EPIC');
      }
      if (cardType === CardType.SUB_CARD && parent.cardType !== CardType.CARD) {
        throw new BadRequestException('A SUB_CARD can only be a child of a CARD');
      }
    }

    let lane: WorkflowLane | null = null;
    if (dto.laneId) {
      lane = await laneRepo.findOne({ where: { id: dto.laneId, deletedAt: IsNull() } });
      if (!lane) throw new NotFoundException('Lane not found');
    } else {
      lane = await this.getDefaultFirstLane(dto.projectId);
    }

    // Auto-generate sequential card number and project-key-prefixed ID
    let cardNumber: number | null = null;
    let externalId: string | undefined = dto.externalId;
    if (project.key) {
      const maxResult = await cardRepo
        .createQueryBuilder('card')
        .select('MAX(card.cardNumber)', 'max')
        .where('card.project = :projectId', { projectId: project.id })
        .getRawOne();
      cardNumber = ((maxResult?.max as number | null) ?? 0) + 1;
      externalId = externalId || `${project.key}-${cardNumber}`;
    }

    const card = cardRepo.create({
      project,
      organizationId: project.organizationId,
      sprint: sprint || undefined,
      sprintId: sprint?.id || null,
      assignee: assignee || undefined,
      cardType: dto.cardType || CardType.CARD,
      parentId: dto.parentId || null,
      laneId: lane?.id || null,
      title: dto.title,
      description: dto.description,
      acceptanceCriteria: dto.acceptanceCriteria || null,
      labels: dto.labels || null,
      cardNumber,
      externalId,
      priority: dto.priority || CardPriority.MEDIUM,
      storyPoints: dto.storyPoints || null,
      estimatedTime: dto.estimatedTime || null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      status: lane ? this.laneTypeToStatus(lane.laneType) : CardStatus.NOT_STARTED,
      ragStatus: null,
      sourceIncidentId: dto.sourceIncidentId || null,
    });

    const savedCard = await cardRepo.save(card) as Card;

    if (assignee) {
      await historyRepo.save(
        historyRepo.create({
          cardId: savedCard.id,
          userId: assignee.id,
          laneId: lane?.id || null,
          assignedById: actorId || null,
        }),
      );
    }

    await this.addActivity(
      savedCard.id,
      `Card created${sprint ? ` in sprint "${sprint.name}"` : ' in Backlog'}`,
      actorId,
    );

    return this.findOne(savedCard.id);
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  async findAll(filters: {
    projectId?: string;
    sprintId?: string;
    assigneeId?: string;
    ragStatus?: CardRAG;
    status?: CardStatus;
    priority?: CardPriority;
    laneId?: string;
    cardType?: CardType;
    backlog?: boolean;
    search?: string;
    parentId?: string;
    organizationId?: string;
  }): Promise<Card[]> {
    const cardRepo = await this.tenantService.getRepository(Card);
    const qb = cardRepo
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.project', 'project')
      .leftJoinAndSelect('card.sprint', 'sprint')
      .leftJoinAndSelect('card.assignee', 'assignee')
      .leftJoinAndSelect('card.lane', 'lane')
      .leftJoinAndSelect('card.parent', 'parent')
      .loadRelationCountAndMap('card.snapsCount', 'card.snaps')
      .where('card.deletedAt IS NULL')
      .orderBy('card.createdAt', 'DESC');

    if (filters.projectId) qb.andWhere('project.id = :projectId', { projectId: filters.projectId });
    if (filters.backlog) {
      qb.andWhere('card.sprintId IS NULL');
    } else if (filters.sprintId) {
      qb.andWhere('sprint.id = :sprintId', { sprintId: filters.sprintId });
    }
    if (filters.assigneeId) qb.andWhere('assignee.id = :assigneeId', { assigneeId: filters.assigneeId });
    if (filters.ragStatus) qb.andWhere('card.ragStatus = :ragStatus', { ragStatus: filters.ragStatus });
    if (filters.status) qb.andWhere('card.status = :status', { status: filters.status });
    if (filters.priority) qb.andWhere('card.priority = :priority', { priority: filters.priority });
    if (filters.laneId) qb.andWhere('card.laneId = :laneId', { laneId: filters.laneId });
    if (filters.cardType) qb.andWhere('card.cardType = :cardType', { cardType: filters.cardType });
    if (filters.parentId) qb.andWhere('card.parentId = :parentId', { parentId: filters.parentId });
    if (filters.search) {
      qb.andWhere(
        '(LOWER(card.title) LIKE LOWER(:s) OR LOWER(card.externalId) LIKE LOWER(:s))',
        { s: `%${filters.search}%` },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string, organizationId?: string): Promise<Card> {
    const cardRepo = await this.tenantService.getRepository(Card);
    const card = await cardRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['project', 'sprint', 'assignee', 'lane', 'parent', 'children', 'reporter'],
    });
    if (!card) throw new NotFoundException(`Card ${id} not found`);
    return card;
  }

  async getCardActivity(cardId: string): Promise<{
    comments: CardComment[];
    assignmentHistory: CardAssignmentHistory[];
  }> {
    const [commentRepo, historyRepo] = await Promise.all([
      this.tenantService.getRepository(CardComment),
      this.tenantService.getRepository(CardAssignmentHistory),
    ]);

    // Load tenant records without cross-schema user relations to avoid
    // eager-loading User.roles (whose junction table has no schema qualifier)
    // potentially failing in the tenant DataSource context.
    const [comments, assignmentHistory] = await Promise.all([
      commentRepo.find({
        where: { cardId, deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
      }),
      historyRepo.find({
        where: { cardId },
        relations: ['lane'],
        order: { assignedAt: 'ASC' },
      }),
    ]);

    // Collect all User IDs referenced by comments and history entries.
    const userIds = new Set<string>();
    for (const c of comments) { if (c.authorId) userIds.add(c.authorId); }
    for (const h of assignmentHistory) {
      if (h.userId) userIds.add(h.userId);
      if (h.assignedById) userIds.add(h.assignedById);
    }

    // Fetch those users from the public schema via the main DataSource.
    if (userIds.size > 0) {
      const userRepo = this.tenantService.getMainRepository(User);
      const users = await userRepo.find({ where: { id: In([...userIds]) } });
      const userMap = new Map(users.map((u) => [u.id, u]));

      for (const c of comments) {
        (c as any).author = c.authorId ? (userMap.get(c.authorId) ?? null) : null;
      }
      for (const h of assignmentHistory) {
        (h as any).user = h.userId ? (userMap.get(h.userId) ?? null) : null;
        (h as any).assignedBy = h.assignedById ? (userMap.get(h.assignedById) ?? null) : null;
      }
    }

    return { comments, assignmentHistory };
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateCardDto, actorId?: string): Promise<Card> {
    const [cardRepo, laneRepo, sprintRepo, historyRepo] = await Promise.all([
      this.tenantService.getRepository(Card),
      this.tenantService.getRepository(WorkflowLane),
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(CardAssignmentHistory),
    ]);

    const card = await this.findOne(id);
    if (card.project.isArchived) throw new BadRequestException('Cannot update cards in an archived project');

    // ── Lane change ──
    if (dto.laneId && dto.laneId !== card.laneId) {
      const newLane = await laneRepo.findOne({ where: { id: dto.laneId, deletedAt: IsNull() } });
      if (!newLane) throw new NotFoundException('Target lane not found');

      const oldLaneName = card.lane?.name || 'Unknown';
      card.laneId = newLane.id;
      card.lane = newLane;
      card.status = this.laneTypeToStatus(newLane.laneType);

      if (newLane.laneType === LaneType.ACTIVE && !card.startedAt) card.startedAt = new Date();
      if (newLane.isFinalLane && !card.completedAt) {
        card.completedAt = new Date();
        card.status = CardStatus.COMPLETED;
      }

      await this.addActivity(card.id, `Moved from "${oldLaneName}" to "${newLane.name}"`, actorId);
    }

    // ── Assignee change ──
    if (dto.assigneeId !== undefined) {
      const oldAssigneeId = card.assignee?.id;

      if (dto.assigneeId === null || dto.assigneeId === '') {
        if (oldAssigneeId) {
          await historyRepo.update({ cardId: card.id, unassignedAt: IsNull() }, { unassignedAt: new Date() });
        }
        card.assignee = null;
        await this.addActivity(card.id, 'Assignee removed', actorId);
      } else if (dto.assigneeId !== oldAssigneeId) {
        const projectMemberRepo = await this.tenantService.getRepository(ProjectMember);
        const member = await projectMemberRepo.findOne({
          where: { user: { id: dto.assigneeId }, project: { id: card.project.id } },
        });
        if (!member) throw new BadRequestException('Assignee must be a member of the project team');

        await historyRepo.update({ cardId: card.id, unassignedAt: IsNull() }, { unassignedAt: new Date() });
        await historyRepo.save(
          historyRepo.create({
            cardId: card.id,
            userId: dto.assigneeId,
            laneId: card.laneId,
            assignedById: actorId || null,
          }),
        );

        const oldName = card.assignee?.name || 'nobody';
        card.assignee = { id: dto.assigneeId } as User;
        await this.addActivity(card.id, `Assignee changed from ${oldName} to new assignee`, actorId);
      }
    }

    // ── Sprint change ──
    if (dto.sprintId !== undefined && dto.sprintId !== card.sprintId) {
      if (dto.sprintId === null) {
        card.sprint = null;
        card.sprintId = null;
        await this.addActivity(card.id, 'Moved to Backlog', actorId);
      } else {
        const newSprint = await sprintRepo.findOne({ where: { id: dto.sprintId }, relations: ['project'] });
        if (!newSprint) throw new NotFoundException('Sprint not found');
        if (newSprint.project.id !== card.project.id) throw new BadRequestException('Sprint belongs to a different project');
        if (newSprint.isClosed) throw new BadRequestException('Cannot move card to a closed sprint');

        const oldSprintName = card.sprint?.name || 'Backlog';
        card.sprint = newSprint;
        card.sprintId = newSprint.id;
        await this.addActivity(card.id, `Moved from "${oldSprintName}" to sprint "${newSprint.name}"`, actorId);
      }
    }

    // ── Simple field updates ──
    const fields: Array<keyof UpdateCardDto> = [
      'title', 'description', 'acceptanceCriteria', 'labels',
      'externalId', 'priority', 'ragStatus', 'storyPoints', 'estimatedTime', 'parentId',
    ];
    for (const f of fields) {
      if (dto[f] !== undefined) (card as any)[f] = dto[f];
    }
    if (dto.dueDate !== undefined) {
      card.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    const updated = await cardRepo.save(card);
    return this.findOne(updated.id);
  }

  // ─── Comments ────────────────────────────────────────────────────────────────

  async addComment(cardId: string, body: string, authorId: string): Promise<CardComment> {
    const [cardRepo, commentRepo] = await Promise.all([
      this.tenantService.getRepository(Card),
      this.tenantService.getRepository(CardComment),
    ]);

    const card = await cardRepo.findOne({ where: { id: cardId, deletedAt: IsNull() } });
    if (!card) throw new NotFoundException('Card not found');

    return commentRepo.save(
      commentRepo.create({ cardId, authorId, body, commentType: CardCommentType.COMMENT }),
    );
  }

  async editComment(commentId: string, body: string, authorId: string): Promise<CardComment> {
    const commentRepo = await this.tenantService.getRepository(CardComment);
    const comment = await commentRepo.findOne({ where: { id: commentId, deletedAt: IsNull() } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.commentType === CardCommentType.SYSTEM) throw new BadRequestException('System activity entries cannot be edited');
    if (comment.authorId !== authorId) throw new BadRequestException('You can only edit your own comments');
    comment.body = body;
    comment.isEdited = true;
    return commentRepo.save(comment);
  }

  async deleteComment(commentId: string, authorId: string): Promise<void> {
    const commentRepo = await this.tenantService.getRepository(CardComment);
    const comment = await commentRepo.findOne({ where: { id: commentId, deletedAt: IsNull() } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.commentType === CardCommentType.SYSTEM) throw new BadRequestException('System activity entries cannot be deleted');
    if (comment.authorId !== authorId) throw new BadRequestException('You can only delete your own comments');
    await commentRepo.softDelete(commentId);
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async remove(id: string): Promise<void> {
    const cardRepo = await this.tenantService.getRepository(Card);
    const card = await cardRepo.findOne({ where: { id }, relations: ['project', 'sprint'] });
    if (!card) throw new NotFoundException(`Card ${id} not found`);
    if (card.project.isArchived) throw new BadRequestException('Cannot delete cards in an archived project');
    if (card.sprint?.isClosed) throw new BadRequestException('Cards in a closed sprint cannot be deleted');
    await cardRepo.softDelete(id);
  }

  // ─── Backwards-compat helpers (used by SnapService & SprintService) ─────────

  async markAsInProgress(id: string): Promise<Card> {
    const cardRepo = await this.tenantService.getRepository(Card);
    const card = await this.findOne(id);
    if (card.status === CardStatus.NOT_STARTED) {
      card.status = CardStatus.IN_PROGRESS;
      if (!card.startedAt) card.startedAt = new Date();
      return cardRepo.save(card);
    }
    return card;
  }

  async markAsCompleted(id: string): Promise<Card> {
    const cardRepo = await this.tenantService.getRepository(Card);
    const card = await this.findOne(id);
    if (card.project.isArchived) throw new BadRequestException('Cannot update cards in an archived project');
    if (card.sprint?.isClosed) throw new BadRequestException('Cannot update card in a closed sprint');
    if (card.status === CardStatus.COMPLETED || card.status === CardStatus.CLOSED) {
      throw new BadRequestException('Card is already completed or closed');
    }
    card.status = CardStatus.COMPLETED;
    card.completedAt = new Date();
    return cardRepo.save(card);
  }

  async getCardsBySprintId(sprintId: string): Promise<Card[]> {
    const cardRepo = await this.tenantService.getRepository(Card);
    return cardRepo.find({ where: { sprint: { id: sprintId } }, relations: ['sprint', 'assignee'] });
  }

  async areAllCardsCompleted(sprintId: string): Promise<boolean> {
    const cards = await this.getCardsBySprintId(sprintId);
    if (cards.length === 0) return true;
    return cards.every((c) => c.status === CardStatus.COMPLETED);
  }

  async closeAllCardsInSprint(sprintId: string): Promise<void> {
    const cardRepo = await this.tenantService.getRepository(Card);
    const cards = await this.getCardsBySprintId(sprintId);
    for (const card of cards) {
      if (card.status === CardStatus.COMPLETED) {
        card.status = CardStatus.CLOSED;
        await cardRepo.save(card);
      }
    }
  }
}
