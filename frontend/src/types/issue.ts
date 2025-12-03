export enum IssueStatus {
  OPEN = 'OPEN',
  MITIGATED = 'MITIGATED',
  CLOSED = 'CLOSED',
}

export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: IssueStatus;
  owner: {
    id: string;
    fullName: string;
    displayName: string;
  };
  severity: IssueSeverity;
  impactSummary?: string;
  resolutionPlan?: string;
  targetResolutionDate?: string;
  closureDate?: string;
  isArchived: boolean;
  archivedDate?: string;
  createdBy?: {
    id: string;
    username: string;
  };
  updatedBy?: {
    id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueInput {
  projectId: string;
  title: string;
  description?: string;
  status?: IssueStatus;
  ownerId: string;
  severity: IssueSeverity;
  impactSummary?: string;
  resolutionPlan?: string;
  targetResolutionDate?: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: IssueStatus;
  ownerId?: string;
  severity?: IssueSeverity;
  impactSummary?: string;
  resolutionPlan?: string;
  targetResolutionDate?: string | null;
}

export interface IssueFilters {
  status?: IssueStatus;
  severity?: IssueSeverity;
  ownerId?: string;
  includeArchived?: boolean;
  search?: string;
}
