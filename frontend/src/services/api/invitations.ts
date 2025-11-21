const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface CreateInvitationDto {
  email: string;
  assignedRole: 'scrum_master' | 'product_owner' | 'pmo';
  projectId?: string;
}

export interface Invitation {
  id: string;
  email: string;
  assignedRole: string;
  status: string;
  token: string;
  expiresAt: string;
  project?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export const invitationsApi = {
  create: async (dto: CreateInvitationDto): Promise<Invitation> => {
    const response = await fetch(`${API_URL}/invitations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create invitation');
    }

    return response.json();
  },

  getAll: async (projectId?: string): Promise<Invitation[]> => {
    const url = projectId
      ? `${API_URL}/invitations?projectId=${projectId}`
      : `${API_URL}/invitations`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch invitations');
    }

    return response.json();
  },

  revoke: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/invitations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to revoke invitation');
    }
  },
};
