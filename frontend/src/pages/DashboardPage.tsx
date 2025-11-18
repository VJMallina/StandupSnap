import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import {
  dashboardApi,
  DashboardData,
  ProjectSummary,
} from '../services/api/dashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [userProjects, setUserProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId || userProjects.length === 1) {
      loadDashboardData();
    }
  }, [selectedProjectId]);

  const loadUserProjects = async () => {
    try {
      setLoading(true);
      const projects = await dashboardApi.getUserProjects();
      setUserProjects(projects);

      // M11-UC02: Auto-select if only one project
      if (projects.length === 1) {
        setSelectedProjectId(projects[0].id);
      } else if (projects.length > 1) {
        // Check localStorage for last selected project
        const lastSelectedProjectId = localStorage.getItem(
          'lastSelectedProjectId',
        );
        if (
          lastSelectedProjectId &&
          projects.find((p) => p.id === lastSelectedProjectId)
        ) {
          setSelectedProjectId(lastSelectedProjectId);
        } else {
          setSelectedProjectId(projects[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const projectIdToUse = selectedProjectId || userProjects[0]?.id;
      const data = await dashboardApi.getDashboard(projectIdToUse);
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('lastSelectedProjectId', projectId);
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

  // M11-UC07: Empty State
  if (!loading && userProjects.length === 0) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <svg
              className="mx-auto h-16 w-16 text-yellow-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Projects Assigned
            </h2>
            <p className="text-gray-700 text-lg">
              You are not assigned to any projects yet. Please contact your
              Scrum Master to get assigned to a project.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading && !dashboardData) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center py-12">
          <svg
            className="animate-spin h-10 w-10 text-blue-600"
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
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {user?.name}! Here's an overview of your project.
          </p>
        </div>

        {/* M11-UC02: Project Selector (only show if multiple projects) */}
        {userProjects.length > 1 && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Project:
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {userProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Dashboard Widgets */}
        {dashboardData && (
          <div className="space-y-6">
            {/* M11-UC03: Sprint Health Widget */}
            {dashboardData.sprintHealth ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Sprint Health
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Sprint Name</p>
                    <p className="text-lg font-bold text-gray-900">
                      {dashboardData.sprintHealth.sprintName}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Progress</p>
                    <p className="text-lg font-bold text-blue-600">
                      Day {dashboardData.sprintHealth.currentDay} of{' '}
                      {dashboardData.sprintHealth.totalDays}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(dashboardData.sprintHealth.currentDay / dashboardData.sprintHealth.totalDays) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Sprint RAG</p>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-bold ${getRAGBadge(dashboardData.sprintHealth.sprintRAG).color}`}
                    >
                      {getRAGBadge(dashboardData.sprintHealth.sprintRAG).label}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      RAG Distribution
                    </p>
                    <div className="flex gap-3 text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                        <span className="font-semibold">
                          {dashboardData.sprintHealth.ragDistribution.green}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                        <span className="font-semibold">
                          {dashboardData.sprintHealth.ragDistribution.amber}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                        <span className="font-semibold">
                          {dashboardData.sprintHealth.ragDistribution.red}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Sprint Health
                </h2>
                <div className="text-center py-8 text-gray-500">
                  <p>No active sprint for this project</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* M11-UC04: Team/Assignee Summary Widget */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Team Summary
                  </h2>
                  <button
                    onClick={() => navigate('/assignees')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View All →
                  </button>
                </div>

                {dashboardData.teamSummary.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No team members assigned to this sprint</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.teamSummary.map((member) => {
                      const memberRAG = getRAGBadge(member.assigneeRAG);

                      return (
                        <div
                          key={member.id}
                          onClick={() =>
                            navigate(
                              `/assignees/${member.id}?sprintId=${dashboardData.sprintHealth?.sprintId}`,
                            )
                          }
                          className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                {member.fullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {member.fullName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {member.designationRole}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <p className="text-lg font-bold text-blue-600">
                                  {member.activeCardsCount}
                                </p>
                                <p className="text-xs text-gray-500">Cards</p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold ${memberRAG.color}`}
                              >
                                {memberRAG.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* M11-UC05: Daily Snap Summary Widget */}
              {dashboardData.dailySnapSummary && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Daily Snap Summary
                    </h2>
                    {dashboardData.dailySnapSummary.isLocked && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                        Locked
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">
                          Snaps Added Today
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {dashboardData.dailySnapSummary.snapsAddedToday}
                        </p>
                      </div>
                      <svg
                        className="h-10 w-10 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-gray-600">
                          Cards Pending Snaps
                        </p>
                        <p className="text-xl font-bold text-yellow-700">
                          {dashboardData.dailySnapSummary.cardsPendingSnaps}
                        </p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-xs text-gray-600">
                          Assignees Pending
                        </p>
                        <p className="text-xl font-bold text-orange-700">
                          {dashboardData.dailySnapSummary.assigneesPendingSnaps}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        navigate(
                          `/sprints/${dashboardData.sprintHealth?.sprintId}/snaps`,
                        )
                      }
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Go to Snap Management
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* M11-UC06: Daily Standup Summary Widget (only when snaps locked) */}
            {dashboardData.dailyStandupSummary.isVisible && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Daily Standup Summary
                  </h2>
                  <button
                    onClick={() =>
                      navigate(
                        `/sprints/${dashboardData.sprintHealth?.sprintId}/standup`,
                      )
                    }
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Full Summary →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">Done</p>
                    <p className="text-3xl font-bold text-green-700">
                      {dashboardData.dailyStandupSummary.doneCount}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">To-Do</p>
                    <p className="text-3xl font-bold text-blue-700">
                      {dashboardData.dailyStandupSummary.todoCount}
                    </p>
                  </div>

                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">Blockers</p>
                    <p className="text-3xl font-bold text-red-700">
                      {dashboardData.dailyStandupSummary.blockerCount}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2 text-center">
                      RAG Today
                    </p>
                    <div className="flex justify-center gap-3 text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                        <span className="font-semibold">
                          {
                            dashboardData.dailyStandupSummary.ragDistribution
                              .green
                          }
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                        <span className="font-semibold">
                          {
                            dashboardData.dailyStandupSummary.ragDistribution
                              .amber
                          }
                        </span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                        <span className="font-semibold">
                          {
                            dashboardData.dailyStandupSummary.ragDistribution
                              .red
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
