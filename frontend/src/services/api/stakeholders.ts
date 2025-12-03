import { Stakeholder, CreateStakeholderInput, UpdateStakeholderInput, StakeholderFilters } from '../../types/stakeholder';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const stakeholdersApi = {
  getByProject: async (projectId: string, filters?: StakeholderFilters): Promise<Stakeholder[]> => {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.powerLevel) params.powerLevel = filters.powerLevel;
      if (filters.interestLevel) params.interestLevel = filters.interestLevel;
      if (filters.includeArchived !== undefined) params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
    }
    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/stakeholders/project/${projectId}${query ? `?${query}` : ''}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch stakeholders');
    return response.json();
  },

  getById: async (id: string): Promise<Stakeholder> => {
    const response = await fetch(`${API_URL}/artifacts/stakeholders/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch stakeholder');
    return response.json();
  },

  create: async (data: CreateStakeholderInput): Promise<Stakeholder> => {
    const response = await fetch(`${API_URL}/artifacts/stakeholders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create stakeholder');
    }
    return response.json();
  },

  update: async (id: string, data: UpdateStakeholderInput): Promise<Stakeholder> => {
    const response = await fetch(`${API_URL}/artifacts/stakeholders/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update stakeholder');
    }
    return response.json();
  },

  archive: async (id: string): Promise<Stakeholder> => {
    const response = await fetch(`${API_URL}/artifacts/stakeholders/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to archive stakeholder');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifacts/stakeholders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete stakeholder');
    }
    return response.json();
  },

  export: async (
    projectId: string,
    format: 'csv' | 'excel' | 'pdf',
    filters?: StakeholderFilters
  ): Promise<Blob> => {
    const params: Record<string, string> = { format };
    if (filters) {
      if (filters.powerLevel) params.powerLevel = filters.powerLevel;
      if (filters.interestLevel) params.interestLevel = filters.interestLevel;
      if (filters.includeArchived !== undefined) params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
    }
    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/stakeholders/project/${projectId}/export?${query}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to export stakeholders');
    return response.blob();
  },
};
