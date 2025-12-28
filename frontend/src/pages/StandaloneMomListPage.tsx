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
import { FilterDrawer, FilterChip } from '../components/ui';

const meetingTypes: StandaloneMeetingType[] = [
  'Planning',
  'Grooming',
  'Retrospective',
  'Stakeholder Meeting',
  'General Meeting',
  'Other',
  'Custom',
];

export default function StandaloneMomListPage() {
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [moms, setMoms] = useState<StandaloneMom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<StandaloneMomFilter>({
    projectId: selectedProjectId || '',
  });
  const [tempFilter, setTempFilter] = useState<StandaloneMomFilter>({
    projectId: selectedProjectId || '',
  });

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
    if (filter.projectId) {
      loadMoms();
    }
  }, [filter]);

  // Sync tempFilter when drawer opens
  useEffect(() => {
    if (isFilterDrawerOpen) {
      setTempFilter(filter);
    }
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
    loadSprints(value);
  };

  const applyFilters = () => {
    setFilter(tempFilter);
  };

  const resetFilters = () => {
    const resetFilter = { projectId: filter.projectId };
    setFilter(resetFilter);
    setTempFilter(resetFilter);
  };

  const removeFilter = (key: keyof StandaloneMomFilter) => {
    const newFilter = { ...filter };
    delete newFilter[key];
    setFilter(newFilter);
    setTempFilter(newFilter);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.search) count++;
    if (filter.meetingType) count++;
    if (filter.sprintId) count++;
    if (filter.dateFrom) count++;
    if (filter.dateTo) count++;
    if (filter.createdBy) count++;
    if (filter.updatedBy) count++;
    return count;
  }, [filter]);

  const getFilterLabel = (key: string, value: any): string => {
    if (key === 'meetingType') return value;
    if (key === 'sprintId') {
      const sprint = sprints.find(s => s.id === value);
      return sprint ? sprint.name : value;
    }
    if (key === 'dateFrom') return `From: ${value}`;
    if (key === 'dateTo') return `To: ${value}`;
    if (key === 'createdBy') return `Creator: ${value}`;
    if (key === 'updatedBy') return `Updater: ${value}`;
    if (key === 'search') return `"${value}"`;
    return value;
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
        <div className="max-w-7xl mx-auto p-8 space-y-8">
          <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-primary-600 uppercase tracking-wider">Meeting Minutes</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">MOM Hub</h1>
              <p className="text-gray-600 text-base">Create, organize, and manage meeting minutes with AI assistance</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filter.projectId}
                onChange={(e) => onProjectChange(e.target.value)}
                className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 min-w-[220px] font-medium shadow-sm hover:border-primary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsFilterDrawerOpen(true)}
                className="relative px-5 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-primary-300 transition-all font-bold flex items-center gap-2 active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-gradient-to-br from-primary-600 to-secondary-600 text-white text-xs font-bold rounded-full shadow-lg">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/mom/new')}
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 font-bold active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                New MOM
              </button>
            </div>
          </header>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">Active filters:</span>
              {filter.search && (
                <FilterChip label="Search" value={filter.search} onRemove={() => removeFilter('search')} />
              )}
              {filter.meetingType && (
                <FilterChip label="Type" value={filter.meetingType} onRemove={() => removeFilter('meetingType')} />
              )}
              {filter.sprintId && (
                <FilterChip label="Sprint" value={getFilterLabel('sprintId', filter.sprintId)} onRemove={() => removeFilter('sprintId')} />
              )}
              {filter.dateFrom && (
                <FilterChip label="From" value={filter.dateFrom} onRemove={() => removeFilter('dateFrom')} />
              )}
              {filter.dateTo && (
                <FilterChip label="To" value={filter.dateTo} onRemove={() => removeFilter('dateTo')} />
              )}
              {filter.createdBy && (
                <FilterChip label="Creator" value={filter.createdBy} onRemove={() => removeFilter('createdBy')} />
              )}
              {filter.updatedBy && (
                <FilterChip label="Updater" value={filter.updatedBy} onRemove={() => removeFilter('updatedBy')} />
              )}
              <button
                onClick={resetFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-semibold underline"
              >
                Clear all
              </button>
            </div>
          )}

          {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-xl p-4 shadow-lg font-medium">{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div>
          ) : moms.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{activeFilterCount > 0 ? 'No MOMs Match Your Filters' : 'No Meeting Minutes Yet'}</h3>
              <p className="text-gray-600 mb-6">{activeFilterCount > 0 ? 'Try adjusting your search criteria or reset filters' : 'Start documenting your meetings with AI-powered assistance'}</p>
              {activeFilterCount === 0 && (
                <button onClick={() => navigate('/mom/new')} className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-bold active:scale-95">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First MOM
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {moms.map((mom) => (
                <article key={mom.id} className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl border-2 border-gray-100 hover:border-primary-300 transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => navigate(`/mom/${mom.id}`)} className="p-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <span className="inline-block px-3 py-1 bg-gradient-to-r from-primary-50 to-secondary-50 text-primary-700 text-xs font-bold uppercase tracking-wider rounded-full border border-primary-200">
                      {mom.customMeetingType || mom.meetingType}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2 leading-tight">{mom.title}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">{mom.meetingDate}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(mom.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{mom.agenda || mom.discussionSummary || 'No summary available'}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        title="Filter Meeting Minutes"
      >
        {/* Search */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Search</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search across all fields..."
              value={tempFilter.search || ''}
              onChange={(e) => setTempFilter((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 transition-all"
            />
          </div>
        </div>

        {/* Meeting Type */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Meeting Type</label>
          <select
            value={tempFilter.meetingType || ''}
            onChange={(e) => setTempFilter((prev) => ({ ...prev, meetingType: e.target.value as StandaloneMeetingType || undefined }))}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="">All Types</option>
            {meetingTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Sprint */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Sprint</label>
          <select
            value={tempFilter.sprintId || ''}
            onChange={(e) => setTempFilter((prev) => ({ ...prev, sprintId: e.target.value || undefined }))}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="">All Sprints</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Date Range</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={tempFilter.dateFrom || ''}
              onChange={(e) => setTempFilter((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="From"
            />
            <input
              type="date"
              value={tempFilter.dateTo || ''}
              onChange={(e) => setTempFilter((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="To"
            />
          </div>
        </div>

        {/* Advanced Filters */}
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
