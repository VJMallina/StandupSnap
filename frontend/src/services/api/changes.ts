import { Change, CreateChangeInput, UpdateChangeInput } from '../../types/change';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper to clean up empty strings and undefined values
const cleanPayload = (data: any) => {
  const cleaned: any = {};
  for (const key in data) {
    const value = data[key];
    // Skip empty strings, null, and undefined
    if (value !== '' && value !== null && value !== undefined) {
      // For arrays, only include if not empty
      if (Array.isArray(value)) {
        if (value.length > 0) {
          cleaned[key] = value;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

export const changesApi = {
  create: async (data: CreateChangeInput): Promise<Change> => {
    const cleanedData = cleanPayload(data);
    console.log('Creating change with payload:', cleanedData);
    const response = await fetch(`${API_URL}/changes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cleanedData),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create change error:', errorText);
      let errorMessage = 'Failed to create change';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
        if (Array.isArray(errorMessage)) {
          errorMessage = errorMessage.join(', ');
        }
      } catch {
        // If parsing fails, use default message
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  update: async (id: string, data: UpdateChangeInput): Promise<Change> => {
    const cleanedData = cleanPayload(data);
    console.log('Updating change with payload:', cleanedData);
    const response = await fetch(`${API_URL}/changes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(cleanedData),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update change error:', errorText);
      let errorMessage = 'Failed to update change';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
        if (Array.isArray(errorMessage)) {
          errorMessage = errorMessage.join(', ');
        }
      } catch {
        // If parsing fails, use default message
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  getById: async (id: string): Promise<Change> => {
    const response = await fetch(`${API_URL}/changes/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch change');
    return response.json();
  },

  getByProject: async (projectId: string, includeArchived = false): Promise<Change[]> => {
    const params = new URLSearchParams({ includeArchived: String(includeArchived) });
    const response = await fetch(`${API_URL}/changes/project/${projectId}?${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch changes');
    return response.json();
  },

  archive: async (id: string): Promise<Change> => {
    const response = await fetch(`${API_URL}/changes/${id}/archive`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to archive change');
    return response.json();
  },

  exportCsv: async (projectId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/changes/project/${projectId}/export`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'text/csv',
      },
    });
    if (!response.ok) throw new Error('Failed to export changes');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `changes-${projectId}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
