import { Project } from './project';
import { TeamMember } from './teamMember';
import { User } from './user';

export enum ChangeType {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  EMERGENCY = 'EMERGENCY',
  STANDARD = 'STANDARD',
}

export enum ChangePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ChangeStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  IMPLEMENTED = 'IMPLEMENTED',
  CLOSED = 'CLOSED',
}

export interface Change {
  id: string;
  project: Project;
  projectId: string;
  title: string;
  description: string;
  changeType: ChangeType;
  priority: ChangePriority;
  status: ChangeStatus;
  impactAssessment: string | null;
  rollbackPlan: string | null;
  testingRequirements: string | null;
  affectedSystems: string[] | null;
  implementationDate: string | null;
  implementationWindow: string | null;
  requestor: TeamMember | null;
  requestorId: string | null;
  approver: TeamMember | null;
  approverId: string | null;
  rejectionReason: string | null;
  approvedDate: string | null;
  implementedDate: string | null;
  isArchived: boolean;
  archivedDate: string | null;
  createdBy: User;
  createdById: string;
  updatedBy: User;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChangeInput {
  projectId: string;
  title: string;
  description: string;
  changeType: ChangeType;
  priority: ChangePriority;
  status?: ChangeStatus;
  impactAssessment?: string;
  rollbackPlan?: string;
  testingRequirements?: string;
  affectedSystems?: string[];
  implementationDate?: string;
  implementationWindow?: string;
  requestorId?: string;
  approverId?: string;
}

export interface UpdateChangeInput {
  title?: string;
  description?: string;
  changeType?: ChangeType;
  priority?: ChangePriority;
  status?: ChangeStatus;
  impactAssessment?: string;
  rollbackPlan?: string;
  testingRequirements?: string;
  affectedSystems?: string[];
  implementationDate?: string;
  implementationWindow?: string;
  requestorId?: string;
  approverId?: string;
  rejectionReason?: string;
}
