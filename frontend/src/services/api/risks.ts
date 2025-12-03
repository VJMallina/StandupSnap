import { Risk, CreateRiskInput, UpdateRiskInput, RiskFilters, RiskHistory } from '../../types/risk';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const risksApi = {
  /**
   * Get all risks for a project with optional filters
   */
  getByProject: async (projectId: string, filters?: RiskFilters): Promise<Risk[]> => {
    const params: Record<string, string> = {};

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.severity) params.severity = filters.severity;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.strategy) params.strategy = filters.strategy;
      if (filters.riskType) params.riskType = filters.riskType;
      if (filters.includeArchived !== undefined) params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
    }

    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/risks/project/${projectId}${query ? `?${query}` : ''}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to fetch risks');
    return response.json();
  },

  /**
   * Get a single risk by ID
   */
  getById: async (id: string): Promise<Risk> => {
    const response = await fetch(`${API_URL}/artifacts/risks/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch risk');
    return response.json();
  },

  /**
   * Create a new risk
   */
  create: async (data: CreateRiskInput): Promise<Risk> => {
    console.log('API call - Creating risk with data:', JSON.stringify(data, null, 2));
    const response = await fetch(`${API_URL}/artifacts/risks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('API error response:', err);
      throw new Error(err.message || 'Failed to create risk');
    }
    return response.json();
  },

  /**
   * Update an existing risk
   */
  update: async (id: string, data: UpdateRiskInput): Promise<Risk> => {
    const response = await fetch(`${API_URL}/artifacts/risks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update risk');
    }
    return response.json();
  },

  /**
   * Archive a risk (only MITIGATED or CLOSED risks can be archived)
   */
  archive: async (id: string): Promise<Risk> => {
    const response = await fetch(`${API_URL}/artifacts/risks/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to archive risk');
    }
    return response.json();
  },

  /**
   * Delete a risk permanently
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifacts/risks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete risk');
    }
    return response.json();
  },

  /**
   * Get risk history timeline
   */
  getHistory: async (id: string): Promise<RiskHistory[]> => {
    const response = await fetch(`${API_URL}/artifacts/risks/${id}/history`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch risk history');
    }
    return response.json();
  },

  /**
   * Export risks to CSV/Excel/PDF (placeholder for future implementation)
   */
  export: async (
    projectId: string,
    format: 'csv' | 'excel' | 'pdf',
    filters?: RiskFilters
  ): Promise<Blob> => {
    const params: Record<string, string> = { format };

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.severity) params.severity = filters.severity;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.strategy) params.strategy = filters.strategy;
      if (filters.riskType) params.riskType = filters.riskType;
      if (filters.includeArchived !== undefined) params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
    }

    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/risks/project/${projectId}/export?${query}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to export risks');
    return response.blob();
  },
};
