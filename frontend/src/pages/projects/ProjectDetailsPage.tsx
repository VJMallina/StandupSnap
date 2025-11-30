import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { projectsApi } from '../../services/api/projects';
import { invitationsApi, Invitation } from '../../services/api/invitations';
import { Project } from '../../types/project';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../constants/roles';
import AppLayout from '../../components/AppLayout';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const [project, setProject] = useState<Project | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(true);
  const [isTeamExpanded, setIsTeamExpanded] = useState(true);

  const canEdit = hasPermission(Permission.EDIT_PROJECT);
  const canDelete = hasPermission(Permission.DELETE_PROJECT);

  // Reload project when id changes or when navigating back (location.key changes)
  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id, location.key]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const [data, projectInvitations] = await Promise.all([
        projectsApi.getById(id!),
        invitationsApi.getAll(id!)
      ]);
      setProject(data);
      // Filter for pending invitations only
      setInvitations(projectInvitations.filter(inv => inv.status === 'pending'));
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await projectsApi.delete(id!);
      setShowDeleteModal(false);
      navigate('/projects');
    } catch (err: any) {
      alert('Failed to delete project: ' + err.message);
    }
  };

  const handleArchive = async () => {
    try {
      if (project) {
        await projectsApi.archive(project.id);
        setProject({ ...project, isArchived: true, isActive: false });
        setShowArchiveModal(false);
        // Navigate back to projects list after successful archive
        setTimeout(() => {
          navigate('/projects');
        }, 1000);
      }
    } catch (err: any) {
      alert('Failed to archive project: ' + err.message);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-teal-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading project details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <h3 className="font-semibold mb-1">Error Loading Project</h3>
            <p>{error || 'Project not found'}</p>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 text-teal-600 hover:text-teal-800 font-medium"
          >
            ← Back to Projects
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <button
                onClick={() => navigate('/projects')}
                className="text-teal-600 hover:text-teal-800 font-medium mb-2 inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Projects
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            </div>
          <div className="flex flex-wrap md:flex-nowrap justify-end gap-2">
            <button
              onClick={() => navigate(`/projects/${id}/team`)}
              className="px-3 py-1.5 text-sm leading-tight bg-purple-600 text-white rounded-md hover:bg-purple-700 font-semibold transition-colors inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Manage Team
            </button>
            {canEdit && !project.isArchived && (
              <button
                onClick={() => navigate(`/projects/${id}/edit`)}
                className="px-3 py-1.5 text-sm leading-tight bg-teal-600 text-white rounded-md hover:bg-teal-700 font-semibold transition-colors inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Project
              </button>
            )}
            {canEdit && !project.isArchived && (
              <button
                onClick={() => setShowArchiveModal(true)}
                className="px-3 py-1.5 text-sm leading-tight bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-semibold transition-colors inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archive
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1.5 text-sm leading-tight bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold transition-colors inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div
            onClick={() => navigate(`/sprints?projectId=${id}`)}
            className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-teal-500 cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Sprints</p>
                <p className="text-3xl font-bold text-gray-900">{project.sprints?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate(`/cards?projectId=${id}`)}
            className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-green-500 cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Cards</p>
                <p className="text-3xl font-bold text-gray-900">{project.cards?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate(`/projects/${id}/team`)}
            className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-purple-500 cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Team Members</p>
                <p className="text-3xl font-bold text-gray-900">{project.teamMembers?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Project Details Card */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-6">
          <div
            className="px-8 py-6 bg-gradient-to-r from-teal-50 to-cyan-50 border-b cursor-pointer hover:from-teal-100 hover:to-cyan-100 transition-colors"
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">Project Information</h2>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isInfoExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                project.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {project.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {isInfoExpanded && (
          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Project Name</label>
                <p className="text-lg text-gray-900">{project.name}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Status</label>
                <p className="text-lg text-gray-900">{project.isActive ? 'Active' : 'Inactive'}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Start Date</label>
                <p className="text-lg text-gray-900">{new Date(project.startDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">End Date</label>
                <p className="text-lg text-gray-900">
                  {project.endDate
                    ? new Date(project.endDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Not set'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1">Description</label>
              <p className="text-gray-900 whitespace-pre-wrap">{project.description || 'No description provided'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Product Owner</label>
                {project.productOwner ? (
                  <>
                    <p className="text-lg text-gray-900">{project.productOwner.name}</p>
                    <p className="text-sm text-gray-600">{project.productOwner.email}</p>
                  </>
                ) : (
                  (() => {
                    const poInvitation = invitations.find(inv => inv.assignedRole === 'product_owner');
                    return poInvitation ? (
                      <>
                        <p className="text-lg text-yellow-600">Invited</p>
                        <p className="text-sm text-gray-600">{poInvitation.email}</p>
                      </>
                    ) : (
                      <p className="text-lg text-gray-900">Not assigned</p>
                    );
                  })()
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">PMO</label>
                {project.pmo ? (
                  <>
                    <p className="text-lg text-gray-900">{project.pmo.name}</p>
                    <p className="text-sm text-gray-600">{project.pmo.email}</p>
                  </>
                ) : (
                  (() => {
                    const pmoInvitation = invitations.find(inv => inv.assignedRole === 'pmo');
                    return pmoInvitation ? (
                      <>
                        <p className="text-lg text-yellow-600">Invited</p>
                        <p className="text-sm text-gray-600">{pmoInvitation.email}</p>
                      </>
                    ) : (
                      <p className="text-lg text-gray-900">Not assigned</p>
                    );
                  })()
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Created At</label>
                <p className="text-gray-900">{new Date(project.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-1">Last Updated</label>
                <p className="text-gray-900">{new Date(project.updatedAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Archived Badge */}
        {project.isArchived && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-yellow-900">Project Archived</h3>
                <p className="text-sm text-yellow-700">This project has been archived and is read-only.</p>
              </div>
            </div>
          </div>
        )}

        {/* Team Members Section */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div
            className="px-8 py-6 bg-gradient-to-r from-teal-50 to-cyan-50 border-b cursor-pointer hover:from-teal-100 hover:to-cyan-100 transition-colors"
            onClick={() => setIsTeamExpanded(!isTeamExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
                <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
                  {project.teamMembers?.length || 0}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isTeamExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          {isTeamExpanded && (
            <div className="px-8 py-6">
              {project.teamMembers && project.teamMembers.length > 0 ? (
                <div className="space-y-4">
                  {project.teamMembers.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-semibold mr-3">
                          {member.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{member.fullName}</p>
                          {member.displayName && (
                            <p className="text-xs text-gray-500">aka {member.displayName}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
                          {member.designationRole}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p>No team members assigned</p>
                  <button
                    onClick={() => navigate(`/projects/${id}/team`)}
                    className="mt-3 text-teal-600 hover:text-teal-800 font-medium"
                  >
                    Add Team Members
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Archive Confirmation Modal */}
        {showArchiveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center mb-4">
                <svg className="w-8 h-8 text-yellow-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900">Archive Project</h3>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to archive <strong>{project.name}</strong>?
                Archived projects cannot be edited but can still be viewed.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowArchiveModal(false)}
                  className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  className="px-6 py-2.5 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
                >
                  Archive Project
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Delete Project"
          message={`Are you sure you want to permanently delete "${project.name}"? This action cannot be undone and all associated data will be lost.`}
        />
      </div>
    </AppLayout>
  );
}
