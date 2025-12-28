import React, { useEffect, useState } from 'react';
import { Risk, RiskHistory } from '../../types/risk';
import { SeverityBadge } from './SeverityBadge';
import { RiskScoreDisplay } from './RiskScoreDisplay';
import { risksApi } from '../../services/api/risks';

interface RiskDetailPanelProps {
  isOpen: boolean;
  risk: Risk | null;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  canArchive: boolean;
}

export const RiskDetailPanel: React.FC<RiskDetailPanelProps> = ({
  isOpen,
  risk,
  onClose,
  onEdit,
  onArchive,
  canArchive,
}) => {
  const [history, setHistory] = useState<RiskHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Keyboard ESC support
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Fetch history when panel opens
  useEffect(() => {
    if (isOpen && risk) {
      fetchHistory();
    }
  }, [isOpen, risk?.id]);

  const fetchHistory = async () => {
    if (!risk) return;

    try {
      setLoadingHistory(true);
      const historyData = await risksApi.getHistory(risk.id);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to fetch risk history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen || !risk) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'CREATED':
        return (
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        );
      case 'STATUS_CHANGED':
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'OWNER_CHANGED':
        return (
          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      case 'ARCHIVED':
        return (
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-semibold text-white">Risk Details</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Risk ID and Archived Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">ID: {risk.id.substring(0, 8)}</span>
            {risk.isArchived && (
              <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
                Archived
              </span>
            )}
          </div>

          {/* A. Identification Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Identification</h3>

            <div>
              <label className="block text-sm font-medium text-gray-500">Title</label>
              <p className="mt-1 text-gray-900 font-semibold text-lg">{risk.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Type</label>
                <p className="mt-1 text-gray-900">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-sm ${
                      risk.riskType === 'THREAT'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {risk.riskType}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Category</label>
                <p className="mt-1 text-gray-900">{risk.category}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Date Identified</label>
              <p className="mt-1 text-gray-900">{formatDate(risk.dateIdentified)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Risk Statement</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{risk.riskStatement}</p>
            </div>

            {risk.currentStatusAssumptions && (
              <div>
                <label className="block text-sm font-medium text-gray-500">
                  Current Status / Assumptions
                </label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">
                  {risk.currentStatusAssumptions}
                </p>
              </div>
            )}
          </div>

          {/* B. Assessment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Assessment</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Probability</label>
                <p className="mt-1 text-gray-900">{risk.probability.replace('_', ' ')}</p>
              </div>

              {risk.costImpact && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Cost Impact</label>
                  <p className="mt-1 text-gray-900">{risk.costImpact.replace('_', ' ')}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {risk.timeImpact && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Time Impact</label>
                  <p className="mt-1 text-gray-900">{risk.timeImpact.replace('_', ' ')}</p>
                </div>
              )}

              {risk.scheduleImpact && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Schedule Impact</label>
                  <p className="mt-1 text-gray-900">{risk.scheduleImpact.replace('_', ' ')}</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <RiskScoreDisplay
                probabilityScore={risk.probabilityScore}
                impactScore={risk.impactScore}
                riskScore={risk.riskScore}
                severity={risk.severity}
              />
            </div>

            {risk.rationale && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Rationale</label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{risk.rationale}</p>
              </div>
            )}
          </div>

          {/* C. Response & Ownership Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Response & Ownership</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Strategy</label>
                <p className="mt-1 text-gray-900 font-medium">{risk.strategy}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Risk Owner</label>
                <p className="mt-1 text-gray-900">{risk.owner.displayName || risk.owner.fullName}</p>
              </div>
            </div>

            {risk.mitigationPlan && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Mitigation Plan</label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{risk.mitigationPlan}</p>
              </div>
            )}

            {risk.contingencyPlan && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Contingency Plan</label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{risk.contingencyPlan}</p>
              </div>
            )}

            {risk.targetClosureDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Target Closure Date</label>
                <p className="mt-1 text-gray-900">{formatDate(risk.targetClosureDate)}</p>
              </div>
            )}
          </div>

          {/* D. Status Tracking Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Status Tracking</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Current Status</label>
                <p className="mt-1">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${
                      risk.status === 'OPEN'
                        ? 'bg-blue-100 text-blue-800'
                        : risk.status === 'IN_PROGRESS'
                        ? 'bg-yellow-100 text-yellow-800'
                        : risk.status === 'MITIGATED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {risk.status.replace('_', ' ')}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                <p className="mt-1 text-gray-900">{formatDate(risk.updatedAt)}</p>
              </div>
            </div>

            {risk.progressNotes && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Progress Notes</label>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">{risk.progressNotes}</p>
              </div>
            )}
          </div>

          {/* History Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex-1">History Timeline</h3>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {showHistory ? 'Hide' : 'Show'}
              </button>
            </div>

            {showHistory && (
              <div className="space-y-3">
                {loadingHistory ? (
                  <div className="text-center py-4">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary-600 border-r-transparent"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading history...</p>
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No history available</p>
                ) : (
                  <div className="space-y-4">
                    {history.map((entry, index) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          {getChangeTypeIcon(entry.changeType)}
                          {index < history.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{entry.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {entry.changedBy?.name || entry.changedBy?.email || 'System'} •{' '}
                                {formatDateTime(entry.createdAt)}
                              </p>
                            </div>
                          </div>
                          {entry.changedFields && Object.keys(entry.changedFields).length > 0 && (
                            <div className="mt-2 bg-gray-50 rounded p-2 text-xs">
                              {Object.entries(entry.changedFields).map(([field, values]) => (
                                <div key={field} className="flex items-center gap-2">
                                  <span className="font-medium capitalize">{field}:</span>
                                  <span className="text-red-600 line-through">{String(values.old)}</span>
                                  <span>→</span>
                                  <span className="text-green-600">{String(values.new)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">Metadata</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>{' '}
                <span className="text-gray-900">{formatDate(risk.createdAt)}</span>
              </div>
              {risk.createdBy && (
                <div>
                  <span className="text-gray-500">Created By:</span>{' '}
                  <span className="text-gray-900">{risk.createdBy.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!risk.isArchived && (
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t">
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-2 text-white bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg hover:from-primary-700 hover:to-cyan-700 transition-all"
            >
              Edit Risk
            </button>
            {canArchive && (
              <button
                onClick={onArchive}
                className="flex-1 px-4 py-2 text-amber-700 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors"
              >
                Archive Risk
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};
