import {
  Card,
  CreateCardRequest,
  UpdateCardRequest,
  CardRAG,
  CardStatus,
  CardPriority,
  CardType,
  CardActivity,
  CardComment,
} from '../../types/card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

interface GetCardsOptions {
  projectId?: string;
  sprintId?: string;
  assigneeId?: string;
  ragStatus?: CardRAG;
  status?: CardStatus;
  priority?: CardPriority;
  cardType?: CardType;
  laneId?: string;
  parentId?: string;
  backlog?: boolean;
  search?: string;
}

export const cardsApi = {
  getAll: async (options?: GetCardsOptions): Promise<Card[]> => {
    const params = new URLSearchParams();
    if (options?.projectId) params.append('projectId', options.projectId);
    if (options?.sprintId) params.append('sprintId', options.sprintId);
    if (options?.assigneeId) params.append('assigneeId', options.assigneeId);
    if (options?.ragStatus) params.append('ragStatus', options.ragStatus);
    if (options?.status) params.append('status', options.status);
    if (options?.priority) params.append('priority', options.priority);
    if (options?.cardType) params.append('cardType', options.cardType);
    if (options?.laneId) params.append('laneId', options.laneId);
    if (options?.parentId) params.append('parentId', options.parentId);
    if (options?.backlog) params.append('backlog', 'true');
    if (options?.search) params.append('search', options.search);

    const url = `${API_URL}/cards${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch cards');
    return response.json();
  },

  getById: async (id: string): Promise<Card> => {
    const response = await fetch(`${API_URL}/cards/${id}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch card');
    return response.json();
  },

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

  moveToLane: async (id: string, laneId: string): Promise<Card> => {
    return cardsApi.update(id, { laneId });
  },

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

  getActivity: async (id: string): Promise<CardActivity> => {
    const response = await fetch(`${API_URL}/cards/${id}/activity`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch card activity');
    return response.json();
  },

  addComment: async (id: string, body: string): Promise<CardComment> => {
    const response = await fetch(`${API_URL}/cards/${id}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ body }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add comment');
    }
    return response.json();
  },

  updateComment: async (_cardId: string, commentId: string, body: string): Promise<CardComment> => {
    const response = await fetch(`${API_URL}/cards/comments/${commentId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ body }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update comment');
    }
    return response.json();
  },

  deleteComment: async (_cardId: string, commentId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/cards/comments/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete comment');
    }
  },
};
