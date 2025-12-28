import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { assumptionsApi } from '../services/api/assumptions';
import { teamMembersApi } from '../services/api/teamMembers';
import {
  Assumption,
  AssumptionFilters,
  CreateAssumptionInput,
  UpdateAssumptionInput,
  AssumptionStatus,
} from '../types/assumption';
import { TeamMember } from '../types/teamMember';
import { AssumptionFormModal } from '../components/assumptions/AssumptionFormModal';
import { AssumptionDetailPanel } from '../components/assumptions/AssumptionDetailPanel';
import { ArchiveAssumptionModal } from '../components/assumptions/ArchiveAssumptionModal';
import { TableSkeleton } from '../components/ui/SkeletonLoader';

const AssumptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();

  // State
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [archivedAssumptions, setArchivedAssumptions] = useState<Assumption[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<AssumptionFilters>({
    includeArchived: false,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<keyof Assumption | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('assumptionTableColumns');
    return saved ? JSON.parse(saved) : {
      id: true,
      title: true,
      status: true,
      owner: true,
      createdAt: true,
      updatedAt: true,
      actions: true,
    };
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Modals & Panels
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedAssumption, setSelectedAssumption] = useState<Assumption | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [showArchivedSection, setShowArchivedSection] = useState(false);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch assumptions and team members
  useEffect(() => {
    if (!selectedProjectId) {
      navigate('/artifacts');
      return;
    }

    fetchData();
  }, [selectedProjectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active assumptions
      const activeAssumptions = await assumptionsApi.getByProject(selectedProjectId!, {
        ...filters,
        search: searchQuery || undefined,
        includeArchived: false,
      });
      setAssumptions(activeAssumptions);

      // Fetch archived assumptions separately
      const archived = await assumptionsApi.getByProject(selectedProjectId!, {
        includeArchived: true,
      });
      setArchivedAssumptions(archived.filter((a) => a.isArchived));

      // Fetch team members for this project
      const members = await teamMembersApi.getProjectTeam(selectedProjectId!);
      const actualTeamMembers = members.filter(m => !m.id.startsWith('user-'));
      setTeamMembers(actualTeamMembers);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load assumptions');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleAddAssumption = () => {
    setFormMode('create');
    setSelectedAssumption(null);
    setIsFormModalOpen(true);
  };

  const handleEditAssumption = (assumption: Assumption) => {
    setFormMode('edit');
    setSelectedAssumption(assumption);
    setIsFormModalOpen(true);
    setIsDetailPanelOpen(false);
  };

  const handleViewAssumption = (assumption: Assumption) => {
    setSelectedAssumption(assumption);
    setIsDetailPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedAssumption(null);
  };

  const handleArchiveClick = (assumption: Assumption) => {
    setSelectedAssumption(assumption);
    setIsArchiveModalOpen(true);
  };

  const handleFormSubmit = async (data: CreateAssumptionInput | UpdateAssumptionInput) => {
    try {
      setIsSubmitting(true);

      if (formMode === 'create') {
        await assumptionsApi.create(data as CreateAssumptionInput);
      } else if (selectedAssumption) {
        await assumptionsApi.update(selectedAssumption.id, data as UpdateAssumptionInput);
      }

      setIsFormModalOpen(false);
      setSelectedAssumption(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save assumption');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!selectedAssumption) return;

    try {
      setIsSubmitting(true);
      await assumptionsApi.archive(selectedAssumption.id);
      setIsArchiveModalOpen(false);
      setSelectedAssumption(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to archive assumption');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await assumptionsApi.export(selectedProjectId!, 'csv', {
        ...filters,
        search: searchQuery || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assumptions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to export assumptions');
    }
  };

  const handleSort = (field: keyof Assumption) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleColumnVisibility = (column: string) => {
    const newColumns = { ...visibleColumns, [column]: !visibleColumns[column] };
    setVisibleColumns(newColumns);
    localStorage.setItem('assumptionTableColumns', JSON.stringify(newColumns));
  };

  // Sort assumptions
  const sortedAssumptions = React.useMemo(() => {
    if (!sortField) return assumptions;

    return [...assumptions].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (aVal < bVal) {
        comparison = -1;
      } else if (aVal > bVal) {
        comparison = 1;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [assumptions, sortField, sortDirection]);

  const getStatusBadgeColor = (status: AssumptionStatus) => {
    switch (status) {
      case AssumptionStatus.OPEN:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case AssumptionStatus.VALIDATED:
        return 'bg-green-50 text-green-700 border-green-200';
      case AssumptionStatus.INVALIDATED:
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!selectedProjectId) {
    return (
      <AppLayout>
        <ArtifactsNavigation />
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl">
            Please select a project from the Artifacts Hub to view assumptions.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ArtifactsNavigation />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assumptions</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage project assumptions and track their validation status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={handleAddAssumption}
              className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
            >
              + Add Assumption
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl flex items-start justify-between">
            <div>{error}</div>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 font-semibold">
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as AssumptionStatus || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value="">All</option>
                <option value={AssumptionStatus.OPEN}>Open</option>
                <option value={AssumptionStatus.VALIDATED}>Validated</option>
                <option value={AssumptionStatus.INVALIDATED}>Invalidated</option>
              </select>
            </div>

            {/* Owner Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Owner</label>
              <select
                value={filters.ownerId || ''}
                onChange={(e) => setFilters({ ...filters, ownerId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value="">All</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName || member.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Apply Filters Button */}
            <div className="flex items-end">
              <button
                onClick={fetchData}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Column Settings */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="text-sm text-gray-700 font-medium hover:text-gray-900"
            >
              {showColumnSettings ? '▼' : '▶'} Column Settings
            </button>
            {showColumnSettings && (
              <div className="mt-3 flex flex-wrap gap-3">
                {Object.keys(visibleColumns).map((column) => (
                  <label key={column} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={visibleColumns[column]}
                      onChange={() => toggleColumnVisibility(column)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="capitalize">{column.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <TableSkeleton rows={8} />
          ) : sortedAssumptions.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Assumptions Found</h3>
              <p className="text-gray-600 mb-6">Document project assumptions and track their validation status to reduce uncertainty.</p>
              <button
                onClick={handleAddAssumption}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-lg font-semibold shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Your First Assumption
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {visibleColumns.id && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('id')}>
                        ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    )}
                    {visibleColumns.title && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('title')}>
                        Title {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('status')}>
                        Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    )}
                    {visibleColumns.owner && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Owner
                      </th>
                    )}
                    {visibleColumns.createdAt && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('createdAt')}>
                        Created {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    )}
                    {visibleColumns.updatedAt && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('updatedAt')}>
                        Updated {sortField === 'updatedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    )}
                    {visibleColumns.actions && (
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedAssumptions.map((assumption) => (
                    <tr key={assumption.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewAssumption(assumption)}>
                      {visibleColumns.id && (
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                          {assumption.id.substring(0, 8)}
                        </td>
                      )}
                      {visibleColumns.title && (
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {assumption.title}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(assumption.status)}`}>
                            {assumption.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.owner && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {assumption.owner?.fullName || assumption.owner?.displayName || '-'}
                        </td>
                      )}
                      {visibleColumns.createdAt && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(assumption.createdAt)}
                        </td>
                      )}
                      {visibleColumns.updatedAt && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(assumption.updatedAt)}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-4 py-3 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {assumption.status === AssumptionStatus.OPEN && (
                              <button
                                onClick={() => handleEditAssumption(assumption)}
                                className="px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                            )}
                            {!assumption.isArchived && (
                              <button
                                onClick={() => handleArchiveClick(assumption)}
                                className="px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Archived Section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowArchivedSection(!showArchivedSection)}
            className="w-full px-4 py-3 flex items-center justify-between text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <span>Archived Assumptions ({archivedAssumptions.length})</span>
            <span className="text-gray-600">{showArchivedSection ? '▼' : '▶'}</span>
          </button>
          {showArchivedSection && (
            <div className="border-t border-gray-200 p-4">
              {archivedAssumptions.length === 0 ? (
                <p className="text-sm text-gray-600">No archived assumptions.</p>
              ) : (
                <div className="space-y-2">
                  {archivedAssumptions.map((assumption) => (
                    <div
                      key={assumption.id}
                      className="px-4 py-3 bg-gray-50 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-100"
                      onClick={() => handleViewAssumption(assumption)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{assumption.title}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Status: {assumption.status} • Archived on {formatDate(assumption.updatedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Modal */}
        <AssumptionFormModal
          isOpen={isFormModalOpen}
          mode={formMode}
          assumption={selectedAssumption}
          teamMembers={teamMembers}
          projectId={selectedProjectId!}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormModalOpen(false);
            setSelectedAssumption(null);
          }}
          isSubmitting={isSubmitting}
        />

        {/* Detail Panel */}
        <AssumptionDetailPanel
          isOpen={isDetailPanelOpen}
          assumption={selectedAssumption}
          onClose={handleCloseDetailPanel}
          onEdit={() => handleEditAssumption(selectedAssumption!)}
          onArchive={() => {
            setIsDetailPanelOpen(false);
            handleArchiveClick(selectedAssumption!);
          }}
        />

        {/* Archive Modal */}
        <ArchiveAssumptionModal
          isOpen={isArchiveModalOpen}
          assumption={selectedAssumption}
          onConfirm={handleArchiveConfirm}
          onCancel={() => {
            setIsArchiveModalOpen(false);
            setSelectedAssumption(null);
          }}
          isSubmitting={isSubmitting}
        />

      </div>
    </AppLayout>
  );
};

export default AssumptionsPage;
