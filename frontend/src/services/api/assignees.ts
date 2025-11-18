export interface AssigneeListItem {
  id: string;
  fullName: string;
  displayName: string | null;
  designationRole: string;
  assignedCardsCount: number;
  assigneeRAG: 'red' | 'amber' | 'green' | null;
}

export interface AssigneeDetails extends AssigneeListItem {
  cards: any[]; // Card type
}

export interface SnapsByDate {
  date: string;
  snaps: any[]; // Snap type
  isToday: boolean;
  isYesterday: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const assigneesApi = {
  /**
   * M10-UC01: Get all assignees
   */
  getAll: async (params?: {
    projectId?: string;
    sprintId?: string;
  }): Promise<AssigneeListItem[]> => {
    const queryParams = new URLSearchParams();
    if (params?.projectId) queryParams.append('projectId', params.projectId);
    if (params?.sprintId) queryParams.append('sprintId', params.sprintId);

    const response = await fetch(
      `${API_URL}/assignees${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch assignees' }));
      throw new Error(error.message || 'Failed to fetch assignees');
    }

    return response.json();
  },

  /**
   * M10-UC02: Get assignee details
   */
  getById: async (
    assigneeId: string,
    sprintId?: string,
  ): Promise<AssigneeDetails> => {
    const queryParams = new URLSearchParams();
    if (sprintId) queryParams.append('sprintId', sprintId);

    const response = await fetch(
      `${API_URL}/assignees/${assigneeId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch assignee details' }));
      throw new Error(error.message || 'Failed to fetch assignee details');
    }

    return response.json();
  },

  /**
   * M10-UC04: Get assignee's cards with filters
   */
  getCards: async (
    assigneeId: string,
    params?: {
      sprintId?: string;
      status?: string;
      rag?: string;
      search?: string;
    },
  ): Promise<any[]> => {
    const queryParams = new URLSearchParams();
    if (params?.sprintId) queryParams.append('sprintId', params.sprintId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.rag) queryParams.append('rag', params.rag);
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(
      `${API_URL}/assignees/${assigneeId}/cards${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch assignee cards' }));
      throw new Error(error.message || 'Failed to fetch assignee cards');
    }

    return response.json();
  },

  /**
   * M10-UC03: Get assignee's snap history
   */
  getSnapHistory: async (
    assigneeId: string,
    sprintId?: string,
  ): Promise<SnapsByDate[]> => {
    const queryParams = new URLSearchParams();
    if (sprintId) queryParams.append('sprintId', sprintId);

    const response = await fetch(
      `${API_URL}/assignees/${assigneeId}/snaps${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch assignee snaps' }));
      throw new Error(error.message || 'Failed to fetch assignee snaps');
    }

    return response.json();
  },
};
