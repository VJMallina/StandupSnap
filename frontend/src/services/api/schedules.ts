import {
  Schedule,
  ScheduleTask,
  TaskDependency,
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateDependencyInput,
} from '../../types/schedule';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const schedulesApi = {
  // ==================== SCHEDULE CRUD ====================

  create: async (data: CreateScheduleInput): Promise<Schedule> => {
    const response = await fetch(`${API_URL}/artifacts/schedules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create schedule');
    }
    return response.json();
  },

  getByProject: async (projectId: string, includeArchived = false): Promise<Schedule[]> => {
    const response = await fetch(
      `${API_URL}/artifacts/schedules/project/${projectId}?includeArchived=${includeArchived}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch schedules');
    }
    return response.json();
  },

  getById: async (id: string): Promise<Schedule> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch schedule');
    }
    return response.json();
  },

  update: async (id: string, data: UpdateScheduleInput): Promise<Schedule> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update schedule');
    }
    return response.json();
  },

  archive: async (id: string): Promise<Schedule> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to archive schedule');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete schedule');
    }
  },

  // ==================== TASK CRUD ====================

  createTask: async (scheduleId: string, data: CreateTaskInput): Promise<ScheduleTask> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/${scheduleId}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create task');
    }
    return response.json();
  },

  getTasks: async (scheduleId: string): Promise<ScheduleTask[]> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/${scheduleId}/tasks`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch tasks');
    }
    return response.json();
  },

  getTaskById: async (taskId: string): Promise<ScheduleTask> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/tasks/${taskId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch task');
    }
    return response.json();
  },

  updateTask: async (taskId: string, data: UpdateTaskInput): Promise<ScheduleTask> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/tasks/${taskId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update task');
    }
    return response.json();
  },

  deleteTask: async (taskId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete task');
    }
  },

  // ==================== DEPENDENCY CRUD ====================

  addDependency: async (taskId: string, data: CreateDependencyInput): Promise<TaskDependency> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/tasks/${taskId}/dependencies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add dependency');
    }
    return response.json();
  },

  getDependencies: async (taskId: string): Promise<TaskDependency[]> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/tasks/${taskId}/dependencies`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch dependencies');
    }
    return response.json();
  },

  deleteDependency: async (dependencyId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/dependencies/${dependencyId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete dependency');
    }
  },

  // ==================== CRITICAL PATH ====================

  calculateCriticalPath: async (scheduleId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/${scheduleId}/calculate-critical-path`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to calculate critical path');
    }
    return response.json();
  },

  getCriticalPathTasks: async (scheduleId: string): Promise<ScheduleTask[]> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/${scheduleId}/critical-path-tasks`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch critical path tasks');
    }
    return response.json();
  },

  // ==================== AUTO-SCHEDULING ====================

  autoScheduleAll: async (scheduleId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/${scheduleId}/auto-schedule`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to auto-schedule');
    }
    return response.json();
  },

  autoScheduleTask: async (taskId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/artifacts/schedules/tasks/${taskId}/auto-schedule`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to auto-schedule task');
    }
    return response.json();
  },
};
