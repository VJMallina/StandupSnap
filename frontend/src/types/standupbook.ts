import { Sprint } from './sprint';
import { Snap } from './snap';

export interface DayMetadata {
  dayNumber: number;
  date: string;
  dayStatus: 'not_started' | 'in_progress' | 'completed';
  isLocked: boolean;
  totalSnaps: number;
  totalCards: number;
  standupSlotCount: number;
}

export interface SlotGroup {
  slotNumber: number;
  snaps: Snap[];
  cardIds: string[];
}

export interface SprintDay {
  date: string;
  dayNumber: number;
  isAccessible: boolean;
}

export interface Mom {
  id: string;
  sprint: Sprint;
  date: string;
  rawInput?: string;
  agenda?: string;
  keyDiscussionPoints?: string;
  decisionsTaken?: string;
  actionItems?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DailyLock {
  id: string;
  sprint: Sprint;
  date: string;
  isLocked: boolean;
  dailySummaryDone?: string;
  dailySummaryToDo?: string;
  dailySummaryBlockers?: string;
  lockedBy?: {
    id: string;
    name: string;
    email: string;
  };
  lockedAt: string;
}

export interface CreateMomRequest {
  sprintId: string;
  date: string;
  rawInput?: string;
  agenda?: string;
  keyDiscussionPoints?: string;
  decisionsTaken?: string;
  actionItems?: string;
}

export interface UpdateMomRequest {
  rawInput?: string;
  agenda?: string;
  keyDiscussionPoints?: string;
  decisionsTaken?: string;
  actionItems?: string;
}

export interface GenerateMomRequest {
  rawInput: string;
}

export interface LockDayRequest {
  sprintId: string;
  date: string;
}
