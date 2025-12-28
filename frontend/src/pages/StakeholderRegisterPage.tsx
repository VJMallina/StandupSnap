import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { stakeholdersApi } from '../services/api/stakeholders';
import { teamMembersApi } from '../services/api/teamMembers';
import {
  Stakeholder,
  StakeholderFilters,
  CreateStakeholderInput,
  UpdateStakeholderInput,
  PowerLevel,
  InterestLevel,
  StakeholderQuadrant,
} from '../types/stakeholder';
import { TeamMember } from '../types/teamMember';
import { StakeholderFormModal } from '../components/stakeholders/StakeholderFormModal';
import { StakeholderDetailPanel } from '../components/stakeholders/StakeholderDetailPanel';
import { ArchiveStakeholderModal } from '../components/stakeholders/ArchiveStakeholderModal';

const StakeholderRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();

  // State
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [archivedStakeholders, setArchivedStakeholders] = useState<Stakeholder[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<StakeholderFilters>({
    includeArchived: false,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<keyof Stakeholder | null>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('stakeholderTableColumns');
    return saved ? JSON.parse(saved) : {
      id: true,
      stakeholderName: true,
      role: true,
      powerLevel: true,
      interestLevel: true,
      quadrant: true,
      owner: true,
      updatedAt: true,
      actions: true,
    };
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Modals & Panels
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [showArchivedSection, setShowArchivedSection] = useState(false);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch stakeholders and team members
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

      // Fetch active stakeholders
      const activeStakeholders = await stakeholdersApi.getByProject(selectedProjectId!, {
        ...filters,
        search: searchQuery || undefined,
        includeArchived: false,
      });
      setStakeholders(activeStakeholders);

      // Fetch archived stakeholders separately
      const archived = await stakeholdersApi.getByProject(selectedProjectId!, {
        includeArchived: true,
      });
      setArchivedStakeholders(archived.filter((s) => s.isArchived));

      // Fetch team members for this project
      const members = await teamMembersApi.getProjectTeam(selectedProjectId!);
      const actualTeamMembers = members.filter(m => !m.id.startsWith('user-'));
      setTeamMembers(actualTeamMembers);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load stakeholders');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleAddStakeholder = () => {
    setFormMode('create');
    setSelectedStakeholder(null);
    setIsFormModalOpen(true);
  };

  const handleEditStakeholder = (stakeholder: Stakeholder) => {
    setFormMode('edit');
    setSelectedStakeholder(stakeholder);
    setIsFormModalOpen(true);
    setIsDetailPanelOpen(false);
  };

  const handleViewStakeholder = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setIsDetailPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedStakeholder(null);
  };

  const handleArchiveClick = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setIsArchiveModalOpen(true);
  };

  const handleFormSubmit = async (data: CreateStakeholderInput | UpdateStakeholderInput) => {
    try {
      setIsSubmitting(true);

      if (formMode === 'create') {
        await stakeholdersApi.create(data as CreateStakeholderInput);
      } else if (selectedStakeholder) {
        await stakeholdersApi.update(selectedStakeholder.id, data as UpdateStakeholderInput);
      }

      setIsFormModalOpen(false);
      setSelectedStakeholder(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save stakeholder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!selectedStakeholder) return;

    try {
      setIsSubmitting(true);
      await stakeholdersApi.archive(selectedStakeholder.id);
      setIsArchiveModalOpen(false);
      setSelectedStakeholder(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to archive stakeholder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await stakeholdersApi.export(selectedProjectId!, 'csv', {
        ...filters,
        search: searchQuery || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stakeholders-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to export stakeholders');
    }
  };

  const handleViewGrid = () => {
    navigate('/artifacts/stakeholders/grid');
  };

  const handleSort = (field: keyof Stakeholder) => {
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
    localStorage.setItem('stakeholderTableColumns', JSON.stringify(newColumns));
  };

  // Sort stakeholders
  const sortedStakeholders = React.useMemo(() => {
    if (!sortField) return stakeholders;

    return [...stakeholders].sort((a, b) => {
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
  }, [stakeholders, sortField, sortDirection]);

  const getQuadrantBadgeColor = (quadrant: StakeholderQuadrant) => {
    switch (quadrant) {
      case StakeholderQuadrant.MANAGE_CLOSELY:
        return 'bg-red-50 text-red-700 border-red-200';
      case StakeholderQuadrant.KEEP_SATISFIED:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case StakeholderQuadrant.KEEP_INFORMED:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case StakeholderQuadrant.MONITOR:
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getQuadrantLabel = (quadrant: StakeholderQuadrant) => {
    switch (quadrant) {
      case StakeholderQuadrant.MANAGE_CLOSELY:
        return 'Manage Closely';
      case StakeholderQuadrant.KEEP_SATISFIED:
        return 'Keep Satisfied';
      case StakeholderQuadrant.KEEP_INFORMED:
        return 'Keep Informed';
      case StakeholderQuadrant.MONITOR:
        return 'Monitor';
      default:
        return quadrant;
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
            Please select a project from the Artifacts Hub to view stakeholders.
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
            <h1 className="text-2xl font-bold text-gray-900">Stakeholder Register</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage project stakeholders and their power-interest relationships
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleViewGrid}
              className="px-4 py-2 border border-primary-300 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
            >
              View Power-Interest Grid
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={handleAddStakeholder}
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg text-sm font-semibold hover:from-primary-700 hover:to-secondary-700 transition-colors shadow-sm"
            >
              + Add Stakeholder
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
                placeholder="Search name, role, email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Power Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Power Level</label>
              <select
                value={filters.powerLevel || ''}
                onChange={(e) => setFilters({ ...filters, powerLevel: e.target.value as PowerLevel || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">All</option>
                <option value={PowerLevel.LOW}>Low</option>
                <option value={PowerLevel.MEDIUM}>Medium</option>
                <option value={PowerLevel.HIGH}>High</option>
              </select>
            </div>

            {/* Interest Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Interest Level</label>
              <select
                value={filters.interestLevel || ''}
                onChange={(e) => setFilters({ ...filters, interestLevel: e.target.value as InterestLevel || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">All</option>
                <option value={InterestLevel.LOW}>Low</option>
                <option value={InterestLevel.MEDIUM}>Medium</option>
                <option value={InterestLevel.HIGH}>High</option>
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
            <div className="p-8 text-center text-gray-600">Loading stakeholders...</div>
          ) : sortedStakeholders.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No stakeholders found. Click "Add Stakeholder" to create one.
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
                    {visibleColumns.stakeholderName && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('stakeholderName')}>
                        Stakeholder Name {sortField === 'stakeholderName' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    )}
                    {visibleColumns.role && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('role')}>
                        Role {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    )}
                    {visibleColumns.powerLevel && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('powerLevel')}>
                        Power {sortField === 'powerLevel' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    )}
                    {visibleColumns.interestLevel && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('interestLevel')}>
                        Interest {sortField === 'interestLevel' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    )}
                    {visibleColumns.quadrant && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Quadrant
                      </th>
                    )}
                    {visibleColumns.owner && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Owner
                      </th>
                    )}
                    {visibleColumns.updatedAt && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('updatedAt')}>
                        Last Updated {sortField === 'updatedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                  {sortedStakeholders.map((stakeholder) => (
                    <tr key={stakeholder.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewStakeholder(stakeholder)}>
                      {visibleColumns.id && (
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                          {stakeholder.id.substring(0, 8)}
                        </td>
                      )}
                      {visibleColumns.stakeholderName && (
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {stakeholder.stakeholderName}
                        </td>
                      )}
                      {visibleColumns.role && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {stakeholder.role}
                        </td>
                      )}
                      {visibleColumns.powerLevel && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            stakeholder.powerLevel === PowerLevel.HIGH ? 'bg-red-100 text-red-800' :
                            stakeholder.powerLevel === PowerLevel.MEDIUM ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {stakeholder.powerLevel}
                          </span>
                        </td>
                      )}
                      {visibleColumns.interestLevel && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            stakeholder.interestLevel === InterestLevel.HIGH ? 'bg-blue-100 text-blue-800' :
                            stakeholder.interestLevel === InterestLevel.MEDIUM ? 'bg-indigo-100 text-indigo-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {stakeholder.interestLevel}
                          </span>
                        </td>
                      )}
                      {visibleColumns.quadrant && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getQuadrantBadgeColor(stakeholder.quadrant)}`}>
                            {getQuadrantLabel(stakeholder.quadrant)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.owner && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {stakeholder.owner?.fullName || stakeholder.owner?.displayName || '-'}
                        </td>
                      )}
                      {visibleColumns.updatedAt && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(stakeholder.updatedAt)}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-4 py-3 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {!stakeholder.isArchived && (
                              <>
                                <button
                                  onClick={() => handleEditStakeholder(stakeholder)}
                                  className="px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleArchiveClick(stakeholder)}
                                  className="px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  Archive
                                </button>
                              </>
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
            <span>Archived Stakeholders ({archivedStakeholders.length})</span>
            <span className="text-gray-600">{showArchivedSection ? '▼' : '▶'}</span>
          </button>
          {showArchivedSection && (
            <div className="border-t border-gray-200 p-4">
              {archivedStakeholders.length === 0 ? (
                <p className="text-sm text-gray-600">No archived stakeholders.</p>
              ) : (
                <div className="space-y-2">
                  {archivedStakeholders.map((stakeholder) => (
                    <div
                      key={stakeholder.id}
                      className="px-4 py-3 bg-gray-50 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-100"
                      onClick={() => handleViewStakeholder(stakeholder)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{stakeholder.stakeholderName}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Role: {stakeholder.role} • {getQuadrantLabel(stakeholder.quadrant)} • Archived on {formatDate(stakeholder.updatedAt)}
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
        <StakeholderFormModal
          isOpen={isFormModalOpen}
          mode={formMode}
          stakeholder={selectedStakeholder}
          teamMembers={teamMembers}
          projectId={selectedProjectId!}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormModalOpen(false);
            setSelectedStakeholder(null);
          }}
          isSubmitting={isSubmitting}
        />

        {/* Detail Panel */}
        <StakeholderDetailPanel
          isOpen={isDetailPanelOpen}
          stakeholder={selectedStakeholder}
          onClose={handleCloseDetailPanel}
          onEdit={() => handleEditStakeholder(selectedStakeholder!)}
          onArchive={() => {
            setIsDetailPanelOpen(false);
            handleArchiveClick(selectedStakeholder!);
          }}
        />

        {/* Archive Modal */}
        <ArchiveStakeholderModal
          isOpen={isArchiveModalOpen}
          stakeholder={selectedStakeholder}
          onConfirm={handleArchiveConfirm}
          onCancel={() => {
            setIsArchiveModalOpen(false);
            setSelectedStakeholder(null);
          }}
          isSubmitting={isSubmitting}
        />
      </div>
    </AppLayout>
  );
};

export default StakeholderRegisterPage;
