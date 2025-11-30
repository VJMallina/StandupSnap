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
      <div className="p-6 space-y-5">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-teal-300 tracking-wider">Standalone MOM</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">Minutes of Meeting Hub</h1>
            <p className="text-sm text-gray-400">Search, filter, and craft MOMs for the selected project.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filter.projectId}
              onChange={(e) => onProjectChange(e.target.value)}
              className="bg-slate-900 text-white border border-slate-800 rounded-lg px-3 py-2 min-w-[200px]"
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
              className="bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-teal-700"
            >
              + Create MOM
            </button>
          </div>
        </header>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Search title, agenda, discussion, decisions, action items"
              value={filter.search || ''}
              onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
              className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2 col-span-2"
            />
            <select
              value={filter.meetingType || ''}
              onChange={(e) => setFilter((prev) => ({ ...prev, meetingType: e.target.value as StandaloneMeetingType }))}
              className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
            >
              <option value="">All meeting types</option>
              {meetingTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              value={filter.sprintId || ''}
              onChange={(e) => setFilter((prev) => ({ ...prev, sprintId: e.target.value || undefined }))}
              className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
            >
              <option value="">All sprints (optional)</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filter.dateFrom || ''}
              onChange={(e) => setFilter((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
            />
            <input
              type="date"
              value={filter.dateTo || ''}
              onChange={(e) => setFilter((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
            />
            <input
              type="text"
              placeholder="Creator ID (optional)"
              value={filter.createdBy || ''}
              onChange={(e) => setFilter((prev) => ({ ...prev, createdBy: e.target.value || undefined }))}
              className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
            />
            <input
              type="text"
              placeholder="Updated By ID (optional)"
              value={filter.updatedBy || ''}
              onChange={(e) => setFilter((prev) => ({ ...prev, updatedBy: e.target.value || undefined }))}
              className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
            />
            <div className="flex items-center gap-2 col-span-1 lg:col-span-4">
              <button
                onClick={resetFilters}
                className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-700"
              >
                Reset Filters
              </button>
              {activeFilters && <span className="text-xs text-teal-300 font-semibold">Filters active</span>}
            </div>
          </div>
        </section>

        {error && (
          <div className="text-red-300 text-sm bg-red-950/40 border border-red-700 rounded-lg p-3 shadow-sm">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-gray-300">Loading MOMs...</div>
        ) : moms.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-gray-400 text-center">
            {filter.search || activeFilters ? 'No MOMs found for selected filters.' : 'No MOMs created yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {moms.map((mom) => (
              <article
                key={mom.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-teal-500/60 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-teal-300">
                      {mom.customMeetingType || mom.meetingType}
                    </p>
                    <h3 className="text-lg font-semibold text-white line-clamp-2">{mom.title}</h3>
                    <p className="text-sm text-gray-400">Date: {mom.meetingDate}</p>
                    <p className="text-xs text-gray-500">Updated: {new Date(mom.updatedAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/mom/${mom.id}`)}
                    className="text-teal-300 hover:text-teal-100 text-sm font-semibold"
                  >
                    View
                  </button>
                </div>
                <div className="mt-3 text-sm text-gray-400 line-clamp-2">
                  {mom.agenda || mom.discussionSummary || 'No summary yet.'}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
