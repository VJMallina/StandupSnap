import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TeamMember } from '../types/teamMember';
import { teamMembersApi } from '../services/api/teamMembers';
import { projectsApi } from '../services/api/projects';
import { invitationsApi, Invitation } from '../services/api/invitations';
import { Project } from '../types/project';
import AddTeamMemberModal from '../components/team/AddTeamMemberModal';
import RemoveTeamMemberModal from '../components/team/RemoveTeamMemberModal';
import EditTeamMemberModal from '../components/team/EditTeamMemberModal';

export default function TeamManagementPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [isArchived, setIsArchived] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
      loadTeamMembers();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const [projectData, projectInvitations] = await Promise.all([
        projectsApi.getById(projectId!),
        invitationsApi.getAll(projectId!)
      ]);
      setProject(projectData);
      setProjectName(projectData.name);
      setIsArchived(projectData.isArchived);
      // Filter for pending invitations only
      setInvitations(projectInvitations.filter(inv => inv.status === 'pending'));
    } catch (err: any) {
      console.error('Failed to load project:', err);
      setError('Failed to load project details');
    }
  };

  const loadTeamMembers = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
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

  const handleAddSuccess = async () => {
    await loadTeamMembers(false);
  };

  const handleRemoveMember = (member: TeamMember) => {
    setSelectedMember(member);
    setIsRemoveModalOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    await loadTeamMembers(false);
  };

  const handleRemoveConfirm = async () => {
    if (!selectedMember) return;
    await teamMembersApi.removeFromProject(projectId!, selectedMember.id);
    setSelectedMember(null);
    setIsRemoveModalOpen(false);
    await loadTeamMembers(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate('/team')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Team
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 md:p-8 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Project Team</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Team Management</h1>
              <p className="text-emerald-100 mt-2 text-sm">
                {projectName}
                {isArchived && <span className="ml-2 px-2 py-0.5 bg-orange-500/20 rounded text-orange-200 text-xs font-semibold">Archived</span>}
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={isArchived}
              className="flex items-center px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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

        {/* Project Leads Section */}
        {project && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Leads</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Owner */}
              <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200">
                <div className="h-20 bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600"></div>
                <div className="relative px-6 pb-6">
                  {project.productOwner ? (
                    <>
                      <div className="-mt-10 mb-4">
                        <div className="w-20 h-20 rounded-xl bg-white shadow-lg flex items-center justify-center text-2xl font-bold text-teal-600 border-4 border-white">
                          {project.productOwner.name?.charAt(0) || '?'}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                            Product Owner
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse"></span>
                            Active
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{project.productOwner.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {project.productOwner.email}
                        </p>
                      </div>
                    </>
                  ) : (
                    (() => {
                      const poInvitation = invitations.find(inv => inv.assignedRole === 'product_owner');
                      return poInvitation ? (
                        <>
                          <div className="-mt-10 mb-4">
                            <div className="w-20 h-20 rounded-xl bg-white shadow-lg flex items-center justify-center border-4 border-white">
                              <svg className="w-10 h-10 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                                Product Owner
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse"></span>
                                Pending
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-amber-600">Invitation Sent</h3>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {poInvitation.email}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="-mt-10 mb-4">
                            <div className="w-20 h-20 rounded-xl bg-white shadow-lg flex items-center justify-center border-4 border-white">
                              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                                Product Owner
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                Unassigned
                              </span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-400">Not assigned yet</h3>
                            <p className="text-sm text-gray-400 mt-1">Invite someone to fill this role</p>
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* PMO */}
              <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200">
                <div className="h-20 bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-600"></div>
                <div className="relative px-6 pb-6">
                  {project.pmo ? (
                    <>
                      <div className="-mt-10 mb-4">
                        <div className="w-20 h-20 rounded-xl bg-white shadow-lg flex items-center justify-center text-2xl font-bold text-emerald-600 border-4 border-white">
                          {project.pmo.name?.charAt(0) || '?'}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            PMO
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse"></span>
                            Active
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{project.pmo.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center mt-1">
                          <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {project.pmo.email}
                        </p>
                      </div>
                    </>
                  ) : (
                    (() => {
                      const pmoInvitation = invitations.find(inv => inv.assignedRole === 'pmo');
                      return pmoInvitation ? (
                        <>
                          <div className="-mt-10 mb-4">
                            <div className="w-20 h-20 rounded-xl bg-white shadow-lg flex items-center justify-center border-4 border-white">
                              <svg className="w-10 h-10 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                PMO
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse"></span>
                                Pending
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-amber-600">Invitation Sent</h3>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {pmoInvitation.email}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="-mt-10 mb-4">
                            <div className="w-20 h-20 rounded-xl bg-white shadow-lg flex items-center justify-center border-4 border-white">
                              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                PMO
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                Unassigned
                              </span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-400">Not assigned yet</h3>
                            <p className="text-sm text-gray-400 mt-1">Invite someone to fill this role</p>
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
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
                <thead className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
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
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
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
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleEditMember(member)}
                            disabled={isArchived}
                            className="text-teal-600 hover:text-teal-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                          >
                            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member)}
                            disabled={isArchived}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                          >
                            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </div>
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
          <div className="mt-6 bg-teal-50 border border-teal-200 rounded-lg p-4">
            <p className="text-teal-900 font-medium">
              Total Team Members: <span className="text-teal-700">{teamMembers.length}</span>
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

      <EditTeamMemberModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedMember(null);
        }}
        onSuccess={handleEditSuccess}
        member={selectedMember}
      />
    </div>
  );
}
