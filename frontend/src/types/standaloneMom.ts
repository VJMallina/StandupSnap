export type StandaloneMeetingType =
  | 'Planning'
  | 'Grooming'
  | 'Retrospective'
  | 'Stakeholder Meeting'
  | 'General Meeting'
  | 'Custom'
  | 'Other';

export interface StandaloneMom {
  id: string;
  projectId?: string;
  sprintId?: string | null;
  project?: { id: string; name: string };
  sprint?: { id: string; name: string } | null;
  title: string;
  meetingDate: string;
  meetingType: StandaloneMeetingType;
  customMeetingType?: string | null;
  rawNotes?: string | null;
  agenda?: string | null;
  discussionSummary?: string | null;
  decisions?: string | null;
  actionItems?: string | null;
  archived?: boolean;
  createdBy?: { id: string; name?: string; email?: string } | null;
  updatedBy?: { id: string; name?: string; email?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStandaloneMomRequest {
  projectId: string;
  sprintId?: string;
  title: string;
  meetingDate: string;
  meetingType: StandaloneMeetingType;
  customMeetingType?: string;
  rawNotes?: string;
  agenda?: string;
  discussionSummary?: string;
  decisions?: string;
  actionItems?: string;
}

export type UpdateStandaloneMomRequest = Partial<CreateStandaloneMomRequest> & { archived?: boolean };

export interface StandaloneMomFilter {
  projectId: string;
  sprintId?: string;
  meetingType?: StandaloneMeetingType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  updatedBy?: string;
}
