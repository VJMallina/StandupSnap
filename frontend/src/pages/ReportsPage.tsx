import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import AppLayout from '../components/AppLayout';
import { Select } from '../components/ui/Select';
import { reportsApi } from '../services/api/reports';
import { canvasReportsApi } from '../services/api/canvasReports';
import { importPptx } from '../components/canvas/importUtils';
import { dashboardApi, ProjectSummary } from '../services/api/dashboard';
import { sprintsApi } from '../services/api/sprints';
import { DailySummary } from '../types/snap';
import { Sprint } from '../types/sprint';
import { CanvasReportSummary, ReportType } from '../types/canvasReport';
import { useProjectSelection } from '../context/ProjectSelectionContext';

export default function ReportsPage() {
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection();
  const [activeTab, setActiveTab] = useState<'daily' | 'canvas'>('daily');
  const [canvasReports, setCanvasReports] = useState<CanvasReportSummary[]>([]);
  const [canvasLoading, setCanvasLoading] = useState(false);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [newReportName, setNewReportName] = useState('');
  const [newReportType, setNewReportType] = useState<ReportType>('custom');
  const [useTemplate, setUseTemplate] = useState(true);
  const [templateStartDate, setTemplateStartDate] = useState('');
  const [templateEndDate, setTemplateEndDate] = useState('');
  const [creatingReport, setCreatingReport] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
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
      if (data.length === 0) {
        setSelectedProjectId('');
      } else if (!selectedProjectId || !data.find(p => p.id === selectedProjectId)) {
        setSelectedProjectId(data[0].id);
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

  const loadCanvasReports = async (projectId: string) => {
    if (!projectId) return;
    setCanvasLoading(true);
    try {
      const data = await canvasReportsApi.list(projectId);
      setCanvasReports(data);
    } catch {
      // non-blocking
    } finally {
      setCanvasLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId && activeTab === 'canvas') loadCanvasReports(selectedProjectId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, activeTab]);

  const handleCreateCanvasReport = async () => {
    if (!newReportName.trim() || !selectedProjectId) return;
    setCreatingReport(true);
    try {
      if (useTemplate) {
        const report = await canvasReportsApi.generateFromTemplate({
          projectId: selectedProjectId,
          name: newReportName,
          reportType: newReportType,
          startDate: templateStartDate || undefined,
          endDate: templateEndDate || undefined,
        });
        setShowNewReportModal(false);
        navigate(`/reports/editor/${report.id}`);
      } else {
        navigate(
          `/reports/editor/new?projectId=${selectedProjectId}&name=${encodeURIComponent(newReportName)}&type=${newReportType}`,
        );
      }
    } catch (e: any) {
      alert(e.message ?? 'Failed to create report');
    } finally {
      setCreatingReport(false);
    }
  };

  const handleImportPptx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;
    e.target.value = '';
    setImporting(true);
    try {
      const slides = await importPptx(file);
      const reportName = file.name.replace(/\.pptx$/i, '');
      const created = await canvasReportsApi.create({
        name: reportName,
        projectId: selectedProjectId,
        reportType: 'custom',
        slides,
      });
      navigate(`/reports/editor/${created.id}`);
    } catch (err: any) {
      alert(err.message ?? 'Failed to import PPTX');
    } finally {
      setImporting(false);
    }
  };

  const handleOpenCanvasReport = (reportId: string) => {
    navigate(`/reports/editor/${reportId}`);
  };

  const handleDuplicateCanvasReport = async (reportId: string) => {
    if (!selectedProjectId) return;
    await canvasReportsApi.duplicate(reportId);
    loadCanvasReports(selectedProjectId);
  };

  const handleDeleteCanvasReport = async (reportId: string) => {
    if (!window.confirm('Delete this report?')) return;
    await canvasReportsApi.remove(reportId);
    setCanvasReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSprintId('');
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
          <p className="text-primary-100 text-sm mt-1">Daily standup summaries and canvas status decks</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {[
            { id: 'daily', label: 'Daily Summaries', icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )},
            { id: 'canvas', label: 'Status Decks', icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            )},
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'daily' | 'canvas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Canvas Reports Tab ── */}
        {activeTab === 'canvas' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-[180px] max-w-xs">
                <Select
                  label="Project"
                  value={selectedProjectId}
                  onChange={handleProjectChange}
                  placeholder="Select Project"
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                />
              </div>
              <div className="flex items-center gap-2">
                {/* Hidden file input for PPTX import */}
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".pptx"
                  className="hidden"
                  onChange={handleImportPptx}
                />
                <button
                  onClick={() => importInputRef.current?.click()}
                  disabled={!selectedProjectId || importing}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition-all"
                  title="Import a .pptx file as a new canvas report"
                >
                  {importing ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                  {importing ? 'Importing…' : 'Import PPTX'}
                </button>
                <button
                  onClick={() => { setNewReportName(''); setShowNewReportModal(true); }}
                  disabled={!selectedProjectId}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl font-medium text-sm hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Report
                </button>
              </div>
            </div>

            {/* Report list */}
            {canvasLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : canvasReports.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No status decks yet</h3>
                <p className="text-gray-500 text-sm mb-4">Create your first canvas report to build visual status presentations</p>
                <button
                  onClick={() => setShowNewReportModal(true)}
                  disabled={!selectedProjectId}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Report
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {canvasReports.map((report) => (
                  <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                    {/* Preview area */}
                    <div
                      className="h-36 rounded-t-xl bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-100 flex items-center justify-center cursor-pointer"
                      onClick={() => handleOpenCanvasReport(report.id)}
                    >
                      <svg className="w-10 h-10 text-gray-300 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 text-sm truncate">{report.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 capitalize font-medium">{report.reportType}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(report.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenCanvasReport(report.id)}
                            title="Open"
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDuplicateCanvasReport(report.id)}
                            title="Duplicate"
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCanvasReport(report.id)}
                            title="Delete"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── New Report Modal ── */}
        {showNewReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 animate-scaleIn">
              <h2 className="text-lg font-bold text-gray-800 mb-1">New Status Deck</h2>
              <p className="text-sm text-gray-500 mb-5">Choose how to start your report</p>

              {/* Start mode toggle */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setUseTemplate(true)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${useTemplate ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className={`w-4 h-4 ${useTemplate ? 'text-primary-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className={`text-sm font-semibold ${useTemplate ? 'text-primary-700' : 'text-gray-700'}`}>Use Template</span>
                  </div>
                  <p className="text-xs text-gray-500">Auto-populated with live project data — sprints, RAG, team & risks</p>
                </button>
                <button
                  onClick={() => setUseTemplate(false)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${!useTemplate ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className={`w-4 h-4 ${!useTemplate ? 'text-primary-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className={`text-sm font-semibold ${!useTemplate ? 'text-primary-700' : 'text-gray-700'}`}>Blank Canvas</span>
                  </div>
                  <p className="text-xs text-gray-500">Start from scratch and build your own layout</p>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
                  <input
                    autoFocus
                    value={newReportName}
                    onChange={(e) => setNewReportName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCanvasReport(); }}
                    placeholder="e.g. Weekly Status – Sprint 12"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                  <select
                    value={newReportType}
                    onChange={(e) => setNewReportType(e.target.value as ReportType)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Date range — only shown for template mode */}
                {useTemplate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Range <span className="text-gray-400 font-normal">(optional — defaults to current period)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={templateStartDate}
                        onChange={(e) => setTemplateStartDate(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <input
                        type="date"
                        value={templateEndDate}
                        onChange={(e) => setTemplateEndDate(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewReportModal(false)}
                  disabled={creatingReport}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >Cancel</button>
                <button
                  onClick={handleCreateCanvasReport}
                  disabled={!newReportName.trim() || creatingReport}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl text-sm font-medium hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 transition-all"
                >
                  {creatingReport ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {useTemplate ? 'Generating…' : 'Creating…'}
                    </>
                  ) : (
                    useTemplate ? 'Generate & Open Editor' : 'Create & Open Editor'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Daily Summaries Tab (existing content) ── */}
        {activeTab === 'daily' && <>

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
        </> }
      </div>
    </AppLayout>
  );
}
