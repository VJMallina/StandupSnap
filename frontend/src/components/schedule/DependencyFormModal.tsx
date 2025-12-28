import React, { useState, useEffect } from 'react';
import {
  ScheduleTask,
  DependencyType,
  CreateDependencyInput,
} from '../../types/schedule';

interface DependencyFormModalProps {
  isOpen: boolean;
  currentTask: ScheduleTask;
  availableTasks: ScheduleTask[];
  onSubmit: (data: CreateDependencyInput) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

const dependencyTypeOptions = [
  {
    value: DependencyType.FINISH_TO_START,
    label: 'Finish-to-Start (FS)',
    description: 'Successor task cannot start until predecessor task finishes',
    example: 'Most common: Build must finish before Testing starts',
  },
  {
    value: DependencyType.START_TO_START,
    label: 'Start-to-Start (SS)',
    description: 'Successor task cannot start until predecessor task starts',
    example: 'Pour concrete and Level concrete start together',
  },
  {
    value: DependencyType.FINISH_TO_FINISH,
    label: 'Finish-to-Finish (FF)',
    description: 'Successor task cannot finish until predecessor task finishes',
    example: 'Testing cannot finish until Documentation finishes',
  },
  {
    value: DependencyType.START_TO_FINISH,
    label: 'Start-to-Finish (SF)',
    description: 'Successor task cannot finish until predecessor task starts',
    example: 'Rare: Night shift cannot finish until day shift starts',
  },
];

export const DependencyFormModal: React.FC<DependencyFormModalProps> = ({
  isOpen,
  currentTask,
  availableTasks,
  onSubmit,
  onClose,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<CreateDependencyInput>({
    predecessorTaskId: '',
    successorTaskId: currentTask.id,
    dependencyType: DependencyType.FINISH_TO_START,
    lagDays: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        predecessorTaskId: '',
        successorTaskId: currentTask.id,
        dependencyType: DependencyType.FINISH_TO_START,
        lagDays: 0,
      });
      setErrors({});
    }
  }, [isOpen, currentTask.id]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.predecessorTaskId) {
      newErrors.predecessorTaskId = 'Please select a predecessor task';
    }

    if (formData.predecessorTaskId === currentTask.id) {
      newErrors.predecessorTaskId = 'A task cannot depend on itself';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Task Dependency</h2>
              <p className="text-sm text-gray-600 mt-1">
                Define how <span className="font-semibold text-primary-600">{currentTask.title}</span> depends on another task
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Predecessor Task Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Predecessor Task <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              The task that must be completed (or started) before this task
            </p>
            <select
              value={formData.predecessorTaskId}
              onChange={(e) => setFormData({ ...formData, predecessorTaskId: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.predecessorTaskId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">-- Select predecessor task --</option>
              {availableTasks
                .filter((t) => t.id !== currentTask.id)
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.wbsCode} - {task.title}
                  </option>
                ))}
            </select>
            {errors.predecessorTaskId && (
              <p className="text-sm text-red-600 mt-1">{errors.predecessorTaskId}</p>
            )}
          </div>

          {/* Dependency Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Dependency Type <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {dependencyTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.dependencyType === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="dependencyType"
                    value={option.value}
                    checked={formData.dependencyType === option.value}
                    onChange={(e) =>
                      setFormData({ ...formData, dependencyType: e.target.value as DependencyType })
                    }
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{option.description}</div>
                    <div className="text-xs text-gray-500 mt-1 italic">Example: {option.example}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Lag Days */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Lag Time (Days)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Positive = Delay (wait after predecessor), Negative = Lead (overlap with predecessor)
            </p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={formData.lagDays}
                onChange={(e) => setFormData({ ...formData, lagDays: parseInt(e.target.value) || 0 })}
                className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <div className="flex-1 text-sm">
                {(formData.lagDays ?? 0) > 0 && (
                  <span className="text-amber-700">
                    ⏱️ Successor will wait {formData.lagDays} day(s) after predecessor
                  </span>
                )}
                {(formData.lagDays ?? 0) < 0 && (
                  <span className="text-blue-700">
                    ⚡ Successor will overlap by {Math.abs(formData.lagDays ?? 0)} day(s)
                  </span>
                )}
                {(formData.lagDays ?? 0) === 0 && (
                  <span className="text-gray-500">No delay or lead time</span>
                )}
              </div>
            </div>
          </div>

          {/* Visual Explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">How this works:</p>
                <p>
                  {formData.dependencyType === DependencyType.FINISH_TO_START &&
                    'The predecessor task must finish before this task can start.'}
                  {formData.dependencyType === DependencyType.START_TO_START &&
                    'This task cannot start until the predecessor task starts.'}
                  {formData.dependencyType === DependencyType.FINISH_TO_FINISH &&
                    'This task cannot finish until the predecessor task finishes.'}
                  {formData.dependencyType === DependencyType.START_TO_FINISH &&
                    'This task cannot finish until the predecessor task starts.'}
                  {(formData.lagDays ?? 0) > 0 && ` Plus a ${formData.lagDays} day delay.`}
                  {(formData.lagDays ?? 0) < 0 && ` With a ${Math.abs(formData.lagDays ?? 0)} day lead time.`}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                'Add Dependency'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
