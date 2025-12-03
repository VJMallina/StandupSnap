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
  const [filter, setFilter] = useState<StandaloneMomFilter>({
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

  const resetFilters = () => {
    setFilter({ projectId: filter.projectId });
  };

  const activeFilters = useMemo(
    () =>
      Boolean(
        filter.search ||
          filter.meetingType ||
          filter.sprintId ||
          filter.dateFrom ||
          filter.dateTo ||
          filter.createdBy ||
          filter.updatedBy,
      ),
    [filter],
  );

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
        <div className="max-w-7xl mx-auto p-8 space-y-8">
          <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-teal-600 uppercase tracking-wider">Meeting Minutes</span>
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">MOM Hub</h1>
              <p className="text-gray-600 text-base">Create, organize, and manage meeting minutes with AI assistance</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filter.projectId}
                onChange={(e) => onProjectChange(e.target.value)}
                className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 min-w-[220px] font-medium shadow-sm hover:border-teal-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => navigate('/mom/new')}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 font-bold"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                New MOM
              </button>
            </div>
          </header>

          <section className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="col-span-2 relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search across all fields..."
                  value={filter.search || ''}
                  onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-3 font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400 transition-all"
                />
              </div>
              <select value={filter.meetingType || ''} onChange={(e) => setFilter((prev) => ({ ...prev, meetingType: e.target.value as StandaloneMeetingType }))} className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all">
                <option value="">All Types</option>
                {meetingTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select value={filter.sprintId || ''} onChange={(e) => setFilter((prev) => ({ ...prev, sprintId: e.target.value || undefined }))} className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all">
                <option value="">All Sprints</option>
                {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
              </select>
              <input type="date" value={filter.dateFrom || ''} onChange={(e) => setFilter((prev) => ({ ...prev, dateFrom: e.target.value }))} className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" />
              <input type="date" value={filter.dateTo || ''} onChange={(e) => setFilter((prev) => ({ ...prev, dateTo: e.target.value }))} className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" />
              <input type="text" placeholder="Creator ID" value={filter.createdBy || ''} onChange={(e) => setFilter((prev) => ({ ...prev, createdBy: e.target.value || undefined }))} className="bg-white border-2 border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400 transition-all" />
              <input type="text" placeholder="Updater ID" value={filter.updatedBy || ''} onChange={(e) => setFilter((prev) => ({ ...prev, updatedBy: e.target.value || undefined }))} className="bg-white border-2 border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400 transition-all" />
              <div className="flex items-center gap-3">
                <button onClick={resetFilters} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all">Reset</button>
                {activeFilters && <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">Filtered</span>}
              </div>
            </div>
          </section>

          {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-xl p-4 shadow-lg font-medium">{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div></div>
          ) : moms.length === 0 ? (
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">{filter.search || activeFilters ? 'No MOMs match your filters' : 'No MOMs yet - Create your first one!'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {moms.map((mom) => (
                <article key={mom.id} className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl border-2 border-gray-100 hover:border-teal-300 transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => navigate(`/mom/${mom.id}`)} className="p-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <span className="inline-block px-3 py-1 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 text-xs font-bold uppercase tracking-wider rounded-full border border-teal-200">
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
    </AppLayout>
  );
}
