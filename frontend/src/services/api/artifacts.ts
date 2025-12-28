import {
  ArtifactTemplate,
  ArtifactInstance,
  ArtifactVersion,
  CreateArtifactTemplateDto,
  UpdateArtifactTemplateDto,
  CreateArtifactInstanceDto,
  UpdateArtifactInstanceDto,
  CreateArtifactVersionDto,
} from '../../types/artifact';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const artifactsApi = {
  // ==================== TEMPLATE CRUD ====================

  createTemplate: async (data: CreateArtifactTemplateDto): Promise<ArtifactTemplate> => {
    const response = await fetch(`${API_URL}/artifact-templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create artifact template');
    }
    return response.json();
  },

  getSystemTemplates: async (): Promise<ArtifactTemplate[]> => {
    const response = await fetch(`${API_URL}/artifact-templates/system`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch system templates');
    }
    return response.json();
  },

  getAllTemplates: async (projectId?: string): Promise<ArtifactTemplate[]> => {
    const url = projectId
      ? `${API_URL}/artifact-templates?projectId=${projectId}`
      : `${API_URL}/artifact-templates`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch templates');
    }
    return response.json();
  },

  getTemplateById: async (id: string): Promise<ArtifactTemplate> => {
    const response = await fetch(`${API_URL}/artifact-templates/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch template');
    }
    return response.json();
  },

  updateTemplate: async (id: string, data: UpdateArtifactTemplateDto): Promise<ArtifactTemplate> => {
    const response = await fetch(`${API_URL}/artifact-templates/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update template');
    }
    return response.json();
  },

  deleteTemplate: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifact-templates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete template');
    }
  },

  // ==================== INSTANCE CRUD ====================

  createInstance: async (data: CreateArtifactInstanceDto): Promise<ArtifactInstance> => {
    const response = await fetch(`${API_URL}/artifact-instances`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create artifact instance');
    }
    return response.json();
  },

  getInstancesByProject: async (projectId: string): Promise<ArtifactInstance[]> => {
    const response = await fetch(`${API_URL}/artifact-instances?projectId=${projectId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch artifact instances');
    }
    return response.json();
  },

  getInstanceById: async (id: string): Promise<ArtifactInstance> => {
    const response = await fetch(`${API_URL}/artifact-instances/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch artifact instance');
    }
    return response.json();
  },

  updateInstance: async (id: string, data: UpdateArtifactInstanceDto): Promise<ArtifactInstance> => {
    const response = await fetch(`${API_URL}/artifact-instances/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update artifact instance');
    }
    return response.json();
  },

  deleteInstance: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifact-instances/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete artifact instance');
    }
  },

  updateInstanceData: async (id: string, data: any): Promise<ArtifactVersion> => {
    const response = await fetch(`${API_URL}/artifact-instances/${id}/data`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ data }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update artifact data');
    }
    return response.json();
  },

  // ==================== VERSION MANAGEMENT ====================

  createVersion: async (
    instanceId: string,
    data: CreateArtifactVersionDto
  ): Promise<ArtifactVersion> => {
    const response = await fetch(`${API_URL}/artifact-instances/${instanceId}/versions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create version');
    }
    return response.json();
  },

  getVersions: async (instanceId: string): Promise<ArtifactVersion[]> => {
    const response = await fetch(`${API_URL}/artifact-instances/${instanceId}/versions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch versions');
    }
    return response.json();
  },

  getVersion: async (instanceId: string, versionId: string): Promise<ArtifactVersion> => {
    const response = await fetch(`${API_URL}/artifact-instances/${instanceId}/versions/${versionId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch version');
    }
    return response.json();
  },

  restoreVersion: async (instanceId: string, versionId: string): Promise<ArtifactVersion> => {
    const response = await fetch(
      `${API_URL}/artifact-instances/${instanceId}/versions/${versionId}/restore`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to restore version');
    }
    return response.json();
  },
};
