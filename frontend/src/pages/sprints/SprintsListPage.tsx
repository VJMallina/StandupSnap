import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sprintsApi } from '../../services/api/sprints';
import { projectsApi } from '../../services/api/projects';
import { Sprint, SprintStatus } from '../../types/sprint';
import { Project } from '../../types/project';
import AppLayout from '../../components/AppLayout';

export default function SprintsListPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<SprintStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadSprints();
  }, [selectedProjectId, selectedStatus, searchQuery]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadSprints = async () => {
    try {
      setLoading(true);
      const data = await sprintsApi.getAll(
        selectedProjectId || undefined,
        selectedStatus || undefined,
        searchQuery || undefined
      );
      setSprints(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, sprint: Sprint) => {
    if (!window.confirm(`Are you sure you want to delete "${sprint.name}"?`)) return;

    try {
      await sprintsApi.delete(id);
      loadSprints();
    } catch (err: any) {
      alert('Failed to delete sprint: ' + err.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Completed';
    if (days === 0) return 'Today';
    return `${days} day${days !== 1 ? 's' : ''} left`;
  };

  const getStatusBadgeColor = (status: SprintStatus) => {
    switch (status) {
      case SprintStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case SprintStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800';
      case SprintStatus.CLOSED:
        return 'bg-gray-100 text-gray-800';
      case SprintStatus.UPCOMING:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: SprintStatus) => {
    switch (status) {
      case SprintStatus.ACTIVE:
        return 'Active';
      case SprintStatus.COMPLETED:
        return 'Completed';
      case SprintStatus.CLOSED:
        return 'Closed';
      case SprintStatus.UPCOMING:
        return 'Upcoming';
      default:
        return status;
    }
  };

  const clearFilters = () => {
    setSelectedProjectId('');
    setSelectedStatus('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedProjectId || selectedStatus || searchQuery;

  if (loading && sprints.length === 0) {
    return (
      <AppLayout>
        <div className="p-6">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Sprints</h1>
          <button
            onClick={() => navigate('/sprints/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Sprint
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filters Section - M6-UC07 */}
        <div className="bg-white shadow rounded p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as SprintStatus | '')}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Statuses</option>
                <option value={SprintStatus.UPCOMING}>Upcoming</option>
                <option value={SprintStatus.ACTIVE}>Active</option>
                <option value={SprintStatus.COMPLETED}>Completed</option>
                <option value={SprintStatus.CLOSED}>Closed</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-2">Search by Name</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sprints..."
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3">
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Sprint List Table - M6-UC02 */}
        <div className="bg-white shadow rounded overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sprint Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start - End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sprints.map((sprint) => (
                <tr key={sprint.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{sprint.name}</div>
                        {sprint.goal && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {sprint.goal}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sprint.project.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(sprint.status)}`}>
                      {getStatusLabel(sprint.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sprint.status === SprintStatus.ACTIVE && getDaysRemaining(sprint.endDate)}
                    {sprint.status === SprintStatus.UPCOMING && 'Not started'}
                    {sprint.status === SprintStatus.COMPLETED && 'Completed'}
                    {sprint.status === SprintStatus.CLOSED && 'Closed'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {sprint.creationType === 'manual' ? 'Manual' : 'Auto'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => navigate(`/sprints/${sprint.id}`)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    {!sprint.isClosed && (
                      <button
                        onClick={() => handleDelete(sprint.id, sprint)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sprints.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sprints found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query.'
                  : 'Get started by creating a new sprint.'}
              </p>
              {!hasActiveFilters && (
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/sprints/new')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Sprint
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
