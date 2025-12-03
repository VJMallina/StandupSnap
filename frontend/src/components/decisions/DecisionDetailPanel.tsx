import React from 'react';
import { Decision, DecisionStatus } from '../../types/decision';

interface DecisionDetailPanelProps {
  isOpen: boolean;
  decision: Decision | null;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
}

export const DecisionDetailPanel: React.FC<DecisionDetailPanelProps> = ({
  isOpen,
  decision,
  onClose,
  onEdit,
  onArchive,
}) => {
  if (!isOpen || !decision) return null;

  const getStatusBadgeColor = (status: DecisionStatus) => {
    switch (status) {
      case DecisionStatus.PENDING:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case DecisionStatus.FINALIZED:
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isFinalized = decision.status === DecisionStatus.FINALIZED;

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
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Decision Details</h2>
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
          {/* ID & Status */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</p>
              <p className="mt-1 text-sm font-mono text-gray-900">{decision.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadgeColor(decision.status)}`}>
                {decision.status}
              </span>
            </div>
          </div>

          {/* Pending Highlight */}
          {decision.status === DecisionStatus.PENDING && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-amber-900">Decision pending - requires action</span>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Title</p>
            <p className="text-lg font-semibold text-gray-900">{decision.title}</p>
          </div>

          {/* Context / Description */}
          {decision.description && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Context / Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{decision.description}</p>
            </div>
          )}

          {/* Decision Owner */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Decision Owner</p>
            <p className="text-sm text-gray-900">
              {decision.owner?.fullName || decision.owner?.displayName || 'Not assigned'}
            </p>
          </div>

          {/* Decision Taken */}
          {decision.decisionTaken && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Decision Taken</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-900 font-medium whitespace-pre-wrap">{decision.decisionTaken}</p>
              </div>
            </div>
          )}

          {/* Due Date */}
          {decision.dueDate && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Due Date for Decision</p>
              <p className="text-sm text-gray-900">{formatDate(decision.dueDate)}</p>
            </div>
          )}

          {/* Impacted Areas */}
          {decision.impactedAreas && decision.impactedAreas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Impacted Areas</p>
              <div className="flex flex-wrap gap-2">
                {decision.impactedAreas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Supporting Notes */}
          {decision.supportingNotes && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Supporting Notes</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{decision.supportingNotes}</p>
              </div>
            </div>
          )}

          {/* Finalized Date */}
          {decision.finalizedDate && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Finalized Date</p>
              <p className="text-sm text-gray-900">{formatDate(decision.finalizedDate)}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm text-gray-900">{formatDate(decision.createdAt)}</p>
              {decision.createdBy && (
                <p className="text-xs text-gray-600 mt-1">by {decision.createdBy.username}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm text-gray-900">{formatDate(decision.updatedAt)}</p>
              {decision.updatedBy && (
                <p className="text-xs text-gray-600 mt-1">by {decision.updatedBy.username}</p>
              )}
            </div>
          </div>

          {/* Archived Badge */}
          {decision.isArchived && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="text-sm font-semibold text-yellow-900">
                  This decision is archived (read-only)
                </span>
              </div>
            </div>
          )}

          {/* Finalized Read-only Warning */}
          {isFinalized && !decision.isArchived && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-blue-900">
                  This decision is finalized. Only supporting notes can be updated.
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          {!decision.isArchived && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                {isFinalized ? 'Edit Notes' : 'Edit Decision'}
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
