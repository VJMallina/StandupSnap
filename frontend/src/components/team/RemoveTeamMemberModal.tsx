import { useState } from 'react';
import { TeamMember } from '../../types/teamMember';

interface RemoveTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  member: TeamMember | null;
}

export default function RemoveTeamMemberModal({ isOpen, onClose, onConfirm, member }: RemoveTeamMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to remove team member');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Remove Team Member</h3>
            <button
              onClick={onClose}
              className="text-teal-100 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Are you sure you want to remove this team member from the project?
            </p>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="font-semibold text-gray-900">{member.fullName}</p>
              <p className="text-sm text-gray-600">{member.designationRole}</p>
              {member.displayName && (
                <p className="text-xs text-gray-500 mt-1">aka {member.displayName}</p>
              )}
            </div>

            <p className="text-sm text-gray-600 mt-4">
              Note: The team member profile will remain in the system and can be added to other projects.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
