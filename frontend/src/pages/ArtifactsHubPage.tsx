import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { projectsApi } from '../services/api/projects';
import { useProjectSelection } from '../context/ProjectSelectionContext';

interface Project {
  id: string;
  name: string;
}

const artifactTypes = [
  {
    key: 'raci',
    title: 'RACI Matrix',
    description: 'Clarify who is Responsible, Accountable, Consulted, and Informed for every deliverable.',
    badge: 'Active',
    color: 'from-slate-900 via-cyan-800 to-emerald-600',
    href: '/artifacts/raci',
  },
  {
    key: 'risk-register',
    title: 'Risk Register',
    description: 'Log risks, impact, likelihood, owners, and mitigation plans.',
    badge: 'Active',
    color: 'from-indigo-900 via-indigo-700 to-sky-600',
    href: '/artifacts/risks',
    disabled: false,
  },
  {
    key: 'decision-log',
    title: 'Decision Log',
    description: 'Capture context, options, outcomes, and owners for key decisions.',
    badge: 'Coming soon',
    color: 'from-amber-900 via-amber-700 to-orange-600',
    href: '#',
    disabled: true,
  },
  {
    key: 'raid',
    title: 'RAID Log',
    description: 'Track risks, assumptions, issues, and dependencies in one view.',
    badge: 'Coming soon',
    color: 'from-purple-900 via-purple-700 to-fuchsia-600',
    href: '#',
    disabled: true,
  },
];

export default function ArtifactsHubPage() {
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const data = await projectsApi.getAll(false);
        setProjects(data);

        // Auto-select first project if none is chosen or previously stored project is missing
        if (data.length > 0) {
          const hasSelected = selectedProjectId && data.some(p => p.id === selectedProjectId);
          if (!hasSelected) {
            setSelectedProjectId(data[0].id);
          }
        } else {
          setSelectedProjectId('');
        }
      } catch (err) {
        console.error('Failed to load projects', err);
        setMessage('Failed to load projects. Please refresh.');
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, [selectedProjectId, setSelectedProjectId]);

  const selectedProjectName = projects.find(p => p.id === selectedProjectId)?.name;

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setMessage('');
  };

  const handleOpen = (href: string, disabled?: boolean) => {
    if (disabled || href === '#') return;
    if (!selectedProjectId) {
      setMessage('Select a project to open artifacts.');
      return;
    }
    navigate(href);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-800 to-emerald-700 text-white shadow-2xl border border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_35%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.08),transparent_30%)]" />
          <div className="relative p-6 md:p-8 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold tracking-wide uppercase">
                  Artifacts
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold leading-tight">Project documentation, in one place</h1>
                  <p className="text-sm text-white/80 max-w-2xl">
                    Choose a project once and open any artifact workspace with the same context.
                  </p>
                </div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 w-full md:w-80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/80">Project</span>
                  {selectedProjectId && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/20 text-white font-semibold">
                      Selected
                    </span>
                  )}
                </div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full rounded-xl bg-white/90 text-slate-900 font-semibold px-3 py-2 outline-none focus:ring-2 focus:ring-teal-300 border border-white/40"
                  disabled={loadingProjects}
                >
                  <option value="">-- Select a project --</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {selectedProjectName && (
                  <p className="text-xs text-white/80 mt-2">Artifacts will open for <span className="font-semibold text-white">{selectedProjectName}</span>.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="flex items-start justify-between bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl shadow-sm">
            <div>{message}</div>
            <button onClick={() => setMessage('')} className="text-amber-700 hover:text-amber-900 font-semibold text-sm">Dismiss</button>
          </div>
        )}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {artifactTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => {
                handleOpen(type.href, type.disabled);
              }}
              disabled={type.disabled}
              className={`relative overflow-hidden rounded-2xl text-left border shadow-sm transition ${
                type.disabled
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'border-gray-100 bg-white hover:shadow-lg'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br opacity-10 ${type.color}`} />
              <div className="relative p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{type.title}</span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      type.disabled
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-teal-50 text-teal-700 border border-teal-100'
                    }`}
                  >
                    {type.badge}
                  </span>
                </div>
                <p className={`text-sm ${type.disabled ? 'text-gray-500' : 'text-gray-600'}`}>
                  {type.description}
                </p>
                {!type.disabled && (
                  <div className="inline-flex items-center text-sm font-semibold text-teal-700">
                    Open
                    <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
