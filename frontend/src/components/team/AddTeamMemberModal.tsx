import { useState, useEffect } from 'react';
import { TeamMember, CreateTeamMemberDto, DesignationRole } from '../../types/teamMember';
import { teamMembersApi } from '../../services/api/teamMembers';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

export default function AddTeamMemberModal({ isOpen, onClose, onSuccess, projectId }: AddTeamMemberModalProps) {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [availableMembers, setAvailableMembers] = useState<TeamMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating new member
  const [formData, setFormData] = useState<CreateTeamMemberDto>({
    fullName: '',
    designationRole: DesignationRole.DEVELOPER,
    displayName: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadAvailableMembers();
    }
  }, [isOpen, projectId]);

  const loadAvailableMembers = async () => {
    try {
      const members = await teamMembersApi.getAvailableForProject(projectId);
      setAvailableMembers(members);
      if (members.length === 0) {
        setMode('create');
      }
    } catch (err: any) {
      console.error('Failed to load available members:', err);
    }
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAddExisting = async () => {
    if (selectedMemberIds.length === 0) {
      setError('Please select at least one team member');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await teamMembersApi.addToProject(projectId, selectedMemberIds);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add team members');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newMember = await teamMembersApi.create(formData);
      await teamMembersApi.addToProject(projectId, [newMember.id]);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create team member');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('select');
    setSelectedMemberIds([]);
    setFormData({ fullName: '', designationRole: DesignationRole.DEVELOPER, displayName: '' });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Add Team Member</h2>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
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

          {availableMembers.length > 0 && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode('select')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  mode === 'select'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Select Existing
              </button>
              <button
                onClick={() => setMode('create')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  mode === 'create'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Create New
              </button>
            </div>
          )}

          {mode === 'select' && availableMembers.length > 0 ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Select one or more team members to add to this project:
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableMembers.map(member => (
                  <label
                    key={member.id}
                    className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      onChange={() => handleSelectMember(member.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{member.fullName}</p>
                      <p className="text-sm text-gray-600">{member.designationRole}</p>
                      {member.displayName && (
                        <p className="text-xs text-gray-500">aka {member.displayName}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {availableMembers.length === 0 && mode === 'create' && (
                <p className="text-sm text-gray-600 mb-4">
                  No existing team members available. Create a new team member profile:
                </p>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter nickname or display name"
                />
              </div>
            </div>
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
            onClick={mode === 'select' ? handleAddExisting : handleCreateNew}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {loading ? 'Adding...' : mode === 'select' ? `Add Selected (${selectedMemberIds.length})` : 'Create & Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
