import {
  FormTemplate,
  FormInstance,
  FormField,
  CreateFormTemplateInput,
  UpdateFormTemplateInput,
  CreateFormInstanceInput,
  UpdateFormInstanceInput,
  UpdateFieldOrderInput,
  TemplateFilters,
  InstanceFilters,
} from '../../types/formBuilder';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// ========== TEMPLATE API ==========

export const formBuilderTemplateApi = {
  getByProject: async (projectId: string, filters?: TemplateFilters): Promise<FormTemplate[]> => {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.includeArchived !== undefined)
        params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
    }
    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/form-builder/templates/project/${projectId}${query ? `?${query}` : ''}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  },

  getById: async (id: string): Promise<FormTemplate> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/templates/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch template');
    return response.json();
  },

  create: async (data: CreateFormTemplateInput): Promise<FormTemplate> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create template');
    }
    return response.json();
  },

  update: async (id: string, data: UpdateFormTemplateInput): Promise<FormTemplate> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/templates/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update template');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/templates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete template');
    }
  },

  archive: async (id: string): Promise<FormTemplate> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/templates/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to archive template');
    }
    return response.json();
  },

  restore: async (id: string): Promise<FormTemplate> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/templates/${id}/restore`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to restore template');
    }
    return response.json();
  },

  publish: async (id: string): Promise<FormTemplate> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/templates/${id}/publish`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to publish template');
    }
    return response.json();
  },

  duplicate: async (id: string, newName?: string): Promise<FormTemplate> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/templates/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: newName }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to duplicate template');
    }
    return response.json();
  },

  export: async (id: string): Promise<FormTemplate> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/templates/${id}/export`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export template');
    return response.json();
  },

  // Field management
  addField: async (templateId: string, field: FormField): Promise<FormTemplate> => {
    const response = await fetch(
      `${API_URL}/artifacts/form-builder/templates/${templateId}/fields`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(field),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to add field');
    }
    return response.json();
  },

  updateField: async (
    templateId: string,
    fieldId: string,
    updatedField: Partial<FormField>
  ): Promise<FormTemplate> => {
    const response = await fetch(
      `${API_URL}/artifacts/form-builder/templates/${templateId}/fields/${fieldId}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedField),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update field');
    }
    return response.json();
  },

  deleteField: async (templateId: string, fieldId: string): Promise<void> => {
    const response = await fetch(
      `${API_URL}/artifacts/form-builder/templates/${templateId}/fields/${fieldId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete field');
    }
  },

  reorderFields: async (
    templateId: string,
    data: UpdateFieldOrderInput
  ): Promise<FormTemplate> => {
    const response = await fetch(
      `${API_URL}/artifacts/form-builder/templates/${templateId}/fields/reorder`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to reorder fields');
    }
    return response.json();
  },
};

// ========== INSTANCE API ==========

export const formBuilderInstanceApi = {
  getByProject: async (projectId: string, filters?: InstanceFilters): Promise<FormInstance[]> => {
    const params: Record<string, string> = {};
    if (filters) {
      if (filters.templateId) params.templateId = filters.templateId;
      if (filters.status) params.status = filters.status;
      if (filters.includeArchived !== undefined)
        params.includeArchived = String(filters.includeArchived);
      if (filters.search) params.search = filters.search;
    }
    const query = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/artifacts/form-builder/instances/project/${projectId}${query ? `?${query}` : ''}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch instances');
    return response.json();
  },

  getByTemplate: async (templateId: string): Promise<FormInstance[]> => {
    const response = await fetch(
      `${API_URL}/artifacts/form-builder/instances/template/${templateId}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to fetch instances');
    return response.json();
  },

  getById: async (id: string): Promise<FormInstance> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/instances/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch instance');
    return response.json();
  },

  create: async (data: CreateFormInstanceInput): Promise<FormInstance> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/instances`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create instance');
    }
    return response.json();
  },

  update: async (id: string, data: UpdateFormInstanceInput): Promise<FormInstance> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/instances/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update instance');
    }
    return response.json();
  },

  submit: async (id: string): Promise<FormInstance> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/instances/${id}/submit`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit instance');
    }
    return response.json();
  },

  approve: async (id: string, notes?: string): Promise<FormInstance> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/instances/${id}/approve`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to approve instance');
    }
    return response.json();
  },

  reject: async (id: string, notes?: string): Promise<FormInstance> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/instances/${id}/reject`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to reject instance');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/instances/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete instance');
    }
  },

  archive: async (id: string): Promise<FormInstance> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/instances/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to archive instance');
    }
    return response.json();
  },

  restore: async (id: string): Promise<FormInstance> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/instances/${id}/restore`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to restore instance');
    }
    return response.json();
  },

  duplicate: async (id: string, newName?: string): Promise<FormInstance> => {
    const response = await fetch(`${API_URL}/artifacts/form-builder/instances/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: newName }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to duplicate instance');
    }
    return response.json();
  },

  export: async (id: string, format: 'json' | 'pdf' | 'word'): Promise<any> => {
    const response = await fetch(
      `${API_URL}/artifacts/form-builder/instances/${id}/export?format=${format}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) throw new Error('Failed to export instance');

    if (format === 'json') {
      return response.json();
    }
    return response.blob();
  },
};
