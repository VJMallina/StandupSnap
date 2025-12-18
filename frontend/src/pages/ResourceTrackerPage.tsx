import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { resourcesApi, Resource, ResourceRole, ResourceRAGStatus, CapacitySummary } from '../services/api/resources';
import ResourceFormModal from '../components/resources/ResourceFormModal';
import ResourceHeatmap from '../components/resources/ResourceHeatmap';
import ResourceDetailPanel from '../components/resources/ResourceDetailPanel';
import WorkloadAssignmentModal from '../components/resources/WorkloadAssignmentModal';

export default function ResourceTrackerPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();

  const [resources, setResources] = useState<Resource[]>([]);
  const [archivedResources, setArchivedResources] = useState<Resource[]>([]);
  const [summary, setSummary] = useState<CapacitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showArchivedSection, setShowArchivedSection] = useState(false);
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);
  const [workloadResource, setWorkloadResource] = useState<Resource | null>(null);
  const [heatmapRefreshKey, setHeatmapRefreshKey] = useState(0);

  // Filters
  const [includeArchived, setIncludeArchived] = useState(false);
  const [filterRole, setFilterRole] = useState<ResourceRole | ''>('');
  const [filterName, setFilterName] = useState('');
  const [filterMinLoad, setFilterMinLoad] = useState<number | ''>('');
  const [filterMaxLoad, setFilterMaxLoad] = useState<number | ''>('');

  // Sorting
  const [sortField, setSortField] = useState<keyof Resource | ''>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!selectedProjectId) {
      navigate('/artifacts');
      return;
    }
    loadResources();
    loadSummary();
  }, [selectedProjectId]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const allData = await resourcesApi.getAll(selectedProjectId!, true);
      setResources(allData.filter(r => !r.isArchived));
      setArchivedResources(allData.filter(r => r.isArchived));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await resourcesApi.getCapacitySummary(selectedProjectId!);
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load summary:', err);
    }
  };

  const handleAddResource = () => {
    setEditingResource(null);
    setShowModal(true);
  };

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setShowModal(true);
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this resource?')) return;

    setLoading(true);
    try {
      await resourcesApi.archive(id);

      // Reload resources and summary in parallel for better performance
      const [allData, summaryData] = await Promise.all([
        resourcesApi.getAll(selectedProjectId!, true),
        resourcesApi.getCapacitySummary(selectedProjectId!)
      ]);

      setResources(allData.filter(r => !r.isArchived));
      setArchivedResources(allData.filter(r => r.isArchived));
      setSummary(summaryData);
    } catch (err: any) {
      alert('Failed to archive resource: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingResource(null);
  };

  const handleModalSuccess = async () => {
    setShowModal(false);
    setEditingResource(null);
    setLoading(true);

    try {
      // Reload resources and summary in parallel for better performance
      const [allData, summaryData] = await Promise.all([
        resourcesApi.getAll(selectedProjectId!, true),
        resourcesApi.getCapacitySummary(selectedProjectId!)
      ]);

      setResources(allData.filter(r => !r.isArchived));
      setArchivedResources(allData.filter(r => r.isArchived));
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!filterRole && !filterName && filterMinLoad === '' && filterMaxLoad === '') {
      loadResources();
      return;
    }

    const filters: any = {};
    if (filterRole) filters.role = filterRole;
    if (filterName) filters.name = filterName;
    if (filterMinLoad !== '') filters.minLoad = Number(filterMinLoad);
    if (filterMaxLoad !== '') filters.maxLoad = Number(filterMaxLoad);
    filters.isArchived = includeArchived;

    resourcesApi.filter(selectedProjectId!, filters)
      .then(setResources)
      .catch((err) => setError(err.message));
  };

  const clearFilters = () => {
    setFilterRole('');
    setFilterName('');
    setFilterMinLoad('');
    setFilterMaxLoad('');
    loadResources();
  };

  const handleViewResource = (resource: Resource) => {
    setSelectedResource(resource);
    setShowDetailPanel(true);
  };

  const handleDetailPanelClose = () => {
    setShowDetailPanel(false);
    setSelectedResource(null);
  };

  const handleDetailPanelEdit = (resource: Resource) => {
    setShowDetailPanel(false);
    setEditingResource(resource);
    setShowModal(true);
  };

  const handleManageWorkload = (resource: Resource) => {
    setWorkloadResource(resource);
    setShowWorkloadModal(true);
  };

  const handleWorkloadModalClose = () => {
    setShowWorkloadModal(false);
    setWorkloadResource(null);
  };

  const handleWorkloadModalSuccess = async () => {
    setShowWorkloadModal(false);
    setWorkloadResource(null);
    setLoading(true);

    try {
      // Reload resources and summary in parallel for better performance
      const [allData, summaryData] = await Promise.all([
        resourcesApi.getAll(selectedProjectId!, true),
        resourcesApi.getCapacitySummary(selectedProjectId!)
      ]);

      setResources(allData.filter(r => !r.isArchived));
      setArchivedResources(allData.filter(r => r.isArchived));
      setSummary(summaryData);

      // Trigger heatmap refresh by changing key
      setHeatmapRefreshKey(prev => prev + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Resource) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedResources = (resourceList: Resource[]) => {
    if (!sortField) return resourceList;

    return [...resourceList].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === undefined || bValue === undefined) return 0;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      // For MVP, we'll create a CSV export (Excel-compatible)
      if (format === 'excel') {
        const csvContent = generateCSV();
        downloadFile(csvContent, `Resources_${selectedProjectId}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      } else {
        alert('PDF export will be available in the next update!');
      }
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const generateCSV = () => {
    const headers = ['Name', 'Role', 'Skills', 'Availability (h)', 'Workload (h)', 'Load %', 'RAG Status', 'Notes'];
    const rows = resources.map(r => [
      r.name,
      r.role === ResourceRole.OTHER && r.customRoleName ? r.customRoleName : r.role,
      r.skills.join('; '),
      r.weeklyAvailability,
      r.weeklyWorkload,
      Number(r.loadPercentage).toFixed(1),
      r.ragStatus.toUpperCase(),
      r.notes || ''
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getRAGColor = (rag: ResourceRAGStatus) => {
    switch (rag) {
      case ResourceRAGStatus.GREEN:
        return 'bg-green-100 text-green-800';
      case ResourceRAGStatus.AMBER:
        return 'bg-amber-100 text-amber-800';
      case ResourceRAGStatus.RED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && resources.length === 0) {
    return (
      <AppLayout>
        <ArtifactsNavigation />
        <div className="flex justify-center items-center min-h-[60vh]">
          <p className="text-gray-500">Loading resources...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ArtifactsNavigation />

      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resource Tracker</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage team capacity and workload allocation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </button>
            <button
              onClick={handleAddResource}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Resource
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Dashboard Summary */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Total Resources</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalResources}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Underutilized</p>
              <p className="text-2xl font-bold text-green-600">{summary.underutilized}</p>
              <p className="text-xs text-gray-500 mt-1">&lt; 80% load</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Ideal Capacity</p>
              <p className="text-2xl font-bold text-amber-600">{summary.ideal}</p>
              <p className="text-xs text-gray-500 mt-1">80-100% load</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Overloaded</p>
              <p className="text-2xl font-bold text-red-600">{summary.overloaded}</p>
              <p className="text-xs text-gray-500 mt-1">&gt; 100% load</p>
            </div>
          </div>
        )}

        {/* Heatmap */}
        {selectedProjectId && (
          <ResourceHeatmap key={heatmapRefreshKey} projectId={selectedProjectId} />
        )}

        {/* Resource Register Table */}
        <div className="bg-white rounded-lg border border-gray-200 relative">
          {/* Loading overlay */}
          {loading && resources.length > 0 && (
            <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-3"></div>
                <p className="text-gray-600 font-medium">Updating resources...</p>
              </div>
            </div>
          )}

          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Resource Register</h2>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                Include Archived
              </label>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
              <input
                type="text"
                placeholder="Search by name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as ResourceRole | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Roles</option>
                {Object.values(ResourceRole).map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Min Load %"
                value={filterMinLoad}
                onChange={(e) => setFilterMinLoad(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max Load %"
                value={filterMaxLoad}
                onChange={(e) => setFilterMaxLoad(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {resources.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">No resources found</p>
                <button
                  onClick={handleAddResource}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Add Your First Resource
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortField === 'name' && (
                          <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('role')}
                      className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Role
                        {sortField === 'role' && (
                          <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
                    <th
                      onClick={() => handleSort('weeklyAvailability')}
                      className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Availability
                        {sortField === 'weeklyAvailability' && (
                          <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('weeklyWorkload')}
                      className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Workload
                        {sortField === 'weeklyWorkload' && (
                          <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('loadPercentage')}
                      className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Load %
                        {sortField === 'loadPercentage' && (
                          <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('ragStatus')}
                      className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1">
                        RAG
                        {sortField === 'ragStatus' && (
                          <svg className={`w-4 h-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedResources(resources).map((resource) => (
                    <tr
                      key={resource.id}
                      onClick={() => handleViewResource(resource)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{resource.name}</span>
                          {Number(resource.loadPercentage) < 30 && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded" title="Underutilized">
                              LOW
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {resource.role === ResourceRole.OTHER && resource.customRoleName
                          ? resource.customRoleName
                          : resource.role}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1">
                          {resource.skills.slice(0, 2).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                          {resource.skills.length > 2 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              +{resource.skills.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center text-sm text-gray-700">
                        {resource.weeklyAvailability}h
                      </td>
                      <td className="py-4 px-6 text-center text-sm text-gray-700">
                        {resource.weeklyWorkload}h
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-semibold text-gray-900">
                          {Number(resource.loadPercentage).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRAGColor(resource.ragStatus)}`}>
                          {resource.ragStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {resource.notes && (
                          <svg
                            className="w-5 h-5 text-blue-600 mx-auto"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            title={resource.notes}
                          >
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </td>
                      <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleManageWorkload(resource)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Manage Weekly Workload"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditResource(resource)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {!resource.isArchived && (
                            <button
                              onClick={() => handleArchive(resource.id)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Archive"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Archived Resources Section */}
        {archivedResources.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => setShowArchivedSection(!showArchivedSection)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${showArchivedSection ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Archived Resources</h3>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                  {archivedResources.length}
                </span>
              </div>
            </button>

            {showArchivedSection && (
              <div className="border-t border-gray-200 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
                      <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Availability</th>
                      <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Workload</th>
                      <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Load %</th>
                      <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">RAG</th>
                      <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                      <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {archivedResources.map((resource) => (
                      <tr
                        key={resource.id}
                        onClick={() => handleViewResource(resource)}
                        className="opacity-60 hover:opacity-100 hover:bg-gray-50 cursor-pointer transition-all"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{resource.name}</span>
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">Archived</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700">
                          {resource.role === ResourceRole.OTHER && resource.customRoleName
                            ? resource.customRoleName
                            : resource.role}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                            {resource.skills.slice(0, 2).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                            {resource.skills.length > 2 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                +{resource.skills.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center text-sm text-gray-700">
                          {resource.weeklyAvailability}h
                        </td>
                        <td className="py-4 px-6 text-center text-sm text-gray-700">
                          {resource.weeklyWorkload}h
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="font-semibold text-gray-900">
                            {Number(resource.loadPercentage).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRAGColor(resource.ragStatus)}`}>
                            {resource.ragStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {resource.notes && (
                            <svg
                              className="w-5 h-5 text-blue-600 mx-auto"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              title={resource.notes}
                            >
                              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleManageWorkload(resource)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Manage Weekly Workload"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEditResource(resource)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
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
        )}
      </div>

      {/* Resource Form Modal */}
      {showModal && selectedProjectId && (
        <ResourceFormModal
          projectId={selectedProjectId}
          resource={editingResource}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Resource Detail Panel */}
      {showDetailPanel && selectedResource && (
        <ResourceDetailPanel
          resource={selectedResource}
          onClose={handleDetailPanelClose}
          onEdit={handleDetailPanelEdit}
        />
      )}

      {/* Workload Assignment Modal */}
      {showWorkloadModal && workloadResource && (
        <WorkloadAssignmentModal
          resource={workloadResource}
          onClose={handleWorkloadModalClose}
          onSuccess={handleWorkloadModalSuccess}
        />
      )}
    </AppLayout>
  );
}
