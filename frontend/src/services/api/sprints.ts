import { Sprint, CreateSprintRequest, UpdateSprintRequest, GenerateSprintsRequest } from '../../types/sprint';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const sprintsApi = {
  getAll: async (projectId?: string): Promise<Sprint[]> => {
    const url = projectId
      ? `${API_URL}/sprints?projectId=${projectId}`
      : `${API_URL}/sprints`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sprints');
    }

    return response.json();
  },

  getById: async (id: string): Promise<Sprint> => {
    const response = await fetch(`${API_URL}/sprints/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sprint');
    }

    return response.json();
  },

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

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/sprints/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete sprint');
    }
  },

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
};
