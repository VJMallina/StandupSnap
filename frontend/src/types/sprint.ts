import { Project } from './project';

export enum SprintStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

export enum SprintCreationType {
  MANUAL = 'manual',
  AUTO_GENERATED = 'auto_generated',
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  creationType: SprintCreationType;
  isClosed: boolean;
  dailyStandupCount: number;
  slotTimes?: Record<string, string>;
  project: Project;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSprintRequest {
  projectId: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  dailyStandupCount?: number;
  slotTimes?: Record<string, string>;
}

export interface UpdateSprintRequest {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  dailyStandupCount?: number;
  slotTimes?: Record<string, string>;
}

export interface GenerateSprintsRequest {
  projectId: string;
  sprintDurationWeeks: number;
  namePrefix?: string;
  dailyStandupCount?: number;
  slotTimes?: Record<string, string>;
}

export interface PreviewSprintsRequest {
  projectId: string;
  sprintDurationWeeks: number;
  namePrefix?: string;
  dailyStandupCount?: number;
  slotTimes?: Record<string, string>;
}

export interface SprintPreview {
  name: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  dailyStandupCount: number;
}
