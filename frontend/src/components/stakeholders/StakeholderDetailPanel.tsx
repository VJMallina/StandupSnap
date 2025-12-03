import React from 'react';
import { Stakeholder, CommunicationFrequency } from '../../types/stakeholder';
import { MiniPowerInterestQuadrant } from './MiniPowerInterestQuadrant';

interface StakeholderDetailPanelProps {
  isOpen: boolean;
  stakeholder: Stakeholder | null;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
}

export const StakeholderDetailPanel: React.FC<StakeholderDetailPanelProps> = ({
  isOpen,
  stakeholder,
  onClose,
  onEdit,
  onArchive,
}) => {
  if (!isOpen || !stakeholder) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCommunicationFrequency = (freq?: CommunicationFrequency): string => {
    if (!freq) return 'Not specified';
    const labels = {
      [CommunicationFrequency.DAILY]: 'Daily',
      [CommunicationFrequency.WEEKLY]: 'Weekly',
      [CommunicationFrequency.MONTHLY]: 'Monthly',
      [CommunicationFrequency.AD_HOC]: 'Ad-hoc',
    };
    return labels[freq] || freq;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Stakeholder Details</h2>
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

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* ID */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</p>
            <p className="mt-1 text-sm font-mono text-gray-900">{stakeholder.id}</p>
          </div>

          {/* Stakeholder Name */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Stakeholder Name</p>
            <p className="text-lg font-semibold text-gray-900">{stakeholder.stakeholderName}</p>
          </div>

          {/* Role */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Role</p>
            <p className="text-sm text-gray-900">{stakeholder.role}</p>
          </div>

          {/* Power & Interest Levels */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Power Level</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                stakeholder.powerLevel === 'HIGH' ? 'bg-red-100 text-red-800 border border-red-200' :
                stakeholder.powerLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-gray-100 text-gray-800 border border-gray-200'
              }`}>
                {stakeholder.powerLevel}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Interest Level</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                stakeholder.interestLevel === 'HIGH' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                stakeholder.interestLevel === 'MEDIUM' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                'bg-gray-100 text-gray-800 border border-gray-200'
              }`}>
                {stakeholder.interestLevel}
              </span>
            </div>
          </div>

          {/* Mini Power-Interest Quadrant */}
          <MiniPowerInterestQuadrant
            powerLevel={stakeholder.powerLevel}
            interestLevel={stakeholder.interestLevel}
            quadrant={stakeholder.quadrant}
            stakeholderName={stakeholder.stakeholderName}
            role={stakeholder.role}
          />

          {/* Engagement Strategy */}
          {stakeholder.engagementStrategy && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Engagement Strategy</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{stakeholder.engagementStrategy}</p>
              </div>
            </div>
          )}

          {/* Communication Frequency */}
          {stakeholder.communicationFrequency && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Communication Frequency</p>
              <p className="text-sm text-gray-900">{formatCommunicationFrequency(stakeholder.communicationFrequency)}</p>
            </div>
          )}

          {/* Contact Information */}
          {(stakeholder.email || stakeholder.phone) && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Contact Information</p>
              <div className="space-y-2">
                {stakeholder.email && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${stakeholder.email}`} className="text-sm text-blue-600 hover:text-blue-800">
                      {stakeholder.email}
                    </a>
                  </div>
                )}
                {stakeholder.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${stakeholder.phone}`} className="text-sm text-blue-600 hover:text-blue-800">
                      {stakeholder.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Owner */}
          {stakeholder.owner && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Owner</p>
              <p className="text-sm text-gray-900">
                {stakeholder.owner.fullName || stakeholder.owner.displayName}
              </p>
            </div>
          )}

          {/* Notes */}
          {stakeholder.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Notes</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{stakeholder.notes}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm text-gray-900">{formatDate(stakeholder.createdAt)}</p>
              {stakeholder.createdBy && (
                <p className="text-xs text-gray-600 mt-1">by {stakeholder.createdBy.username}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm text-gray-900">{formatDate(stakeholder.updatedAt)}</p>
              {stakeholder.updatedBy && (
                <p className="text-xs text-gray-600 mt-1">by {stakeholder.updatedBy.username}</p>
              )}
            </div>
          </div>

          {/* Archived Badge */}
          {stakeholder.isArchived && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="text-sm font-semibold text-yellow-900">This stakeholder is archived (read-only)</span>
              </div>
            </div>
          )}

          {/* Actions */}
          {!stakeholder.isArchived && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
              >
                Edit Stakeholder
              </button>
              <button
                onClick={onArchive}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Archive
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
