import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { projectsApi } from '../services/api/projects';
import { sprintsApi } from '../services/api/sprints';
import { standaloneMomApi } from '../services/api/standaloneMom';
import { Project } from '../types/project';
import { Sprint } from '../types/sprint';
import { StandaloneMom, StandaloneMomFilter, StandaloneMeetingType } from '../types/standaloneMom';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { FilterDrawer } from '../components/ui';

const meetingTypes: StandaloneMeetingType[] = [
  'Planning', 'Grooming', 'Retrospective', 'Stakeholder Meeting', 'General Meeting', 'Other', 'Custom',
];

const TYPE_CONFIG: Record<string, { dot: string; badge: string; badgeText: string; accent: string }> = {
  'Planning':            { dot: 'bg-blue-500',    badge: 'bg-blue-50',    badgeText: 'text-blue-700',    accent: 'bg-blue-500' },
  'Grooming':            { dot: 'bg-violet-500',  badge: 'bg-violet-50',  badgeText: 'text-violet-700',  accent: 'bg-violet-500' },
  'Retrospective':       { dot: 'bg-orange-500',  badge: 'bg-orange-50',  badgeText: 'text-orange-700',  accent: 'bg-orange-500' },
  'Stakeholder Meeting': { dot: 'bg-emerald-500', badge: 'bg-emerald-50', badgeText: 'text-emerald-700', accent: 'bg-emerald-500' },
  'General Meeting':     { dot: 'bg-slate-400',   badge: 'bg-slate-50',   badgeText: 'text-slate-600',   accent: 'bg-slate-400' },
  'Custom':              { dot: 'bg-teal-500',    badge: 'bg-teal-50',    badgeText: 'text-teal-700',    accent: 'bg-teal-500' },
  'Other':               { dot: 'bg-teal-500',    badge: 'bg-teal-50',    badgeText: 'text-teal-700',    accent: 'bg-teal-500' },
};

const getTypeConfig = (type: string) =>
  TYPE_CONFIG[type] ?? { dot: 'bg-gray-400', badge: 'bg-gray-50', badgeText: 'text-gray-600', accent: 'bg-gray-400' };

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function StandaloneMomListPage() {
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [moms, setMoms] = useState<StandaloneMom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Inline controls — update filter directly
  const [searchValue, setSearchValue] = useState('');
  const [filter, setFilter] = useState<StandaloneMomFilter>({ projectId: selectedProjectId || '' });

  // Temp state for the advanced filter drawer
  const [tempFilter, setTempFilter] = useState<StandaloneMomFilter>({ projectId: selectedProjectId || '' });

  // Debounce search into filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter((prev) => ({ ...prev, search: searchValue || undefined }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setFilter((prev) => ({ ...prev, projectId: selectedProjectId }));
      loadSprints(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (filter.projectId) loadMoms();
  }, [filter]);

  useEffect(() => {
    if (isFilterDrawerOpen) setTempFilter(filter);
  }, [isFilterDrawerOpen, filter]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
      if (!selectedProjectId && data.length > 0) {
        setSelectedProjectId(data[0].id);
        setFilter((prev) => ({ ...prev, projectId: data[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    }
  };

  const loadSprints = async (projectId: string) => {
    try {
      const data = await sprintsApi.getAll({ projectId });
      setSprints(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load sprints');
    }
  };

  const loadMoms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await standaloneMomApi.list(filter);
      setMoms(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load MOMs');
    } finally {
      setLoading(false);
    }
  };

  const onProjectChange = (value: string) => {
    setSelectedProjectId(value);
    setFilter({ projectId: value });
    setSearchValue('');
    if (value) loadSprints(value);
  };

  const setTypeFilter = (type: StandaloneMeetingType | undefined) => {
    setFilter((prev) => ({ ...prev, meetingType: type }));
  };

  const applyAdvancedFilters = () => {
    setFilter((prev) => ({
      ...prev,
      sprintId: tempFilter.sprintId,
      dateFrom: tempFilter.dateFrom,
      dateTo: tempFilter.dateTo,
      createdBy: tempFilter.createdBy,
      updatedBy: tempFilter.updatedBy,
    }));
  };

  const resetAdvancedFilters = () => {
    const base = { projectId: filter.projectId, meetingType: filter.meetingType, search: filter.search };
    setFilter(base);
    setTempFilter(base);
  };

  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (filter.sprintId) count++;
    if (filter.dateFrom) count++;
    if (filter.dateTo) count++;
    if (filter.createdBy) count++;
    if (filter.updatedBy) count++;
    return count;
  }, [filter]);

  const hasAnyFilter = !!filter.meetingType || !!searchValue || advancedFilterCount > 0;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meeting Minutes</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create and manage meeting records with AI assistance
            </p>
          </div>
          <button
            onClick={() => navigate('/mom/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all active:scale-95 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New MOM
          </button>
        </div>

        {/* Toolbar: project + search + filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filter.projectId}
            onChange={(e) => onProjectChange(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all min-w-[180px]"
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search meeting minutes..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder-gray-400"
            />
            {searchValue && (
              <button
                onClick={() => setSearchValue('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {advancedFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 bg-primary-600 text-white text-xs font-bold rounded-full">
                {advancedFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Type pill tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter(undefined)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              !filter.meetingType
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {meetingTypes.map((type) => {
            const cfg = getTypeConfig(type);
            const isActive = filter.meetingType === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(isActive ? undefined : type)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? `${cfg.badge} ${cfg.badgeText} ring-1 ring-inset ring-current`
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? cfg.dot : 'bg-gray-300'}`} />
                {type}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        {/* MOM list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-stretch bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="w-1 bg-gray-200 flex-shrink-0" />
                <div className="flex-1 px-5 py-4 space-y-2">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-5 w-2/3 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : moms.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {hasAnyFilter ? 'No MOMs match your filters' : 'No meeting minutes yet'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {hasAnyFilter
                ? 'Try adjusting or clearing your filters'
                : 'Start documenting your meetings with AI-powered assistance'}
            </p>
            {!hasAnyFilter && (
              <button
                onClick={() => navigate('/mom/new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First MOM
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {moms.map((mom) => {
              const cfg = getTypeConfig(mom.meetingType);
              const typeLabel = mom.customMeetingType || mom.meetingType;
              const previewText =
                mom.agenda || mom.discussionSummary || mom.decisions || mom.actionItems || '';

              return (
                <div
                  key={mom.id}
                  onClick={() => navigate(`/mom/${mom.id}`)}
                  className="group flex items-stretch bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer overflow-hidden"
                >
                  {/* Left accent bar */}
                  <div className={`w-1 flex-shrink-0 ${cfg.accent}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${cfg.badge} ${cfg.badgeText}`}>
                          {typeLabel}
                        </span>
                        {mom.archived && (
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-amber-50 text-amber-700">
                            Archived
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{mom.title}</h3>
                      {previewText && (
                        <p className="text-xs text-gray-500 truncate">{previewText}</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="hidden sm:flex flex-col items-end gap-0.5 text-xs text-gray-400 flex-shrink-0">
                      {mom.project && <span className="font-medium text-gray-500">{mom.project.name}</span>}
                      <span>{formatDate(mom.meetingDate)}</span>
                    </div>
                  </div>

                  {/* Hover actions */}
                  <div
                    className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!mom.archived && (
                      <button
                        onClick={() => navigate(`/mom/${mom.id}/edit`)}
                        title="Edit"
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/mom/${mom.id}`)}
                      title="View"
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced filter drawer — sprint, date range, created/updated by */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        onApply={applyAdvancedFilters}
        onReset={resetAdvancedFilters}
        title="Advanced Filters"
      >
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Sprint</label>
          <select
            value={tempFilter.sprintId || ''}
            onChange={(e) => setTempFilter((prev) => ({ ...prev, sprintId: e.target.value || undefined }))}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="">All Sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Date Range</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={tempFilter.dateFrom || ''}
              onChange={(e) => setTempFilter((prev) => ({ ...prev, dateFrom: e.target.value || undefined }))}
              className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-3 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
            <input
              type="date"
              value={tempFilter.dateTo || ''}
              onChange={(e) => setTempFilter((prev) => ({ ...prev, dateTo: e.target.value || undefined }))}
              className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-3 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Advanced</h3>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Created By (ID)</label>
            <input
              type="text"
              placeholder="Enter creator ID"
              value={tempFilter.createdBy || ''}
              onChange={(e) => setTempFilter((prev) => ({ ...prev, createdBy: e.target.value || undefined }))}
              className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Updated By (ID)</label>
            <input
              type="text"
              placeholder="Enter updater ID"
              value={tempFilter.updatedBy || ''}
              onChange={(e) => setTempFilter((prev) => ({ ...prev, updatedBy: e.target.value || undefined }))}
              className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 transition-all"
            />
          </div>
        </div>
      </FilterDrawer>
    </AppLayout>
  );
}
