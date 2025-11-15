import {
  Snap,
  CreateSnapRequest,
  UpdateSnapRequest,
  DailySummary,
  LockDailySnapsRequest,
  GenerateSummaryRequest,
  DailySnapLock,
} from '../../types/snap';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const snapsApi = {
  /**
   * M8-UC01: Create a new snap
   */
  create: async (data: CreateSnapRequest): Promise<Snap> => {
    const response = await fetch(`${API_URL}/snaps`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create snap');
    }

    return response.json();
  },

  /**
   * Get snap by ID
   */
  getById: async (id: string): Promise<Snap> => {
    const response = await fetch(`${API_URL}/snaps/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch snap');
    }

    return response.json();
  },

  /**
   * Get all snaps for a card (with history)
   */
  getByCard: async (cardId: string): Promise<Snap[]> => {
    const response = await fetch(`${API_URL}/snaps/card/${cardId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch card snaps');
    }

    return response.json();
  },

  /**
   * Get all snaps for a sprint on a specific date
   */
  getBySprintAndDate: async (sprintId: string, date: string): Promise<Snap[]> => {
    const response = await fetch(`${API_URL}/snaps/sprint/${sprintId}/date/${date}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch sprint snaps');
    }

    return response.json();
  },

  /**
   * M8-UC02: Update a snap
   */
  update: async (id: string, data: UpdateSnapRequest): Promise<Snap> => {
    const response = await fetch(`${API_URL}/snaps/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update snap');
    }

    return response.json();
  },

  /**
   * M8-UC03: Delete a snap
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/snaps/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete snap');
    }
  },

  /**
   * M8-UC04: Lock daily snaps
   */
  lockDaily: async (data: LockDailySnapsRequest): Promise<DailySnapLock> => {
    const response = await fetch(`${API_URL}/snaps/lock-daily`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to lock daily snaps');
    }

    return response.json();
  },

  /**
   * M8-UC05: Get daily summary
   */
  getDailySummary: async (sprintId: string, date: string): Promise<DailySummary> => {
    const response = await fetch(`${API_URL}/snaps/summary/${sprintId}/${date}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch daily summary');
    }

    return response.json();
  },

  /**
   * Generate daily summary (manual trigger)
   */
  generateSummary: async (data: GenerateSummaryRequest): Promise<DailySummary> => {
    const response = await fetch(`${API_URL}/snaps/generate-summary`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate summary');
    }

    return response.json();
  },

  /**
   * Check if a date is locked
   */
  isDayLocked: async (sprintId: string, date: string): Promise<boolean> => {
    const response = await fetch(`${API_URL}/snaps/is-locked/${sprintId}/${date}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to check lock status');
    }

    const data = await response.json();
    return data.isLocked;
  },
};
