import {
  Card,
  CreateCardRequest,
  UpdateCardRequest,
  CardRAG,
  CardStatus,
  CardPriority,
} from '../../types/card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const cardsApi = {
  // M7-UC05: Get all cards with filtering and search
  getAll: async (
    projectId?: string,
    sprintId?: string,
    assigneeId?: string,
    ragStatus?: CardRAG,
    status?: CardStatus,
    priority?: CardPriority,
    search?: string,
  ): Promise<Card[]> => {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (sprintId) params.append('sprintId', sprintId);
    if (assigneeId) params.append('assigneeId', assigneeId);
    if (ragStatus) params.append('ragStatus', ragStatus);
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (search) params.append('search', search);

    const url = `${API_URL}/cards${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cards');
    }

    return response.json();
  },

  // M7-UC04: Get card by ID with details
  getById: async (id: string): Promise<Card> => {
    const response = await fetch(`${API_URL}/cards/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch card');
    }

    return response.json();
  },

  // M7-UC01: Create card
  create: async (data: CreateCardRequest): Promise<Card> => {
    const response = await fetch(`${API_URL}/cards`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create card');
    }

    return response.json();
  },

  // M7-UC02: Update card
  update: async (id: string, data: UpdateCardRequest): Promise<Card> => {
    const response = await fetch(`${API_URL}/cards/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update card');
    }

    return response.json();
  },

  // M7-UC06: Mark card as completed
  markAsCompleted: async (id: string): Promise<Card> => {
    const response = await fetch(`${API_URL}/cards/${id}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to mark card as completed');
    }

    return response.json();
  },

  // M7-UC03: Delete card
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/cards/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete card');
    }
  },
};
