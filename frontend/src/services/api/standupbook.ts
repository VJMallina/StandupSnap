import { Sprint } from '../../types/sprint';
import { Snap } from '../../types/snap';
import {
  DayMetadata,
  SlotGroup,
  SprintDay,
  Mom,
  DailyLock,
  CreateMomRequest,
  UpdateMomRequest,
  GenerateMomRequest,
  LockDayRequest,
} from '../../types/standupbook';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
};

export const standupBookApi = {
  // SB-UC01: Get active sprint
  getActiveSprint: async (projectId: string): Promise<Sprint | null> => {
    const response = await fetch(`${API_URL}/standup-book/active-sprint/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // SB-UC02: Get sprint days
  getSprintDays: async (sprintId: string): Promise<SprintDay[]> => {
    const response = await fetch(`${API_URL}/standup-book/sprint-days/${sprintId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // SB-UC03: Get day metadata
  getDayMetadata: async (sprintId: string, date: string): Promise<DayMetadata> => {
    const response = await fetch(`${API_URL}/standup-book/day-metadata/${sprintId}?date=${date}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // SB-UC04 & SB-UC05: Get snaps for day
  getSnapsForDay: async (sprintId: string, date: string): Promise<Snap[]> => {
    const response = await fetch(`${API_URL}/standup-book/snaps/${sprintId}?date=${date}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // SB-UC08 & SB-UC09: Get snaps grouped by slots
  getSnapsGroupedBySlots: async (sprintId: string, date: string): Promise<SlotGroup[]> => {
    const response = await fetch(`${API_URL}/standup-book/snaps-by-slots/${sprintId}?date=${date}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Lock day
  lockDay: async (data: LockDayRequest): Promise<DailyLock> => {
    const response = await fetch(`${API_URL}/standup-book/lock-day`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Get daily lock
  getDailyLock: async (sprintId: string, date: string): Promise<DailyLock | null> => {
    const response = await fetch(`${API_URL}/standup-book/daily-lock/${sprintId}?date=${date}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // SB-UC10: Create MOM
  createMom: async (data: CreateMomRequest): Promise<Mom> => {
    const response = await fetch(`${API_URL}/standup-book/mom`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // SB-UC11: Update MOM
  updateMom: async (id: string, data: UpdateMomRequest): Promise<Mom> => {
    const response = await fetch(`${API_URL}/standup-book/mom/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Get MOM by date
  getMomByDate: async (sprintId: string, date: string): Promise<Mom | null> => {
    const response = await fetch(`${API_URL}/standup-book/mom/${sprintId}?date=${date}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get all MOMs for sprint
  getAllMoms: async (sprintId: string): Promise<Mom[]> => {
    const response = await fetch(`${API_URL}/standup-book/moms/${sprintId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Delete MOM
  deleteMom: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/standup-book/mom/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete MOM');
    }
  },

  // Generate MOM with AI
  generateMom: async (data: GenerateMomRequest): Promise<Partial<Mom>> => {
    const response = await fetch(`${API_URL}/standup-book/mom/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // SB-UC12: Download MOM
  downloadMom: async (id: string, format: string = 'txt'): Promise<void> => {
    const response = await fetch(`${API_URL}/standup-book/mom/${id}/download?format=${format}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to download MOM');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOM_${id}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
