import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import AppLayout from '../components/AppLayout';
import { Select } from '../components/ui/Select';
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
  const [expandedAssignees, setExpandedAssignees] = useState<Record<string, boolean>>({});

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
    let content = `
================================================================================
                         DAILY STANDUP SUMMARY
================================================================================
Sprint: ${summary.sprint?.name || 'Unknown'}
Date: ${new Date(summary.summaryDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}

================================================================================
                         SPRINT HEALTH OVERVIEW
================================================================================
Overall Day RAG: ${(summary.ragOverview?.sprintLevel || 'GREEN').toUpperCase()}

Card-Level Status:
  - Green: ${summary.ragOverview?.cardLevel?.green || 0} cards
  - Amber: ${summary.ragOverview?.cardLevel?.amber || 0} cards
  - Red: ${summary.ragOverview?.cardLevel?.red || 0} cards

Assignee-Level Status:
  - Green: ${summary.ragOverview?.assigneeLevel?.green || 0} assignees
  - Amber: ${summary.ragOverview?.assigneeLevel?.amber || 0} assignees
  - Red: ${summary.ragOverview?.assigneeLevel?.red || 0} assignees

================================================================================
                         CARD-LEVEL UPDATES
================================================================================
`;

    if (summary.fullData?.byAssignee) {
      summary.fullData.byAssignee.forEach((assigneeData: any) => {
        content += `\n--- ${assigneeData.assignee} ---\n`;
        assigneeData.snaps?.forEach((snap: any) => {
          content += `\n  Card: ${snap.cardTitle}\n`;
          content += `  RAG Status: ${(snap.rag || 'green').toUpperCase()}\n`;
          content += `  Done: ${snap.done || '-'}\n`;
          content += `  To Do: ${snap.toDo || '-'}\n`;
          content += `  Blockers: ${snap.blockers || '-'}\n`;
        });
      });
    } else {
      content += '\nNo card-level data available\n';
    }

    content += `
================================================================================
                              END OF REPORT
================================================================================
`;

    const blob = new Blob([content.trim()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-${new Date(summary.summaryDate).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadWord = async (summary: DailySummary) => {
    const children: any[] = [];

    // Title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Daily Standup Summary',
            bold: true,
            size: 48,
            color: '2563EB',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Date and Sprint
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: new Date(summary.summaryDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            bold: true,
            size: 28,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Sprint: ${summary.sprint?.name || 'Unknown'}`,
            italics: true,
            size: 24,
            color: '6B7280',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Sprint Health Overview Section
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'SPRINT HEALTH OVERVIEW',
            bold: true,
            size: 28,
            color: '4F46E5',
          }),
        ],
        spacing: { before: 300, after: 200 },
      })
    );

    // Overall Day RAG
    const ragColor = summary.ragOverview?.sprintLevel === 'red' ? 'DC2626' :
                     summary.ragOverview?.sprintLevel === 'amber' ? 'D97706' : '059669';

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Overall Day RAG: ',
            bold: true,
            size: 24,
          }),
          new TextRun({
            text: (summary.ragOverview?.sprintLevel || 'GREEN').toUpperCase(),
            bold: true,
            size: 24,
            color: ragColor,
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // Card Level Stats
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Card-Level Status: ',
            bold: true,
            size: 22,
          }),
          new TextRun({
            text: `${summary.ragOverview?.cardLevel?.green || 0} Green`,
            size: 22,
            color: '059669',
          }),
          new TextRun({
            text: ` | ${summary.ragOverview?.cardLevel?.amber || 0} Amber`,
            size: 22,
            color: 'D97706',
          }),
          new TextRun({
            text: ` | ${summary.ragOverview?.cardLevel?.red || 0} Red`,
            size: 22,
            color: 'DC2626',
          }),
        ],
        spacing: { after: 100 },
      })
    );

    // Assignee Level Stats
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Assignee-Level Status: ',
            bold: true,
            size: 22,
          }),
          new TextRun({
            text: `${summary.ragOverview?.assigneeLevel?.green || 0} Green`,
            size: 22,
            color: '059669',
          }),
          new TextRun({
            text: ` | ${summary.ragOverview?.assigneeLevel?.amber || 0} Amber`,
            size: 22,
            color: 'D97706',
          }),
          new TextRun({
            text: ` | ${summary.ragOverview?.assigneeLevel?.red || 0} Red`,
            size: 22,
            color: 'DC2626',
          }),
        ],
        spacing: { after: 400 },
      })
    );

    // Card-Level Updates Section
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'CARD-LEVEL UPDATES',
            bold: true,
            size: 28,
            color: '2563EB',
          }),
        ],
        spacing: { before: 300, after: 200 },
      })
    );

    // Add card-level data by assignee
    if (summary.fullData?.byAssignee) {
      summary.fullData.byAssignee.forEach((assigneeData: any) => {
        // Assignee header
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: assigneeData.assignee,
                bold: true,
                size: 24,
                color: '1F2937',
              }),
            ],
            spacing: { before: 300, after: 150 },
          })
        );

        // Each card for this assignee
        assigneeData.snaps?.forEach((snap: any) => {
          const cardRagColor = snap.rag === 'red' ? 'DC2626' :
                              snap.rag === 'amber' ? 'D97706' : '059669';

          // Card title with RAG
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${snap.cardTitle} `,
                  bold: true,
                  size: 22,
                }),
                new TextRun({
                  text: `[${(snap.rag || 'green').toUpperCase()}]`,
                  bold: true,
                  size: 20,
                  color: cardRagColor,
                }),
              ],
              spacing: { before: 200, after: 100 },
            })
          );

          // Done
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Done: ',
                  bold: true,
                  size: 20,
                  color: '059669',
                }),
                new TextRun({
                  text: snap.done || '-',
                  size: 20,
                }),
              ],
              spacing: { after: 50 },
            })
          );

          // To Do
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'To Do: ',
                  bold: true,
                  size: 20,
                  color: '2563EB',
                }),
                new TextRun({
                  text: snap.toDo || '-',
                  size: 20,
                }),
              ],
              spacing: { after: 50 },
            })
          );

          // Blockers
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Blockers: ',
                  bold: true,
                  size: 20,
                  color: 'DC2626',
                }),
                new TextRun({
                  text: snap.blockers || '-',
                  size: 20,
                }),
              ],
              spacing: { after: 150 },
            })
          );
        });
      });
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'No card-level data available',
              size: 22,
              color: '6B7280',
              italics: true,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `summary-${new Date(summary.summaryDate).toISOString().split('T')[0]}.docx`);
  };

  const toggleAssignee = (summaryId: string, assigneeIdx: number) => {
    const key = `${summaryId}-${assigneeIdx}`;
    setExpandedAssignees(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 md:p-5 shadow-lg">
          <h1 className="text-2xl font-bold text-white">Reports</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-6">
          {/* Project Selector */}
          <div className="flex-1 min-w-[180px]">
            <Select
              label="Project"
              value={selectedProjectId}
              onChange={handleProjectChange}
              placeholder="Select Project"
              options={projects.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
            />
          </div>

          {/* Sprint Filter */}
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Sprint"
              value={selectedSprintId}
              onChange={setSelectedSprintId}
              placeholder="All Sprints"
              options={[
                { value: '', label: 'All Sprints' },
                ...sprints.map((sprint) => ({
                  value: sprint.id,
                  label: sprint.name,
                })),
              ]}
            />
          </div>

          {/* Start Date */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm hover:border-gray-300 transition-colors"
            />
          </div>

          {/* End Date */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm hover:border-gray-300 transition-colors"
            />
          </div>

          {/* Clear Filters */}
          <div>
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center animate-pulse">
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
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

                      <div className="flex items-center gap-3">
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
                      {/* Download Actions - At Top */}
                      <div className="flex justify-end gap-3 mb-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(summary);
                          }}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          TXT
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadWord(summary);
                          }}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Word
                        </button>
                      </div>

                      {/* Sprint Health Overview */}
                      <div className="mb-6 bg-white rounded-xl p-4 border border-gray-100">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Sprint Health Overview
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Day RAG</p>
                            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${ragConfig.bg} ${ragConfig.text}`}>
                              {(summary.ragOverview?.sprintLevel || 'green').toUpperCase()}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-emerald-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Green Cards</p>
                            <p className="text-2xl font-bold text-emerald-600">{summary.ragOverview?.cardLevel?.green || 0}</p>
                          </div>
                          <div className="text-center p-3 bg-amber-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Amber Cards</p>
                            <p className="text-2xl font-bold text-amber-600">{summary.ragOverview?.cardLevel?.amber || 0}</p>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Red Cards</p>
                            <p className="text-2xl font-bold text-red-600">{summary.ragOverview?.cardLevel?.red || 0}</p>
                          </div>
                        </div>
                      </div>

                      {/* Card-Level Snaps */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Card-Level Updates
                        </h4>

                        {summary.fullData?.byAssignee?.map((assigneeData: any, idx: number) => {
                          const assigneeKey = `${summary.id}-${idx}`;
                          const isAssigneeExpanded = expandedAssignees[assigneeKey] !== false; // Default expanded

                          return (
                            <div key={idx} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-100 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors flex items-center justify-between"
                                onClick={() => toggleAssignee(summary.id, idx)}
                              >
                                <div className="flex items-center gap-2">
                                  <h5 className="font-semibold text-gray-900">{assigneeData.assignee}</h5>
                                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                                    {assigneeData.snaps?.length || 0} cards
                                  </span>
                                </div>
                                <svg
                                  className={`w-5 h-5 text-gray-400 transition-transform ${isAssigneeExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                              {isAssigneeExpanded && (
                                <div className="divide-y divide-gray-100">
                                  {assigneeData.snaps?.map((snap: any, snapIdx: number) => {
                                    const snapRagConfig = getRAGConfig(snap.rag || 'green');
                                    return (
                                      <div key={snapIdx} className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <h6 className="font-medium text-gray-900">{snap.cardTitle}</h6>
                                          <span className={`px-2 py-1 rounded text-xs font-semibold ${snapRagConfig.bg} ${snapRagConfig.text}`}>
                                            {(snap.rag || 'green').toUpperCase()}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                          <div className="bg-emerald-50 rounded-lg p-3">
                                            <p className="font-medium text-emerald-700 mb-1">Done</p>
                                            <p className="text-gray-700 whitespace-pre-wrap">{snap.done || '-'}</p>
                                          </div>
                                          <div className="bg-primary-50 rounded-lg p-3">
                                            <p className="font-medium text-primary-700 mb-1">To Do</p>
                                            <p className="text-gray-700 whitespace-pre-wrap">{snap.toDo || '-'}</p>
                                          </div>
                                          <div className="bg-red-50 rounded-lg p-3">
                                            <p className="font-medium text-red-700 mb-1">Blockers</p>
                                            <p className="text-gray-700 whitespace-pre-wrap">{snap.blockers || '-'}</p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {(!summary.fullData?.byAssignee || summary.fullData.byAssignee.length === 0) && (
                          <div className="bg-white rounded-xl p-6 text-center text-gray-500 border border-gray-100">
                            No card-level data available
                          </div>
                        )}
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
