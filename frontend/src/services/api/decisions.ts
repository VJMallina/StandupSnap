import { Decision, CreateDecisionInput, UpdateDecisionInput, DecisionFilters } from '../../types/decision';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const decisionsApi = {
  getByProject: async (projectId: string, filters?: DecisionFilters): Promise<Decision[]> => {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.includeArchived !== undefined) params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
    }
    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/decisions/project/${projectId}${query ? `?${query}` : ''}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch decisions');
    return response.json();
  },

  getById: async (id: string): Promise<Decision> => {
    const response = await fetch(`${API_URL}/artifacts/decisions/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch decision');
    return response.json();
  },

  create: async (data: CreateDecisionInput): Promise<Decision> => {
    const response = await fetch(`${API_URL}/artifacts/decisions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create decision');
    }
    return response.json();
  },

  update: async (id: string, data: UpdateDecisionInput): Promise<Decision> => {
    const response = await fetch(`${API_URL}/artifacts/decisions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update decision');
    }
    return response.json();
  },

  archive: async (id: string): Promise<Decision> => {
    const response = await fetch(`${API_URL}/artifacts/decisions/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to archive decision');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifacts/decisions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete decision');
    }
    return response.json();
  },

  export: async (
    projectId: string,
    format: 'csv' | 'excel' | 'pdf',
    filters?: DecisionFilters
  ): Promise<Blob> => {
    const params: Record<string, string> = { format };
    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.includeArchived !== undefined) params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
    }
    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/decisions/project/${projectId}/export?${query}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to export decisions');
    return response.blob();
  },
};
