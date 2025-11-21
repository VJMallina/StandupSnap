import { DailySummary } from '../../types/snap';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface GetSummariesOptions {
  projectId: string;
  sprintId?: string;
  startDate?: string;
  endDate?: string;
}

export const reportsApi = {
  /**
   * Get all summaries for a project with optional filters
   */
  getSummaries: async (options: GetSummariesOptions): Promise<DailySummary[]> => {
    const params = new URLSearchParams();
    if (options.sprintId) params.append('sprintId', options.sprintId);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);

    const url = `${API_URL}/snaps/summaries/project/${options.projectId}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch summaries');
    }

    return response.json();
  },
};
