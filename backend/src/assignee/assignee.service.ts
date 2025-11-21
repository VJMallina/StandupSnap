import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';
import { Card, CardStatus, CardRAG } from '../entities/card.entity';
import { Snap } from '../entities/snap.entity';
import { Sprint } from '../entities/sprint.entity';

export interface AssigneeListItem {
  id: string;
  fullName: string;
  displayName: string | null;
  designationRole: string;
  assignedCardsCount: number;
  assigneeRAG: CardRAG | null;
}

export interface AssigneeDetails {
  id: string;
  fullName: string;
  displayName: string | null;
  designationRole: string;
  assignedCardsCount: number;
  assigneeRAG: CardRAG | null;
  cards: Card[];
}

export interface SnapsByDate {
  date: string;
  snaps: Snap[];
  isToday: boolean;
  isYesterday: boolean;
}

@Injectable()
export class AssigneeService {
  constructor(
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @InjectRepository(Snap)
    private snapRepository: Repository<Snap>,
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
  ) {}

  /**
   * M10-UC01: Get list of all assignees with aggregated stats
   */
  async getAssigneeList(
    projectId?: string,
    sprintId?: string,
  ): Promise<AssigneeListItem[]> {
    // Get team members - filter by project if provided
    let teamMembers: TeamMember[];

    if (projectId) {
      // Get team members assigned to this project
      teamMembers = await this.teamMemberRepository
        .createQueryBuilder('tm')
        .innerJoin('tm.projects', 'project')
        .where('project.id = :projectId', { projectId })
        .getMany();
    } else {
      // Get all team members
      teamMembers = await this.teamMemberRepository.find({
        relations: ['projects'],
      });
    }

    // For each team member, calculate stats
    const result: AssigneeListItem[] = [];

    for (const tm of teamMembers) {
      // Get cards for this assignee
      const cardsQuery = this.cardRepository
        .createQueryBuilder('card')
        .where('card.assignee_id = :assigneeId', { assigneeId: tm.id });

      // Filter by project if provided
      if (projectId) {
        cardsQuery.andWhere('card.project_id = :projectId', { projectId });
      }

      // Filter by sprint if provided (active sprint)
      if (sprintId) {
        cardsQuery.andWhere('card.sprint_id = :sprintId', { sprintId });
      } else {
        // Default: get cards from active sprints only
        cardsQuery
          .innerJoin('card.sprint', 'sprint')
          .andWhere('sprint.status = :status', { status: 'active' });
      }

      const cards = await cardsQuery.getMany();

      // Calculate assignee-level RAG (worst-case)
      let assigneeRAG: CardRAG | null = null;
      if (cards.length > 0) {
        const hasRed = cards.some((c) => c.ragStatus === CardRAG.RED);
        const hasAmber = cards.some((c) => c.ragStatus === CardRAG.AMBER);

        if (hasRed) {
          assigneeRAG = CardRAG.RED;
        } else if (hasAmber) {
          assigneeRAG = CardRAG.AMBER;
        } else {
          assigneeRAG = CardRAG.GREEN;
        }
      }

      result.push({
        id: tm.id,
        fullName: tm.fullName,
        displayName: tm.displayName,
        designationRole: tm.designationRole,
        assignedCardsCount: cards.length,
        assigneeRAG,
      });
    }

    return result;
  }

  /**
   * M10-UC02: Get assignee details with full card list
   */
  async getAssigneeDetails(
    assigneeId: string,
    sprintId?: string,
  ): Promise<AssigneeDetails> {
    const teamMember = await this.teamMemberRepository.findOne({
      where: { id: assigneeId },
      relations: ['projects'],
    });

    if (!teamMember) {
      throw new NotFoundException('Assignee not found');
    }

    // Get cards
    const cardsQuery = this.cardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.sprint', 'sprint')
      .leftJoinAndSelect('card.project', 'project')
      .where('card.assignee_id = :assigneeId', { assigneeId });

    if (sprintId) {
      cardsQuery.andWhere('card.sprint_id = :sprintId', { sprintId });
    } else {
      // Default: active sprint only
      cardsQuery.andWhere('sprint.status = :status', { status: 'active' });
    }

    const cards = await cardsQuery.getMany();

    // Calculate assignee RAG
    let assigneeRAG: CardRAG | null = null;
    if (cards.length > 0) {
      const hasRed = cards.some((c) => c.ragStatus === CardRAG.RED);
      const hasAmber = cards.some((c) => c.ragStatus === CardRAG.AMBER);

      if (hasRed) {
        assigneeRAG = CardRAG.RED;
      } else if (hasAmber) {
        assigneeRAG = CardRAG.AMBER;
      } else {
        assigneeRAG = CardRAG.GREEN;
      }
    }

    return {
      id: teamMember.id,
      fullName: teamMember.fullName,
      displayName: teamMember.displayName,
      designationRole: teamMember.designationRole,
      assignedCardsCount: cards.length,
      assigneeRAG,
      cards,
    };
  }

  /**
   * M10-UC04: Get assignee's cards with filtering
   */
  async getAssigneeCards(
    assigneeId: string,
    sprintId?: string,
    status?: string,
    rag?: string,
    search?: string,
  ): Promise<Card[]> {
    const queryBuilder = this.cardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.sprint', 'sprint')
      .leftJoinAndSelect('card.project', 'project')
      .leftJoinAndSelect('card.assignee', 'assignee')
      .where('card.assignee_id = :assigneeId', { assigneeId });

    // Filter by sprint
    if (sprintId) {
      queryBuilder.andWhere('card.sprint_id = :sprintId', { sprintId });
    } else {
      queryBuilder.andWhere('sprint.status = :sprintStatus', {
        sprintStatus: 'active',
      });
    }

    // Filter by card status
    if (status) {
      queryBuilder.andWhere('card.status = :status', { status });
    }

    // Filter by RAG
    if (rag) {
      queryBuilder.andWhere('card.ragStatus = :rag', { rag });
    }

    // Search by card name or external ID
    if (search) {
      queryBuilder.andWhere(
        '(card.title LIKE :search OR card.externalId LIKE :search)',
        { search: `%${search}%` },
      );
    }

    return queryBuilder.getMany();
  }

  /**
   * M10-UC03: Get assignee's snap history grouped by date
   */
  async getAssigneeSnapHistory(
    assigneeId: string,
    sprintId?: string,
  ): Promise<SnapsByDate[]> {
    // Get all cards for this assignee
    const cardsQuery = this.cardRepository
      .createQueryBuilder('card')
      .where('card.assignee_id = :assigneeId', { assigneeId });

    if (sprintId) {
      cardsQuery.andWhere('card.sprint_id = :sprintId', { sprintId });
    } else {
      cardsQuery
        .innerJoin('card.sprint', 'sprint')
        .andWhere('sprint.status = :status', { status: 'active' });
    }

    const cards = await cardsQuery.getMany();
    const cardIds = cards.map((c) => c.id);

    if (cardIds.length === 0) {
      return [];
    }

    // Get all snaps for these cards
    const { In } = require('typeorm');
    const snaps = await this.snapRepository.find({
      where: {
        cardId: cardIds.length === 1 ? cardIds[0] : In(cardIds),
      },
      relations: ['card', 'createdBy'],
      order: { snapDate: 'DESC', createdAt: 'DESC' },
    });

    // Group snaps by date
    const snapsByDateMap = new Map<string, Snap[]>();

    for (const snap of snaps) {
      const dateStr = new Date(snap.snapDate).toISOString().split('T')[0];
      if (!snapsByDateMap.has(dateStr)) {
        snapsByDateMap.set(dateStr, []);
      }
      snapsByDateMap.get(dateStr)!.push(snap);
    }

    // Convert to array and mark today/yesterday
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const result: SnapsByDate[] = [];

    for (const [date, dateSnaps] of snapsByDateMap.entries()) {
      result.push({
        date,
        snaps: dateSnaps,
        isToday: date === today,
        isYesterday: date === yesterdayStr,
      });
    }

    // Sort by date descending (today first)
    result.sort((a, b) => {
      if (a.isToday) return -1;
      if (b.isToday) return 1;
      if (a.isYesterday) return -1;
      if (b.isYesterday) return 1;
      return b.date.localeCompare(a.date);
    });

    return result;
  }
}
