import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projectsApi } from '../../services/api/projects';
import { Project } from '../../types/project';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../constants/roles';
import AppLayout from '../../components/AppLayout';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; projectId: string; projectName: string }>({
    isOpen: false,
    projectId: '',
    projectName: ''
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission(Permission.CREATE_PROJECT);
  const canEdit = hasPermission(Permission.EDIT_PROJECT);
  const canDelete = hasPermission(Permission.DELETE_PROJECT);

  // Reload when page loads or when navigating back
  useEffect(() => {
    loadProjects();
  }, [location.key]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // Load all projects (both active and archived)
      const [activeData, archivedData] = await Promise.all([
        projectsApi.getAll(false),
        projectsApi.getAll(true)
      ]);
      setProjects([...activeData, ...archivedData]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on active tab
  const filteredProjects = projects.filter(p =>
    activeTab === 'archived' ? p.isArchived : !p.isArchived
  );

  const handleDelete = async () => {
    try {
      await projectsApi.delete(deleteModal.projectId);
      setDeleteModal({ isOpen: false, projectId: '', projectName: '' });
      loadProjects();
    } catch (err: any) {
      alert('Failed to delete project: ' + err.message);
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
            <p className="text-gray-600">Loading projects...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <h3 className="font-semibold mb-1">Error Loading Projects</h3>
            <p>{error}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 md:p-8 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-teal-100 text-sm font-medium mb-1">Management</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Projects</h1>
              <p className="text-teal-100 mt-2 text-sm">Manage and track all your projects</p>
            </div>
            {canCreate && (
              <button
                onClick={() => navigate('/projects/new')}
                className="flex items-center px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Project
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('active')}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                  activeTab === 'active'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active Projects
                <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === 'active'
                    ? 'bg-teal-100 text-teal-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {projects.filter(p => !p.isArchived).length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                  activeTab === 'archived'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Archived Projects
                <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === 'archived'
                    ? 'bg-teal-100 text-teal-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {projects.filter(p => p.isArchived).length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {activeTab === 'active' ? 'No active projects found' : 'No archived projects found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {activeTab === 'active'
                  ? 'Get started by creating your first project'
                  : 'Archived projects will appear here'}
              </p>
              {canCreate && activeTab === 'active' && (
                <button
                  onClick={() => navigate('/projects/new')}
                  className="inline-flex items-center px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Project
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{project.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 max-w-xs truncate">{project.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(project.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          project.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => navigate(`/projects/${project.id}`)}
                            className="text-teal-600 hover:text-teal-800 font-medium inline-flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                          {canEdit && !project.isArchived && (
                            <button
                              onClick={() => navigate(`/projects/${project.id}/edit`)}
                              className="text-green-600 hover:text-green-800 font-medium inline-flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, projectId: project.id, projectName: project.name })}
                              className="text-red-600 hover:text-red-800 font-medium inline-flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, projectId: '', projectName: '' })}
          onConfirm={handleDelete}
          title="Delete Project"
          message={`Are you sure you want to permanently delete "${deleteModal.projectName}"? This action cannot be undone and all associated data will be lost.`}
        />
      </div>
    </AppLayout>
  );
}
