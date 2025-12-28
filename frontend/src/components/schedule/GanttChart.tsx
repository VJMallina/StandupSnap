import React, { useMemo } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { ScheduleTask, TaskStatus } from '../../types/schedule';
import { format } from 'date-fns';

interface GanttChartProps {
  tasks: ScheduleTask[];
  viewMode: 'day' | 'week' | 'month';
  onTaskClick: (task: ScheduleTask) => void;
  onTaskUpdate?: (task: ScheduleTask, startDate: Date, endDate: Date) => Promise<void>;
}

// Color palette for visual differentiation
const COLOR_PALETTE = [
  { bg: '#3b82f6', progress: '#1d4ed8' }, // Blue
  { bg: '#8b5cf6', progress: '#6d28d9' }, // Purple
  { bg: '#ec4899', progress: '#be185d' }, // Pink
  { bg: '#f59e0b', progress: '#d97706' }, // Amber
  { bg: '#06b6d4', progress: '#0891b2' }, // Cyan
  { bg: '#10b981', progress: '#059669' }, // Emerald
  { bg: '#f97316', progress: '#ea580c' }, // Orange
  { bg: '#6366f1', progress: '#4f46e5' }, // Indigo
];

// Helper functions (pure functions outside component)
const getTaskColor = (task: ScheduleTask, hasChildren: boolean): string => {
  // Parent tasks (with children) get darker, bolder colors
  if (hasChildren) {
    if (task.status === TaskStatus.COMPLETED) return '#047857'; // Darker green
    if (task.status === TaskStatus.CANCELLED) return '#6b7280'; // Gray
    if (task.isCriticalPath) return '#b91c1c'; // Darker red
    if (task.status === TaskStatus.IN_PROGRESS) return '#1e40af'; // Darker blue
    if (task.status === TaskStatus.ON_HOLD) return '#b45309'; // Darker amber
    return '#1f2937'; // Dark gray for parent tasks
  }

  // Regular tasks (child/leaf tasks)
  if (task.status === TaskStatus.COMPLETED) return '#10b981'; // Green
  if (task.status === TaskStatus.CANCELLED) return '#9ca3af'; // Gray
  if (task.isCriticalPath) return '#ef4444'; // Red (Critical)
  if (task.status === TaskStatus.IN_PROGRESS) return '#3b82f6'; // Blue
  if (task.status === TaskStatus.ON_HOLD) return '#f59e0b'; // Amber

  // Use level-based color palette for NOT_STARTED tasks
  const colorIndex = task.level % COLOR_PALETTE.length;
  return COLOR_PALETTE[colorIndex].bg;
};

const getProgressColor = (task: ScheduleTask, hasChildren: boolean): string => {
  // Parent tasks get even darker progress colors
  if (hasChildren) {
    if (task.status === TaskStatus.COMPLETED) return '#065f46'; // Very dark green
    if (task.status === TaskStatus.CANCELLED) return '#4b5563'; // Dark gray
    if (task.isCriticalPath) return '#991b1b'; // Very dark red
    if (task.status === TaskStatus.IN_PROGRESS) return '#1e3a8a'; // Very dark blue
    if (task.status === TaskStatus.ON_HOLD) return '#92400e'; // Very dark amber
    return '#111827'; // Very dark gray
  }

  // Regular task progress colors
  if (task.status === TaskStatus.COMPLETED) return '#059669'; // Dark green
  if (task.status === TaskStatus.CANCELLED) return '#6b7280'; // Dark gray
  if (task.isCriticalPath) return '#dc2626'; // Dark red
  if (task.status === TaskStatus.IN_PROGRESS) return '#1d4ed8'; // Dark blue
  if (task.status === TaskStatus.ON_HOLD) return '#d97706'; // Dark amber

  // Use level-based color palette for NOT_STARTED tasks
  const colorIndex = task.level % COLOR_PALETTE.length;
  return COLOR_PALETTE[colorIndex].progress;
};

// Custom Tooltip Component
const CustomTooltip: React.FC<{ task: Task; fontSize: string; fontFamily: string }> = ({ task }) => {
  const originalTask = (task as any).originalTask as ScheduleTask | undefined;

  if (!originalTask) return null;

  const duration = Math.ceil(
    (new Date(originalTask.endDate).getTime() - new Date(originalTask.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const isParentTask = task.type === 'project';

  return (
    <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 min-w-[250px] max-w-[350px] z-50">
      <div className="font-semibold text-sm mb-2 flex items-center gap-2">
        {isParentTask && (
          <span className="flex items-center justify-center w-5 h-5 bg-gray-700 rounded text-xs">
            📁
          </span>
        )}
        {originalTask.isCriticalPath && (
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
        {originalTask.title}
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Start:</span>
          <span>{format(new Date(originalTask.startDate), 'MMM dd, yyyy')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">End:</span>
          <span>{format(new Date(originalTask.endDate), 'MMM dd, yyyy')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Duration:</span>
          <span>{duration} {duration === 1 ? 'day' : 'days'}</span>
        </div>
        {originalTask.assignee && (
          <div className="flex justify-between">
            <span className="text-gray-400">Assignee:</span>
            <span>{originalTask.assignee.user?.name || originalTask.assignee.user?.email}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">Progress:</span>
          <span>{originalTask.progress || 0}%</span>
        </div>
        {originalTask.totalFloat !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-400">Slack:</span>
            <span className={originalTask.totalFloat === 0 ? 'text-red-400 font-semibold' : ''}>
              {originalTask.totalFloat} {originalTask.totalFloat === 1 ? 'day' : 'days'}
            </span>
          </div>
        )}
        {isParentTask && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <span className="text-blue-400 text-xs flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              Parent Task (contains subtasks)
            </span>
          </div>
        )}
        {originalTask.isCriticalPath && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <span className="text-red-400 font-semibold flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Critical Path
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  viewMode,
  onTaskClick,
  onTaskUpdate,
}) => {

  // Transform ScheduleTask[] to Gantt Task[] format
  const ganttTasks: Task[] = useMemo(() => {
    return tasks.map((task) => {
      const hasChildren = tasks.some(t => t.parentTask?.id === task.id);

      return {
        id: task.id,
        name: task.title,
        start: new Date(task.startDate),
        end: new Date(task.endDate),
        progress: task.progress || 0,
        type: task.isMilestone ? 'milestone' : hasChildren ? 'project' : 'task',
        dependencies: task.predecessors?.filter(dep => dep.predecessorTask).map((dep) => dep.predecessorTask.id) || [],
        isDisabled: task.status === TaskStatus.CANCELLED,
        styles: {
          backgroundColor: getTaskColor(task, hasChildren),
          progressColor: getProgressColor(task, hasChildren),
          backgroundSelectedColor: hasChildren ? '#1f2937' : '#3b82f6',
          progressSelectedColor: hasChildren ? '#111827' : '#1d4ed8',
        },
        originalTask: task, // Store original task for tooltip
      } as Task;
    });
  }, [tasks]);

  const handleTaskChange = async (task: Task) => {
    if (!onTaskUpdate) return;

    const originalTask = tasks.find((t) => t.id === task.id);
    if (originalTask) {
      await onTaskUpdate(originalTask, task.start, task.end);
    }
  };

  const handleTaskClick = (task: Task) => {
    const originalTask = tasks.find((t) => t.id === task.id);
    if (originalTask) {
      onTaskClick(originalTask);
    }
  };

  const ganttViewMode =
    viewMode === 'day' ? ViewMode.Day : viewMode === 'week' ? ViewMode.Week : ViewMode.Month;

  if (ganttTasks.length === 0) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 text-sm mb-2">No tasks to display</p>
          <p className="text-gray-400 text-xs">Create your first task to see the Gantt chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white overflow-auto relative gantt-container">
      <style>
        {`
          /* Hide the entire task list section */
          ._1yTi3, .gantt-task-list, [class*="taskList"] {
            display: none !important;
            width: 0 !important;
            min-width: 0 !important;
          }

          /* Make gantt container take full width */
          ._1yTi3 + div, .gantt-container, [class*="ganttVerticalContainer"] {
            width: 100% !important;
          }

          /* Ensure chart starts from left */
          .gantt {
            margin-left: 0 !important;
          }

          /* Critical path animation */
          @keyframes pulse-critical {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            }
            50% {
              box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
            }
          }

          /* Apply pulse to critical path tasks */
          .gantt-bar.critical-path {
            animation: pulse-critical 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>

      <Gantt
        tasks={ganttTasks}
        viewMode={ganttViewMode}
        onDateChange={handleTaskChange}
        onClick={handleTaskClick}
        listCellWidth=""
        TooltipContent={CustomTooltip}
        TaskListHeader={() => null}
        TaskListTable={() => null}
        columnWidth={viewMode === 'day' ? 60 : viewMode === 'week' ? 80 : 100}
        rowHeight={40}
        barCornerRadius={4}
        arrowColor="#6b7280"
        fontSize="14px"
        todayColor="rgba(239, 68, 68, 0.2)"
      />
    </div>
  );
};
