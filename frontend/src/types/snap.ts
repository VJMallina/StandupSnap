import { Card } from './card';
import { User } from './auth';

export enum SnapRAG {
  GREEN = 'green',
  AMBER = 'amber',
  RED = 'red',
}

export interface Snap {
  id: string;
  cardId: string;
  card?: Card;
  createdById: string;
  createdBy?: User;
  rawInput: string;
  done: string | null;
  toDo: string | null;
  blockers: string | null;
  suggestedRAG: SnapRAG | null;
  finalRAG: SnapRAG | null;
  snapDate: string; // ISO date string (YYYY-MM-DD)
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSnapRequest {
  cardId: string;
  rawInput: string;
  done?: string;
  toDo?: string;
  blockers?: string;
  suggestedRAG?: SnapRAG;
  finalRAG?: SnapRAG;
}

export interface UpdateSnapRequest {
  rawInput?: string;
  done?: string;
  toDo?: string;
  blockers?: string;
  suggestedRAG?: SnapRAG;
  finalRAG?: SnapRAG;
  regenerate?: boolean;
}

export interface DailySnapLock {
  id: string;
  sprintId: string;
  lockDate: string;
  lockedById: string | null;
  isAutoLocked: boolean;
  createdAt: string;
}

export interface RAGOverview {
  cardLevel: {
    green: number;
    amber: number;
    red: number;
  };
  assigneeLevel: {
    green: number;
    amber: number;
    red: number;
  };
  sprintLevel: 'green' | 'amber' | 'red';
}

export interface DailySummary {
  id: string;
  sprintId: string;
  summaryDate: string;
  done: string;
  toDo: string;
  blockers: string;
  ragOverview: RAGOverview;
  fullData: any;
  createdAt: string;
}

export interface LockDailySnapsRequest {
  sprintId: string;
  lockDate: string; // YYYY-MM-DD
}

export interface GenerateSummaryRequest {
  sprintId: string;
  date: string; // YYYY-MM-DD
}
