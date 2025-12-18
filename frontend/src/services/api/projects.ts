const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper function for fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
};

export const projectsApi = {
  getAll: async (isArchived?: boolean) => {
    const queryParams = isArchived !== undefined ? `?isArchived=${isArchived}` : '';
    const response = await fetchWithTimeout(`${API_URL}/projects${queryParams}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetchWithTimeout(`${API_URL}/projects/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetchWithTimeout(`${API_URL}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create project');
    }
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetchWithTimeout(`${API_URL}/projects/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetchWithTimeout(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete project');
  },

  getMembers: async (id: string) => {
    const response = await fetchWithTimeout(`${API_URL}/projects/${id}/members`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch members');
    return response.json();
  },

  // Check if project name is unique (excluding the current project in edit mode)
  checkNameUniqueness: async (name: string, excludeId?: string) => {
    const response = await fetchWithTimeout(`${API_URL}/projects/check-name?name=${encodeURIComponent(name)}${excludeId ? `&excludeId=${excludeId}` : ''}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to check name uniqueness');
    return response.json();
  },

  // Archive a project
  archive: async (id: string) => {
    const response = await fetchWithTimeout(`${API_URL}/projects/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to archive project');
    return response.json();
  },
};
