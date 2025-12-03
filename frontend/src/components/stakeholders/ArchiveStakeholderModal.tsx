import React from 'react';
import { Stakeholder } from '../../types/stakeholder';

interface ArchiveStakeholderModalProps {
  isOpen: boolean;
  stakeholder: Stakeholder | null;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const ArchiveStakeholderModal: React.FC<ArchiveStakeholderModalProps> = ({
  isOpen,
  stakeholder,
  onConfirm,
  onCancel,
  isSubmitting,
}) => {
  if (!isOpen || !stakeholder) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onCancel}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Icon */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Archive Stakeholder?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to archive this stakeholder? They will be removed from active stakeholder lists and the Power-Interest Grid.
            </p>

            {/* Stakeholder Details */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-gray-900 mb-2">{stakeholder.stakeholderName}</p>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="font-medium">Role:</span> {stakeholder.role}</p>
                <p>
                  <span className="font-medium">Power:</span> {stakeholder.powerLevel} •{' '}
                  <span className="font-medium">Interest:</span> {stakeholder.interestLevel}
                </p>
                {stakeholder.owner && (
                  <p>
                    <span className="font-medium">Owner:</span>{' '}
                    {stakeholder.owner.fullName || stakeholder.owner.displayName}
                  </p>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-yellow-900">
                <span className="font-semibold">Note:</span> Archived stakeholders will be marked as read-only
                and moved to the archived section. They will not appear in the Power-Interest Grid or any stakeholder dashboards.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Archiving...
                  </span>
                ) : (
                  'Archive Stakeholder'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
