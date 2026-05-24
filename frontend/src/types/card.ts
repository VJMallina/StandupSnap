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

export enum CardType {
  EPIC = 'epic',
  CARD = 'card',
  SUB_CARD = 'sub_card',
}

export enum LaneType {
  TODO = 'todo',
  ACTIVE = 'active',
  DONE = 'done',
}

export enum TransitionMode {
  FREE = 'free',
  SEQUENTIAL = 'sequential',
  FORWARD = 'forward',
}

export enum CardCommentType {
  COMMENT = 'comment',
  SYSTEM = 'system',
}

export interface WorkflowLane {
  id: string;
  workflowTemplateId: string;
  name: string;
  order: number;
  color: string;
  laneType: LaneType;
  isFinalLane: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplate {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  transitionMode: TransitionMode;
  lanes: WorkflowLane[];
  createdAt: string;
  updatedAt: string;
}

export interface CardAssignmentHistory {
  id: string;
  cardId: string;
  userId: string | null;
  laneId: string | null;
  assignedById: string | null;
  unassignedAt: string | null;
  assignedAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  lane?: WorkflowLane;
  assignedBy?: { id: string; firstName: string; lastName: string };
}

export interface CardComment {
  id: string;
  cardId: string;
  authorId: string | null;
  body: string;
  commentType: CardCommentType;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; firstName: string; lastName: string; email: string };
}

export interface CardActivity {
  comments: CardComment[];
  assignmentHistory: CardAssignmentHistory[];
}

export interface Card {
  id: string;
  project: Project;
  sprint: Sprint | null;
  assignee: TeamMember | null;
  title: string;
  description?: string;
  externalId?: string;
  cardType: CardType;
  priority: CardPriority;
  estimatedTime: number;
  storyPoints?: number;
  status: CardStatus;
  ragStatus?: CardRAG;
  laneId?: string;
  lane?: WorkflowLane;
  acceptanceCriteria?: string;
  labels?: string[];
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  parentId?: string;
  reporterId?: string;
  createdAt: string;
  updatedAt: string;
  snapsCount?: number;
  children?: Card[];
}

export interface CreateCardRequest {
  projectId: string;
  sprintId?: string;
  assigneeId?: string;
  title: string;
  description?: string;
  externalId?: string;
  cardType?: CardType;
  priority?: CardPriority;
  estimatedTime: number;
  storyPoints?: number;
  laneId?: string;
  parentId?: string;
  acceptanceCriteria?: string;
  labels?: string[];
  dueDate?: string;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  externalId?: string;
  priority?: CardPriority;
  status?: CardStatus;
  estimatedTime?: number;
  storyPoints?: number;
  assigneeId?: string | null;
  sprintId?: string | null;
  laneId?: string;
  parentId?: string | null;
  acceptanceCriteria?: string;
  labels?: string[];
  dueDate?: string | null;
}
