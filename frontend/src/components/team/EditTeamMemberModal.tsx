import { useState, useEffect } from 'react';
import { TeamMember, DesignationRole } from '../../types/teamMember';
import { teamMembersApi } from '../../services/api/teamMembers';

interface EditTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member: TeamMember | null;
}

export default function EditTeamMemberModal({ isOpen, onClose, onSuccess, member }: EditTeamMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    designationRole: DesignationRole.DEVELOPER,
    displayName: '',
  });

  useEffect(() => {
    if (member && isOpen) {
      setFormData({
        fullName: member.fullName,
        designationRole: member.designationRole as DesignationRole,
        displayName: member.displayName || '',
      });
    }
  }, [member, isOpen]);

  const handleSave = async () => {
    if (!member) return;

    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await teamMembersApi.update(member.id, formData);
      await onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update team member');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Edit Team Member</h3>
            <button
              onClick={handleClose}
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Designation Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.designationRole}
                onChange={(e) => setFormData({ ...formData, designationRole: e.target.value as DesignationRole })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {Object.values(DesignationRole).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Display Name / Nickname (Optional)
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter nickname or display name"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
