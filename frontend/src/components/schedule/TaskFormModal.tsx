import React, { useState, useEffect } from 'react';
import {
  ScheduleTask,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  SchedulingMode,
} from '../../types/schedule';
import { TeamMember } from '../../types/teamMember';

interface TaskFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  task?: ScheduleTask | null;
  scheduleId: string;
  teamMembers: TeamMember[];
  tasks: ScheduleTask[]; // For parent task selection
  defaultParentTaskId?: string; // Pre-fill parent when creating child task
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  mode,
  task,
  defaultParentTaskId,
  scheduleId: _scheduleId,
  teamMembers,
  tasks,
  onSubmit,
  onClose,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<CreateTaskInput | UpdateTaskInput>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    parentTaskId: undefined,
    orderIndex: 1,
    assigneeId: undefined,
    estimatedHours: undefined,
    status: TaskStatus.NOT_STARTED,
    progress: 0,
    schedulingMode: SchedulingMode.MANUAL,
    isMilestone: false,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        startDate: task.startDate.split('T')[0],
        endDate: task.endDate.split('T')[0],
        parentTaskId: task.parentTask?.id || undefined,
        orderIndex: task.orderIndex,
        assigneeId: task.assignee?.id || undefined,
        estimatedHours: task.estimatedHours || undefined,
        status: task.status,
        progress: task.progress,
        schedulingMode: task.schedulingMode,
        isMilestone: task.isMilestone,
        notes: task.notes || '',
      });
    } else {
      // For create mode, set next order index
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.orderIndex)) : 0;
      setFormData({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        parentTaskId: defaultParentTaskId || undefined,
        orderIndex: maxOrder + 1,
        assigneeId: undefined,
        estimatedHours: undefined,
        status: TaskStatus.NOT_STARTED,
        progress: 0,
        schedulingMode: SchedulingMode.MANUAL,
        isMilestone: false,
        notes: '',
      });
    }
    setErrors({});
  }, [mode, task, tasks, isOpen, defaultParentTaskId]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // If milestone is checked, set end date = start date
      if (field === 'isMilestone' && value === true && updated.startDate) {
        updated.endDate = updated.startDate;
      }

      return updated;
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be after or equal to start date';
      }
    }

    // Validate parent task (prevent circular hierarchy)
    if (formData.parentTaskId && task) {
      // Check if selected parent is a descendant of current task
      if (isDescendant(formData.parentTaskId, task.id, tasks)) {
        newErrors.parentTaskId = 'Cannot set a child task as parent (circular hierarchy)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isDescendant = (potentialParentId: string, currentTaskId: string, allTasks: ScheduleTask[]): boolean => {
    const potentialParent = allTasks.find(t => t.id === potentialParentId);
    if (!potentialParent) return false;

    // Check if potentialParent has currentTask as an ancestor
    let checkTask = potentialParent;
    while (checkTask.parentTask) {
      if (checkTask.parentTask.id === currentTaskId) {
        return true; // Circular hierarchy detected
      }
      checkTask = allTasks.find(t => t.id === checkTask.parentTask?.id) || checkTask;
      if (!checkTask.parentTask) break;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Filter out current task from parent task options (can't be parent of itself)
  const availableParentTasks = tasks.filter(t => t.id !== task?.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-3xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-secondary-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Add New Task' : 'Edit Task'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {/* Title (Required) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Design database schema"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Task details..."
              />
            </div>

            {/* Parent Task & Scheduling Mode */}
            <div className="grid grid-cols-2 gap-4">
              {/* Parent Task */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Parent Task
                </label>
                <select
                  value={formData.parentTaskId || ''}
                  onChange={(e) => handleChange('parentTaskId', e.target.value || undefined)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.parentTaskId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">None (Root Task)</option>
                  {availableParentTasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.wbsCode} - {t.title}
                    </option>
                  ))}
                </select>
                {errors.parentTaskId && (
                  <p className="mt-1 text-sm text-red-600">{errors.parentTaskId}</p>
                )}
              </div>

              {/* Scheduling Mode */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Scheduling Mode
                </label>
                <select
                  value={formData.schedulingMode || SchedulingMode.MANUAL}
                  onChange={(e) => handleChange('schedulingMode', e.target.value as SchedulingMode)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={SchedulingMode.MANUAL}>Manual</option>
                  <option value={SchedulingMode.AUTO}>Auto (Based on Dependencies)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.schedulingMode === SchedulingMode.AUTO
                    ? 'Dates calculated automatically from dependencies'
                    : 'Set dates manually'}
                </p>
              </div>
            </div>

            {/* Milestone & Other Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isMilestone || false}
                  onChange={(e) => handleChange('isMilestone', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-900">Milestone</span>
              </label>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Start Date {formData.schedulingMode === SchedulingMode.MANUAL && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  disabled={formData.schedulingMode === SchedulingMode.AUTO}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    formData.schedulingMode === SchedulingMode.AUTO ? 'bg-gray-100 cursor-not-allowed' : ''
                  } ${errors.startDate ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                )}
                {formData.schedulingMode === SchedulingMode.AUTO && (
                  <p className="mt-1 text-xs text-gray-500">Calculated automatically from dependencies</p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  End Date {formData.schedulingMode === SchedulingMode.MANUAL && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  disabled={formData.isMilestone || formData.schedulingMode === SchedulingMode.AUTO}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    formData.isMilestone || formData.schedulingMode === SchedulingMode.AUTO ? 'bg-gray-100 cursor-not-allowed' : ''
                  } ${errors.endDate ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                )}
                {formData.isMilestone && formData.schedulingMode !== SchedulingMode.AUTO && (
                  <p className="mt-1 text-xs text-gray-500">End date equals start date for milestones</p>
                )}
                {formData.schedulingMode === SchedulingMode.AUTO && (
                  <p className="mt-1 text-xs text-gray-500">Calculated automatically from dependencies</p>
                )}
              </div>
            </div>

            {/* Assignee & Estimated Hours */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assignee */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Assignee
                </label>
                <select
                  value={formData.assigneeId || ''}
                  onChange={(e) => handleChange('assigneeId', e.target.value || undefined)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.displayName || member.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimatedHours || ''}
                  onChange={(e) => handleChange('estimatedHours', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Status & Progress */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={TaskStatus.NOT_STARTED}>Not Started</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.COMPLETED}>Completed</option>
                  <option value={TaskStatus.ON_HOLD}>On Hold</option>
                  <option value={TaskStatus.CANCELLED}>Cancelled</option>
                </select>
              </div>

              {/* Progress */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Progress (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress || 0}
                  onChange={(e) => handleChange('progress', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Additional notes..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
