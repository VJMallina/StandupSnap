import {
  Sprint,
  CreateSprintRequest,
  UpdateSprintRequest,
  GenerateSprintsRequest,
  PreviewSprintsRequest,
  SprintPreview,
  SprintStatus
} from '../../types/sprint';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const sprintsApi = {
  // M6-UC02 & M6-UC07: Get all sprints with filtering and search
  getAll: async (projectId?: string, status?: SprintStatus, search?: string): Promise<Sprint[]> => {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const url = `${API_URL}/sprints${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sprints');
    }

    return response.json();
  },

  // M6-UC02: Get sprint by ID with details
  getById: async (id: string): Promise<Sprint> => {
    const response = await fetch(`${API_URL}/sprints/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sprint');
    }

    return response.json();
  },

  // M6-UC01: Create sprint (Manual)
  create: async (data: CreateSprintRequest): Promise<Sprint> => {
    const response = await fetch(`${API_URL}/sprints`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create sprint');
    }

    return response.json();
  },

  // M6-UC03: Update sprint details
  update: async (id: string, data: UpdateSprintRequest): Promise<Sprint> => {
    const response = await fetch(`${API_URL}/sprints/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update sprint');
    }

    return response.json();
  },

  // M6-UC04: Delete sprint
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/sprints/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete sprint');
    }
  },

  // M6-UC01: Preview auto-generated sprints
  preview: async (data: PreviewSprintsRequest): Promise<SprintPreview[]> => {
    const response = await fetch(`${API_URL}/sprints/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to preview sprints');
    }

    return response.json();
  },

  // M6-UC01: Auto-generate sprints
  generate: async (data: GenerateSprintsRequest): Promise<Sprint[]> => {
    const response = await fetch(`${API_URL}/sprints/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate sprints');
    }

    return response.json();
  },

  // M6-UC06: Close sprint
  closeSprint: async (id: string): Promise<Sprint> => {
    const response = await fetch(`${API_URL}/sprints/${id}/close`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to close sprint');
    }

    return response.json();
  },
};
