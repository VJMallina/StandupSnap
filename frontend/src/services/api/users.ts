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
  firstName: string;
  lastName: string;
  role: string;
}

export const usersApi = {
  // Get users by role (for PO/PMO dropdowns)
  getByRole: async (role: string): Promise<User[]> => {
    // Note: Backend API integration will be done in next session
    // For now, return mock data
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'po1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'PRODUCT_OWNER'
      },
      {
        id: '2',
        email: 'po2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'PRODUCT_OWNER'
      },
      {
        id: '3',
        email: 'pmo1@example.com',
        firstName: 'Bob',
        lastName: 'Johnson',
        role: 'PMO'
      },
      {
        id: '4',
        email: 'pmo2@example.com',
        firstName: 'Alice',
        lastName: 'Williams',
        role: 'PMO'
      }
    ];

    // Filter by role
    return mockUsers.filter(user => user.role === role);

    // TODO: Replace with actual API call in next session
    // const response = await fetch(`${API_URL}/users?role=${role}`, {
    //   headers: getAuthHeaders(),
    // });
    // return response.json();
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
