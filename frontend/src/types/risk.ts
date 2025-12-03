import { TeamMember } from './teamMember';

export type RiskType = 'THREAT' | 'OPPORTUNITY';

export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type ProbabilityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type RiskStrategy = 'AVOID' | 'MITIGATE' | 'ACCEPT' | 'TRANSFER' | 'EXPLOIT';

export type RiskStatus = 'OPEN' | 'IN_PROGRESS' | 'MITIGATED' | 'CLOSED';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface Risk {
  id: string;

  // A. Identification
  title: string;
  riskType: RiskType;
  category: string;
  dateIdentified: string;
  riskStatement: string;
  currentStatusAssumptions?: string;

  // B. Assessment
  probability: ProbabilityLevel;
  costImpact?: ImpactLevel;
  timeImpact?: ImpactLevel;
  scheduleImpact?: ImpactLevel;

  // Auto-calculated
  probabilityScore: number; // 1-4
  impactScore: number; // 1-4
  riskScore: number; // 1-16
  severity: RiskSeverity;
  rationale?: string;

  // C. Response & Ownership
  strategy: RiskStrategy;
  mitigationPlan?: string;
  contingencyPlan?: string;
  owner: TeamMember;
  targetClosureDate?: string;

  // D. Status Tracking
  status: RiskStatus;
  progressNotes?: string;

  // Archive
  isArchived: boolean;

  // Relations
  project: Project;
  createdBy?: User;
  updatedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRiskInput {
  projectId: string;

  // A. Identification (mandatory)
  title: string;
  riskType: RiskType;
  category: string;
  dateIdentified?: string;
  riskStatement: string;
  currentStatusAssumptions?: string;

  // B. Assessment (mandatory: probability)
  probability: ProbabilityLevel;
  costImpact?: ImpactLevel;
  timeImpact?: ImpactLevel;
  scheduleImpact?: ImpactLevel;
  rationale?: string;

  // C. Response & Ownership (mandatory: strategy, ownerId)
  strategy: RiskStrategy;
  mitigationPlan?: string;
  contingencyPlan?: string;
  ownerId: string;
  targetClosureDate?: string;

  // D. Status Tracking
  status?: RiskStatus;
  progressNotes?: string;
}

export interface UpdateRiskInput {
  // A. Identification
  title?: string;
  riskType?: RiskType;
  category?: string;
  dateIdentified?: string;
  riskStatement?: string;
  currentStatusAssumptions?: string;

  // B. Assessment
  probability?: ProbabilityLevel;
  costImpact?: ImpactLevel | null;
  timeImpact?: ImpactLevel | null;
  scheduleImpact?: ImpactLevel | null;
  rationale?: string;

  // C. Response & Ownership
  strategy?: RiskStrategy;
  mitigationPlan?: string;
  contingencyPlan?: string;
  ownerId?: string;
  targetClosureDate?: string | null;

  // D. Status Tracking
  status?: RiskStatus;
  progressNotes?: string;
}

export interface RiskFilters {
  status?: RiskStatus;
  category?: string;
  severity?: RiskSeverity;
  ownerId?: string;
  strategy?: RiskStrategy;
  riskType?: RiskType;
  includeArchived?: boolean;
  search?: string;
}

export type RiskChangeType =
  | 'CREATED'
  | 'UPDATED'
  | 'ARCHIVED'
  | 'STATUS_CHANGED'
  | 'OWNER_CHANGED'
  | 'SEVERITY_CHANGED';

export interface RiskHistory {
  id: string;
  changeType: RiskChangeType;
  description: string;
  changedFields?: Record<string, { old: any; new: any }>;
  changedBy?: User;
  createdAt: string;
}
