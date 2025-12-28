import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { Select } from '../../components/ui/Select';
import { assigneesApi, AssigneeListItem } from '../../services/api/assignees';
import { projectsApi } from '../../services/api/projects';
import { sprintsApi } from '../../services/api/sprints';
import { Project } from '../../types/project';
import { Sprint } from '../../types/sprint';

export default function AssigneeListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [assignees, setAssignees] = useState<AssigneeListItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    searchParams.get('projectId') || '',
  );
  const [selectedSprintId, setSelectedSprintId] = useState<string>(
    searchParams.get('sprintId') || '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initial load - fetch all data in parallel
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load projects first
        const projectsData = await projectsApi.getAll(false);
        setProjects(projectsData);

        const projectId = selectedProjectId || (projectsData.length > 0 ? projectsData[0].id : '');

        if (projectId) {
          if (!selectedProjectId) setSelectedProjectId(projectId);

          // Load sprints and assignees in parallel
          const [sprintsData, assigneesData] = await Promise.all([
            sprintsApi.getAll({ projectId }),
            assigneesApi.getAll({ projectId })
          ]);

          const activeSprints = sprintsData.filter((s) => s.status === 'active');
          setSprints(activeSprints);
          setAssignees(assigneesData);

          if (activeSprints.length > 0 && !selectedSprintId) {
            setSelectedSprintId(activeSprints[0].id);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setInitialized(true);
      }
    };

    initialize();
  }, []);

  // When project changes (after init)
  useEffect(() => {
    if (!initialized) return;

    const loadProjectData = async () => {
      if (!selectedProjectId) {
        setSprints([]);
        setSelectedSprintId('');
        setAssignees([]);
        return;
      }

      setLoading(true);
      try {
        const [sprintsData, assigneesData] = await Promise.all([
          sprintsApi.getAll({ projectId: selectedProjectId }),
          assigneesApi.getAll({ projectId: selectedProjectId })
        ]);

        const activeSprints = sprintsData.filter((s) => s.status === 'active');
        setSprints(activeSprints);
        setAssignees(assigneesData);

        if (activeSprints.length > 0) {
          setSelectedSprintId(activeSprints[0].id);
        } else {
          setSelectedSprintId('');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [selectedProjectId, initialized]);

  // When only sprint changes (after init)
  useEffect(() => {
    if (!initialized || !selectedProjectId) return;

    // Skip if this is triggered by project change
    const loadSprintAssignees = async () => {
      setLoading(true);
      try {
        const data = await assigneesApi.getAll({
          projectId: selectedProjectId,
          sprintId: selectedSprintId || undefined,
        });
        setAssignees(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSprintAssignees();
  }, [selectedSprintId]);

  const loadAssignees = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await assigneesApi.getAll({
        projectId: selectedProjectId || undefined,
        sprintId: selectedSprintId || undefined,
      });

      setAssignees(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading assignees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSprintId('');
    if (projectId) {
      setSearchParams({ projectId });
    } else {
      setSearchParams({});
    }
  };

  const handleSprintChange = (sprintId: string) => {
    setSelectedSprintId(sprintId);
    const params: Record<string, string> = {};
    if (selectedProjectId) params.projectId = selectedProjectId;
    if (sprintId) params.sprintId = sprintId;
    setSearchParams(params);
  };

  const getRAGBadge = (rag: string | null) => {
    if (!rag)
      return {
        color: 'bg-gray-100 text-gray-500',
        label: 'No Status',
      };

    const configs = {
      red: { color: 'bg-red-100 text-red-800', label: 'RED' },
      amber: { color: 'bg-yellow-100 text-yellow-800', label: 'AMBER' },
      green: { color: 'bg-green-100 text-green-800', label: 'GREEN' },
    };

    return configs[rag as keyof typeof configs] || configs.green;
  };

  const showContentLoader = !initialized || (loading && assignees.length === 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-700 rounded-2xl p-4 md:p-5 shadow-lg mb-8">
          <p className="text-primary-100 text-sm font-medium mb-1">Team</p>
          <h1 className="text-2xl md:text-2xl font-bold text-white">Team Members</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-6">
          {/* Project Selector */}
          <div className="flex-1 min-w-[200px]">
            <Select
              label="Project"
              value={selectedProjectId}
              onChange={handleProjectChange}
              placeholder="Select a project..."
              options={[
                { value: '', label: 'Select a project...' },
                ...projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                })),
              ]}
            />
          </div>

          {/* Sprint Selector */}
          <div className="flex-1 min-w-[200px]">
            <Select
              label="Sprint"
              value={selectedSprintId}
              onChange={handleSprintChange}
              disabled={!selectedProjectId}
              placeholder={
                !selectedProjectId
                  ? 'Select a project first'
                  : sprints.length === 0
                    ? 'No active sprints'
                    : 'Select a sprint...'
              }
              options={[
                { value: '', label: !selectedProjectId ? 'Select a project first' : sprints.length === 0 ? 'No active sprints' : 'All Sprints' },
                ...sprints.map((sprint) => ({
                  value: sprint.id,
                  label: sprint.name,
                })),
              ]}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Assignees List */}
        {showContentLoader ? (
          <div className="flex justify-center items-center py-12">
            <svg
              className="animate-spin h-10 w-10 text-primary-600"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : assignees.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-gray-600 mb-4">No team members found</p>
            <p className="text-sm text-gray-500">
              Add team members to the project from Team Management
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignees.map((assignee) => {
              const ragBadge = getRAGBadge(assignee.assigneeRAG);

              return (
                <div
                  key={assignee.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden cursor-pointer"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (selectedProjectId) params.set('projectId', selectedProjectId);
                    if (selectedSprintId) params.set('sprintId', selectedSprintId);
                    navigate(`/assignees/${assignee.id}?${params.toString()}`);
                  }}
                >
                  <div className="p-6">
                    {/* Avatar/Initials */}
                    <div className="flex items-center mb-4">
                      <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg mr-3">
                        {assignee.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {assignee.fullName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {assignee.designationRole}
                        </p>
                      </div>
                    </div>

                    {/* Display Name */}
                    {assignee.displayName && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">@{assignee.displayName}</p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary-600">
                          {assignee.assignedCardsCount}
                        </p>
                        <p className="text-xs text-gray-500">
                          Assigned {assignee.assignedCardsCount === 1 ? 'Card' : 'Cards'}
                        </p>
                      </div>

                      <div className="text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${ragBadge.color}`}
                        >
                          {ragBadge.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">RAG Status</p>
                      </div>
                    </div>
                  </div>

                  {/* View Details Link */}
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <button className="text-sm font-medium text-primary-600 hover:text-primary-800">
                      View Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
