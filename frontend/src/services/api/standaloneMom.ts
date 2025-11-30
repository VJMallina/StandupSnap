import { StandaloneMom, StandaloneMomFilter, CreateStandaloneMomRequest, UpdateStandaloneMomRequest } from '../../types/standaloneMom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleJson = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
};

const buildQuery = (params: Record<string, string | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.append(key, value);
  });
  return query.toString();
};

export const standaloneMomApi = {
  list: async (filter: StandaloneMomFilter): Promise<StandaloneMom[]> => {
    const query = buildQuery({
      projectId: filter.projectId,
      sprintId: filter.sprintId,
      meetingType: filter.meetingType,
      search: filter.search,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      createdBy: filter.createdBy,
      updatedBy: filter.updatedBy,
    });
    const response = await fetch(`${API_URL}/standalone-mom?${query}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleJson(response);
  },

  get: async (id: string): Promise<StandaloneMom> => {
    const response = await fetch(`${API_URL}/standalone-mom/${id}`, { headers: getAuthHeaders() });
    return handleJson(response);
  },

  create: async (payload: CreateStandaloneMomRequest): Promise<StandaloneMom> => {
    const response = await fetch(`${API_URL}/standalone-mom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    return handleJson(response);
  },

  update: async (id: string, payload: UpdateStandaloneMomRequest): Promise<StandaloneMom> => {
    const response = await fetch(`${API_URL}/standalone-mom/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    return handleJson(response);
  },

  archive: async (id: string): Promise<StandaloneMom> => {
    const response = await fetch(`${API_URL}/standalone-mom/${id}/archive`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleJson(response);
  },

  remove: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/standalone-mom/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Unable to perform the action. Please try again.');
    }
  },

  generate: async (text: string) => {
    const response = await fetch(`${API_URL}/standalone-mom/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ text }),
    });
    return handleJson(response);
  },

  extractTranscript: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/standalone-mom/extract`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData,
    });
    return handleJson(response) as Promise<{ text: string }>;
  },

  download: async (id: string, format: 'txt' | 'docx' = 'txt') => {
    const response = await fetch(`${API_URL}/standalone-mom/${id}/download?format=${format}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Unable to generate file. Please try again.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOM_${id}.${format}`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
