const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const projectsApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/projects`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  },

  create: async (data: any) => {
    const response = await fetch(`${API_URL}/projects`, {
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
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete project');
  },

  getMembers: async (id: string) => {
    const response = await fetch(`${API_URL}/projects/${id}/members`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch members');
    return response.json();
  },
};
