import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import AppLayout from '../components/AppLayout';
import CreateSnapModal from '../components/snaps/CreateSnapModal';
import { sprintsApi } from '../services/api/sprints';
import { projectsApi } from '../services/api/projects';
import { cardsApi } from '../services/api/cards';
import { snapsApi } from '../services/api/snaps';
import { Sprint } from '../types/sprint';
import { Card } from '../types/card';
import { Snap, SnapRAG } from '../types/snap';

interface Project {
  id: string;
  name: string;
}

type TabType = 'overview' | 'management';

export default function SnapsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('management');

  // Filter State
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Snaps State
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [locking, setLocking] = useState(false);

  // Card Selection Modal State
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [sprintCards, setSprintCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardSelectionError, setCardSelectionError] = useState<string | null>(null);

  // Create Snap Modal State
  const [showCreateSnapModal, setShowCreateSnapModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [yesterdaySnap, setYesterdaySnap] = useState<Snap | null>(null);
  const [olderSnaps, setOlderSnaps] = useState<Snap[]>([]);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSnap, setEditingSnap] = useState<Snap | null>(null);
  const [editRawInput, setEditRawInput] = useState('');
  const [editDone, setEditDone] = useState('');
  const [editToDo, setEditToDo] = useState('');
  const [editBlockers, setEditBlockers] = useState('');
  const [editFinalRAG, setEditFinalRAG] = useState<SnapRAG | ''>('');
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete State
  const [deletingSnapId, setDeletingSnapId] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load sprints when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadSprints();
    } else {
      setSprints([]);
      setSelectedSprintId('');
    }
  }, [selectedProjectId]);

  // Load snaps when sprint or date changes
  useEffect(() => {
    if (selectedSprintId && selectedDate) {
      loadSnaps();
      checkLockStatus();
    } else {
      setSnaps([]);
      setIsLocked(false);
    }
  }, [selectedSprintId, selectedDate]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll(false);
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err: any) {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadSprints = async () => {
    try {
      const data = await sprintsApi.getAll({ projectId: selectedProjectId });
      setSprints(data);
      if (data.length > 0) {
        setSelectedSprintId(data[0].id);
      } else {
        setSelectedSprintId('');
      }
    } catch (err: any) {
      setError('Failed to load sprints');
    }
  };

  const loadSnaps = async () => {
    try {
      setLoading(true);
      const data = await snapsApi.getBySprintAndDate(selectedSprintId, selectedDate);
      setSnaps(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load snaps');
      setSnaps([]);
    } finally {
      setLoading(false);
    }
  };

  const checkLockStatus = async () => {
    try {
      const locked = await snapsApi.isDayLocked(selectedSprintId, selectedDate);
      setIsLocked(locked);
    } catch (err) {
      setIsLocked(false);
    }
  };

  const handleLockDay = async () => {
    if (!selectedSprintId || !selectedDate) return;

    try {
      setLocking(true);
      await snapsApi.lockDaily({
        sprintId: selectedSprintId,
        lockDate: selectedDate,
      });
      setIsLocked(true);
      await loadSnaps();
    } catch (err: any) {
      setError(err.message || 'Failed to lock day');
    } finally {
      setLocking(false);
    }
  };

  const openCardSelection = async () => {
    setShowCardSelection(true);
    setCardSelectionError(null);

    if (selectedSprintId) {
      try {
        setLoadingCards(true);
        const cardsData = await cardsApi.getAll({ sprintId: selectedSprintId });
        setSprintCards(cardsData);
      } catch (err: any) {
        setCardSelectionError('Failed to load cards');
      } finally {
        setLoadingCards(false);
      }
    }
  };

  const handleCardSelect = async (card: Card) => {
    setSelectedCard(card);
    setShowCardSelection(false);

    // Fetch card's snaps for context
    try {
      const cardSnaps = await snapsApi.getByCard(card.id);
      if (cardSnaps.length > 0) {
        // Sort by date descending
        const sorted = cardSnaps.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setYesterdaySnap(sorted[0] || null);
        setOlderSnaps(sorted.slice(1, 6)); // Get up to 5 older snaps
      } else {
        setYesterdaySnap(null);
        setOlderSnaps([]);
      }
    } catch (err) {
      setYesterdaySnap(null);
      setOlderSnaps([]);
    }

    setShowCreateSnapModal(true);
  };

  const handleCreateSnapSuccess = () => {
    setShowCreateSnapModal(false);
    setSelectedCard(null);
    loadSnaps();
  };

  const openEditModal = (snap: Snap) => {
    setEditingSnap(snap);
    setEditRawInput(snap.rawInput);
    setEditDone(snap.done || '');
    setEditToDo(snap.toDo || '');
    setEditBlockers(snap.blockers || '');
    setEditFinalRAG(snap.finalRAG || '');
    setEditError(null);
    setShowEditModal(true);
  };

  const handleUpdateSnap = async () => {
    if (!editingSnap) return;

    try {
      setUpdating(true);
      setEditError(null);

      await snapsApi.update(editingSnap.id, {
        rawInput: editRawInput,
        done: editDone,
        toDo: editToDo,
        blockers: editBlockers,
        finalRAG: editFinalRAG || undefined,
      });

      setShowEditModal(false);
      await loadSnaps();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update snap');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSnap = async (snapId: string) => {
    if (!confirm('Are you sure you want to delete this snap?')) return;

    try {
      setDeletingSnapId(snapId);
      await snapsApi.delete(snapId);
      await loadSnaps();
    } catch (err: any) {
      setError(err.message || 'Failed to delete snap');
    } finally {
      setDeletingSnapId(null);
    }
  };

  const getRAGColor = (rag: SnapRAG | null) => {
    switch (rag) {
      case SnapRAG.GREEN:
        return 'bg-green-500';
      case SnapRAG.AMBER:
        return 'bg-amber-500';
      case SnapRAG.RED:
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getRAGLabel = (rag: SnapRAG | null) => {
    switch (rag) {
      case SnapRAG.GREEN:
        return 'Green';
      case SnapRAG.AMBER:
        return 'Amber';
      case SnapRAG.RED:
        return 'Red';
      default:
        return 'Not Set';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: 'Active',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const downloadSummary = () => {
    const projectName = projects.find(p => p.id === selectedProjectId)?.name || 'Unknown Project';
    const sprintName = sprints.find(s => s.id === selectedSprintId)?.name || 'Unknown Sprint';
    const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const greenCount = snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.GREEN).length;
    const amberCount = snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.AMBER).length;
    const redCount = snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.RED).length;

    let summary = `DAILY STANDUP SUMMARY\n`;
    summary += `${'='.repeat(50)}\n\n`;
    summary += `Project: ${projectName}\n`;
    summary += `Sprint: ${sprintName}\n`;
    summary += `Date: ${formattedDate}\n`;
    summary += `Total Snaps: ${snaps.length}\n\n`;
    summary += `RAG Status Overview:\n`;
    summary += `  - Green: ${greenCount}\n`;
    summary += `  - Amber: ${amberCount}\n`;
    summary += `  - Red: ${redCount}\n\n`;
    summary += `${'='.repeat(50)}\n`;
    summary += `INDIVIDUAL UPDATES\n`;
    summary += `${'='.repeat(50)}\n\n`;

    snaps.forEach((snap, index) => {
      const rag = getRAGLabel(snap.finalRAG || snap.suggestedRAG);
      const assignee = snap.card?.assignee?.fullName || snap.card?.assignee?.name || snap.card?.assignee?.username || 'Unassigned';

      summary += `${index + 1}. ${snap.card?.title || 'Unknown Card'}\n`;
      summary += `   Assignee: ${assignee}\n`;
      summary += `   Status: ${rag}\n`;
      if (snap.done) summary += `   Done: ${snap.done}\n`;
      if (snap.toDo) summary += `   To Do: ${snap.toDo}\n`;
      if (snap.blockers) summary += `   Blockers: ${snap.blockers}\n`;
      summary += `\n`;
    });

    summary += `${'='.repeat(50)}\n`;
    summary += `Generated by StandupSnap\n`;

    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `standup-summary-${selectedDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadWordSummary = async () => {
    const projectName = projects.find(p => p.id === selectedProjectId)?.name || 'Unknown Project';
    const sprintName = sprints.find(s => s.id === selectedSprintId)?.name || 'Unknown Sprint';
    const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const greenCount = snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.GREEN).length;
    const amberCount = snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.AMBER).length;
    const redCount = snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.RED).length;

    // Create document sections
    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'DAILY STANDUP SUMMARY',
            bold: true,
            size: 36,
            color: '2563EB',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Project & Sprint Info
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Project: ', bold: true, size: 24 }),
          new TextRun({ text: projectName, size: 24, color: '4B5563' }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Sprint: ', bold: true, size: 24 }),
          new TextRun({ text: sprintName, size: 24, color: '4B5563' }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Date: ', bold: true, size: 24 }),
          new TextRun({ text: formattedDate, size: 24, color: '4B5563' }),
        ],
        spacing: { after: 300 },
      })
    );

    // RAG Status Summary
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'RAG Status Overview',
            bold: true,
            size: 28,
            color: '1F2937',
          }),
        ],
        spacing: { before: 200, after: 200 },
      })
    );

    // Status boxes
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '● Green: ', bold: true, size: 22, color: '059669' }),
          new TextRun({ text: `${greenCount} snaps`, size: 22 }),
          new TextRun({ text: '    ● Amber: ', bold: true, size: 22, color: 'D97706' }),
          new TextRun({ text: `${amberCount} snaps`, size: 22 }),
          new TextRun({ text: '    ● Red: ', bold: true, size: 22, color: 'DC2626' }),
          new TextRun({ text: `${redCount} snaps`, size: 22 }),
        ],
        spacing: { after: 400 },
      })
    );

    // Divider
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            color: 'E5E7EB',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );

    // Individual Updates Header
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'INDIVIDUAL UPDATES',
            bold: true,
            size: 28,
            color: '2563EB',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );

    // Individual snaps
    snaps.forEach((snap, index) => {
      const rag = snap.finalRAG || snap.suggestedRAG;
      const ragColor = rag === SnapRAG.GREEN ? '059669' : rag === SnapRAG.AMBER ? 'D97706' : rag === SnapRAG.RED ? 'DC2626' : '6B7280';
      const ragLabel = rag === SnapRAG.GREEN ? 'GREEN' : rag === SnapRAG.AMBER ? 'AMBER' : rag === SnapRAG.RED ? 'RED' : 'N/A';
      const assignee = snap.card?.assignee?.fullName || snap.card?.assignee?.name || snap.card?.assignee?.username || 'Unassigned';

      // Card title with number
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${snap.card?.title || 'Unknown Card'}`,
              bold: true,
              size: 24,
              color: '1F2937',
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      // Assignee and status
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Assignee: ', size: 20, color: '6B7280' }),
            new TextRun({ text: assignee, size: 20 }),
            new TextRun({ text: '  |  Status: ', size: 20, color: '6B7280' }),
            new TextRun({ text: ragLabel, bold: true, size: 20, color: ragColor }),
          ],
          spacing: { after: 100 },
        })
      );

      // Done
      if (snap.done) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '✓ Done: ', bold: true, size: 20, color: '059669' }),
              new TextRun({ text: snap.done, size: 20 }),
            ],
            spacing: { after: 50 },
          })
        );
      }

      // To Do
      if (snap.toDo) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '→ To Do: ', bold: true, size: 20, color: '2563EB' }),
              new TextRun({ text: snap.toDo, size: 20 }),
            ],
            spacing: { after: 50 },
          })
        );
      }

      // Blockers
      if (snap.blockers) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '⚠ Blockers: ', bold: true, size: 20, color: 'DC2626' }),
              new TextRun({ text: snap.blockers, size: 20 }),
            ],
            spacing: { after: 50 },
          })
        );
      }

      // Spacing between snaps
      children.push(new Paragraph({ spacing: { after: 200 } }));
    });

    // Footer
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            color: 'E5E7EB',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Generated by StandupSnap',
            italics: true,
            size: 18,
            color: '9CA3AF',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `standup-summary-${selectedDate}.docx`);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="h-10 w-10 text-blue-600 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div>
                <h1 className="text-3xl font-bold">Daily Snaps</h1>
                <p className="text-gray-600">Track daily progress updates</p>
              </div>
            </div>
            {activeTab === 'management' && (
              <button
                onClick={openCardSelection}
                disabled={!selectedSprintId || isLocked}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Snap
              </button>
            )}
          </div>
        </div>

        {/* Global Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
              <select
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value)}
                disabled={!selectedProjectId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">{!selectedProjectId ? 'Select a project first' : 'Select a sprint'}</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('management')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'management'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Daily Management
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
          </nav>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Overview Tab - Shows today's snaps summary */}
        {activeTab === 'overview' && (
          <div>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Today's Snaps</p>
                    <p className="text-2xl font-bold text-gray-900">{snaps.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Green Status</p>
                    <p className="text-2xl font-bold text-green-600">
                      {snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.GREEN).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amber Status</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.AMBER).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Red Status</p>
                    <p className="text-2xl font-bold text-red-600">
                      {snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.RED).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Download Summary Button - Shows when locked */}
            {isLocked && snaps.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-800 font-medium">Day locked - Summary ready for download</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadSummary}
                      className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      TXT
                    </button>
                    <button
                      onClick={downloadWordSummary}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Word
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Snaps Summary List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : !selectedSprintId ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600">Select a project and sprint in the Daily Management tab</p>
              </div>
            ) : snaps.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600">No snaps for today. Go to Daily Management tab to create snaps.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {snaps.map((snap) => (
                  <div key={snap.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${getRAGColor(snap.finalRAG || snap.suggestedRAG)} mr-3`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{snap.card?.title || 'Unknown Card'}</p>
                          <p className="text-sm text-gray-500">{snap.card?.assignee?.name || snap.card?.assignee?.username || 'Unassigned'}</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{getRAGLabel(snap.finalRAG || snap.suggestedRAG)}</span>
                    </div>
                    {snap.blockers && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                        <strong>Blocker:</strong> {snap.blockers}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Management Tab */}
        {activeTab === 'management' && (
          <div>
            {/* Lock Status */}
            {selectedSprintId && selectedDate && (
              <div className={`mb-6 p-4 rounded-lg border ${isLocked ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {isLocked ? (
                      <>
                        <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-amber-800 font-medium">This day is locked. Snaps cannot be modified.</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        <span className="text-blue-800 font-medium">
                          {snaps.length} snap(s) for {new Date(selectedDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                  {!isLocked && snaps.length > 0 && (
                    <button
                      onClick={handleLockDay}
                      disabled={locking}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center"
                    >
                      {locking ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Locking...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Lock Day & Generate Summary
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Snaps List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : !selectedSprintId ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-600">Select a project and sprint to view snaps</p>
              </div>
            ) : snaps.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <p className="text-gray-600 mb-4">No snaps for this date</p>
                {!isLocked && (
                  <button
                    onClick={openCardSelection}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Create First Snap
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {snaps.map((snap) => (
                  <div key={snap.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{snap.card?.title || 'Unknown Card'}</h3>
                          <p className="text-sm text-gray-500">{snap.card?.assignee?.name || snap.card?.assignee?.username || 'Unassigned'}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${getRAGColor(snap.finalRAG || snap.suggestedRAG)} mr-2`}></div>
                            <span className="text-sm font-medium text-gray-600">{getRAGLabel(snap.finalRAG || snap.suggestedRAG)}</span>
                          </div>
                          {!isLocked && (
                            <div className="flex items-center space-x-1 ml-4">
                              <button
                                onClick={() => openEditModal(snap)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteSnap(snap.id)}
                                disabled={deletingSnapId === snap.id}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                title="Delete"
                              >
                                {deletingSnapId === snap.id ? (
                                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-green-800 mb-1 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Done
                          </h4>
                          <p className="text-sm text-green-700">{snap.done || 'No updates'}</p>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-blue-800 mb-1 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            To Do
                          </h4>
                          <p className="text-sm text-blue-700">{snap.toDo || 'No planned work'}</p>
                        </div>

                        <div className="bg-red-50 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-red-800 mb-1 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Blockers
                          </h4>
                          <p className="text-sm text-red-700">{snap.blockers || 'No blockers'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Selection Modal */}
      {showCardSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Select Card for Snap</h2>
                <button onClick={() => setShowCardSelection(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {cardSelectionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-sm text-red-800">{cardSelectionError}</p>
                </div>
              )}

              {loadingCards ? (
                <div className="flex justify-center py-8">
                  <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : sprintCards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No cards available in this sprint</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sprintCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => handleCardSelect(card)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{card.title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {card.assignee ? (card.assignee.fullName || card.assignee.name || card.assignee.username) : 'Unassigned'}
                        {card.externalId && <span className="ml-2 text-gray-400">• {card.externalId}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCardSelection(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Snap Modal */}
      {showCreateSnapModal && selectedCard && (
        <CreateSnapModal
          cardId={selectedCard.id}
          cardTitle={selectedCard.title}
          yesterdaySnap={yesterdaySnap}
          olderSnaps={olderSnaps}
          onClose={() => {
            setShowCreateSnapModal(false);
            setSelectedCard(null);
          }}
          onSuccess={handleCreateSnapSuccess}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingSnap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Edit Snap</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{editError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Done</label>
                <textarea
                  value={editDone}
                  onChange={(e) => setEditDone(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Do</label>
                <textarea
                  value={editToDo}
                  onChange={(e) => setEditToDo(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blockers</label>
                <textarea
                  value={editBlockers}
                  onChange={(e) => setEditBlockers(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RAG Status</label>
                <select
                  value={editFinalRAG}
                  onChange={(e) => setEditFinalRAG(e.target.value as SnapRAG | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Use AI Suggestion ({getRAGLabel(editingSnap.suggestedRAG)})</option>
                  <option value={SnapRAG.GREEN}>Green - On Track</option>
                  <option value={SnapRAG.AMBER}>Amber - At Risk</option>
                  <option value={SnapRAG.RED}>Red - Blocked</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={handleUpdateSnap}
                disabled={updating}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {updating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Snap'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
