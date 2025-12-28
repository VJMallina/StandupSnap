import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { projectsApi } from '../services/api/projects';
import { risksApi } from '../services/api/risks';
import { stakeholdersApi } from '../services/api/stakeholders';
import { changesApi } from '../services/api/changes';
import { assumptionsApi } from '../services/api/assumptions';
import { issuesApi } from '../services/api/issues';
import { decisionsApi } from '../services/api/decisions';
import { resourcesApi } from '../services/api/resources';
import { useProjectSelection } from '../context/ProjectSelectionContext';

interface Project {
  id: string;
  name: string;
}

interface ArtifactCounts {
  risks: number;
  stakeholders: number;
  changes: number;
  assumptions: number;
  issues: number;
  decisions: number;
  raci: number;
  resources: number;
}

const artifactTypes = [
  {
    key: 'raci',
    title: 'RACI Matrix',
    description: 'Clarify who is Responsible, Accountable, Consulted, and Informed for every deliverable.',
    badge: 'Active',
    color: 'from-primary-500 via-primary-600 to-secondary-600',
    href: '/artifacts/raci',
  },
  {
    key: 'risk-register',
    title: 'Risk Register',
    description: 'Log risks, impact, likelihood, owners, and mitigation plans.',
    badge: 'Active',
    color: 'from-primary-600 via-primary-700 to-secondary-600',
    href: '/artifacts/risks',
    disabled: false,
  },
  {
    key: 'stakeholder-register',
    title: 'Stakeholder Register',
    description: 'Manage stakeholders with Power-Interest Grid analysis and engagement strategies.',
    badge: 'Active',
    color: 'from-primary-500 via-primary-600 to-secondary-700',
    href: '/artifacts/stakeholders',
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
    description: 'Track risks, assumptions, issues, and decisions in one view.',
    badge: 'Active',
    color: 'from-secondary-600 via-secondary-700 to-primary-700',
    href: '/artifacts/raid-log',
    disabled: false,
  },
  {
    key: 'change-management',
    title: 'Change Management',
    description: 'Track and manage project changes with approval workflows and impact analysis.',
    badge: 'Active',
    color: 'from-secondary-600 via-secondary-700 to-primary-600',
    href: '/artifacts/changes',
    disabled: false,
  },
  {
    key: 'resource-tracker',
    title: 'Resource Tracker',
    description: 'Manage team capacity, workload allocation, and resource utilization with heatmap visualization.',
    badge: 'Active',
    color: 'from-secondary-600 to-primary-600',
    href: '/artifacts/resources',
    disabled: false,
  },
  {
    key: 'schedule-builder',
    title: 'Schedule Builder',
    description: 'MS Project-like Gantt chart with task hierarchy, dependencies, and resource assignment.',
    badge: 'Active',
    color: 'from-primary-600 via-secondary-600 to-primary-700',
    href: '/artifacts/schedule-builder',
    disabled: false,
  },
  {
    key: 'document-templates',
    title: 'Document Templates',
    description: 'Create project documents from standard templates (Charter, Budget, Lessons Learned, etc.).',
    badge: 'Active',
    color: 'from-secondary-500 via-primary-600 to-secondary-700',
    href: '/artifacts/documents',
    disabled: false,
  },
];

export default function ArtifactsHubPage() {
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [message, setMessage] = useState('');
  const [counts, setCounts] = useState<ArtifactCounts>({
    risks: 0,
    stakeholders: 0,
    changes: 0,
    assumptions: 0,
    issues: 0,
    decisions: 0,
    raci: 0,
    resources: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const data = await projectsApi.getAll(false);
        setProjects(data);

        // Auto-select first project if none is chosen or previously stored project is missing
        if (data.length > 0) {
          const hasSelected = selectedProjectId && data.some((p: Project) => p.id === selectedProjectId);
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

  useEffect(() => {
    const loadCounts = async () => {
      if (!selectedProjectId) {
        setCounts({
          risks: 0,
          stakeholders: 0,
          changes: 0,
          assumptions: 0,
          issues: 0,
          decisions: 0,
          raci: 0,
          resources: 0,
        });
        return;
      }

      try {
        setLoadingCounts(true);
        const [risks, stakeholders, changes, assumptions, issues, decisions, resources] = await Promise.allSettled([
          risksApi.getByProject(selectedProjectId, { includeArchived: false }),
          stakeholdersApi.getByProject(selectedProjectId, { includeArchived: false }),
          changesApi.getByProject(selectedProjectId, false),
          assumptionsApi.getByProject(selectedProjectId, { includeArchived: false }),
          issuesApi.getByProject(selectedProjectId, { includeArchived: false }),
          decisionsApi.getByProject(selectedProjectId, { includeArchived: false }),
          resourcesApi.getAll(selectedProjectId, false),
        ]);

        setCounts({
          risks: risks.status === 'fulfilled' ? risks.value.length : 0,
          stakeholders: stakeholders.status === 'fulfilled' ? stakeholders.value.length : 0,
          changes: changes.status === 'fulfilled' ? changes.value.length : 0,
          assumptions: assumptions.status === 'fulfilled' ? assumptions.value.length : 0,
          issues: issues.status === 'fulfilled' ? issues.value.length : 0,
          decisions: decisions.status === 'fulfilled' ? decisions.value.length : 0,
          raci: 0, // RACI matrices need separate API call
          resources: resources.status === 'fulfilled' ? resources.value.length : 0,
        });
      } catch (err) {
        console.error('Failed to load artifact counts', err);
      } finally {
        setLoadingCounts(false);
      }
    };

    loadCounts();
  }, [selectedProjectId]);

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

  const getBadgeText = (key: string): string => {
    if (key === 'decision-log') return 'Coming soon';
    if (!selectedProjectId || loadingCounts) return 'Active';

    const count = getArtifactCount(key);
    return count === 0 ? 'Not started' : 'Active';
  };

  const getBadgeColor = (key: string, count: number): string => {
    if (key === 'decision-log') return 'bg-gray-100 text-gray-500';
    if (!selectedProjectId || loadingCounts) return 'bg-primary-50 text-primary-700 border border-primary-100';
    if (count === 0) return 'bg-gray-100 text-gray-600';
    return 'bg-primary-50 text-primary-700 border border-primary-100';
  };

  const getArtifactCount = (key: string): number => {
    switch (key) {
      case 'risk-register':
        return counts.risks;
      case 'stakeholder-register':
        return counts.stakeholders;
      case 'change-management':
        return counts.changes;
      case 'raid':
        return counts.risks + counts.assumptions + counts.issues + counts.decisions;
      case 'raci':
        return counts.raci;
      case 'resource-tracker':
        return counts.resources;
      default:
        return 0;
    }
  };

  return (
    <AppLayout>
      <ArtifactsNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-700 rounded-xl p-4 md:p-5 shadow-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Artifacts Hub</h1>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 min-w-[250px]">
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full rounded-lg bg-white/90 text-slate-900 font-semibold px-3 py-2 outline-none focus:ring-2 focus:ring-white/50 border border-white/40"
                disabled={loadingProjects}
              >
                <option value="">-- Select a project --</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
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
                        : getBadgeColor(type.key, getArtifactCount(type.key))
                    }`}
                  >
                    {getBadgeText(type.key)}
                  </span>
                </div>
                <p className={`text-sm ${type.disabled ? 'text-gray-500' : 'text-gray-600'}`}>
                  {type.description}
                </p>
                {!type.disabled && (
                  <div className="inline-flex items-center text-sm font-semibold text-primary-700">
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
