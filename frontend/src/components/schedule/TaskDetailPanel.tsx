import React from 'react';
import { ScheduleTask, TaskStatus, DependencyType } from '../../types/schedule';

interface TaskDetailPanelProps {
  task: ScheduleTask | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: ScheduleTask) => void;
  onAddDependency: (task: ScheduleTask) => void;
  onDeleteDependency: (dependencyId: string) => void;
}

const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case TaskStatus.NOT_STARTED:
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case TaskStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case TaskStatus.COMPLETED:
      return 'bg-green-100 text-green-700 border-green-200';
    case TaskStatus.ON_HOLD:
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case TaskStatus.CANCELLED:
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getStatusLabel = (status: TaskStatus): string => {
  return status.replace(/_/g, ' ');
};

const getDependencyTypeLabel = (type: DependencyType): string => {
  switch (type) {
    case DependencyType.FINISH_TO_START:
      return 'FS';
    case DependencyType.START_TO_START:
      return 'SS';
    case DependencyType.FINISH_TO_FINISH:
      return 'FF';
    case DependencyType.START_TO_FINISH:
      return 'SF';
    default:
      return type;
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
  onAddDependency,
  onDeleteDependency,
}) => {
  if (!isOpen || !task) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Slide-out Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-5 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-mono bg-white/20 px-2.5 py-1 rounded">
                  {task.wbsCode}
                </span>
                {task.isMilestone && (
                  <span className="text-xs bg-amber-400 text-amber-900 px-2.5 py-1 rounded-full font-semibold">
                    ◆ Milestone
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold leading-tight">{task.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onEdit(task)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Task
            </button>
            <button
              onClick={() => onAddDependency(task)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-secondary-600 rounded-lg hover:bg-secondary-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Add Dependency
            </button>
          </div>

          {/* Status & Progress */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Status
              </label>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border ${getStatusColor(task.status)}`}>
                {getStatusLabel(task.status)}
              </span>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Progress
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-700 w-12 text-right">{task.progress}%</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Description
              </label>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border border-gray-200">
                {task.description}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">
              Timeline
            </label>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-blue-600 font-semibold mb-1">Start Date</div>
                <div className="text-sm font-bold text-blue-900">{formatDate(task.startDate)}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-xs text-purple-600 font-semibold mb-1">End Date</div>
                <div className="text-sm font-bold text-purple-900">{formatDate(task.endDate)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-xs text-green-600 font-semibold mb-1">Duration</div>
                <div className="text-sm font-bold text-green-900">{task.durationDays} days</div>
              </div>
            </div>
          </div>

          {/* Critical Path Metrics */}
          {(task.earlyStart || task.totalFloat !== undefined) && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">
                Critical Path Metrics
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {task.earlyStart && (
                    <div>
                      <div className="text-xs text-gray-600 font-semibold mb-1">Early Start</div>
                      <div className="text-sm font-bold text-gray-900">{formatDate(task.earlyStart)}</div>
                    </div>
                  )}
                  {task.earlyFinish && (
                    <div>
                      <div className="text-xs text-gray-600 font-semibold mb-1">Early Finish</div>
                      <div className="text-sm font-bold text-gray-900">{formatDate(task.earlyFinish)}</div>
                    </div>
                  )}
                  {task.lateStart && (
                    <div>
                      <div className="text-xs text-gray-600 font-semibold mb-1">Late Start</div>
                      <div className="text-sm font-bold text-gray-900">{formatDate(task.lateStart)}</div>
                    </div>
                  )}
                  {task.lateFinish && (
                    <div>
                      <div className="text-xs text-gray-600 font-semibold mb-1">Late Finish</div>
                      <div className="text-sm font-bold text-gray-900">{formatDate(task.lateFinish)}</div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-300">
                  <div className={`p-3 rounded-lg ${task.totalFloat === 0 ? 'bg-red-100 border border-red-300' : 'bg-white border border-gray-300'}`}>
                    <div className="text-xs text-gray-600 font-semibold mb-1">Total Float (Slack)</div>
                    <div className={`text-lg font-bold ${task.totalFloat === 0 ? 'text-red-700' : 'text-gray-900'}`}>
                      {task.totalFloat} days
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {task.totalFloat === 0 ? 'No room for delay' : 'Max delay without affecting project'}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-300 p-3 rounded-lg">
                    <div className="text-xs text-gray-600 font-semibold mb-1">Free Float</div>
                    <div className="text-lg font-bold text-gray-900">{task.freeFloat} days</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {task.freeFloat === 0 ? 'No room for delay' : 'Max delay without affecting successors'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assignment */}
          <div className="grid grid-cols-2 gap-4">
            {task.assignee && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Assigned To
                </label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold text-sm">
                    {task.assignee.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{task.assignee.fullName}</span>
                </div>
              </div>
            )}
            {task.estimatedHours !== undefined && task.estimatedHours !== null && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Estimated Hours
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <span className="text-sm font-bold text-gray-900">{task.estimatedHours}h</span>
                </div>
              </div>
            )}
          </div>

          {/* Hierarchy */}
          {task.parentTask && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Parent Task
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <span className="text-xs font-mono text-gray-500 mr-2">{task.parentTask.wbsCode}</span>
                <span className="text-sm font-medium text-gray-900">{task.parentTask.title}</span>
              </div>
            </div>
          )}

          {/* Predecessors */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Predecessors ({task.predecessors?.length || 0})
            </label>
            {task.predecessors && task.predecessors.length > 0 ? (
              <div className="space-y-2">
                {task.predecessors.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="px-2 py-0.5 text-xs font-bold bg-amber-200 text-amber-900 rounded">
                        {getDependencyTypeLabel(dep.dependencyType)}
                      </span>
                      <span className="text-xs font-mono text-gray-500">{dep.predecessorTask.wbsCode}</span>
                      <span className="text-sm font-medium text-gray-900">{dep.predecessorTask.title}</span>
                      {dep.lagDays !== 0 && (
                        <span className="text-xs text-gray-600">
                          ({dep.lagDays > 0 ? `+${dep.lagDays}` : dep.lagDays}d)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteDependency(dep.id)}
                      className="text-red-600 hover:text-red-700 ml-2"
                      title="Delete dependency"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">No predecessors defined</p>
                <button
                  onClick={() => onAddDependency(task)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-semibold mt-2"
                >
                  Add a predecessor
                </button>
              </div>
            )}
          </div>

          {/* Successors */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Successors ({task.successors?.length || 0})
            </label>
            {task.successors && task.successors.length > 0 ? (
              <div className="space-y-2">
                {task.successors.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3"
                  >
                    <span className="px-2 py-0.5 text-xs font-bold bg-blue-200 text-blue-900 rounded">
                      {getDependencyTypeLabel(dep.dependencyType)}
                    </span>
                    <span className="text-xs font-mono text-gray-500">{dep.successorTask.wbsCode}</span>
                    <span className="text-sm font-medium text-gray-900">{dep.successorTask.title}</span>
                    {dep.lagDays !== 0 && (
                      <span className="text-xs text-gray-600">
                        ({dep.lagDays > 0 ? `+${dep.lagDays}` : dep.lagDays}d)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">No successors defined</p>
              </div>
            )}
          </div>

          {/* Critical Path Indicator */}
          {task.isCriticalPath && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold text-sm">Critical Path Task</span>
              </div>
              <p className="text-xs text-red-700 mt-1">
                Delays in this task will impact the overall project timeline
              </p>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Notes
              </label>
              <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-4 whitespace-pre-wrap">
                {task.notes}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <span className="font-semibold">Created:</span>{' '}
                {new Date(task.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold">Updated:</span>{' '}
                {new Date(task.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
