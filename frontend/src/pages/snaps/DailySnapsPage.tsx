import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { snapsApi } from '../../services/api/snaps';
import { sprintsApi } from '../../services/api/sprints';
import { Snap, DailySummary } from '../../types/snap';
import { Sprint } from '../../types/sprint';
import AppLayout from '../../components/AppLayout';
import SnapCard from '../../components/snaps/SnapCard';

export default function DailySnapsPage() {
  const { sprintId } = useParams<{ sprintId: string }>();
  const navigate = useNavigate();

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lockingDay, setLockingDay] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [viewMode, setViewMode] = useState<'snaps' | 'summary'>('snaps');

  useEffect(() => {
    if (sprintId) {
      loadSprint();
    }
  }, [sprintId]);

  useEffect(() => {
    if (sprintId && selectedDate) {
      loadDailyData();
    }
  }, [sprintId, selectedDate]);

  const loadSprint = async () => {
    try {
      const data = await sprintsApi.getById(sprintId!);
      setSprint(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadDailyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load snaps for the selected date
      const snapsData = await snapsApi.getBySprintAndDate(sprintId!, selectedDate);
      setSnaps(snapsData);

      // Check if day is locked
      const locked = await snapsApi.isDayLocked(sprintId!, selectedDate);
      setIsLocked(locked);

      // If locked, try to load summary
      if (locked) {
        try {
          const summaryData = await snapsApi.getDailySummary(sprintId!, selectedDate);
          setSummary(summaryData);
        } catch (err) {
          // Summary might not exist yet
          setSummary(null);
        }
      } else {
        setSummary(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLockDay = async () => {
    if (!confirm(`Lock all snaps for ${new Date(selectedDate).toLocaleDateString()}?\n\nThis will prevent further edits and generate the daily summary.`)) {
      return;
    }

    try {
      setLockingDay(true);
      await snapsApi.lockDaily({ sprintId: sprintId!, lockDate: selectedDate });
      await loadDailyData();
      alert('Daily snaps locked successfully and summary generated!');
    } catch (err: any) {
      alert(`Failed to lock daily snaps: ${err.message}`);
    } finally {
      setLockingDay(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setGeneratingSummary(true);
      const summaryData = await snapsApi.generateSummary({ sprintId: sprintId!, date: selectedDate });
      setSummary(summaryData);
      setViewMode('summary');
      alert('Summary generated successfully!');
    } catch (err: any) {
      alert(`Failed to generate summary: ${err.message}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleDownloadSummary = () => {
    if (!summary) return;

    // Create text content for download
    const content = `
Daily Standup Summary
Sprint: ${sprint?.name}
Date: ${new Date(summary.summaryDate).toLocaleDateString()}

=== DONE ===
${summary.done || 'Nothing completed'}

=== TO DO ===
${summary.toDo || 'Nothing planned'}

=== BLOCKERS ===
${summary.blockers || 'No blockers'}

=== RAG OVERVIEW ===
Sprint Level: ${summary.ragOverview.sprintLevel.toUpperCase()}

Card Level:
  Green: ${summary.ragOverview.cardLevel.green}
  Amber: ${summary.ragOverview.cardLevel.amber}
  Red: ${summary.ragOverview.cardLevel.red}

Assignee Level:
  Green: ${summary.ragOverview.assigneeLevel.green}
  Amber: ${summary.ragOverview.assigneeLevel.amber}
  Red: ${summary.ragOverview.assigneeLevel.red}
    `.trim();

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-summary-${selectedDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group snaps by assignee
  const snapsByAssignee = snaps.reduce((acc, snap) => {
    const assigneeName = snap.card?.assignee
      ? snap.card.assignee.fullName
      : 'Unassigned';

    if (!acc[assigneeName]) {
      acc[assigneeName] = [];
    }
    acc[assigneeName].push(snap);
    return acc;
  }, {} as Record<string, Snap[]>);

  const getRAGColor = (rag: string) => {
    switch (rag) {
      case 'green': return 'bg-green-100 text-green-800';
      case 'amber': return 'bg-yellow-100 text-yellow-800';
      case 'red': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!sprint) {
    return (
      <AppLayout>
        <div className="p-6">Loading sprint...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Daily Snap Management</h1>
              <p className="text-gray-600">{sprint.name}</p>
            </div>
            <button
              onClick={() => navigate(`/sprints/${sprintId}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to Sprint
            </button>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow">
            <label className="font-medium text-gray-700">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date(sprint.startDate).toISOString().split('T')[0]}
              max={new Date(sprint.endDate).toISOString().split('T')[0]}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isLocked && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                🔒 Day Locked
              </span>
            )}
            {!isLocked && snaps.length > 0 && (
              <button
                onClick={handleLockDay}
                disabled={lockingDay}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:bg-gray-400"
              >
                {lockingDay ? 'Locking...' : 'Lock Snaps for Today'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="mb-4 flex gap-2 bg-white p-2 rounded-lg shadow inline-flex">
          <button
            onClick={() => setViewMode('snaps')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'snaps'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Snaps View
          </button>
          <button
            onClick={() => setViewMode('summary')}
            disabled={!isLocked && !summary}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'summary'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            Summary View
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : viewMode === 'snaps' ? (
          /* Snaps View */
          <>
            {snaps.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600">No snaps recorded for this date</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(snapsByAssignee).map(([assigneeName, assigneeSnaps]) => (
                  <div key={assigneeName} className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                      {assigneeName} ({assigneeSnaps.length} snap{assigneeSnaps.length !== 1 ? 's' : ''})
                    </h3>
                    <div className="space-y-4">
                      {assigneeSnaps.map((snap) => (
                        <SnapCard key={snap.id} snap={snap} showCardTitle={true} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Summary View */
          <>
            {!summary ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600 mb-4">No summary available for this date</p>
                {isLocked && (
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {generatingSummary ? 'Generating...' : 'Generate Summary'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Header */}
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Daily Summary</h2>
                    <button
                      onClick={handleDownloadSummary}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Download Summary
                    </button>
                  </div>
                  <p className="text-gray-600">
                    {new Date(summary.summaryDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {/* RAG Overview */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">RAG Status Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Sprint Level</h4>
                      <span className={`px-4 py-2 rounded-full text-lg font-bold ${getRAGColor(summary.ragOverview.sprintLevel)}`}>
                        {summary.ragOverview.sprintLevel.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Card Level</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-600">Green:</span>
                          <span className="font-semibold">{summary.ragOverview.cardLevel.green}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Amber:</span>
                          <span className="font-semibold">{summary.ragOverview.cardLevel.amber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Red:</span>
                          <span className="font-semibold">{summary.ragOverview.cardLevel.red}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Assignee Level</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-600">Green:</span>
                          <span className="font-semibold">{summary.ragOverview.assigneeLevel.green}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Amber:</span>
                          <span className="font-semibold">{summary.ragOverview.assigneeLevel.amber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Red:</span>
                          <span className="font-semibold">{summary.ragOverview.assigneeLevel.red}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Done Section */}
                {summary.done && (
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-green-700">✓ Done</h3>
                    <div className="whitespace-pre-wrap text-gray-700">{summary.done}</div>
                  </div>
                )}

                {/* To Do Section */}
                {summary.toDo && (
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-blue-700">→ To Do</h3>
                    <div className="whitespace-pre-wrap text-gray-700">{summary.toDo}</div>
                  </div>
                )}

                {/* Blockers Section */}
                {summary.blockers && (
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-red-700">⚠ Blockers</h3>
                    <div className="whitespace-pre-wrap text-gray-700">{summary.blockers}</div>
                  </div>
                )}

                {/* Detailed Breakdown by Assignee */}
                {summary.fullData?.byAssignee && (
                  <details className="bg-white shadow rounded-lg p-6">
                    <summary className="text-lg font-semibold cursor-pointer hover:text-blue-600">
                      View Detailed Breakdown by Team Member
                    </summary>
                    <div className="mt-4 space-y-4">
                      {summary.fullData.byAssignee.map((assigneeData: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{assigneeData.assignee}</h4>
                          <div className="space-y-2">
                            {assigneeData.snaps.map((snap: any, snapIdx: number) => (
                              <div key={snapIdx} className="bg-gray-50 p-3 rounded text-sm">
                                <div className="font-medium text-gray-700 mb-1">{snap.cardTitle}</div>
                                {snap.done && <div className="text-green-700">Done: {snap.done}</div>}
                                {snap.toDo && <div className="text-blue-700">To Do: {snap.toDo}</div>}
                                {snap.blockers && <div className="text-red-700">Blockers: {snap.blockers}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
