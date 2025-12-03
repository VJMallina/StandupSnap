export enum AssumptionStatus {
  OPEN = 'OPEN',
  VALIDATED = 'VALIDATED',
  INVALIDATED = 'INVALIDATED',
}

export interface Assumption {
  id: string;
  title: string;
  description?: string;
  owner?: {
    id: string;
    fullName: string;
    displayName: string;
  };
  status: AssumptionStatus;
  notes?: string;
  isArchived: boolean;
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

export interface CreateAssumptionInput {
  projectId: string;
  title: string;
  description?: string;
  ownerId?: string;
  status?: AssumptionStatus;
  notes?: string;
}

export interface UpdateAssumptionInput {
  title?: string;
  description?: string;
  ownerId?: string | null;
  status?: AssumptionStatus;
  notes?: string;
}

export interface AssumptionFilters {
  status?: AssumptionStatus;
  ownerId?: string;
  includeArchived?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
}
