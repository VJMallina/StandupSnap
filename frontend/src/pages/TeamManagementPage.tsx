import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TeamMember } from '../types/teamMember';
import { teamMembersApi } from '../services/api/teamMembers';
import { projectsApi } from '../services/api/projects';
import AddTeamMemberModal from '../components/team/AddTeamMemberModal';
import RemoveTeamMemberModal from '../components/team/RemoveTeamMemberModal';

export default function TeamManagementPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [isArchived, setIsArchived] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
      loadTeamMembers();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const project = await projectsApi.getById(projectId!);
      setProjectName(project.name);
      setIsArchived(project.isArchived);
    } catch (err: any) {
      console.error('Failed to load project:', err);
      setError('Failed to load project details');
    }
  };

  const loadTeamMembers = async () => {
    setLoading(true);
    setError(null);

    try {
      const members = await teamMembersApi.getProjectTeam(projectId!);
      setTeamMembers(members);
    } catch (err: any) {
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    loadTeamMembers();
  };

  const handleRemoveMember = (member: TeamMember) => {
    setSelectedMember(member);
    setIsRemoveModalOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!selectedMember) return;
    await teamMembersApi.removeFromProject(projectId!, selectedMember.id);
    setSelectedMember(null);
    loadTeamMembers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Management</h1>
              <p className="text-gray-600">
                {projectName}
                {isArchived && <span className="ml-2 text-sm text-orange-600 font-semibold">(Archived)</span>}
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={isArchived}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Team Member
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Team Members List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {teamMembers.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">No team members yet</p>
              <p className="text-gray-400 text-sm">Add team members to start building your project team</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Full Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Designation / Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Display Name</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{member.fullName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {member.designationRole}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {member.displayName ? (
                          <p className="text-gray-700">{member.displayName}</p>
                        ) : (
                          <p className="text-gray-400 italic">-</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={isArchived}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center ml-auto"
                        >
                          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Team Stats */}
        {teamMembers.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900 font-medium">
              Total Team Members: <span className="text-blue-700">{teamMembers.length}</span>
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddTeamMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
        projectId={projectId!}
      />

      <RemoveTeamMemberModal
        isOpen={isRemoveModalOpen}
        onClose={() => {
          setIsRemoveModalOpen(false);
          setSelectedMember(null);
        }}
        onConfirm={handleRemoveConfirm}
        member={selectedMember}
      />
    </div>
  );
}
