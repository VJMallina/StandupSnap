import { Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';
import { Card, CardRAG } from '../entities/card.entity';
import { Snap } from '../entities/snap.entity';
import { Sprint } from '../entities/sprint.entity';
import { TenantService } from '../tenant/tenant.service';

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
  constructor(private tenantService: TenantService) {}

  async getAssigneeList(projectId?: string, sprintId?: string): Promise<AssigneeListItem[]> {
    const [teamMemberRepo, cardRepo] = await Promise.all([
      this.tenantService.getRepository(TeamMember),
      this.tenantService.getRepository(Card),
    ]);

    let teamMembers: TeamMember[];
    if (projectId) {
      teamMembers = await teamMemberRepo
        .createQueryBuilder('tm')
        .innerJoin('tm.projects', 'project')
        .where('project.id = :projectId', { projectId })
        .getMany();
    } else {
      teamMembers = await teamMemberRepo.find({ relations: ['projects'] });
    }

    const result: AssigneeListItem[] = [];

    for (const tm of teamMembers) {
      const cardsQuery = cardRepo
        .createQueryBuilder('card')
        .where('card.assignee_id = :assigneeId', { assigneeId: tm.id });

      if (projectId) cardsQuery.andWhere('card.project_id = :projectId', { projectId });

      if (sprintId) {
        cardsQuery.andWhere('card.sprint_id = :sprintId', { sprintId });
      } else {
        cardsQuery.innerJoin('card.sprint', 'sprint').andWhere('sprint.status = :status', { status: 'active' });
      }

      const cards = await cardsQuery.getMany();

      let assigneeRAG: CardRAG | null = null;
      if (cards.length > 0) {
        const hasRed = cards.some((c) => c.ragStatus === CardRAG.RED);
        const hasAmber = cards.some((c) => c.ragStatus === CardRAG.AMBER);
        if (hasRed) assigneeRAG = CardRAG.RED;
        else if (hasAmber) assigneeRAG = CardRAG.AMBER;
        else assigneeRAG = CardRAG.GREEN;
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

  async getAssigneeDetails(assigneeId: string, sprintId?: string): Promise<AssigneeDetails> {
    const [teamMemberRepo, cardRepo] = await Promise.all([
      this.tenantService.getRepository(TeamMember),
      this.tenantService.getRepository(Card),
    ]);

    const teamMember = await teamMemberRepo.findOne({ where: { id: assigneeId }, relations: ['projects'] });
    if (!teamMember) throw new NotFoundException('Assignee not found');

    const cardsQuery = cardRepo
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.sprint', 'sprint')
      .leftJoinAndSelect('card.project', 'project')
      .where('card.assignee_id = :assigneeId', { assigneeId });

    if (sprintId) {
      cardsQuery.andWhere('card.sprint_id = :sprintId', { sprintId });
    } else {
      cardsQuery.andWhere('sprint.status = :status', { status: 'active' });
    }

    const cards = await cardsQuery.getMany();

    let assigneeRAG: CardRAG | null = null;
    if (cards.length > 0) {
      const hasRed = cards.some((c) => c.ragStatus === CardRAG.RED);
      const hasAmber = cards.some((c) => c.ragStatus === CardRAG.AMBER);
      if (hasRed) assigneeRAG = CardRAG.RED;
      else if (hasAmber) assigneeRAG = CardRAG.AMBER;
      else assigneeRAG = CardRAG.GREEN;
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

  async getAssigneeCards(
    assigneeId: string,
    sprintId?: string,
    status?: string,
    rag?: string,
    search?: string,
  ): Promise<Card[]> {
    const cardRepo = await this.tenantService.getRepository(Card);
    const qb = cardRepo
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.sprint', 'sprint')
      .leftJoinAndSelect('card.project', 'project')
      .leftJoinAndSelect('card.assignee', 'assignee')
      .where('card.assignee_id = :assigneeId', { assigneeId });

    if (sprintId) {
      qb.andWhere('card.sprint_id = :sprintId', { sprintId });
    } else {
      qb.andWhere('sprint.status = :sprintStatus', { sprintStatus: 'active' });
    }

    if (status) qb.andWhere('card.status = :status', { status });
    if (rag) qb.andWhere('card.ragStatus = :rag', { rag });
    if (search) qb.andWhere('(card.title LIKE :search OR card.externalId LIKE :search)', { search: `%${search}%` });

    return qb.getMany();
  }

  async getAssigneeSnapHistory(assigneeId: string, sprintId?: string): Promise<SnapsByDate[]> {
    const [cardRepo, snapRepo] = await Promise.all([
      this.tenantService.getRepository(Card),
      this.tenantService.getRepository(Snap),
    ]);

    const cardsQuery = cardRepo
      .createQueryBuilder('card')
      .where('card.assignee_id = :assigneeId', { assigneeId });

    if (sprintId) {
      cardsQuery.andWhere('card.sprint_id = :sprintId', { sprintId });
    } else {
      cardsQuery.innerJoin('card.sprint', 'sprint').andWhere('sprint.status = :status', { status: 'active' });
    }

    const cards = await cardsQuery.getMany();
    const cardIds = cards.map((c) => c.id);
    if (cardIds.length === 0) return [];

    const snaps = await snapRepo.find({
      where: { cardId: cardIds.length === 1 ? cardIds[0] : In(cardIds) },
      relations: ['card', 'createdBy'],
      order: { snapDate: 'DESC', createdAt: 'DESC' },
    });

    const snapsByDateMap = new Map<string, Snap[]>();
    for (const snap of snaps) {
      const dateStr = new Date(snap.snapDate).toISOString().split('T')[0];
      if (!snapsByDateMap.has(dateStr)) snapsByDateMap.set(dateStr, []);
      snapsByDateMap.get(dateStr)!.push(snap);
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const result: SnapsByDate[] = [];
    for (const [date, dateSnaps] of snapsByDateMap.entries()) {
      result.push({ date, snaps: dateSnaps, isToday: date === today, isYesterday: date === yesterdayStr });
    }

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
