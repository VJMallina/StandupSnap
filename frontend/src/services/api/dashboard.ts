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
  sprintRAG: 'red' | 'amber' | 'green' | null;
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
  assigneeRAG: 'red' | 'amber' | 'green' | null;
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const dashboardApi = {
  /**
   * M11-UC01: Get complete dashboard data
   */
  getDashboard: async (projectId?: string): Promise<DashboardData> => {
    const queryParams = new URLSearchParams();
    if (projectId) queryParams.append('projectId', projectId);

    const response = await fetch(
      `${API_URL}/dashboard${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch dashboard' }));
      throw new Error(error.message || 'Failed to fetch dashboard');
    }

    return response.json();
  },

  /**
   * M11-UC02: Get user's assigned projects
   */
  getUserProjects: async (): Promise<ProjectSummary[]> => {
    const response = await fetch(`${API_URL}/dashboard/projects`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch projects' }));
      throw new Error(error.message || 'Failed to fetch projects');
    }

    return response.json();
  },
};
