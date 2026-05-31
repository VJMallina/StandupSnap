import { Injectable } from '@nestjs/common';
import { Project } from '../entities/project.entity';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { Card, CardRAG } from '../entities/card.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Snap } from '../entities/snap.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { TenantService } from '../tenant/tenant.service';

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
  constructor(private tenantService: TenantService) {}

  async getDashboardData(
    userId: string,
    projectId?: string,
    organizationId?: string,
    orgRole?: string,
  ): Promise<DashboardData> {
    const userProjects = await this.getUserProjects(userId, orgRole);

    if (userProjects.length === 0) {
      return {
        project: null,
        sprintHealth: null,
        teamSummary: [],
        dailySnapSummary: null,
        dailyStandupSummary: { isVisible: false, date: '', doneCount: 0, todoCount: 0, blockerCount: 0, ragDistribution: { green: 0, amber: 0, red: 0 } },
      };
    }

    let selectedProject: Project;
    if (projectId) {
      const found = userProjects.find((p) => p.id === projectId);
      if (!found) {
        throw new Error('Project not found or not accessible');
      }
      selectedProject = found;
    } else {
      selectedProject = userProjects[0];
    }

    const sprintRepo = await this.tenantService.getRepository(Sprint);
    const activeSprint = await sprintRepo.findOne({
      where: { project: { id: selectedProject.id }, status: SprintStatus.ACTIVE },
    });

    if (!activeSprint) {
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

  async getUserProjects(userId: string, orgRole?: string): Promise<Project[]> {
    const ORG_WIDE_ROLES = ['ORG_ADMIN', 'PMO'];
    if (orgRole && ORG_WIDE_ROLES.includes(orgRole)) {
      const projectRepo = await this.tenantService.getRepository(Project);
      return projectRepo.find({
        where: { isArchived: false },
        order: { createdAt: 'DESC' },
      });
    }

    const projectMemberRepo = await this.tenantService.getRepository(ProjectMember);
    const memberships = await projectMemberRepo
      .createQueryBuilder('pm')
      .leftJoinAndSelect('pm.project', 'project')
      .where('pm.user_id = :userId', { userId })
      .andWhere('pm.isActive = true')
      .andWhere('project.isArchived = false')
      .getMany();

    return memberships.filter((pm) => pm.project).map((pm) => pm.project);
  }

  async getSprintHealth(sprintId: string): Promise<SprintHealthWidget | null> {
    const [sprintRepo, cardRepo] = await Promise.all([
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(Card),
    ]);

    const sprint = await sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) return null;

    const cards = await cardRepo.find({ where: { sprint: { id: sprintId } } });

    const ragDistribution = {
      green: cards.filter((c) => c.ragStatus === CardRAG.GREEN).length,
      amber: cards.filter((c) => c.ragStatus === CardRAG.AMBER).length,
      red: cards.filter((c) => c.ragStatus === CardRAG.RED).length,
    };

    let sprintRAG: CardRAG | null = null;
    if (cards.length > 0) {
      const hasRed = cards.some((c) => c.ragStatus === CardRAG.RED);
      const hasAmber = cards.some((c) => c.ragStatus === CardRAG.AMBER);
      if (hasRed) sprintRAG = CardRAG.RED;
      else if (hasAmber) sprintRAG = CardRAG.AMBER;
      else sprintRAG = CardRAG.GREEN;
    }

    const now = new Date();
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const totalMs = endDate.getTime() - startDate.getTime();
    const elapsedMs = now.getTime() - startDate.getTime();
    const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
    const currentDay = Math.max(1, Math.min(totalDays, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24))));

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      sprintStartDate: String(sprint.startDate),
      sprintEndDate: String(sprint.endDate),
      currentDay,
      totalDays,
      sprintRAG,
      ragDistribution,
    };
  }

  async getTeamSummary(projectId: string, sprintId: string): Promise<TeamMemberSummary[]> {
    const [projectRepo, cardRepo] = await Promise.all([
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(Card),
    ]);

    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ['teamMembers'],
    });

    if (!project || !project.teamMembers) return [];

    const result: TeamMemberSummary[] = [];

    for (const tm of project.teamMembers) {
      const cards = await cardRepo.find({
        where: { assignee: { id: tm.id }, sprint: { id: sprintId } },
      });

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
        activeCardsCount: cards.length,
        assigneeRAG,
      });
    }

    return result;
  }

  async getDailySnapSummary(sprintId: string): Promise<DailySnapSummaryWidget | null> {
    const [sprintRepo, cardRepo, snapRepo] = await Promise.all([
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(Card),
      this.tenantService.getRepository(Snap),
    ]);

    const sprint = await sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) return null;

    const cards = await cardRepo.find({
      where: { sprint: { id: sprintId } },
      relations: ['assignee'],
    });

    const today = new Date().toISOString().split('T')[0];
    const cardIds = cards.map((c) => c.id);

    let snapsToday: Snap[] = [];
    if (cardIds.length > 0) {
      snapsToday = await snapRepo
        .createQueryBuilder('snap')
        .where('snap.card_id IN (:...cardIds)', { cardIds })
        .andWhere('snap.snapDate = :today', { today })
        .getMany();
    }

    const cardsWithSnapsToday = new Set(snapsToday.map((s) => s.cardId));
    const cardsPendingSnaps = cards.filter((c) => !cardsWithSnapsToday.has(c.id)).length;

    const assigneesPendingSnapsSet = new Set<string>();
    cards.forEach((card) => {
      if (!cardsWithSnapsToday.has(card.id) && card.assignee) {
        assigneesPendingSnapsSet.add(card.assignee.id);
      }
    });

    const isLocked = snapsToday.length > 0 && snapsToday.some((s) => s.isLocked);

    return {
      snapsAddedToday: snapsToday.length,
      cardsPendingSnaps,
      assigneesPendingSnaps: assigneesPendingSnapsSet.size,
      isLocked,
    };
  }

  async getDailyStandupSummary(sprintId: string): Promise<DailyStandupSummaryWidget> {
    const [cardRepo, snapRepo] = await Promise.all([
      this.tenantService.getRepository(Card),
      this.tenantService.getRepository(Snap),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const cards = await cardRepo.find({ where: { sprint: { id: sprintId } } });
    const cardIds = cards.map((c) => c.id);

    let snapsToday: Snap[] = [];
    if (cardIds.length > 0) {
      snapsToday = await snapRepo
        .createQueryBuilder('snap')
        .where('snap.card_id IN (:...cardIds)', { cardIds })
        .andWhere('snap.snapDate = :today', { today })
        .getMany();
    }

    const isLocked = snapsToday.length > 0 && snapsToday.some((s) => s.isLocked);

    if (!isLocked) {
      return { isVisible: false, date: '', doneCount: 0, todoCount: 0, blockerCount: 0, ragDistribution: { green: 0, amber: 0, red: 0 } };
    }

    let doneCount = 0;
    let todoCount = 0;
    let blockerCount = 0;
    snapsToday.forEach((snap) => {
      if (snap.done) doneCount++;
      if (snap.toDo) todoCount++;
      if (snap.blockers) blockerCount++;
    });

    const ragDistribution = {
      green: snapsToday.filter((s) => s.finalRAG === 'green').length,
      amber: snapsToday.filter((s) => s.finalRAG === 'amber').length,
      red: snapsToday.filter((s) => s.finalRAG === 'red').length,
    };

    return { isVisible: true, date: today, doneCount, todoCount, blockerCount, ragDistribution };
  }
}
