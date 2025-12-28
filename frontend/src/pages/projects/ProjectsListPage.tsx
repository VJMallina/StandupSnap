import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { projectsApi } from '../../services/api/projects';
import { Project } from '../../types/project';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../constants/roles';
import AppLayout from '../../components/AppLayout';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; projectId: string; projectName: string }>({
    isOpen: false,
    projectId: '',
    projectName: ''
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission} = usePermissions();

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  // Reset to page 1 when changing tabs or items per page
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, itemsPerPage]);

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
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <TableSkeleton rows={5} />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-sm flex items-start justify-between">
            <div>
              <h3 className="font-semibold mb-1">Error Loading Projects</h3>
              <p>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-sm font-semibold text-red-700 hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-700 rounded-xl p-4 md:p-5 shadow-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Projects</h1>
            </div>
            {canCreate && (
              <button
                onClick={() => navigate('/projects/new')}
                className="flex items-center px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl shadow-md hover:shadow-lg transition"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Project
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-fadeInUp" style={{animationDelay: '100ms'}}>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              {(['active', 'archived'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                    activeTab === tab
                      ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {tab === 'active' ? 'Active Projects' : 'Archived Projects'}
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === tab ? 'bg-white text-primary-700 border border-primary-200' : 'bg-white text-gray-700 border border-gray-200'
                  }`}>
                    {tab === 'active'
                      ? projects.filter((p) => !p.isArchived).length
                      : projects.filter((p) => p.isArchived).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} shown
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fadeInUp" style={{animationDelay: '200ms'}}>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16 px-6">
              <svg className="mx-auto h-14 w-14 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {activeTab === 'active' ? 'No active projects found' : 'No archived projects found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'active'
                  ? 'Get started by creating your first project'
                  : 'Archived projects will appear here'}
              </p>
              {canCreate && activeTab === 'active' && (
                <button
                  onClick={() => navigate('/projects/new')}
                  className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl shadow hover:shadow-md transition"
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
                <thead className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProjects.map((project) => (
                    <tr key={project.id} className="even:bg-gray-50/50 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-secondary-50/50 hover:shadow-md hover:border-l-4 hover:border-l-primary-500 transition-all duration-200">
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
                            className="text-primary-600 hover:text-primary-800 font-medium inline-flex items-center"
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
              {filteredProjects.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredProjects.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              )}
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
