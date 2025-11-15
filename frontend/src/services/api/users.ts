const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
}

export const usersApi = {
  // Get users by role (for PO/PMO dropdowns)
  getByRole: async (role: string): Promise<User[]> => {
    const response = await fetch(`${API_URL}/users?role=${role}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch users by role');
    }
    return response.json();
  },

  // Get all users
  getAll: async (): Promise<User[]> => {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },

  // Get user by ID
  getById: async (id: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  }
};
