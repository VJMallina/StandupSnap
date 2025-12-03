import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { issuesApi } from '../services/api/issues';
import { teamMembersApi } from '../services/api/teamMembers';
import {
  Issue,
  IssueFilters,
  CreateIssueInput,
  UpdateIssueInput,
  IssueStatus,
  IssueSeverity,
} from '../types/issue';
import { TeamMember } from '../types/teamMember';
import { IssueFormModal } from '../components/issues/IssueFormModal';
import { IssueDetailPanel } from '../components/issues/IssueDetailPanel';
import { ArchiveIssueModal } from '../components/issues/ArchiveIssueModal';

const IssuesPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();

  // State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [archivedIssues, setArchivedIssues] = useState<Issue[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<IssueFilters>({
    includeArchived: false,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<keyof Issue | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('issueTableColumns');
    return saved ? JSON.parse(saved) : {
      id: true,
      title: true,
      status: true,
      severity: true,
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
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [showArchivedSection, setShowArchivedSection] = useState(false);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch issues and team members
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

      // Fetch active issues
      const activeIssues = await issuesApi.getByProject(selectedProjectId!, {
        ...filters,
        search: searchQuery || undefined,
        includeArchived: false,
      });
      setIssues(activeIssues);

      // Fetch archived issues separately
      const archived = await issuesApi.getByProject(selectedProjectId!, {
        includeArchived: true,
      });
      setArchivedIssues(archived.filter((i) => i.isArchived));

      // Fetch team members for this project
      const members = await teamMembersApi.getProjectTeam(selectedProjectId!);
      const actualTeamMembers = members.filter(m => !m.id.startsWith('user-'));
      setTeamMembers(actualTeamMembers);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleAddIssue = () => {
    setFormMode('create');
    setSelectedIssue(null);
    setIsFormModalOpen(true);
  };

  const handleEditIssue = (issue: Issue) => {
    setFormMode('edit');
    setSelectedIssue(issue);
    setIsFormModalOpen(true);
    setIsDetailPanelOpen(false);
  };

  const handleViewIssue = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsDetailPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedIssue(null);
  };

  const handleArchiveClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsArchiveModalOpen(true);
  };

  const handleFormSubmit = async (data: CreateIssueInput | UpdateIssueInput) => {
    try {
      setIsSubmitting(true);

      if (formMode === 'create') {
        await issuesApi.create(data as CreateIssueInput);
      } else if (selectedIssue) {
        await issuesApi.update(selectedIssue.id, data as UpdateIssueInput);
      }

      setIsFormModalOpen(false);
      setSelectedIssue(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!selectedIssue) return;

    try {
      setIsSubmitting(true);
      await issuesApi.archive(selectedIssue.id);
      setIsArchiveModalOpen(false);
      setSelectedIssue(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to archive issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await issuesApi.export(selectedProjectId!, 'csv', {
        ...filters,
        search: searchQuery || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `issues-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to export issues');
    }
  };

  const handleSort = (field: keyof Issue) => {
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
    localStorage.setItem('issueTableColumns', JSON.stringify(newColumns));
  };

  // Sort issues
  const sortedIssues = React.useMemo(() => {
    if (!sortField) return issues;

    return [...issues].sort((a, b) => {
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
  }, [issues, sortField, sortDirection]);

  const getStatusBadgeColor = (status: IssueStatus) => {
    switch (status) {
      case IssueStatus.OPEN:
        return 'bg-red-50 text-red-700 border-red-200';
      case IssueStatus.MITIGATED:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case IssueStatus.CLOSED:
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSeverityBadgeColor = (severity: IssueSeverity) => {
    switch (severity) {
      case IssueSeverity.CRITICAL:
        return 'bg-red-100 text-red-900 border-red-300';
      case IssueSeverity.HIGH:
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case IssueSeverity.MEDIUM:
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case IssueSeverity.LOW:
        return 'bg-yellow-100 text-yellow-900 border-yellow-300';
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
            Please select a project from the Artifacts Hub to view issues.
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
            <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track and manage project issues by severity and status
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
              onClick={handleAddIssue}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm"
            >
              + Add Issue
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as IssueStatus || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              >
                <option value="">All</option>
                <option value={IssueStatus.OPEN}>Open</option>
                <option value={IssueStatus.MITIGATED}>Mitigated</option>
                <option value={IssueStatus.CLOSED}>Closed</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Severity</label>
              <select
                value={filters.severity || ''}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value as IssueSeverity || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              >
                <option value="">All</option>
                <option value={IssueSeverity.CRITICAL}>Critical</option>
                <option value={IssueSeverity.HIGH}>High</option>
                <option value={IssueSeverity.MEDIUM}>Medium</option>
                <option value={IssueSeverity.LOW}>Low</option>
              </select>
            </div>

            {/* Owner Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Owner</label>
              <select
                value={filters.ownerId || ''}
                onChange={(e) => setFilters({ ...filters, ownerId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
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
                className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
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
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
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
            <div className="p-8 text-center text-gray-600">Loading issues...</div>
          ) : sortedIssues.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No issues found. Click "Add Issue" to create one.
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
                    {visibleColumns.severity && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('severity')}>
                        Severity {sortField === 'severity' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                  {sortedIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewIssue(issue)}>
                      {visibleColumns.id && (
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                          {issue.id.substring(0, 8)}
                        </td>
                      )}
                      {visibleColumns.title && (
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {issue.title}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(issue.status)}`}>
                            {issue.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.severity && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getSeverityBadgeColor(issue.severity)}`}>
                            {issue.severity}
                          </span>
                        </td>
                      )}
                      {visibleColumns.owner && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {issue.owner?.fullName || issue.owner?.displayName || '-'}
                        </td>
                      )}
                      {visibleColumns.createdAt && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(issue.createdAt)}
                        </td>
                      )}
                      {visibleColumns.updatedAt && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(issue.updatedAt)}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-4 py-3 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {issue.status !== IssueStatus.CLOSED && (
                              <button
                                onClick={() => handleEditIssue(issue)}
                                className="px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                            )}
                            {!issue.isArchived && (
                              <button
                                onClick={() => handleArchiveClick(issue)}
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
            <span>Archived Issues ({archivedIssues.length})</span>
            <span className="text-gray-600">{showArchivedSection ? '▼' : '▶'}</span>
          </button>
          {showArchivedSection && (
            <div className="border-t border-gray-200 p-4">
              {archivedIssues.length === 0 ? (
                <p className="text-sm text-gray-600">No archived issues.</p>
              ) : (
                <div className="space-y-2">
                  {archivedIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="px-4 py-3 bg-gray-50 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-100"
                      onClick={() => handleViewIssue(issue)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{issue.title}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Status: {issue.status} • Severity: {issue.severity} • Archived on {formatDate(issue.updatedAt)}
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
        <IssueFormModal
          isOpen={isFormModalOpen}
          mode={formMode}
          issue={selectedIssue}
          teamMembers={teamMembers}
          projectId={selectedProjectId!}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormModalOpen(false);
            setSelectedIssue(null);
          }}
          isSubmitting={isSubmitting}
        />

        {/* Detail Panel */}
        <IssueDetailPanel
          isOpen={isDetailPanelOpen}
          issue={selectedIssue}
          onClose={handleCloseDetailPanel}
          onEdit={() => handleEditIssue(selectedIssue!)}
          onArchive={() => {
            setIsDetailPanelOpen(false);
            handleArchiveClick(selectedIssue!);
          }}
        />

        {/* Archive Modal */}
        <ArchiveIssueModal
          isOpen={isArchiveModalOpen}
          issue={selectedIssue}
          onConfirm={handleArchiveConfirm}
          onCancel={() => {
            setIsArchiveModalOpen(false);
            setSelectedIssue(null);
          }}
          isSubmitting={isSubmitting}
        />

      </div>
    </AppLayout>
  );
};

export default IssuesPage;
