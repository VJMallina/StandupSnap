import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Select from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import {
  dashboardApi,
  DashboardData,
  ProjectSummary,
} from '../services/api/dashboard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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

      if (projects.length === 1) {
        setSelectedProjectId(projects[0].id);
      } else if (projects.length > 1) {
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

  const getRAGConfig = (rag: string | null) => {
    if (!rag)
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        border: 'border-gray-200',
        dot: 'bg-gray-400',
        label: 'No Status',
      };

    const configs = {
      red: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        dot: 'bg-red-500',
        label: 'RED',
      },
      amber: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        label: 'AMBER',
      },
      green: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'GREEN',
      },
    };

    return configs[rag as keyof typeof configs] || configs.green;
  };

  // Empty State
  if (!loading && userProjects.length === 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-amber-600"
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
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              No Projects Assigned
            </h2>
            <p className="text-gray-600">
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
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 md:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-teal-100 text-sm font-medium mb-1">Snapboard</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Welcome back, {user?.name}
              </h1>
              <p className="text-teal-100 mt-2 text-sm">
                Here's what's happening with your projects today
              </p>
            </div>

            {/* Project Selector */}
            {userProjects.length > 1 && (
              <div className="min-w-[200px]">
                <Select
                  value={selectedProjectId}
                  onChange={handleProjectChange}
                  variant="dark"
                  options={userProjects.map((project) => ({
                    value: project.id,
                    label: project.name,
                  }))}
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Snap Corner</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/snaps')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 hover:from-teal-100 hover:to-cyan-100 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Add Snap</span>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 hover:from-violet-100 hover:to-purple-100 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">View Reports</span>
            </button>
            <button
              onClick={() => navigate('/cards')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 hover:from-amber-100 hover:to-orange-100 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">View Cards</span>
            </button>
            <button
              onClick={() => navigate('/standups')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 hover:from-emerald-100 hover:to-teal-100 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Standups</span>
            </button>
          </div>
        </div>

        {/* Dashboard Widgets */}
        {dashboardData && (
          <div className="space-y-6">
            {/* Sprint Progress Chart & Calendar Row */}
            {dashboardData.sprintHealth && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sprint Progress Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Sprint Progress</h2>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={Array.from({ length: dashboardData.sprintHealth.totalDays }, (_, i) => ({
                            day: i + 1,
                            progress: i < dashboardData.sprintHealth!.currentDay
                              ? Math.round(((i + 1) / dashboardData.sprintHealth!.totalDays) * 100)
                              : null,
                            ideal: Math.round(((i + 1) / dashboardData.sprintHealth!.totalDays) * 100),
                          }))}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                            domain={[0, 100]}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '8px',
                              border: 'none',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="ideal"
                            stroke="#e5e7eb"
                            fill="#f9fafb"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Ideal"
                          />
                          <Area
                            type="monotone"
                            dataKey="progress"
                            stroke="#0d9488"
                            fill="url(#progressGradient)"
                            strokeWidth={2}
                            name="Actual"
                          />
                          <defs>
                            <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Mini Calendar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Sprint Timeline</h2>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Start</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(dashboardData.sprintHealth.sprintStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${(dashboardData.sprintHealth.currentDay / dashboardData.sprintHealth.totalDays) * 100}%` }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">End</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(dashboardData.sprintHealth.sprintEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: dashboardData.sprintHealth.totalDays }, (_, i) => {
                        const dayNum = i + 1;
                        const isToday = dayNum === dashboardData.sprintHealth!.currentDay;
                        const isPast = dayNum < dashboardData.sprintHealth!.currentDay;
                        const isFuture = dayNum > dashboardData.sprintHealth!.currentDay;

                        return (
                          <div
                            key={i}
                            className={`
                              aspect-square rounded-lg flex items-center justify-center text-xs font-medium
                              ${isToday ? 'bg-teal-500 text-white ring-2 ring-teal-300' : ''}
                              ${isPast ? 'bg-teal-100 text-teal-700' : ''}
                              ${isFuture ? 'bg-gray-50 text-gray-400' : ''}
                            `}
                          >
                            {dayNum}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-teal-100"></div>
                        <span className="text-gray-600">Completed</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-teal-500"></div>
                        <span className="text-gray-600">Today</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-gray-50 border border-gray-200"></div>
                        <span className="text-gray-600">Remaining</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sprint Health Widget */}
            {dashboardData.sprintHealth ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Sprint Health</h2>
                        <p className="text-sm text-gray-500">{dashboardData.sprintHealth.sprintName}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg ${getRAGConfig(dashboardData.sprintHealth.sprintRAG).bg} ${getRAGConfig(dashboardData.sprintHealth.sprintRAG).border} border`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getRAGConfig(dashboardData.sprintHealth.sprintRAG).dot}`}></div>
                        <span className={`text-sm font-semibold ${getRAGConfig(dashboardData.sprintHealth.sprintRAG).text}`}>
                          {getRAGConfig(dashboardData.sprintHealth.sprintRAG).label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Progress */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Progress</span>
                        <span className="text-sm font-bold text-teal-600">
                          Day {dashboardData.sprintHealth.currentDay}/{dashboardData.sprintHealth.totalDays}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full transition-all duration-500"
                          style={{
                            width: `${(dashboardData.sprintHealth.currentDay / dashboardData.sprintHealth.totalDays) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Start</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(dashboardData.sprintHealth.sprintStartDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="w-8 h-0.5 bg-gray-200"></div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">End</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(dashboardData.sprintHealth.sprintEndDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* RAG Distribution */}
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-3">RAG Distribution</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                          <span className="text-sm font-bold text-gray-900">{dashboardData.sprintHealth.ragDistribution.green}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <span className="text-sm font-bold text-gray-900">{dashboardData.sprintHealth.ragDistribution.amber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-sm font-bold text-gray-900">{dashboardData.sprintHealth.ragDistribution.red}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-gray-500">No active sprint for this project</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Summary Widget */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Team Summary</h2>
                    </div>
                    <button
                      onClick={() => navigate('/assignees')}
                      className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      View All
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {dashboardData.teamSummary.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No team members assigned to this sprint</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dashboardData.teamSummary.map((member) => {
                        const ragConfig = getRAGConfig(member.assigneeRAG);

                        return (
                          <div
                            key={member.id}
                            onClick={() =>
                              navigate(
                                `/assignees/${member.id}?sprintId=${dashboardData.sprintHealth?.sprintId}`,
                              )
                            }
                            className="p-4 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/50 cursor-pointer transition-all duration-200 group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center text-teal-600 font-bold text-sm">
                                  {member.fullName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                                    {member.fullName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {member.designationRole}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-center">
                                  <p className="text-lg font-bold text-teal-600">
                                    {member.activeCardsCount}
                                  </p>
                                  <p className="text-xs text-gray-500">Cards</p>
                                </div>
                                <div className={`w-2.5 h-2.5 rounded-full ${ragConfig.dot}`}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Snap Summary Widget */}
              {dashboardData.dailySnapSummary && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Daily Snap Summary</h2>
                      </div>
                      {dashboardData.dailySnapSummary.isLocked && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100">
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-600">Locked</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Main Stat */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Snaps Added Today</p>
                          <p className="text-3xl font-bold text-teal-600">
                            {dashboardData.dailySnapSummary.snapsAddedToday}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                        <p className="text-xs text-gray-600 mb-1">Cards Pending</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {dashboardData.dailySnapSummary.cardsPendingSnaps}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                        <p className="text-xs text-gray-600 mb-1">Assignees Pending</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {dashboardData.dailySnapSummary.assigneesPendingSnaps}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/snaps')}
                      className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      Go to Snap Management
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Standup Summary Widget */}
            {dashboardData.dailyStandupSummary.isVisible && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Daily Standup Summary</h2>
                    </div>
                    <button
                      onClick={() => navigate('/snaps')}
                      className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      View Full Summary
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                      <p className="text-sm text-gray-600 mb-2">Done</p>
                      <p className="text-3xl font-bold text-emerald-600">
                        {dashboardData.dailyStandupSummary.doneCount}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 text-center">
                      <p className="text-sm text-gray-600 mb-2">To-Do</p>
                      <p className="text-3xl font-bold text-teal-600">
                        {dashboardData.dailyStandupSummary.todoCount}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center">
                      <p className="text-sm text-gray-600 mb-2">Blockers</p>
                      <p className="text-3xl font-bold text-red-600">
                        {dashboardData.dailyStandupSummary.blockerCount}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-sm text-gray-600 mb-3 text-center">RAG Today</p>
                      <div className="flex justify-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <span className="text-sm font-bold text-gray-900">
                            {dashboardData.dailyStandupSummary.ragDistribution.green}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                          <span className="text-sm font-bold text-gray-900">
                            {dashboardData.dailyStandupSummary.ragDistribution.amber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                          <span className="text-sm font-bold text-gray-900">
                            {dashboardData.dailyStandupSummary.ragDistribution.red}
                          </span>
                        </div>
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
