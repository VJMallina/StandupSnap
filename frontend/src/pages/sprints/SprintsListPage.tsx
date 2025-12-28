import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sprintsApi } from '../../services/api/sprints';
import { projectsApi } from '../../services/api/projects';
import { Sprint, SprintStatus } from '../../types/sprint';
import { Project } from '../../types/project';
import AppLayout from '../../components/AppLayout';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { FilterDrawer, FilterChip } from '../../components/ui';

export default function SprintsListPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<SprintStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [tempProjectId, setTempProjectId] = useState<string>('');
  const [tempStatus, setTempStatus] = useState<SprintStatus | ''>('');
  const [tempSearch, setTempSearch] = useState<string>('');
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
        return 'bg-primary-100 text-primary-800';
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

  // Pagination calculations
  const totalPages = Math.ceil(sprints.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSprints = sprints.slice(startIndex, endIndex);

  // Reset to page 1 when filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProjectId, selectedStatus, searchQuery, itemsPerPage]);

  // Sync tempFilters when drawer opens
  useEffect(() => {
    if (isFilterDrawerOpen) {
      setTempProjectId(selectedProjectId);
      setTempStatus(selectedStatus);
      setTempSearch(searchQuery);
    }
  }, [isFilterDrawerOpen, selectedProjectId, selectedStatus, searchQuery]);

  const applyFilters = () => {
    setSelectedProjectId(tempProjectId);
    setSelectedStatus(tempStatus);
    setSearchQuery(tempSearch);
  };

  const clearFilters = () => {
    setSelectedProjectId('');
    setSelectedStatus('');
    setSearchQuery('');
    setTempProjectId('');
    setTempStatus('');
    setTempSearch('');
  };

  const removeFilter = (filterType: 'project' | 'status' | 'search') => {
    if (filterType === 'project') {
      setSelectedProjectId('');
      setTempProjectId('');
    } else if (filterType === 'status') {
      setSelectedStatus('');
      setTempStatus('');
    } else if (filterType === 'search') {
      setSearchQuery('');
      setTempSearch('');
    }
  };

  const activeFilterCount = [selectedProjectId, selectedStatus, searchQuery].filter(Boolean).length;

  const getProjectName = (id: string) => {
    return projects.find(p => p.id === id)?.name || id;
  };

  if (loading && sprints.length === 0) {
    return (
      <AppLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <TableSkeleton rows={5} />
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
              <h1 className="text-2xl font-bold">Sprints</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFilterDrawerOpen(true)}
                className="relative px-5 py-2.5 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl hover:bg-white/30 transition-all font-semibold flex items-center gap-2 active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/sprints/new')}
                className="flex items-center px-5 py-2.5 bg-white text-primary-700 font-semibold rounded-xl shadow-md hover:shadow-lg transition active:scale-95"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Sprint
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl shadow-sm">
            <div className="flex items-start justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-sm font-semibold text-red-700 hover:text-red-900">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">Active filters:</span>
            {selectedProjectId && (
              <FilterChip label="Project" value={getProjectName(selectedProjectId)} onRemove={() => removeFilter('project')} />
            )}
            {selectedStatus && (
              <FilterChip label="Status" value={getStatusLabel(selectedStatus)} onRemove={() => removeFilter('status')} />
            )}
            {searchQuery && (
              <FilterChip label="Search" value={`"${searchQuery}"`} onRemove={() => removeFilter('search')} />
            )}
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-semibold underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-xs text-gray-500">
            Showing {sprints.length} sprint{sprints.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 shadow-sm">
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
              {paginatedSprints.map((sprint) => (
                <tr key={sprint.id} className="even:bg-gray-50/30 hover:bg-primary-50/50 hover:shadow-md hover:translate-x-1 hover:border-l-4 hover:border-l-primary-500 transition-all duration-200 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{sprint.name}</div>
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
                      className="text-primary-700 hover:text-primary-900 font-semibold mr-3"
                    >
                      View
                    </button>
                    {!sprint.isClosed && (
                      <button
                        onClick={() => handleDelete(sprint.id, sprint)}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {sprints.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sprints.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}

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
                {activeFilterCount > 0
                  ? 'Try adjusting your filters or search query.'
                  : 'Get started by creating a new sprint.'}
              </p>
              {activeFilterCount === 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/sprints/new')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Create Sprint
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        onApply={applyFilters}
        onReset={clearFilters}
        title="Filter Sprints"
      >
        {/* Project */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Project</label>
          <select
            value={tempProjectId}
            onChange={(e) => setTempProjectId(e.target.value)}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Status</label>
          <select
            value={tempStatus}
            onChange={(e) => setTempStatus(e.target.value as SprintStatus | '')}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="">All Statuses</option>
            <option value={SprintStatus.UPCOMING}>Upcoming</option>
            <option value={SprintStatus.ACTIVE}>Active</option>
            <option value={SprintStatus.COMPLETED}>Completed</option>
            <option value={SprintStatus.CLOSED}>Closed</option>
          </select>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Search</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search sprints..."
              value={tempSearch}
              onChange={(e) => setTempSearch(e.target.value)}
              className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 transition-all"
            />
          </div>
        </div>
      </FilterDrawer>
    </AppLayout>
  );
}
