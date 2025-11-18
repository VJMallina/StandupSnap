import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { Card, CardRAG } from '../entities/card.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Snap } from '../entities/snap.entity';
import { User } from '../entities/user.entity';
import { ProjectMember } from '../entities/project-member.entity';

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
}

export interface SprintHealthWidget {
  sprintId: string;
  sprintName: string;
  sprintStartDate: string;
  sprintEndDate: string;
  currentDay: number;
  totalDays: number;
  sprintRAG: CardRAG | null;
  ragDistribution: {
    green: number;
    amber: number;
    red: number;
  };
}

export interface TeamMemberSummary {
  id: string;
  fullName: string;
  displayName: string | null;
  designationRole: string;
  activeCardsCount: number;
  assigneeRAG: CardRAG | null;
}

export interface DailySnapSummaryWidget {
  snapsAddedToday: number;
  cardsPendingSnaps: number;
  assigneesPendingSnaps: number;
  isLocked: boolean;
}

export interface DailyStandupSummaryWidget {
  isVisible: boolean;
  date: string;
  doneCount: number;
  todoCount: number;
  blockerCount: number;
  ragDistribution: {
    green: number;
    amber: number;
    red: number;
  };
}

export interface DashboardData {
  project: ProjectSummary | null;
  sprintHealth: SprintHealthWidget | null;
  teamSummary: TeamMemberSummary[];
  dailySnapSummary: DailySnapSummaryWidget | null;
  dailyStandupSummary: DailyStandupSummaryWidget;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Snap)
    private snapRepository: Repository<Snap>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ProjectMember)
    private projectMemberRepository: Repository<ProjectMember>,
  ) {}

  /**
   * M11-UC01: Get complete dashboard data
   */
  async getDashboardData(
    userId: string,
    projectId?: string,
  ): Promise<DashboardData> {
    // Get user's projects
    const userProjects = await this.getUserProjects(userId);

    if (userProjects.length === 0) {
      // M11-UC07: Empty state
      return {
        project: null,
        sprintHealth: null,
        teamSummary: [],
        dailySnapSummary: null,
        dailyStandupSummary: { isVisible: false, date: '', doneCount: 0, todoCount: 0, blockerCount: 0, ragDistribution: { green: 0, amber: 0, red: 0 } },
      };
    }

    // M11-UC02: Determine which project to use
    let selectedProject: Project;
    if (projectId) {
      const found = userProjects.find((p) => p.id === projectId);
      if (!found) {
        throw new Error('Project not found or not accessible');
      }
      selectedProject = found;
    } else {
      // Auto-select first project
      selectedProject = userProjects[0];
    }

    // Get active sprint for this project
    const activeSprint = await this.sprintRepository.findOne({
      where: { project: { id: selectedProject.id }, status: SprintStatus.ACTIVE },
    });

    if (!activeSprint) {
      // No active sprint
      return {
        project: {
          id: selectedProject.id,
          name: selectedProject.name,
          description: selectedProject.description,
        },
        sprintHealth: null,
        teamSummary: [],
        dailySnapSummary: null,
        dailyStandupSummary: { isVisible: false, date: '', doneCount: 0, todoCount: 0, blockerCount: 0, ragDistribution: { green: 0, amber: 0, red: 0 } },
      };
    }

    // Load all widgets
    const [sprintHealth, teamSummary, dailySnapSummary, dailyStandupSummary] =
      await Promise.all([
        this.getSprintHealth(activeSprint.id),
        this.getTeamSummary(selectedProject.id, activeSprint.id),
        this.getDailySnapSummary(activeSprint.id),
        this.getDailyStandupSummary(activeSprint.id),
      ]);

    return {
      project: {
        id: selectedProject.id,
        name: selectedProject.name,
        description: selectedProject.description,
      },
      sprintHealth,
      teamSummary,
      dailySnapSummary,
      dailyStandupSummary,
    };
  }

  /**
   * M11-UC02: Get user's assigned projects
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    // Get user's project memberships
    const projectMemberships = await this.projectMemberRepository.find({
      where: { user: { id: userId }, isActive: true },
      relations: ['project'],
    });

    if (!projectMemberships || projectMemberships.length === 0) {
      return [];
    }

    return projectMemberships.map((pm) => pm.project);
  }

  /**
   * M11-UC03: Get Sprint Health widget data
   */
  async getSprintHealth(sprintId: string): Promise<SprintHealthWidget | null> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
    });

    if (!sprint) {
      return null;
    }

    // Get all cards in this sprint
    const cards = await this.cardRepository.find({
      where: { sprint: { id: sprintId } },
    });

    // Calculate RAG distribution
    const ragDistribution = {
      green: cards.filter((c) => c.ragStatus === CardRAG.GREEN).length,
      amber: cards.filter((c) => c.ragStatus === CardRAG.AMBER).length,
      red: cards.filter((c) => c.ragStatus === CardRAG.RED).length,
    };

    // Calculate sprint-level RAG (worst-case)
    let sprintRAG: CardRAG | null = null;
    if (cards.length > 0) {
      const hasRed = cards.some((c) => c.ragStatus === CardRAG.RED);
      const hasAmber = cards.some((c) => c.ragStatus === CardRAG.AMBER);

      if (hasRed) {
        sprintRAG = CardRAG.RED;
      } else if (hasAmber) {
        sprintRAG = CardRAG.AMBER;
      } else {
        sprintRAG = CardRAG.GREEN;
      }
    }

    // Calculate current day and total days
    const now = new Date();
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);

    const totalMs = endDate.getTime() - startDate.getTime();
    const elapsedMs = now.getTime() - startDate.getTime();

    const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
    const currentDay = Math.max(
      1,
      Math.min(totalDays, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24))),
    );

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      sprintStartDate: sprint.startDate.toISOString(),
      sprintEndDate: sprint.endDate.toISOString(),
      currentDay,
      totalDays,
      sprintRAG,
      ragDistribution,
    };
  }

  /**
   * M11-UC04: Get Team/Assignee Summary widget
   */
  async getTeamSummary(
    projectId: string,
    sprintId: string,
  ): Promise<TeamMemberSummary[]> {
    // Get all team members for this project
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['teamMembers'],
    });

    if (!project || !project.teamMembers) {
      return [];
    }

    const result: TeamMemberSummary[] = [];

    for (const tm of project.teamMembers) {
      // Get active cards for this assignee in this sprint
      const cards = await this.cardRepository.find({
        where: {
          assignee: { id: tm.id },
          sprint: { id: sprintId },
        },
      });

      // Calculate assignee RAG (worst-case)
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
        activeCardsCount: cards.length,
        assigneeRAG,
      });
    }

    return result;
  }

  /**
   * M11-UC05: Get Daily Snap Summary widget
   */
  async getDailySnapSummary(
    sprintId: string,
  ): Promise<DailySnapSummaryWidget | null> {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
    });

    if (!sprint) {
      return null;
    }

    // Get all cards in sprint
    const cards = await this.cardRepository.find({
      where: { sprint: { id: sprintId } },
      relations: ['assignee'],
    });

    // Get today's date (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);

    // Get all snaps for today
    const { In } = require('typeorm');
    const cardIds = cards.map((c) => c.id);

    let snapsToday: Snap[] = [];
    if (cardIds.length > 0) {
      snapsToday = await this.snapRepository.find({
        where: {
          cardId: cardIds.length === 1 ? cardIds[0] : In(cardIds),
          snapDate: todayDate,
        },
      });
    }

    // Cards that have snaps today
    const cardsWithSnapsToday = new Set(snapsToday.map((s) => s.cardId));

    // Cards pending snaps (cards without snaps today)
    const cardsPendingSnaps = cards.filter(
      (c) => !cardsWithSnapsToday.has(c.id),
    ).length;

    // Assignees pending snaps (unique assignees with cards but no snaps today)
    const assigneesPendingSnapsSet = new Set<string>();
    cards.forEach((card) => {
      if (!cardsWithSnapsToday.has(card.id) && card.assignee) {
        assigneesPendingSnapsSet.add(card.assignee.id);
      }
    });

    // Check if today's snaps are locked (if any snap is locked, they all are)
    const isLocked = snapsToday.length > 0 && snapsToday.some((s) => s.isLocked);

    return {
      snapsAddedToday: snapsToday.length,
      cardsPendingSnaps,
      assigneesPendingSnaps: assigneesPendingSnapsSet.size,
      isLocked,
    };
  }

  /**
   * M11-UC06: Get Daily Standup Summary widget
   * Only visible when snaps are locked
   */
  async getDailyStandupSummary(
    sprintId: string,
  ): Promise<DailyStandupSummaryWidget> {
    // Get today's snaps
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);

    const cards = await this.cardRepository.find({
      where: { sprint: { id: sprintId } },
    });

    const { In } = require('typeorm');
    const cardIds = cards.map((c) => c.id);

    let snapsToday: Snap[] = [];
    if (cardIds.length > 0) {
      snapsToday = await this.snapRepository.find({
        where: {
          cardId: cardIds.length === 1 ? cardIds[0] : In(cardIds),
          snapDate: todayDate,
        },
      });
    }

    // Check if snaps are locked
    const isLocked = snapsToday.length > 0 && snapsToday.some((s) => s.isLocked);

    if (!isLocked) {
      return {
        isVisible: false,
        date: '',
        doneCount: 0,
        todoCount: 0,
        blockerCount: 0,
        ragDistribution: { green: 0, amber: 0, red: 0 },
      };
    }

    // Count done/todo/blockers
    let doneCount = 0;
    let todoCount = 0;
    let blockerCount = 0;

    snapsToday.forEach((snap) => {
      if (snap.done) doneCount++;
      if (snap.toDo) todoCount++;
      if (snap.blockers) blockerCount++;
    });

    // RAG distribution for today's snaps (use finalRAG)
    const ragDistribution = {
      green: snapsToday.filter((s) => s.finalRAG === 'green').length,
      amber: snapsToday.filter((s) => s.finalRAG === 'amber').length,
      red: snapsToday.filter((s) => s.finalRAG === 'red').length,
    };

    return {
      isVisible: true,
      date: today,
      doneCount,
      todoCount,
      blockerCount,
      ragDistribution,
    };
  }
}
