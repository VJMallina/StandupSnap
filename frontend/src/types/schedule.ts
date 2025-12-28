export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

export enum SchedulingMode {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
}

export enum DependencyType {
  FINISH_TO_START = 'FINISH_TO_START',
  START_TO_START = 'START_TO_START',
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',
  START_TO_FINISH = 'START_TO_FINISH',
}

export interface Schedule {
  id: string;
  project: {
    id: string;
    name: string;
  };
  name: string;
  description?: string;
  scheduleStartDate: string;
  scheduleEndDate: string;
  isArchived: boolean;
  tasks?: ScheduleTask[];
  createdBy?: {
    id: string;
    fullName: string;
  };
  updatedBy?: {
    id: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleTask {
  id: string;
  schedule: {
    id: string;
    name?: string;
  };
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  parentTask?: ScheduleTask | null;
  children?: ScheduleTask[];
  wbsCode: string;
  level: number;
  orderIndex: number;
  assignee?: {
    id: string;
    fullName: string;
    displayName?: string;
    user?: {
      id: string;
      email: string;
    };
  } | null;
  estimatedHours?: number;
  actualHours: number;
  status: TaskStatus;
  progress: number;
  schedulingMode: SchedulingMode;
  isMilestone: boolean;
  baselineStartDate?: string | null;
  baselineEndDate?: string | null;
  baselineDuration?: number | null;
  earlyStart?: string | null;
  earlyFinish?: string | null;
  lateStart?: string | null;
  lateFinish?: string | null;
  totalFloat: number;
  freeFloat: number;
  isCriticalPath: boolean;
  notes?: string;
  predecessors?: TaskDependency[];
  successors?: TaskDependency[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  id: string;
  predecessorTask: {
    id: string;
    title: string;
    wbsCode: string;
  };
  successorTask: {
    id: string;
    title: string;
    wbsCode: string;
  };
  dependencyType: DependencyType;
  lagDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  projectId: string;
  name: string;
  description?: string;
  scheduleStartDate: string;
  scheduleEndDate: string;
}

export interface UpdateScheduleInput {
  name?: string;
  description?: string;
  scheduleStartDate?: string;
  scheduleEndDate?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  parentTaskId?: string;
  orderIndex: number;
  assigneeId?: string;
  estimatedHours?: number;
  status?: TaskStatus;
  progress?: number;
  schedulingMode?: SchedulingMode;
  isMilestone?: boolean;
  notes?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  parentTaskId?: string;
  orderIndex?: number;
  assigneeId?: string;
  estimatedHours?: number;
  status?: TaskStatus;
  progress?: number;
  schedulingMode?: SchedulingMode;
  isMilestone?: boolean;
  notes?: string;
}

export interface CreateDependencyInput {
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: DependencyType;
  lagDays?: number;
}

export interface UpdateDependencyInput {
  dependencyType?: DependencyType;
  lagDays?: number;
}

// Helper type for flat task list with parent reference by ID
export interface FlatScheduleTask extends Omit<ScheduleTask, 'parentTask' | 'children'> {
  parentTaskId?: string | null;
}
