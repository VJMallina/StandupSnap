import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sprintsApi } from '../../services/api/sprints';
import { projectsApi } from '../../services/api/projects';
import { Sprint, SprintStatus } from '../../types/sprint';
import { Project } from '../../types/project';
import AppLayout from '../../components/AppLayout';
import Select from '../../components/ui/Select';

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
      const data = await sprintsApi.getAll({
        projectId: selectedProjectId || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined
      });
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
        return 'bg-teal-100 text-blue-800';
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
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 via-cyan-500 to-teal-600 rounded-2xl p-6 md:p-8 shadow-lg mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-cyan-100 text-sm font-medium mb-1">Planning</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Sprints</h1>
              <p className="text-cyan-100 mt-2 text-sm">Manage sprint cycles and iterations</p>
            </div>
            <button
              onClick={() => navigate('/sprints/new')}
              className="flex items-center px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Sprint
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          {/* Project Filter */}
          <div className="flex-1 min-w-[180px]">
            <Select
              label="Project"
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              placeholder="All Projects"
              options={[
                { value: '', label: 'All Projects' },
                ...projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                })),
              ]}
            />
          </div>

          {/* Status Filter */}
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Status"
              value={selectedStatus}
              onChange={(value) => setSelectedStatus(value as SprintStatus | '')}
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: SprintStatus.UPCOMING, label: 'Upcoming' },
                { value: SprintStatus.ACTIVE, label: 'Active' },
                { value: SprintStatus.COMPLETED, label: 'Completed' },
                { value: SprintStatus.CLOSED, label: 'Closed' },
              ]}
            />
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sprints..."
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm hover:border-gray-300 transition-colors"
            />
          </div>
        </div>
        <div className="mb-6">

          {hasActiveFilters && (
            <div className="mt-3">
              <button
                onClick={clearFilters}
                className="text-sm text-teal-600 hover:underline"
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
                      className="text-teal-600 hover:text-teal-900 mr-3"
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
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
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
