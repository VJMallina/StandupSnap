export enum PowerLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum InterestLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum CommunicationFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  AD_HOC = 'AD_HOC',
}

export enum StakeholderQuadrant {
  MANAGE_CLOSELY = 'MANAGE_CLOSELY',       // High Power + High Interest
  KEEP_SATISFIED = 'KEEP_SATISFIED',       // High Power + Low Interest
  KEEP_INFORMED = 'KEEP_INFORMED',         // Low Power + High Interest
  MONITOR = 'MONITOR',                     // Low Power + Low Interest
}

export interface Stakeholder {
  id: string;
  stakeholderName: string;
  role: string;
  powerLevel: PowerLevel;
  interestLevel: InterestLevel;
  quadrant: StakeholderQuadrant;
  engagementStrategy?: string;
  communicationFrequency?: CommunicationFrequency;
  email?: string;
  phone?: string;
  notes?: string;
  owner?: {
    id: string;
    fullName: string;
    displayName: string;
  };
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

export interface CreateStakeholderInput {
  projectId: string;
  stakeholderName: string;
  role: string;
  powerLevel: PowerLevel;
  interestLevel: InterestLevel;
  engagementStrategy?: string;
  communicationFrequency?: CommunicationFrequency;
  email?: string;
  phone?: string;
  notes?: string;
  ownerId?: string;
}

export interface UpdateStakeholderInput {
  stakeholderName?: string;
  role?: string;
  powerLevel?: PowerLevel;
  interestLevel?: InterestLevel;
  engagementStrategy?: string;
  communicationFrequency?: CommunicationFrequency;
  email?: string;
  phone?: string;
  notes?: string;
  ownerId?: string;
}

export interface StakeholderFilters {
  powerLevel?: PowerLevel;
  interestLevel?: InterestLevel;
  includeArchived?: boolean;
  search?: string;
}
