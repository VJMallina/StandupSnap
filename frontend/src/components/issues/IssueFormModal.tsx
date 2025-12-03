import React, { useState, useEffect } from 'react';
import {
  Issue,
  CreateIssueInput,
  UpdateIssueInput,
  IssueStatus,
  IssueSeverity,
} from '../../types/issue';
import { TeamMember } from '../../types/teamMember';

interface IssueFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  issue?: Issue | null;
  teamMembers: TeamMember[];
  projectId: string;
  onSubmit: (data: CreateIssueInput | UpdateIssueInput) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export const IssueFormModal: React.FC<IssueFormModalProps> = ({
  isOpen,
  mode,
  issue,
  teamMembers,
  projectId,
  onSubmit,
  onClose,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<CreateIssueInput | UpdateIssueInput>({
    title: '',
    description: '',
    ownerId: '',
    status: IssueStatus.OPEN,
    severity: IssueSeverity.MEDIUM,
    impactSummary: '',
    resolutionPlan: '',
    targetResolutionDate: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && issue) {
      setFormData({
        title: issue.title,
        description: issue.description || '',
        ownerId: issue.owner?.id || '',
        status: issue.status,
        severity: issue.severity,
        impactSummary: issue.impactSummary || '',
        resolutionPlan: issue.resolutionPlan || '',
        targetResolutionDate: issue.targetResolutionDate || undefined,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        ownerId: '',
        status: IssueStatus.OPEN,
        severity: IssueSeverity.MEDIUM,
        impactSummary: '',
        resolutionPlan: '',
        targetResolutionDate: undefined,
      });
    }
    setErrors({});
  }, [mode, issue, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (mode === 'create' && !formData.ownerId) {
      newErrors.ownerId = 'Owner is required';
    }

    if (mode === 'create' && !(formData as CreateIssueInput).severity) {
      newErrors.severity = 'Severity is required';
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
        ? { ...formData, projectId } as CreateIssueInput
        : formData as UpdateIssueInput;

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
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Add New Issue' : 'Edit Issue'}
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
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${
                  errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter issue title"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                placeholder="Describe the issue in detail"
              />
            </div>

            {/* Status and Severity Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Status
                </label>
                <select
                  value={formData.status || IssueStatus.OPEN}
                  onChange={(e) => handleChange('status', e.target.value as IssueStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  <option value={IssueStatus.OPEN}>Open</option>
                  <option value={IssueStatus.MITIGATED}>Mitigated</option>
                  <option value={IssueStatus.CLOSED}>Closed</option>
                </select>
              </div>

              {/* Severity (Required) */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Severity <span className="text-red-500">*</span>
                </label>
                <select
                  value={(formData as CreateIssueInput).severity || IssueSeverity.MEDIUM}
                  onChange={(e) => handleChange('severity', e.target.value as IssueSeverity)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${
                    errors.severity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value={IssueSeverity.LOW}>Low</option>
                  <option value={IssueSeverity.MEDIUM}>Medium</option>
                  <option value={IssueSeverity.HIGH}>High</option>
                  <option value={IssueSeverity.CRITICAL}>Critical</option>
                </select>
                {errors.severity && (
                  <p className="mt-1 text-xs text-red-600">{errors.severity}</p>
                )}
              </div>
            </div>

            {/* Owner (Required) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Owner <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.ownerId || ''}
                onChange={(e) => handleChange('ownerId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${
                  errors.ownerId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">-- Select Owner --</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName || member.displayName}
                  </option>
                ))}
              </select>
              {errors.ownerId && (
                <p className="mt-1 text-xs text-red-600">{errors.ownerId}</p>
              )}
            </div>

            {/* Impact Summary (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Impact Summary
              </label>
              <textarea
                value={formData.impactSummary || ''}
                onChange={(e) => handleChange('impactSummary', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                placeholder="Describe the impact of this issue"
              />
            </div>

            {/* Resolution Plan (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Resolution Plan
              </label>
              <textarea
                value={formData.resolutionPlan || ''}
                onChange={(e) => handleChange('resolutionPlan', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                placeholder="Outline the plan to resolve this issue"
              />
            </div>

            {/* Target Resolution Date (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Target Resolution Date
              </label>
              <input
                type="date"
                value={formData.targetResolutionDate ? new Date(formData.targetResolutionDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('targetResolutionDate', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
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
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  mode === 'create' ? 'Create Issue' : 'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
