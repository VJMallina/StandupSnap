import React, { useState, useMemo } from 'react';
import { ScheduleTask, TaskStatus } from '../../types/schedule';

interface TaskListPanelProps {
  tasks: ScheduleTask[];
  onTaskClick: (task: ScheduleTask) => void;
  onEditTask: (task: ScheduleTask) => void;
  onDeleteTask: (taskId: string) => void;
  onAddChildTask?: (parentTask: ScheduleTask) => void;
  onAddTask?: () => void;
  onUpdateTaskDates?: (taskId: string, startDate: string, endDate: string) => Promise<void>;
}

export const TaskListPanel: React.FC<TaskListPanelProps> = ({
  tasks,
  onTaskClick,
  onEditTask,
  onDeleteTask,
  onAddChildTask,
  onAddTask,
  onUpdateTaskDates,
}) => {
  const [editingDate, setEditingDate] = useState<{ taskId: string; field: 'start' | 'end' } | null>(null);

  // Build hierarchical task list with proper ordering
  const orderedTasks = useMemo(() => {
    const buildHierarchy = (parentId: string | null = null, level: number = 0): ScheduleTask[] => {
      const children = tasks
        .filter((t) => (parentId === null ? !t.parentTask : t.parentTask?.id === parentId))
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const result: ScheduleTask[] = [];
      for (const child of children) {
        result.push({ ...child, level });
        result.push(...buildHierarchy(child.id, level + 1));
      }
      return result;
    };

    return buildHierarchy();
  }, [tasks]);

  const getStatusBadgeColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case TaskStatus.ON_HOLD:
        return 'bg-amber-100 text-amber-800';
      case TaskStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: TaskStatus): string => {
    return status.replace('_', ' ');
  };

  const handleDateChange = async (taskId: string, field: 'start' | 'end', newDate: string) => {
    if (!onUpdateTaskDates) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startDate = field === 'start' ? newDate : task.startDate;
    const endDate = field === 'end' ? newDate : task.endDate;

    await onUpdateTaskDates(taskId, startDate, endDate);
    setEditingDate(null);
  };

  const formatDateForInput = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderTask = (task: ScheduleTask): JSX.Element => {
    const hasChildren = tasks.some(t => t.parentTask?.id === task.id);
    const level = task.level || 0;

    return (
      <div
        key={task.id}
        className={`flex items-center px-3 py-2.5 cursor-pointer border-b group hover:bg-gray-50 overflow-visible ${
          hasChildren ? 'bg-gray-50/50' : ''
        }`}
        onClick={() => onTaskClick(task)}
      >
        {/* WBS Code */}
        <div
          className={`text-xs font-mono w-20 flex-shrink-0 mr-4 ${
            hasChildren ? 'text-gray-700 font-semibold' : 'text-gray-500'
          }`}
          style={{ paddingLeft: `${level * 16}px` }}
        >
          {task.wbsCode}
        </div>

        {/* Task Title */}
        <div className="w-48 flex-shrink-0 mr-4 flex items-center justify-between group/task">
          <span
            className={`text-sm truncate ${
              hasChildren ? 'font-bold text-gray-900' : 'font-medium text-gray-900'
            }`}
          >
            {task.title}
          </span>

          {/* Actions (visible on hover) */}
          <div className="flex gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity ml-2">
            {onAddChildTask && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChildTask(task);
                }}
                className="p-0.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded flex-shrink-0"
                title="Add child task"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditTask(task);
              }}
              className="p-0.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded flex-shrink-0"
              title="Edit task"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete task "${task.title}"? This will also delete all child tasks.`)) {
                  onDeleteTask(task.id);
                }
              }}
              className="p-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded flex-shrink-0"
              title="Delete task"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Start Date */}
        <div
          className="w-32 flex-shrink-0 mr-4 text-xs"
          onClick={(e) => {
            if (onUpdateTaskDates && !(editingDate?.taskId === task.id && editingDate?.field === 'start')) {
              e.stopPropagation();
              setEditingDate({ taskId: task.id, field: 'start' });
            }
          }}
        >
          {editingDate?.taskId === task.id && editingDate?.field === 'start' && onUpdateTaskDates ? (
            <input
              type="date"
              value={formatDateForInput(task.startDate)}
              onChange={(e) => handleDateChange(task.id, 'start', e.target.value)}
              onBlur={() => setEditingDate(null)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full px-2 py-1 border border-primary-500 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          ) : (
            <div
              className={`px-2 py-1 rounded ${
                onUpdateTaskDates ? 'hover:bg-gray-200 cursor-pointer' : ''
              } ${hasChildren ? 'font-semibold text-gray-700' : 'text-gray-600'}`}
            >
              {formatDateForDisplay(task.startDate)}
            </div>
          )}
        </div>

        {/* End Date */}
        <div
          className="w-32 flex-shrink-0 mr-4 text-xs"
          onClick={(e) => {
            if (onUpdateTaskDates && !(editingDate?.taskId === task.id && editingDate?.field === 'end')) {
              e.stopPropagation();
              setEditingDate({ taskId: task.id, field: 'end' });
            }
          }}
        >
          {editingDate?.taskId === task.id && editingDate?.field === 'end' && onUpdateTaskDates ? (
            <input
              type="date"
              value={formatDateForInput(task.endDate)}
              onChange={(e) => handleDateChange(task.id, 'end', e.target.value)}
              onBlur={() => setEditingDate(null)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full px-2 py-1 border border-primary-500 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          ) : (
            <div
              className={`px-2 py-1 rounded ${
                onUpdateTaskDates ? 'hover:bg-gray-200 cursor-pointer' : ''
              } ${hasChildren ? 'font-semibold text-gray-700' : 'text-gray-600'}`}
            >
              {formatDateForDisplay(task.endDate)}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="w-28 flex-shrink-0 mr-4">
          <span className={`text-xs px-2 py-0.5 rounded inline-block ${getStatusBadgeColor(task.status)}`}>
            {getStatusLabel(task.status)}
          </span>
        </div>

        {/* Progress */}
        <div className={`text-xs w-16 flex-shrink-0 mr-4 ${
          hasChildren ? 'font-semibold text-gray-700' : 'text-gray-600'
        }`}>
          {task.progress}%
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-white overflow-y-auto overflow-x-visible flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
        <div className="flex items-center px-3 py-3 text-xs font-semibold text-gray-700">
          <div className="w-20 flex-shrink-0 mr-4">WBS</div>
          <div className="w-48 flex-shrink-0 mr-4">Task Name</div>
          <div className="w-32 flex-shrink-0 mr-4">Start Date</div>
          <div className="w-32 flex-shrink-0 mr-4">End Date</div>
          <div className="w-28 flex-shrink-0 mr-4">Status</div>
          <div className="w-16 flex-shrink-0 mr-4">Progress</div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1">
        {orderedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="text-sm">No tasks created yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Task" to get started</p>
          </div>
        ) : (
          orderedTasks.map((task) => renderTask(task))
        )}
      </div>

      {/* Add Task Button */}
      {onAddTask && tasks.length > 0 && (
        <div className="sticky bottom-0 bg-white px-3 py-3 border-t border-gray-200">
          <button
            onClick={onAddTask}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary-700 bg-primary-50 border-2 border-primary-200 border-dashed rounded-lg hover:bg-primary-100 hover:border-primary-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
          <div className="text-xs text-gray-500 text-center mt-2">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
          </div>
        </div>
      )}
    </div>
  );
};
