import { useState, useEffect } from 'react';
import { DesignationRole } from '../../types/teamMember';
import { teamMembersApi } from '../../services/api/teamMembers';

interface OrgMember {
  id: string;
  fullName: string;
  displayName?: string;
}

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

export default function AddTeamMemberModal({ isOpen, onClose, onSuccess, projectId }: AddTeamMemberModalProps) {
  const [availableMembers, setAvailableMembers] = useState<OrgMember[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [designationRole, setDesignationRole] = useState<string>(DesignationRole.DEVELOPER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setSelectedUserIds([]);
      setError(null);
      loadAvailableMembers();
    }
  }, [isOpen, projectId]);

  const loadAvailableMembers = async () => {
    try {
      const members = await teamMembersApi.getAvailableForProject(projectId);
      setAvailableMembers(members as unknown as OrgMember[]);
    } catch (err: any) {
      console.error('Failed to load available members:', err);
    }
  };

  const handleSelectMember = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) {
      setError('Please select at least one team member');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await teamMembersApi.addToProject(projectId, selectedUserIds, designationRole);
      await onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add team members');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserIds([]);
    setDesignationRole(DesignationRole.DEVELOPER);
    setError(null);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Add Team Member</h3>
            <button onClick={handleClose} className="text-primary-100 hover:text-white transition-colors">
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

          {availableMembers.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 font-medium">No available org members</p>
              <p className="text-gray-400 text-sm mt-1">All org members are already assigned to this project, or no one has joined yet.</p>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Designation Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={designationRole}
                  onChange={(e) => setDesignationRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {Object.values(DesignationRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">This role applies to all selected members.</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Select org members to add ({availableMembers.length} available):
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {availableMembers.map(member => (
                    <label
                      key={member.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedUserIds.includes(member.id)
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(member.id)}
                        onChange={() => handleSelectMember(member.id)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{member.fullName}</p>
                        {member.displayName && (
                          <p className="text-sm text-gray-500">{member.displayName}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={loading || availableMembers.length === 0}
            className="flex-1 bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {loading ? 'Adding...' : `Add Selected (${selectedUserIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
