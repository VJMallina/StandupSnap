import { Project } from './project';

export interface Sprint {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: string;
  project: Project;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSprintRequest {
  projectId: string;
  name: string;
  description?: string;
  startDate: string;
  durationWeeks: number;
  status?: string;
}

export interface UpdateSprintRequest {
  name?: string;
  description?: string;
  startDate?: string;
  durationWeeks?: number;
  status?: string;
}

export interface GenerateSprintsRequest {
  projectId: string;
  sprintDurationWeeks: number;
}
