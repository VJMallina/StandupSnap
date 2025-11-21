import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { reportsApi } from '../services/api/reports';
import { dashboardApi, ProjectSummary } from '../services/api/dashboard';
import { sprintsApi } from '../services/api/sprints';
import { DailySummary } from '../types/snap';
import { Sprint } from '../types/sprint';

export default function ReportsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadSprints();
      loadSummaries();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      loadSummaries();
    }
  }, [selectedSprintId, startDate, endDate]);

  const loadProjects = async () => {
    try {
      const data = await dashboardApi.getUserProjects();
      setProjects(data);
      if (data.length > 0) {
        const lastProject = localStorage.getItem('lastSelectedProjectId');
        if (lastProject && data.find(p => p.id === lastProject)) {
          setSelectedProjectId(lastProject);
        } else {
          setSelectedProjectId(data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSprints = async () => {
    try {
      const data = await sprintsApi.getAll({ projectId: selectedProjectId });
      setSprints(data);
    } catch (err: any) {
      console.error('Failed to load sprints:', err);
    }
  };

  const loadSummaries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsApi.getSummaries({
        projectId: selectedProjectId,
        sprintId: selectedSprintId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setSummaries(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSprintId('');
    localStorage.setItem('lastSelectedProjectId', projectId);
  };

  const getRAGConfig = (rag: string) => {
    const configs = {
      red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
      amber: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
      green: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    };
    return configs[rag as keyof typeof configs] || configs.green;
  };

  const handleDownload = (summary: DailySummary) => {
    const content = `
Daily Standup Summary
Sprint: ${summary.sprint?.name || 'Unknown'}
Date: ${new Date(summary.summaryDate).toLocaleDateString()}

=== DONE ===
${summary.done || 'Nothing completed'}

=== TO DO ===
${summary.toDo || 'Nothing planned'}

=== BLOCKERS ===
${summary.blockers || 'No blockers'}

=== RAG OVERVIEW ===
Sprint Level: ${summary.ragOverview?.sprintLevel?.toUpperCase() || 'N/A'}

Card Level:
  Green: ${summary.ragOverview?.cardLevel?.green || 0}
  Amber: ${summary.ragOverview?.cardLevel?.amber || 0}
  Red: ${summary.ragOverview?.cardLevel?.red || 0}

Assignee Level:
  Green: ${summary.ragOverview?.assigneeLevel?.green || 0}
  Amber: ${summary.ragOverview?.assigneeLevel?.amber || 0}
  Red: ${summary.ragOverview?.assigneeLevel?.red || 0}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-${new Date(summary.summaryDate).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSelectedSprintId('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Reports
          </h1>
          <p className="text-gray-500 mt-1">View and download daily standup summaries</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Project Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sprint Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Sprint</label>
              <select
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Sprints</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Summaries List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        ) : summaries.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Summaries Found</h3>
            <p className="text-gray-500">
              No locked daily summaries available for the selected filters.
              <br />
              Summaries are generated when daily snaps are locked.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {summaries.map((summary) => {
              const ragConfig = getRAGConfig(summary.ragOverview?.sprintLevel || 'green');
              const isExpanded = expandedSummary === summary.id;

              return (
                <div
                  key={summary.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Summary Header */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedSummary(isExpanded ? null : summary.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {new Date(summary.summaryDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </h3>
                          <p className="text-sm text-gray-500">{summary.sprint?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* RAG Badge */}
                        <div className={`px-3 py-1.5 rounded-lg ${ragConfig.bg}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${ragConfig.dot}`}></div>
                            <span className={`text-sm font-semibold ${ragConfig.text}`}>
                              {(summary.ragOverview?.sprintLevel || 'green').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="hidden md:flex items-center gap-3 text-sm">
                          <span className="text-emerald-600 font-medium">
                            {summary.ragOverview?.cardLevel?.green || 0} Green
                          </span>
                          <span className="text-amber-600 font-medium">
                            {summary.ragOverview?.cardLevel?.amber || 0} Amber
                          </span>
                          <span className="text-red-600 font-medium">
                            {summary.ragOverview?.cardLevel?.red || 0} Red
                          </span>
                        </div>

                        {/* Expand Icon */}
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Done */}
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <h4 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Done
                          </h4>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {summary.done || 'Nothing completed'}
                          </div>
                        </div>

                        {/* To Do */}
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <h4 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            To Do
                          </h4>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {summary.toDo || 'Nothing planned'}
                          </div>
                        </div>

                        {/* Blockers */}
                        <div className="bg-white rounded-xl p-4 border border-gray-100">
                          <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Blockers
                          </h4>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {summary.blockers || 'No blockers'}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(summary);
                          }}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download Report
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
