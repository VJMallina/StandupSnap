import React, { useState, useEffect } from 'react';
import {
  Decision,
  CreateDecisionInput,
  UpdateDecisionInput,
  DecisionStatus,
  ImpactedArea,
} from '../../types/decision';
import { TeamMember } from '../../types/teamMember';

interface DecisionFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  decision?: Decision | null;
  teamMembers: TeamMember[];
  projectId: string;
  onSubmit: (data: CreateDecisionInput | UpdateDecisionInput) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export const DecisionFormModal: React.FC<DecisionFormModalProps> = ({
  isOpen,
  mode,
  decision,
  teamMembers,
  projectId,
  onSubmit,
  onClose,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<CreateDecisionInput | UpdateDecisionInput>({
    title: '',
    description: '',
    ownerId: '',
    status: DecisionStatus.PENDING,
    decisionTaken: '',
    dueDate: undefined,
    impactedAreas: [],
    supportingNotes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prevent editing finalized decisions except supporting notes
  const isFinalized = decision?.status === DecisionStatus.FINALIZED;

  useEffect(() => {
    if (mode === 'edit' && decision) {
      setFormData({
        title: decision.title,
        description: decision.description || '',
        ownerId: decision.owner?.id || '',
        status: decision.status,
        decisionTaken: decision.decisionTaken || '',
        dueDate: decision.dueDate || undefined,
        impactedAreas: decision.impactedAreas || [],
        supportingNotes: decision.supportingNotes || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        ownerId: '',
        status: DecisionStatus.PENDING,
        decisionTaken: '',
        dueDate: undefined,
        impactedAreas: [],
        supportingNotes: '',
      });
    }
    setErrors({});
  }, [mode, decision, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImpactedAreaToggle = (area: ImpactedArea) => {
    const currentAreas = (formData.impactedAreas as ImpactedArea[]) || [];
    const newAreas = currentAreas.includes(area)
      ? currentAreas.filter(a => a !== area)
      : [...currentAreas, area];
    handleChange('impactedAreas', newAreas);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isFinalized) {
      if (!formData.title?.trim()) {
        newErrors.title = 'Title is required';
      }

      if (mode === 'create' && !formData.ownerId) {
        newErrors.ownerId = 'Owner is required';
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
      let submitData;
      if (isFinalized) {
        // For finalized decisions, only submit supporting notes
        submitData = { supportingNotes: formData.supportingNotes } as UpdateDecisionInput;
      } else {
        submitData = mode === 'create'
          ? { ...formData, projectId } as CreateDecisionInput
          : formData as UpdateDecisionInput;
      }

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
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Add New Decision' : isFinalized ? 'Edit Supporting Notes' : 'Edit Decision'}
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

          {/* Warning for finalized decisions */}
          {isFinalized && (
            <div className="px-6 pt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">Note:</span> This decision is finalized and read-only. Only supporting notes can be updated.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {!isFinalized && (
              <>
                {/* Title (Required) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter decision title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-600">{errors.title}</p>
                  )}
                </div>

                {/* Context / Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Context / Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    placeholder="Background or reasoning for the decision"
                  />
                </div>

                {/* Owner (Required) and Status Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Owner */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Decision Owner <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.ownerId || ''}
                      onChange={(e) => handleChange('ownerId', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
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

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status || DecisionStatus.PENDING}
                      onChange={(e) => handleChange('status', e.target.value as DecisionStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value={DecisionStatus.PENDING}>Pending</option>
                      <option value={DecisionStatus.FINALIZED}>Finalized</option>
                    </select>
                  </div>
                </div>

                {/* Decision Taken */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Decision Taken
                  </label>
                  <textarea
                    value={formData.decisionTaken || ''}
                    onChange={(e) => handleChange('decisionTaken', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    placeholder="Actual decision statement (filled when status = Finalized)"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Due Date for Decision
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleChange('dueDate', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Impacted Areas */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Impacted Areas
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {Object.values(ImpactedArea).map((area) => (
                      <label key={area} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={((formData.impactedAreas as ImpactedArea[]) || []).includes(area)}
                          onChange={() => handleImpactedAreaToggle(area)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="capitalize">{area.toLowerCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Supporting Notes (Always editable) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Supporting Notes
              </label>
              <textarea
                value={formData.supportingNotes || ''}
                onChange={(e) => handleChange('supportingNotes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Additional clarifications"
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
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  mode === 'create' ? 'Create Decision' : 'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
