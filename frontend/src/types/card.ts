import { Sprint } from './sprint';
import { TeamMember } from './teamMember';
import { Project } from './project';

export enum CardStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

export enum CardPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum CardRAG {
  RED = 'red',
  AMBER = 'amber',
  GREEN = 'green',
}

export interface Card {
  id: string;
  project: Project;
  sprint: Sprint;
  assignee: TeamMember;
  title: string;
  description?: string;
  externalId?: string; // Jira Ticket ID, etc.
  priority: CardPriority;
  estimatedTime: number; // ET in hours (MANDATORY)
  status: CardStatus;
  ragStatus?: CardRAG;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardRequest {
  projectId: string;
  sprintId: string;
  assigneeId: string;
  title: string;
  description?: string;
  externalId?: string;
  priority?: CardPriority;
  estimatedTime: number; // MANDATORY
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  externalId?: string;
  priority?: CardPriority;
  estimatedTime?: number;
  assigneeId?: string;
  sprintId?: string;
}
