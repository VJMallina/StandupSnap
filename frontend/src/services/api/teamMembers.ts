import { TeamMember, CreateTeamMemberDto, UpdateTeamMemberDto } from '../../types/teamMember';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const teamMembersApi = {
  // Team Member CRUD
  create: async (data: CreateTeamMemberDto): Promise<TeamMember> => {
    const response = await fetch(`${API_URL}/team-members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create team member');
    }
    return response.json();
  },

  getAll: async (): Promise<TeamMember[]> => {
    const response = await fetch(`${API_URL}/team-members`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch team members');
    return response.json();
  },

  getById: async (id: string): Promise<TeamMember> => {
    const response = await fetch(`${API_URL}/team-members/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch team member');
    return response.json();
  },

  update: async (id: string, data: UpdateTeamMemberDto): Promise<TeamMember> => {
    const response = await fetch(`${API_URL}/team-members/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update team member');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/team-members/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete team member');
  },

  // Project-specific operations
  getProjectTeam: async (projectId: string): Promise<TeamMember[]> => {
    const response = await fetch(`${API_URL}/projects/${projectId}/team`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch project team');
    return response.json();
  },

  getAvailableForProject: async (projectId: string): Promise<TeamMember[]> => {
    const response = await fetch(`${API_URL}/projects/${projectId}/available-team`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch available team members');
    return response.json();
  },

  addToProject: async (projectId: string, teamMemberIds: string[]): Promise<void> => {
    const response = await fetch(`${API_URL}/projects/${projectId}/team`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ teamMemberIds }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add team members to project');
    }
    return response.json();
  },

  removeFromProject: async (projectId: string, teamMemberId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/projects/${projectId}/team/${teamMemberId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove team member from project');
    }
  },
};
