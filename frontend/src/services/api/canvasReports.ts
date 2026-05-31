import {
  CanvasReport,
  CanvasReportSummary,
  CreateCanvasReportPayload,
  UpdateCanvasReportPayload,
  ReportType,
} from '../../types/canvasReport';

export interface GenerateTemplatePayload {
  projectId: string;
  name?: string;
  reportType?: ReportType;
  startDate?: string;
  endDate?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const canvasReportsApi = {
  list: async (projectId: string): Promise<CanvasReportSummary[]> => {
    const res = await fetch(`${API_URL}/canvas-reports?projectId=${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (payload: CreateCanvasReportPayload): Promise<CanvasReport> => {
    const res = await fetch(`${API_URL}/canvas-reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  get: async (id: string): Promise<CanvasReport> => {
    const res = await fetch(`${API_URL}/canvas-reports/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  update: async (id: string, payload: UpdateCanvasReportPayload): Promise<CanvasReport> => {
    const res = await fetch(`${API_URL}/canvas-reports/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  duplicate: async (id: string): Promise<CanvasReport> => {
    const res = await fetch(`${API_URL}/canvas-reports/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  remove: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/canvas-reports/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  generateFromTemplate: async (payload: GenerateTemplatePayload): Promise<CanvasReport> => {
    const res = await fetch(`${API_URL}/canvas-reports/generate-from-template`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
};
