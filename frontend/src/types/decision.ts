export enum DecisionStatus {
  PENDING = 'PENDING',
  FINALIZED = 'FINALIZED',
}

export enum ImpactedArea {
  SCHEDULE = 'SCHEDULE',
  SCOPE = 'SCOPE',
  COST = 'COST',
  RESOURCES = 'RESOURCES',
}

export interface Decision {
  id: string;
  title: string;
  description?: string;
  owner: {
    id: string;
    fullName: string;
    displayName: string;
  };
  status: DecisionStatus;
  decisionTaken?: string;
  dueDate?: string;
  impactedAreas?: ImpactedArea[];
  supportingNotes?: string;
  finalizedDate?: string;
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

export interface CreateDecisionInput {
  projectId: string;
  title: string;
  description?: string;
  ownerId: string;
  status?: DecisionStatus;
  decisionTaken?: string;
  dueDate?: string;
  impactedAreas?: ImpactedArea[];
  supportingNotes?: string;
}

export interface UpdateDecisionInput {
  title?: string;
  description?: string;
  ownerId?: string;
  status?: DecisionStatus;
  decisionTaken?: string;
  dueDate?: string | null;
  impactedAreas?: ImpactedArea[];
  supportingNotes?: string;
}

export interface DecisionFilters {
  status?: DecisionStatus;
  ownerId?: string;
  includeArchived?: boolean;
  search?: string;
}
