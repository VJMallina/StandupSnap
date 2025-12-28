import React, { useState, useEffect } from 'react';
import {
  Schedule,
  CreateScheduleInput,
  UpdateScheduleInput,
} from '../../types/schedule';

interface ScheduleFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  schedule?: Schedule | null;
  projectId: string;
  onSubmit: (data: CreateScheduleInput | UpdateScheduleInput) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  isOpen,
  mode,
  schedule,
  projectId,
  onSubmit,
  onClose,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<CreateScheduleInput | UpdateScheduleInput>({
    name: '',
    description: '',
    scheduleStartDate: '',
    scheduleEndDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && schedule) {
      setFormData({
        name: schedule.name,
        description: schedule.description || '',
        scheduleStartDate: schedule.scheduleStartDate.split('T')[0],
        scheduleEndDate: schedule.scheduleEndDate.split('T')[0],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        scheduleStartDate: '',
        scheduleEndDate: '',
      });
    }
    setErrors({});
  }, [mode, schedule, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Schedule name is required';
    }

    if (!formData.scheduleStartDate) {
      newErrors.scheduleStartDate = 'Start date is required';
    }

    if (!formData.scheduleEndDate) {
      newErrors.scheduleEndDate = 'End date is required';
    }

    if (formData.scheduleStartDate && formData.scheduleEndDate) {
      if (new Date(formData.scheduleEndDate) < new Date(formData.scheduleStartDate)) {
        newErrors.scheduleEndDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const submitData = mode === 'create'
        ? { ...formData, projectId } as CreateScheduleInput
        : formData as UpdateScheduleInput;

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

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
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-secondary-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Create New Schedule' : 'Edit Schedule'}
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
            {/* Name (Required) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Schedule Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Q1 2025 Project Schedule"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
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
                placeholder="Brief description of the schedule..."
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.scheduleStartDate || ''}
                  onChange={(e) => handleChange('scheduleStartDate', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.scheduleStartDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.scheduleStartDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduleStartDate}</p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.scheduleEndDate || ''}
                  onChange={(e) => handleChange('scheduleEndDate', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.scheduleEndDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.scheduleEndDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduleEndDate}</p>
                )}
              </div>
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
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Schedule' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
