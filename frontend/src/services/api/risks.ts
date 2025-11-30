const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const risksApi = {
  getByProject: async (projectId: string, params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/artifacts/risks/project/${projectId}${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch risks');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_URL}/artifacts/risks/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch risk');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_URL}/artifacts/risks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create risk');
    }
    return response.json();
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_URL}/artifacts/risks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update risk');
    }
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_URL}/artifacts/risks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete risk');
    }
    return response.json();
  },
};
