import { User } from './auth';
import { Project } from './project';

export enum ArtifactCategory {
  PROJECT_GOVERNANCE = 'PROJECT_GOVERNANCE',
  PLANNING_BUDGETING = 'PLANNING_BUDGETING',
  EXECUTION_MONITORING = 'EXECUTION_MONITORING',
  RISK_QUALITY = 'RISK_QUALITY',
  CLOSURE_REPORTING = 'CLOSURE_REPORTING',
  CUSTOM = 'CUSTOM',
}

export enum ArtifactStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export interface ArtifactTemplate {
  id: string;
  name: string;
  description: string;
  category: ArtifactCategory;
  templateStructure: any; // Field definitions from form builder
  isSystemTemplate: boolean;
  isPublished: boolean;
  projectId?: string;
  project?: Project;
  createdById: string;
  createdBy?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtifactInstance {
  id: string;
  templateId: string;
  template?: ArtifactTemplate;
  projectId: string;
  project?: Project;
  name: string;
  description?: string;
  status: ArtifactStatus;
  currentVersionId?: string;
  currentVersion?: ArtifactVersion;
  versions?: ArtifactVersion[];
  createdById: string;
  createdBy?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtifactVersion {
  id: string;
  instanceId: string;
  instance?: ArtifactInstance;
  versionNumber: string; // "1.0", "1.1", "2.0"
  data: any; // Actual filled form data
  changeSummary?: string;
  isMajorVersion: boolean;
  createdById: string;
  createdBy?: User;
  createdAt: Date;
}

// DTOs for API requests
export interface CreateArtifactTemplateDto {
  name: string;
  description: string;
  category: ArtifactCategory;
  templateStructure: any;
  projectId: string;
}

export interface UpdateArtifactTemplateDto {
  name?: string;
  description?: string;
  category?: ArtifactCategory;
  templateStructure?: any;
  isPublished?: boolean;
}

export interface CreateArtifactInstanceDto {
  templateId: string;
  projectId: string;
  name: string;
  description?: string;
  status?: ArtifactStatus;
}

export interface UpdateArtifactInstanceDto {
  name?: string;
  description?: string;
  status?: ArtifactStatus;
}

export interface CreateArtifactVersionDto {
  data: any;
  changeSummary?: string;
  isMajorVersion?: boolean;
}

// Helper function to get category label
export const getCategoryLabel = (category: ArtifactCategory): string => {
  const labels: Record<ArtifactCategory, string> = {
    [ArtifactCategory.PROJECT_GOVERNANCE]: 'Project Governance',
    [ArtifactCategory.PLANNING_BUDGETING]: 'Planning & Budgeting',
    [ArtifactCategory.EXECUTION_MONITORING]: 'Execution & Monitoring',
    [ArtifactCategory.RISK_QUALITY]: 'Risk & Quality',
    [ArtifactCategory.CLOSURE_REPORTING]: 'Closure & Reporting',
    [ArtifactCategory.CUSTOM]: 'Custom',
  };
  return labels[category];
};

// Helper function to get status label and color
export const getStatusInfo = (status: ArtifactStatus): { label: string; color: string } => {
  const statusInfo: Record<ArtifactStatus, { label: string; color: string }> = {
    [ArtifactStatus.DRAFT]: { label: 'Draft', color: 'gray' },
    [ArtifactStatus.IN_PROGRESS]: { label: 'In Progress', color: 'blue' },
    [ArtifactStatus.COMPLETED]: { label: 'Completed', color: 'green' },
    [ArtifactStatus.ARCHIVED]: { label: 'Archived', color: 'gray' },
  };
  return statusInfo[status];
};
