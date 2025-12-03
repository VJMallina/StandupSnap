import { Assumption, CreateAssumptionInput, UpdateAssumptionInput, AssumptionFilters } from '../../types/assumption';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const assumptionsApi = {
  /**
   * Get all assumptions for a project with optional filters
   */
  getByProject: async (projectId: string, filters?: AssumptionFilters): Promise<Assumption[]> => {
    const params: Record<string, string> = {};

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.includeArchived !== undefined) params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
    }

    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/assumptions/project/${projectId}${query ? `?${query}` : ''}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to fetch assumptions');
    return response.json();
  },

  /**
   * Get a single assumption by ID
   */
  getById: async (id: string): Promise<Assumption> => {
    const response = await fetch(`${API_URL}/artifacts/assumptions/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch assumption');
    return response.json();
  },

  /**
   * Create a new assumption
   */
  create: async (data: CreateAssumptionInput): Promise<Assumption> => {
    console.log('API call - Creating assumption with data:', JSON.stringify(data, null, 2));
    const response = await fetch(`${API_URL}/artifacts/assumptions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('API error response:', err);
      throw new Error(err.message || 'Failed to create assumption');
    }
    return response.json();
  },

  /**
   * Update an existing assumption
   */
  update: async (id: string, data: UpdateAssumptionInput): Promise<Assumption> => {
    const response = await fetch(`${API_URL}/artifacts/assumptions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update assumption');
    }
    return response.json();
  },

  /**
   * Archive an assumption
   */
  archive: async (id: string): Promise<Assumption> => {
    const response = await fetch(`${API_URL}/artifacts/assumptions/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to archive assumption');
    }
    return response.json();
  },

  /**
   * Delete an assumption permanently
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifacts/assumptions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete assumption');
    }
    return response.json();
  },

  /**
   * Export assumptions to CSV/Excel/PDF
   */
  export: async (
    projectId: string,
    format: 'csv' | 'excel' | 'pdf',
    filters?: AssumptionFilters
  ): Promise<Blob> => {
    const params: Record<string, string> = { format };

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.includeArchived !== undefined) params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
    }

    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/assumptions/project/${projectId}/export?${query}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to export assumptions');
    return response.blob();
  },
};
