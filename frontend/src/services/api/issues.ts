import { Issue, CreateIssueInput, UpdateIssueInput, IssueFilters } from '../../types/issue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const issuesApi = {
  getByProject: async (projectId: string, filters?: IssueFilters): Promise<Issue[]> => {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.severity) params.severity = filters.severity;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.includeArchived !== undefined) params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
    }
    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/issues/project/${projectId}${query ? `?${query}` : ''}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch issues');
    return response.json();
  },

  getById: async (id: string): Promise<Issue> => {
    const response = await fetch(`${API_URL}/artifacts/issues/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch issue');
    return response.json();
  },

  create: async (data: CreateIssueInput): Promise<Issue> => {
    const response = await fetch(`${API_URL}/artifacts/issues`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create issue');
    }
    return response.json();
  },

  update: async (id: string, data: UpdateIssueInput): Promise<Issue> => {
    const response = await fetch(`${API_URL}/artifacts/issues/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update issue');
    }
    return response.json();
  },

  archive: async (id: string): Promise<Issue> => {
    const response = await fetch(`${API_URL}/artifacts/issues/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to archive issue');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifacts/issues/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete issue');
    }
    return response.json();
  },

  export: async (
    projectId: string,
    format: 'csv' | 'excel' | 'pdf',
    filters?: IssueFilters
  ): Promise<Blob> => {
    const params: Record<string, string> = { format };
    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.severity) params.severity = filters.severity;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.includeArchived !== undefined) params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
    }
    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/issues/project/${projectId}/export?${query}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to export issues');
    return response.blob();
  },
};
