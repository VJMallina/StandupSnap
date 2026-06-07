// ========== ENUMS ==========

export enum RoomType {
  PLANNING_POKER = 'planning_poker',
  RETROSPECTIVE = 'retrospective',
  SPRINT_PLANNING = 'sprint_planning',
  REFINEMENT = 'refinement',
}

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum DeckType {
  FIBONACCI = 'fibonacci',
  MODIFIED_FIBONACCI = 'modified_fibonacci',
  T_SHIRT = 't_shirt',
  CUSTOM = 'custom',
}

// ========== PLANNING POKER ==========

export interface PlanningPokerVote {
  userId: string;
  userName: string;
  vote: string | number;
}

export interface PlanningPokerRound {
  roundId: string;
  itemName?: string;
  cardId?: string;
  votes: Record<string, string | number>;
  revealed: boolean;
  finalValue: string | number | null;
  estimateSaved?: boolean;
  mean?: number;
  median?: number;
  mode?: string | number;
  timestamp: string;
}

export interface PlanningPokerData {
  deckType: DeckType;
  customDeck?: string[];
  rounds: PlanningPokerRound[];
  participants: string[];
}

// ========== RETROSPECTIVE ==========

export interface RetroItem {
  itemId: string;
  content: string;
  createdBy: string;
  createdByName: string;
  votes: string[];
  discussion?: string;
  actionItem?: boolean;
  convertedCardId?: string;
  timestamp: string;
}

export interface RetroColumn {
  columnId: string;
  title: string;
  order: number;
  items: RetroItem[];
}

export interface RetrospectiveData {
  columns: RetroColumn[];
  votingEnabled: boolean;
  maxVotesPerPerson?: number;
}

// ========== SPRINT PLANNING ==========

export interface SprintPlanningItem {
  itemId: string;
  title: string;
  estimate: number;
  status: 'ready' | 'in_scope' | 'out_of_scope';
  order: number;
  cardId?: string;
  priority?: string;
  cardType?: string;
}

export interface SprintPlanningData {
  capacity: number;
  items: SprintPlanningItem[];
  sprintGoals: string[];
  actualWorkload: number;
}

// ========== REFINEMENT ==========

export interface RefinementItem {
  itemId: string;
  title: string;
  notes: string[];
  acceptanceCriteria: string[];
  aiSuggestions?: string[];
  estimate?: number;
  cardId?: string;
  criteriaPushed?: boolean;
}

export interface RefinementData {
  items: RefinementItem[];
}

// ========== BASE ROOM ==========

export interface ScrumRoom {
  id: string;
  name: string;
  type: RoomType;
  description?: string;
  status: RoomStatus;
  data:
    | PlanningPokerData
    | RetrospectiveData
    | SprintPlanningData
    | RefinementData
    | null;
  project?: {
    id: string;
    name: string;
  };
  isArchived: boolean;
  archivedAt?: string;
  completedAt?: string;
  createdBy?: {
    id: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ========== INPUT TYPES ==========

export interface CreateRoomInput {
  name: string;
  type: RoomType;
  description?: string;
  projectId?: string;
  data?: any;
}

export interface UpdateRoomInput {
  name?: string;
  type?: RoomType;
  description?: string;
  status?: RoomStatus;
  data?: any;
}

export interface UpdateRoomDataInput {
  data: any;
}

// ========== FILTER TYPES ==========

export interface RoomFilters {
  projectId?: string;
  type?: RoomType;
  status?: RoomStatus;
  includeArchived?: boolean;
}
