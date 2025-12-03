import React from 'react';
import { Assumption, AssumptionStatus } from '../../types/assumption';

interface AssumptionDetailPanelProps {
  isOpen: boolean;
  assumption: Assumption | null;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
}

export const AssumptionDetailPanel: React.FC<AssumptionDetailPanelProps> = ({
  isOpen,
  assumption,
  onClose,
  onEdit,
  onArchive,
}) => {
  if (!isOpen || !assumption) return null;

  const getStatusBadgeColor = (status: AssumptionStatus) => {
    switch (status) {
      case AssumptionStatus.OPEN:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case AssumptionStatus.VALIDATED:
        return 'bg-green-50 text-green-700 border-green-200';
      case AssumptionStatus.INVALIDATED:
        return 'bg-red-50 text-red-700 border-red-200';
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

  const canEdit = assumption.status === AssumptionStatus.OPEN && !assumption.isArchived;

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
        <div className="sticky top-0 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Assumption Details</h2>
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
              <p className="mt-1 text-sm font-mono text-gray-900">{assumption.id}</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadgeColor(assumption.status)}`}>
              {assumption.status}
            </span>
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Title</p>
            <p className="text-lg font-semibold text-gray-900">{assumption.title}</p>
          </div>

          {/* Description */}
          {assumption.description && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{assumption.description}</p>
            </div>
          )}

          {/* Owner */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Owner</p>
            <p className="text-sm text-gray-900">
              {assumption.owner?.fullName || assumption.owner?.displayName || 'Not assigned'}
            </p>
          </div>

          {/* Notes */}
          {assumption.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Notes</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{assumption.notes}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm text-gray-900">{formatDate(assumption.createdAt)}</p>
              {assumption.createdBy && (
                <p className="text-xs text-gray-600 mt-1">by {assumption.createdBy.username}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm text-gray-900">{formatDate(assumption.updatedAt)}</p>
              {assumption.updatedBy && (
                <p className="text-xs text-gray-600 mt-1">by {assumption.updatedBy.username}</p>
              )}
            </div>
          </div>

          {/* Archived Badge */}
          {assumption.isArchived && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="text-sm font-semibold text-yellow-900">This assumption is archived (read-only)</span>
              </div>
            </div>
          )}

          {/* Actions */}
          {!assumption.isArchived && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              {canEdit && (
                <button
                  onClick={onEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Edit Assumption
                </button>
              )}
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
