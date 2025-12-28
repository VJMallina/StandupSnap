import React from 'react';
import { Risk } from '../../types/risk';

interface ArchiveRiskModalProps {
  isOpen: boolean;
  risk: Risk | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const ArchiveRiskModal: React.FC<ArchiveRiskModalProps> = ({
  isOpen,
  risk,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  if (!isOpen || !risk) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">Archive Risk</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Archiving this risk will remove it from active visibility. You can view it anytime under
            <span className="font-semibold"> Archived Risks</span>.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Risk:</span> {risk.title}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              <span className="font-semibold">Status:</span> {risk.status}
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Are you sure you want to archive this risk?
          </p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-white bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg hover:from-primary-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
};
