import React, { useState, useEffect } from 'react';
import {
  Stakeholder,
  CreateStakeholderInput,
  UpdateStakeholderInput,
  PowerLevel,
  InterestLevel,
  CommunicationFrequency,
} from '../../types/stakeholder';
import { TeamMember } from '../../types/teamMember';

interface StakeholderFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  stakeholder?: Stakeholder | null;
  teamMembers: TeamMember[];
  projectId: string;
  onSubmit: (data: CreateStakeholderInput | UpdateStakeholderInput) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export const StakeholderFormModal: React.FC<StakeholderFormModalProps> = ({
  isOpen,
  mode,
  stakeholder,
  teamMembers,
  projectId,
  onSubmit,
  onClose,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState<CreateStakeholderInput | UpdateStakeholderInput>({
    stakeholderName: '',
    role: '',
    powerLevel: PowerLevel.MEDIUM,
    interestLevel: InterestLevel.MEDIUM,
    engagementStrategy: '',
    communicationFrequency: undefined,
    email: '',
    phone: '',
    notes: '',
    ownerId: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && stakeholder) {
      setFormData({
        stakeholderName: stakeholder.stakeholderName,
        role: stakeholder.role,
        powerLevel: stakeholder.powerLevel,
        interestLevel: stakeholder.interestLevel,
        engagementStrategy: stakeholder.engagementStrategy || '',
        communicationFrequency: stakeholder.communicationFrequency,
        email: stakeholder.email || '',
        phone: stakeholder.phone || '',
        notes: stakeholder.notes || '',
        ownerId: stakeholder.owner?.id,
      });
    } else {
      setFormData({
        stakeholderName: '',
        role: '',
        powerLevel: PowerLevel.MEDIUM,
        interestLevel: InterestLevel.MEDIUM,
        engagementStrategy: '',
        communicationFrequency: undefined,
        email: '',
        phone: '',
        notes: '',
        ownerId: undefined,
      });
    }
    setErrors({});
  }, [mode, stakeholder, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.stakeholderName?.trim()) {
      newErrors.stakeholderName = 'Stakeholder name is required';
    }

    if (!formData.role?.trim()) {
      newErrors.role = 'Role is required';
    }

    if (mode === 'create' && !(formData as CreateStakeholderInput).powerLevel) {
      newErrors.powerLevel = 'Power level is required';
    }

    if (mode === 'create' && !(formData as CreateStakeholderInput).interestLevel) {
      newErrors.interestLevel = 'Interest level is required';
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
        ? { ...formData, projectId } as CreateStakeholderInput
        : formData as UpdateStakeholderInput;

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
        <div className="inline-block w-full max-w-3xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Add New Stakeholder' : 'Edit Stakeholder'}
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
            {/* Stakeholder Name (Required) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Stakeholder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.stakeholderName || ''}
                onChange={(e) => handleChange('stakeholderName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none ${
                  errors.stakeholderName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter stakeholder name"
              />
              {errors.stakeholderName && (
                <p className="mt-1 text-xs text-red-600">{errors.stakeholderName}</p>
              )}
            </div>

            {/* Role (Required) */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.role || ''}
                onChange={(e) => handleChange('role', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none ${
                  errors.role ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="e.g., Project Sponsor, End User, Executive"
              />
              {errors.role && (
                <p className="mt-1 text-xs text-red-600">{errors.role}</p>
              )}
            </div>

            {/* Power Level and Interest Level Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Power Level (Required) */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Power Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={(formData as CreateStakeholderInput).powerLevel || PowerLevel.MEDIUM}
                  onChange={(e) => handleChange('powerLevel', e.target.value as PowerLevel)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none ${
                    errors.powerLevel ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value={PowerLevel.LOW}>Low</option>
                  <option value={PowerLevel.MEDIUM}>Medium</option>
                  <option value={PowerLevel.HIGH}>High</option>
                </select>
                {errors.powerLevel && (
                  <p className="mt-1 text-xs text-red-600">{errors.powerLevel}</p>
                )}
              </div>

              {/* Interest Level (Required) */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Interest Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={(formData as CreateStakeholderInput).interestLevel || InterestLevel.MEDIUM}
                  onChange={(e) => handleChange('interestLevel', e.target.value as InterestLevel)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none ${
                    errors.interestLevel ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value={InterestLevel.LOW}>Low</option>
                  <option value={InterestLevel.MEDIUM}>Medium</option>
                  <option value={InterestLevel.HIGH}>High</option>
                </select>
                {errors.interestLevel && (
                  <p className="mt-1 text-xs text-red-600">{errors.interestLevel}</p>
                )}
              </div>
            </div>

            {/* Engagement Strategy */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Engagement Strategy
              </label>
              <textarea
                value={formData.engagementStrategy || ''}
                onChange={(e) => handleChange('engagementStrategy', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                placeholder="How will you engage with this stakeholder?"
              />
            </div>

            {/* Communication Frequency and Owner Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Communication Frequency */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Communication Frequency
                </label>
                <select
                  value={formData.communicationFrequency || ''}
                  onChange={(e) => handleChange('communicationFrequency', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="">-- Select --</option>
                  <option value={CommunicationFrequency.DAILY}>Daily</option>
                  <option value={CommunicationFrequency.WEEKLY}>Weekly</option>
                  <option value={CommunicationFrequency.MONTHLY}>Monthly</option>
                  <option value={CommunicationFrequency.AD_HOC}>Ad-hoc</option>
                </select>
              </div>

              {/* Owner */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Owner
                </label>
                <select
                  value={formData.ownerId || ''}
                  onChange={(e) => handleChange('ownerId', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="">-- Select Owner --</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName || member.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Information Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  placeholder="stakeholder@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  placeholder="+1 (555) 123-4567"
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
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                placeholder="Additional notes about this stakeholder"
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
                className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  mode === 'create' ? 'Create Stakeholder' : 'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
