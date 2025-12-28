import React, { useState, useEffect } from 'react';
import {
  Assumption,
  CreateAssumptionInput,
  UpdateAssumptionInput,
  AssumptionStatus,
} from '../../types/assumption';
import { TeamMember } from '../../types/teamMember';

interface AssumptionFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  assumption?: Assumption | null;
  teamMembers: TeamMember[];
  projectId: string;
  onSubmit: (data: CreateAssumptionInput | UpdateAssumptionInput) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export const AssumptionFormModal: React.FC<AssumptionFormModalProps> = ({
  isOpen,
  mode,
  assumption,
  teamMembers,
  projectId,
  onSubmit,
  onClose,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<CreateAssumptionInput | UpdateAssumptionInput>({
    title: '',
    description: '',
    ownerId: '',
    status: AssumptionStatus.OPEN,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && assumption) {
      setFormData({
        title: assumption.title,
        description: assumption.description || '',
        ownerId: assumption.owner?.id || '',
        status: assumption.status,
        notes: '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        ownerId: '',
        status: AssumptionStatus.OPEN,
        notes: '',
      });
    }
    setErrors({});
  }, [mode, assumption, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
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
        ? { ...formData, projectId } as CreateAssumptionInput
        : formData as UpdateAssumptionInput;

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
                {mode === 'create' ? 'Add New Assumption' : 'Edit Assumption'}
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
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ${
                  errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter assumption title"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                placeholder="Describe the assumption in detail"
              />
            </div>

            {/* Owner (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Owner
              </label>
              <select
                value={formData.ownerId || ''}
                onChange={(e) => handleChange('ownerId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value="">-- No Owner --</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName || member.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status (Default: Open) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Status
              </label>
              <select
                value={formData.status || AssumptionStatus.OPEN}
                onChange={(e) => handleChange('status', e.target.value as AssumptionStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value={AssumptionStatus.OPEN}>Open</option>
                <option value={AssumptionStatus.VALIDATED}>Validated</option>
                <option value={AssumptionStatus.INVALIDATED}>Invalidated</option>
              </select>
            </div>

            {/* Notes (Append-only in edit mode) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {mode === 'edit' ? 'Add Note' : 'Notes'}
                {mode === 'edit' && (
                  <span className="ml-2 text-xs font-normal text-gray-600">(Will be appended to existing notes)</span>
                )}
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                placeholder={mode === 'edit' ? 'Add a new note...' : 'Add notes...'}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  mode === 'create' ? 'Create Assumption' : 'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
