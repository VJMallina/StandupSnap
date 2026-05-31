import { WorkflowTemplate, WorkflowLane, TransitionMode } from '../../types/card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const workflowApi = {
  getProjectWorkflows: async (projectId: string): Promise<WorkflowTemplate[]> => {
    const response = await fetch(`${API_URL}/workflows/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch workflows');
    return response.json();
  },

  getDefaultWorkflow: async (projectId: string): Promise<WorkflowTemplate> => {
    const response = await fetch(`${API_URL}/workflows/project/${projectId}/default`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch default workflow');
    return response.json();
  },

  getWorkflow: async (id: string): Promise<WorkflowTemplate> => {
    const response = await fetch(`${API_URL}/workflows/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch workflow');
    return response.json();
  },

  addLane: async (
    workflowId: string,
    data: { name: string; color?: string; laneType: string; order?: number }
  ): Promise<WorkflowLane> => {
    const response = await fetch(`${API_URL}/workflows/${workflowId}/lanes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add lane');
    }
    return response.json();
  },

  updateLane: async (
    laneId: string,
    data: { name?: string; color?: string; laneType?: string; isFinalLane?: boolean }
  ): Promise<WorkflowLane> => {
    const response = await fetch(`${API_URL}/workflows/lanes/${laneId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update lane');
    }
    return response.json();
  },

  reorderLanes: async (
    workflowId: string,
    laneOrders: { laneId: string; order: number }[]
  ): Promise<WorkflowLane[]> => {
    const response = await fetch(`${API_URL}/workflows/${workflowId}/lanes/reorder`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ laneOrders }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reorder lanes');
    }
    return response.json();
  },

  deleteLane: async (laneId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/workflows/lanes/${laneId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete lane');
    }
  },

  updateWorkflow: async (
    id: string,
    data: { transitionMode?: TransitionMode },
  ): Promise<WorkflowTemplate> => {
    const response = await fetch(`${API_URL}/workflows/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update workflow');
    }
    return response.json();
  },
};
