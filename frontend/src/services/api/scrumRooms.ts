import {
  ScrumRoom,
  CreateRoomInput,
  UpdateRoomInput,
  UpdateRoomDataInput,
  RoomFilters,
} from '../../types/scrumRooms';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const scrumRoomsApi = {
  getAll: async (filters?: RoomFilters): Promise<ScrumRoom[]> => {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.includeArchived !== undefined)
        params.includeArchived = String(filters.includeArchived);
    }
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/scrum-rooms${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch rooms');
    return response.json();
  },

  getById: async (id: string): Promise<ScrumRoom> => {
    const response = await fetch(`${API_URL}/scrum-rooms/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch room');
    return response.json();
  },

  create: async (data: CreateRoomInput): Promise<ScrumRoom> => {
    const response = await fetch(`${API_URL}/scrum-rooms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create room');
    }
    return response.json();
  },

  update: async (id: string, data: UpdateRoomInput): Promise<ScrumRoom> => {
    const response = await fetch(`${API_URL}/scrum-rooms/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update room');
    }
    return response.json();
  },

  updateData: async (id: string, data: UpdateRoomDataInput): Promise<ScrumRoom> => {
    const response = await fetch(`${API_URL}/scrum-rooms/${id}/data`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update room data');
    }
    return response.json();
  },

  archive: async (id: string): Promise<ScrumRoom> => {
    const response = await fetch(`${API_URL}/scrum-rooms/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to archive room');
    }
    return response.json();
  },

  restore: async (id: string): Promise<ScrumRoom> => {
    const response = await fetch(`${API_URL}/scrum-rooms/${id}/restore`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to restore room');
    }
    return response.json();
  },

  complete: async (id: string): Promise<ScrumRoom> => {
    const response = await fetch(`${API_URL}/scrum-rooms/${id}/complete`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to complete room');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/scrum-rooms/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete room');
    }
  },

  generateMOMSummary: async (text: string): Promise<{
    summary: string;
    decisions: string[];
    actionItems: Array<{ id: string; description: string; assignee?: string; dueDate?: string }>;
  }> => {
    const response = await fetch(`${API_URL}/scrum-rooms/mom/generate-ai`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate summary');
    }
    return response.json();
  },
};
