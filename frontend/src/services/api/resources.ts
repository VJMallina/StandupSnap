const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export enum ResourceRole {
  DEVELOPER = 'Developer',
  QA = 'QA',
  BA = 'BA',
  DESIGNER = 'Designer',
  ARCHITECT = 'Architect',
  PROJECT_COORDINATOR = 'Project Coordinator',
  OTHER = 'Other',
}

export enum ResourceRAGStatus {
  GREEN = 'green',
  AMBER = 'amber',
  RED = 'red',
}

export interface Resource {
  id: string;
  name: string;
  role: ResourceRole;
  customRoleName?: string;
  skills: string[];
  weeklyAvailability: number;
  weeklyWorkload: number;
  loadPercentage: number;
  ragStatus: ResourceRAGStatus;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceDto {
  projectId: string;
  name: string;
  role: ResourceRole;
  customRoleName?: string;
  skills?: string[];
  weeklyAvailability?: number;
  weeklyWorkload?: number;
  notes?: string;
}

export interface UpdateResourceDto {
  name?: string;
  role?: ResourceRole;
  customRoleName?: string;
  skills?: string[];
  weeklyAvailability?: number;
  weeklyWorkload?: number;
  notes?: string;
  isArchived?: boolean;
}

export interface ResourceWorkload {
  weekStartDate: string;
  weekEndDate: string;
  availability: number;
  workload: number;
  loadPercentage: number;
  ragStatus: string;
  notes?: string;
}

export interface HeatmapData {
  resourceId: string;
  resourceName: string;
  role: ResourceRole;
  weeklyData: ResourceWorkload[];
}

export interface CapacitySummary {
  totalResources: number;
  underutilized: number;
  ideal: number;
  overloaded: number;
  ragDistribution: {
    green: number;
    amber: number;
    red: number;
  };
}

export const resourcesApi = {
  // RT-UC01: Create Resource
  create: async (data: CreateResourceDto): Promise<Resource> => {
    const response = await fetch(`${API_URL}/resources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create resource');
    }
    return response.json();
  },

  // RT-UC04: View Resource Register Table
  getAll: async (projectId: string, includeArchived: boolean = false): Promise<Resource[]> => {
    const response = await fetch(
      `${API_URL}/resources?projectId=${projectId}&includeArchived=${includeArchived}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to fetch resources');
    return response.json();
  },

  // RT-UC16: View Resource Details
  getById: async (id: string): Promise<Resource> => {
    const response = await fetch(`${API_URL}/resources/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch resource');
    return response.json();
  },

  // RT-UC02: Edit Resource Details
  update: async (id: string, data: UpdateResourceDto): Promise<Resource> => {
    const response = await fetch(`${API_URL}/resources/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update resource');
    }
    return response.json();
  },

  // RT-UC03 & RT-UC17: Archive Resource
  archive: async (id: string): Promise<Resource> => {
    const response = await fetch(`${API_URL}/resources/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to archive resource');
    return response.json();
  },

  // Delete Resource
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/resources/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete resource');
  },

  // RT-UC14: Filter Resources
  filter: async (
    projectId: string,
    filters: {
      role?: ResourceRole;
      name?: string;
      minLoad?: number;
      maxLoad?: number;
      isArchived?: boolean;
    }
  ): Promise<Resource[]> => {
    const params = new URLSearchParams({ projectId });
    if (filters.role) params.append('role', filters.role);
    if (filters.name) params.append('name', filters.name);
    if (filters.minLoad !== undefined) params.append('minLoad', filters.minLoad.toString());
    if (filters.maxLoad !== undefined) params.append('maxLoad', filters.maxLoad.toString());
    if (filters.isArchived !== undefined) params.append('isArchived', filters.isArchived.toString());

    const response = await fetch(`${API_URL}/resources/filter?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to filter resources');
    return response.json();
  },

  // RT-UC19: Manage Resource Workload
  createOrUpdateWorkload: async (data: {
    resourceId: string;
    weekStartDate: string;
    availability: number;
    workload: number;
    notes?: string;
  }): Promise<any> => {
    const response = await fetch(`${API_URL}/resources/workload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to manage workload');
    }
    return response.json();
  },

  // Get Resource Workload Data
  getResourceWorkload: async (resourceId: string): Promise<ResourceWorkload[]> => {
    const response = await fetch(`${API_URL}/resources/${resourceId}/workload`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch resource workload');
    return response.json();
  },

  // RT-UC09/10/11: Get Heatmap Data
  getHeatmapData: async (
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<HeatmapData[]> => {
    const response = await fetch(
      `${API_URL}/resources/heatmap/data?projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error('Failed to fetch heatmap data');
    return response.json();
  },

  // Get Capacity Summary
  getCapacitySummary: async (projectId: string): Promise<CapacitySummary> => {
    const response = await fetch(`${API_URL}/resources/summary/capacity?projectId=${projectId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch capacity summary');
    return response.json();
  },
};
