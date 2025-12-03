import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { risksApi } from '../services/api/risks';
import { teamMembersApi } from '../services/api/teamMembers';
import {
  Risk,
  RiskFilters,
  CreateRiskInput,
  UpdateRiskInput,
  RiskStatus,
  RiskSeverity,
} from '../types/risk';
import { TeamMember } from '../types/teamMember';
import { SeverityBadge } from '../components/risks/SeverityBadge';
import { RiskFormModal } from '../components/risks/RiskFormModal';
import { RiskDetailPanel } from '../components/risks/RiskDetailPanel';
import { ArchiveRiskModal } from '../components/risks/ArchiveRiskModal';

const RisksPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();

  // State
  const [risks, setRisks] = useState<Risk[]>([]);
  const [archivedRisks, setArchivedRisks] = useState<Risk[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters - Default: exclude CLOSED and ARCHIVED risks
  const [filters, setFilters] = useState<RiskFilters>({
    includeArchived: false,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<keyof Risk | null>('riskScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('riskTableColumns');
    return saved ? JSON.parse(saved) : {
      id: true,
      title: true,
      category: true,
      probability: true,
      impactScore: true,
      riskScore: true,
      severity: true,
      owner: true,
      status: true,
      updatedAt: true,
      actions: true,
    };
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Modals & Panels
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [showArchivedSection, setShowArchivedSection] = useState(false); // Collapsed by default per RR-UC13

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch risks and team members
  useEffect(() => {
    if (!selectedProjectId) {
      navigate('/projects');
      return;
    }

    fetchData();
  }, [selectedProjectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active risks
      const activeRisks = await risksApi.getByProject(selectedProjectId!, {
        ...filters,
        search: searchQuery || undefined,
        includeArchived: false,
      });
      setRisks(activeRisks);

      // Fetch archived risks separately
      const archived = await risksApi.getByProject(selectedProjectId!, {
        includeArchived: true,
      });
      setArchivedRisks(archived.filter((r) => r.isArchived));

      // Fetch team members for this project
      const members = await teamMembersApi.getProjectTeam(selectedProjectId!);
      console.log('Fetched team members:', members);

      // Filter out user-based roles (PO, PMO, Scrum Master) since they can't be risk owners
      // Only keep actual team members (those without 'user-' prefix in their ID)
      const actualTeamMembers = members.filter(m => !m.id.startsWith('user-'));
      console.log('Filtered team members for risk ownership:', actualTeamMembers);
      setTeamMembers(actualTeamMembers);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load risks');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleAddRisk = () => {
    setFormMode('create');
    setSelectedRisk(null);
    setIsFormModalOpen(true);
  };

  const handleEditRisk = (risk: Risk) => {
    setFormMode('edit');
    setSelectedRisk(risk);
    setIsFormModalOpen(true);
    setIsDetailPanelOpen(false);
  };

  const handleViewRisk = (risk: Risk) => {
    setSelectedRisk(risk);
    setIsDetailPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedRisk(null);
  };

  const handleFormSubmit = async (data: CreateRiskInput | UpdateRiskInput) => {
    try {
      setIsSubmitting(true);

      if (formMode === 'create') {
        await risksApi.create(data as CreateRiskInput);
      } else if (selectedRisk) {
        await risksApi.update(selectedRisk.id, data as UpdateRiskInput);
      }

      setIsFormModalOpen(false);
      setSelectedRisk(null);
      await fetchData();
    } catch (err: any) {
      console.error('Error saving risk:', err);
      alert(err.message || 'Failed to save risk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveClick = (risk: Risk) => {
    setSelectedRisk(risk);
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!selectedRisk) return;

    try {
      setIsSubmitting(true);
      await risksApi.archive(selectedRisk.id);
      setIsArchiveModalOpen(false);
      setIsDetailPanelOpen(false);
      setSelectedRisk(null);
      await fetchData();
    } catch (err: any) {
      console.error('Error archiving risk:', err);
      alert(err.message || 'Failed to archive risk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilterChange = async (newFilters: Partial<RiskFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    try {
      const results = await risksApi.getByProject(selectedProjectId!, {
        ...updated,
        search: searchQuery || undefined,
        includeArchived: false,
      });
      setRisks(results);
    } catch (err: any) {
      console.error('Error filtering risks:', err);
    }
  };

  const handleClearFilters = async () => {
    const clearedFilters: RiskFilters = {
      includeArchived: false,
    };
    setFilters(clearedFilters);
    setSearchQuery('');

    try {
      const results = await risksApi.getByProject(selectedProjectId!, {
        includeArchived: false,
      });
      setRisks(results);
    } catch (err: any) {
      console.error('Error clearing filters:', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    try {
      const results = await risksApi.getByProject(selectedProjectId!, {
        ...filters,
        search: query || undefined,
        includeArchived: false,
      });
      setRisks(results);
    } catch (err: any) {
      console.error('Error searching risks:', err);
    }
  };

  const canArchive = (risk: Risk) => {
    return risk.status === 'MITIGATED' || risk.status === 'CLOSED';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSort = (field: keyof Risk) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default desc direction
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf' = 'csv') => {
    if (!selectedProjectId) return;

    try {
      const blob = await risksApi.export(selectedProjectId, format, filters);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `risks-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export risks');
    }
  };

  const handleColumnToggle = (column: string) => {
    const newVisibleColumns = { ...visibleColumns, [column]: !visibleColumns[column] };
    setVisibleColumns(newVisibleColumns);
    localStorage.setItem('riskTableColumns', JSON.stringify(newVisibleColumns));
  };

  const handleResetColumns = () => {
    const defaultColumns = {
      id: true,
      title: true,
      category: true,
      probability: true,
      impactScore: true,
      riskScore: true,
      severity: true,
      owner: true,
      status: true,
      updatedAt: true,
      actions: true,
    };
    setVisibleColumns(defaultColumns);
    localStorage.setItem('riskTableColumns', JSON.stringify(defaultColumns));
  };

  // Sort risks
  const sortedRisks = React.useMemo(() => {
    if (!sortField) return risks;

    return [...risks].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested owner field
      if (sortField === 'owner') {
        aValue = (a.owner?.displayName || a.owner?.fullName || '') as any;
        bValue = (b.owner?.displayName || b.owner?.fullName || '') as any;
      }

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [risks, sortField, sortDirection]);

  const SortIcon: React.FC<{ field: keyof Risk }> = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (!selectedProjectId) {
    return null;
  }

  return (
    <AppLayout>
      <ArtifactsNavigation />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Risk Register</h1>
            <p className="text-gray-600 mt-1">
              Manage and track project risks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
                title="Customize columns"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Columns
              </button>

              {showColumnSettings && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowColumnSettings(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Show/Hide Columns</h3>
                        <button
                          onClick={handleResetColumns}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    <div className="p-2 max-h-96 overflow-y-auto">
                      {[
                        { key: 'id', label: 'ID' },
                        { key: 'title', label: 'Title' },
                        { key: 'category', label: 'Category' },
                        { key: 'probability', label: 'Probability' },
                        { key: 'impactScore', label: 'Impact Score' },
                        { key: 'riskScore', label: 'Risk Score' },
                        { key: 'severity', label: 'Severity' },
                        { key: 'owner', label: 'Owner' },
                        { key: 'status', label: 'Status' },
                        { key: 'updatedAt', label: 'Last Updated' },
                        { key: 'actions', label: 'Actions' },
                      ].map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[col.key]}
                            onChange={() => handleColumnToggle(col.key)}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
              title="Export risks to CSV"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={handleAddRisk}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Risk
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
            <button
              onClick={handleClearFilters}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search risks..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  handleFilterChange({ status: e.target.value ? (e.target.value as RiskStatus) : undefined })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="MITIGATED">Mitigated</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <select
                value={filters.severity || ''}
                onChange={(e) =>
                  handleFilterChange({ severity: e.target.value ? (e.target.value as RiskSeverity) : undefined })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="VERY_HIGH">Very High</option>
              </select>
            </div>

            {/* Risk Owner Filter */}
            <div>
              <select
                value={filters.ownerId || ''}
                onChange={(e) =>
                  handleFilterChange({ ownerId: e.target.value || undefined })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Owners</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName || member.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Strategy Filter */}
            <div>
              <select
                value={filters.strategy || ''}
                onChange={(e) =>
                  handleFilterChange({ strategy: e.target.value as any || undefined })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Strategies</option>
                <option value="AVOID">Avoid</option>
                <option value="MITIGATE">Mitigate</option>
                <option value="ACCEPT">Accept</option>
                <option value="TRANSFER">Transfer</option>
                <option value="EXPLOIT">Exploit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading risks...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Active Risks Table */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {visibleColumns.id && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                    )}
                    {visibleColumns.title && (
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center gap-1">
                          Title
                          <SortIcon field="title" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.category && (
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center gap-1">
                          Category
                          <SortIcon field="category" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.probability && (
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('probability')}
                      >
                        <div className="flex items-center gap-1">
                          Probability
                          <SortIcon field="probability" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.impactScore && (
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('impactScore')}
                      >
                        <div className="flex items-center gap-1">
                          Impact
                          <SortIcon field="impactScore" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.riskScore && (
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('riskScore')}
                      >
                        <div className="flex items-center gap-1">
                          Risk Score
                          <SortIcon field="riskScore" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.severity && (
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('severity')}
                      >
                        <div className="flex items-center gap-1">
                          Severity
                          <SortIcon field="severity" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.owner && (
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('owner')}
                      >
                        <div className="flex items-center gap-1">
                          Owner
                          <SortIcon field="owner" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          Status
                          <SortIcon field="status" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.updatedAt && (
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('updatedAt')}
                      >
                        <div className="flex items-center gap-1">
                          Last Updated
                          <SortIcon field="updatedAt" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.actions && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedRisks.length === 0 ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-12 text-center text-gray-500">
                        No risks found. Click "Add Risk" to create one.
                      </td>
                    </tr>
                  ) : (
                    sortedRisks.map((risk) => (
                      <tr
                        key={risk.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {visibleColumns.id && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {risk.id.substring(0, 8)}
                          </td>
                        )}
                        {visibleColumns.title && (
                          <td
                            className="px-6 py-4 text-sm font-medium text-gray-900 cursor-pointer hover:text-teal-600"
                            onClick={() => handleViewRisk(risk)}
                          >
                            {risk.title}
                          </td>
                        )}
                        {visibleColumns.category && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {risk.category}
                          </td>
                        )}
                        {visibleColumns.probability && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className="capitalize">{risk.probability.toLowerCase().replace('_', ' ')}</span>
                          </td>
                        )}
                        {visibleColumns.impactScore && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {risk.impactScore}
                          </td>
                        )}
                        {visibleColumns.riskScore && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {risk.riskScore}
                          </td>
                        )}
                        {visibleColumns.severity && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <SeverityBadge severity={risk.severity} size="sm" />
                          </td>
                        )}
                        {visibleColumns.owner && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {risk.owner?.displayName || risk.owner?.fullName || 'Unassigned'}
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                risk.status === 'OPEN'
                                  ? 'bg-blue-100 text-blue-800'
                                  : risk.status === 'IN_PROGRESS'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : risk.status === 'MITIGATED'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {risk.status.replace('_', ' ')}
                            </span>
                          </td>
                        )}
                        {visibleColumns.updatedAt && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(risk.updatedAt)}
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditRisk(risk);
                                }}
                                className="text-teal-600 hover:text-teal-900"
                                title="Edit"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {canArchive(risk) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveClick(risk);
                                  }}
                                  className="text-amber-600 hover:text-amber-900"
                                  title="Archive"
                                >
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewRisk(risk);
                                }}
                                className="text-gray-600 hover:text-gray-900"
                                title="View Details"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Archived Risks Section */}
        {archivedRisks.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowArchivedSection(!showArchivedSection)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4"
            >
              <svg
                className={`h-5 w-5 transition-transform ${showArchivedSection ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-semibold">Archived Risks ({archivedRisks.length})</span>
            </button>

            {showArchivedSection && (
              <div className="bg-gray-50 rounded-lg shadow overflow-hidden opacity-75">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          Severity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          Archived Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-50 divide-y divide-gray-200">
                      {archivedRisks.map((risk) => (
                        <tr
                          key={risk.id}
                          onClick={() => handleViewRisk(risk)}
                          className="hover:bg-gray-100 cursor-pointer transition-colors italic text-gray-600"
                        >
                          <td className="px-6 py-4 text-sm">{risk.title}</td>
                          <td className="px-6 py-4 text-sm">{risk.category}</td>
                          <td className="px-6 py-4">
                            <SeverityBadge severity={risk.severity} size="sm" />
                          </td>
                          <td className="px-6 py-4 text-sm">{risk.status}</td>
                          <td className="px-6 py-4 text-sm">{formatDate(risk.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals & Panels */}
      <RiskFormModal
        isOpen={isFormModalOpen}
        mode={formMode}
        risk={selectedRisk}
        projectId={selectedProjectId}
        teamMembers={teamMembers}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedRisk(null);
        }}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />

      <RiskDetailPanel
        isOpen={isDetailPanelOpen}
        risk={selectedRisk}
        onClose={handleCloseDetailPanel}
        onEdit={() => handleEditRisk(selectedRisk!)}
        onArchive={() => handleArchiveClick(selectedRisk!)}
        canArchive={selectedRisk ? canArchive(selectedRisk) : false}
      />

      <ArchiveRiskModal
        isOpen={isArchiveModalOpen}
        risk={selectedRisk}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={handleConfirmArchive}
        isLoading={isSubmitting}
      />
    </AppLayout>
  );
};

export default RisksPage;
