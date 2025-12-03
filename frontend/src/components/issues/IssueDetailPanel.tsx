import React from 'react';
import { Issue, IssueStatus, IssueSeverity } from '../../types/issue';

interface IssueDetailPanelProps {
  isOpen: boolean;
  issue: Issue | null;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
}

export const IssueDetailPanel: React.FC<IssueDetailPanelProps> = ({
  isOpen,
  issue,
  onClose,
  onEdit,
  onArchive,
}) => {
  if (!isOpen || !issue) return null;

  const getStatusBadgeColor = (status: IssueStatus) => {
    switch (status) {
      case IssueStatus.OPEN:
        return 'bg-red-50 text-red-700 border-red-200';
      case IssueStatus.MITIGATED:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case IssueStatus.CLOSED:
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSeverityBadgeColor = (severity: IssueSeverity) => {
    switch (severity) {
      case IssueSeverity.CRITICAL:
        return 'bg-red-100 text-red-900 border-red-300';
      case IssueSeverity.HIGH:
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case IssueSeverity.MEDIUM:
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case IssueSeverity.LOW:
        return 'bg-yellow-100 text-yellow-900 border-yellow-300';
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

  const canEdit = issue.status !== IssueStatus.CLOSED && !issue.isArchived;

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
        <div className="sticky top-0 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Issue Details</h2>
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
          {/* ID, Status & Severity */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</p>
              <p className="mt-1 text-sm font-mono text-gray-900">{issue.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadgeColor(issue.status)}`}>
                {issue.status}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getSeverityBadgeColor(issue.severity)}`}>
                {issue.severity}
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Title</p>
            <p className="text-lg font-semibold text-gray-900">{issue.title}</p>
          </div>

          {/* Description */}
          {issue.description && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{issue.description}</p>
            </div>
          )}

          {/* Owner */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Owner</p>
            <p className="text-sm text-gray-900">
              {issue.owner?.fullName || issue.owner?.displayName || 'Not assigned'}
            </p>
          </div>

          {/* Impact Summary */}
          {issue.impactSummary && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Impact Summary</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{issue.impactSummary}</p>
              </div>
            </div>
          )}

          {/* Resolution Plan */}
          {issue.resolutionPlan && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Resolution Plan</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{issue.resolutionPlan}</p>
              </div>
            </div>
          )}

          {/* Target Resolution Date */}
          {issue.targetResolutionDate && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Target Resolution Date</p>
              <p className="text-sm text-gray-900">{formatDate(issue.targetResolutionDate)}</p>
            </div>
          )}

          {/* Closure Date */}
          {issue.closureDate && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Closure Date</p>
              <p className="text-sm text-gray-900">{formatDate(issue.closureDate)}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm text-gray-900">{formatDate(issue.createdAt)}</p>
              {issue.createdBy && (
                <p className="text-xs text-gray-600 mt-1">by {issue.createdBy.username}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm text-gray-900">{formatDate(issue.updatedAt)}</p>
              {issue.updatedBy && (
                <p className="text-xs text-gray-600 mt-1">by {issue.updatedBy.username}</p>
              )}
            </div>
          </div>

          {/* Archived Badge */}
          {issue.isArchived && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="text-sm font-semibold text-yellow-900">This issue is archived (read-only)</span>
              </div>
            </div>
          )}

          {/* Actions */}
          {!issue.isArchived && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              {canEdit && (
                <button
                  onClick={onEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Edit Issue
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
