import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import AppLayout from '../components/AppLayout';
import { Select } from '../components/ui/Select';
import CreateSnapModal from '../components/snaps/CreateSnapModal';
import EditSnapModal from '../components/snaps/EditSnapModal';
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
  const [editingSnap, setEditingSnap] = useState<Snap | null>(null);

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

  const handleEditSuccess = () => {
    setEditingSnap(null);
    loadSnaps();
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
      in_progress: 'bg-primary-100 text-blue-800',
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

    let summary = `${projectName.toUpperCase()} - DAILY STANDUP SUMMARY\n`;
    summary += `${'='.repeat(50)}\n\n`;
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
      const assignee = snap.card?.assignee?.fullName || snap.card?.assignee?.fullName || snap.card?.assignee?.displayName || 'Unassigned';

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
    const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const safeSprintName = sprintName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    a.download = `${safeProjectName}-${safeSprintName}-standup-summary-${selectedDate}.txt`;
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

    // Title with Project Name
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${projectName.toUpperCase()} - DAILY STANDUP SUMMARY`,
            bold: true,
            size: 36,
            color: '2563EB',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Sprint Info
    children.push(
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

    // Create table for snaps
    const tableRows: TableRow[] = [];

    // Header row
    tableRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true, size: 20, color: 'FFFFFF' })] })],
            shading: { fill: '2563EB' },
            width: { size: 5, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Card', bold: true, size: 20, color: 'FFFFFF' })] })],
            shading: { fill: '2563EB' },
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Assignee', bold: true, size: 20, color: 'FFFFFF' })] })],
            shading: { fill: '2563EB' },
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, size: 20, color: 'FFFFFF' })] })],
            shading: { fill: '2563EB' },
            width: { size: 10, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Done', bold: true, size: 20, color: 'FFFFFF' })] })],
            shading: { fill: '059669' },
            width: { size: 16, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'To Do', bold: true, size: 20, color: 'FFFFFF' })] })],
            shading: { fill: '2563EB' },
            width: { size: 17, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Blockers', bold: true, size: 20, color: 'FFFFFF' })] })],
            shading: { fill: 'DC2626' },
            width: { size: 17, type: WidthType.PERCENTAGE },
          }),
        ],
      })
    );

    // Data rows
    snaps.forEach((snap, index) => {
      const rag = snap.finalRAG || snap.suggestedRAG;
      const ragColor = rag === SnapRAG.GREEN ? '059669' : rag === SnapRAG.AMBER ? 'D97706' : rag === SnapRAG.RED ? 'DC2626' : '6B7280';
      const ragLabel = rag === SnapRAG.GREEN ? 'GREEN' : rag === SnapRAG.AMBER ? 'AMBER' : rag === SnapRAG.RED ? 'RED' : 'N/A';
      const assignee = snap.card?.assignee?.fullName || snap.card?.assignee?.displayName || 'Unassigned';
      const rowShading = index % 2 === 0 ? 'F9FAFB' : 'FFFFFF';

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${index + 1}`, size: 18 })] })],
              shading: { fill: rowShading },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: snap.card?.title || 'Unknown', size: 18, bold: true })] })],
              shading: { fill: rowShading },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: assignee, size: 18 })] })],
              shading: { fill: rowShading },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ragLabel, size: 18, bold: true, color: ragColor })] })],
              shading: { fill: rowShading },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: snap.done || '-', size: 18 })] })],
              shading: { fill: rowShading },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: snap.toDo || '-', size: 18 })] })],
              shading: { fill: rowShading },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: snap.blockers || '-', size: 18 })] })],
              shading: { fill: rowShading },
            }),
          ],
        })
      );
    });

    // Add table to children
    children.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );

    // Spacing after table
    children.push(new Paragraph({ spacing: { after: 300 } }));

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
    const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const safeSprintName = sprintName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    saveAs(blob, `${safeProjectName}-${safeSprintName}-standup-summary-${selectedDate}.docx`);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-secondary-500 via-primary-500 to-primary-600 rounded-2xl p-4 md:p-5 shadow-lg mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-cyan-100 text-sm font-medium mb-1">Snap Management</p>
              <h1 className="text-2xl md:text-2xl font-bold text-white">Daily Snaps</h1>
            </div>
            {activeTab === 'management' && (
              <button
                onClick={openCardSelection}
                disabled={!selectedSprintId || isLocked}
                className="flex items-center px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div className="flex-1 min-w-[200px]">
            <Select
              label="Project"
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              placeholder="Select a project"
              options={[
                { value: '', label: 'Select a project' },
                ...projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                })),
              ]}
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <Select
              label="Sprint"
              value={selectedSprintId}
              onChange={setSelectedSprintId}
              disabled={!selectedProjectId}
              placeholder={!selectedProjectId ? 'Select a project first' : 'Select a sprint'}
              options={[
                { value: '', label: !selectedProjectId ? 'Select a project first' : 'Select a sprint' },
                ...sprints.map((sprint) => ({
                  value: sprint.id,
                  label: sprint.name,
                })),
              ]}
            />
          </div>

          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Date</label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm hover:border-gray-300 transition-colors"
              />
            </div>
          </div>

          {/* Lock Status Indicator */}
          {selectedSprintId && (
            <div className="flex items-center">
              {isLocked ? (
                <span className="inline-flex items-center px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium">
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Locked
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Open
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('management')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'management'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Daily Management
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center mr-4 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary-600 uppercase tracking-wide">Today's Snaps</p>
                    <p className="text-2xl font-bold text-gray-900">{snaps.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mr-4 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-600 uppercase tracking-wide">On Track</p>
                    <p className="text-2xl font-bold text-green-600">
                      {snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.GREEN).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center mr-4 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">At Risk</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {snaps.filter(s => (s.finalRAG || s.suggestedRAG) === SnapRAG.AMBER).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-sm border border-red-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mr-4 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Off Track</p>
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
                      className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
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
                <svg className="animate-spin h-10 w-10 text-primary-600" viewBox="0 0 24 24">
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
              <div className="space-y-4">
                {snaps.map((snap) => {
                  const rag = snap.finalRAG || snap.suggestedRAG;
                  return (
                    <div key={snap.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
                      {/* Card Header with RAG indicator */}
                      <div className={`h-1 ${
                        rag === SnapRAG.GREEN ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                        rag === SnapRAG.AMBER ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                        rag === SnapRAG.RED ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                        'bg-gray-300'
                      }`}></div>
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 text-white font-bold text-sm ${
                              rag === SnapRAG.GREEN ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                              rag === SnapRAG.AMBER ? 'bg-gradient-to-br from-amber-500 to-yellow-600' :
                              rag === SnapRAG.RED ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                              'bg-gray-400'
                            }`}>
                              {(snap.card?.assignee?.fullName || snap.card?.assignee?.displayName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{snap.card?.title || 'Unknown Card'}</p>
                              <p className="text-sm text-gray-500">{snap.card?.assignee?.fullName || snap.card?.assignee?.displayName || 'Unassigned'}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            rag === SnapRAG.GREEN ? 'bg-green-100 text-green-700' :
                            rag === SnapRAG.AMBER ? 'bg-amber-100 text-amber-700' :
                            rag === SnapRAG.RED ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {getRAGLabel(rag)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                            <h4 className="text-xs font-semibold text-green-700 mb-1 flex items-center">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Done
                            </h4>
                            <p className="text-sm text-gray-700">{snap.done || 'No updates'}</p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                            <h4 className="text-xs font-semibold text-blue-700 mb-1 flex items-center">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              To Do
                            </h4>
                            <p className="text-sm text-gray-700">{snap.toDo || 'No planned work'}</p>
                          </div>
                          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-3 border border-red-100">
                            <h4 className="text-xs font-semibold text-red-700 mb-1 flex items-center">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                              </svg>
                              Blockers
                            </h4>
                            <p className="text-sm text-gray-700">{snap.blockers || 'None'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Management Tab */}
        {activeTab === 'management' && (
          <div>
            {/* Lock Status */}
            {selectedSprintId && selectedDate && (
              <div className={`mb-6 p-5 rounded-xl border ${isLocked ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {isLocked ? (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center mr-4 shadow-md">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-amber-800 font-semibold">Day Locked</p>
                          <p className="text-amber-600 text-sm">Snaps cannot be modified</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center mr-4 shadow-md">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-blue-800 font-semibold">{snaps.length} Snap{snaps.length !== 1 ? 's' : ''}</p>
                          <p className="text-primary-600 text-sm">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        </div>
                      </>
                    )}
                  </div>
                  {!isLocked && snaps.length > 0 && (
                    <button
                      onClick={handleLockDay}
                      disabled={locking}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg hover:from-amber-600 hover:to-yellow-700 transition-all shadow-md hover:shadow-lg flex items-center font-medium"
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
                          Lock Day
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
                <svg className="animate-spin h-10 w-10 text-primary-600" viewBox="0 0 24 24">
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
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Create First Snap
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {snaps.map((snap) => {
                  const rag = snap.finalRAG || snap.suggestedRAG;
                  return (
                    <div key={snap.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
                      {/* RAG indicator bar */}
                      <div className={`h-1.5 ${
                        rag === SnapRAG.GREEN ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                        rag === SnapRAG.AMBER ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                        rag === SnapRAG.RED ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                        'bg-gray-300'
                      }`}></div>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mr-4 text-white font-bold shadow-md ${
                              rag === SnapRAG.GREEN ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                              rag === SnapRAG.AMBER ? 'bg-gradient-to-br from-amber-500 to-yellow-600' :
                              rag === SnapRAG.RED ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                              'bg-gray-400'
                            }`}>
                              {(snap.card?.assignee?.fullName || snap.card?.assignee?.displayName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{snap.card?.title || 'Unknown Card'}</h3>
                              <p className="text-sm text-gray-500">{snap.card?.assignee?.fullName || snap.card?.assignee?.displayName || 'Unassigned'}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                              rag === SnapRAG.GREEN ? 'bg-green-100 text-green-700' :
                              rag === SnapRAG.AMBER ? 'bg-amber-100 text-amber-700' :
                              rag === SnapRAG.RED ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {getRAGLabel(rag)}
                            </span>
                            {!isLocked && (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => setEditingSnap(snap)}
                                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteSnap(snap.id)}
                                  disabled={deletingSnapId === snap.id}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                            <h4 className="text-xs font-semibold text-green-700 mb-2 flex items-center uppercase tracking-wide">
                              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Done
                            </h4>
                            <p className="text-sm text-gray-700">{snap.done || 'No updates'}</p>
                          </div>

                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                            <h4 className="text-xs font-semibold text-blue-700 mb-2 flex items-center uppercase tracking-wide">
                              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              To Do
                            </h4>
                            <p className="text-sm text-gray-700">{snap.toDo || 'No planned work'}</p>
                          </div>

                          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-4 border border-red-100">
                            <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center uppercase tracking-wide">
                              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                              </svg>
                              Blockers
                            </h4>
                            <p className="text-sm text-gray-700">{snap.blockers || 'No blockers'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Selection Modal */}
      {showCardSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">Select Card</h2>
                  <p className="text-blue-100 text-sm mt-1">Choose a card to create a snap</p>
                </div>
                <button
                  onClick={() => setShowCardSelection(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {cardSelectionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-sm text-red-800">{cardSelectionError}</p>
                </div>
              )}

              {loadingCards ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className="animate-spin h-10 w-10 text-primary-600 mb-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-gray-500 text-sm">Loading cards...</p>
                </div>
              ) : sprintCards.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">No cards available</p>
                  <p className="text-gray-500 text-sm mt-1">This sprint doesn't have any cards yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sprintCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => handleCardSelect(card)}
                      className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                          {card.assignee ? (card.assignee.fullName || card.assignee.displayName || 'U').charAt(0).toUpperCase() : '?'}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                              {card.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">
                              {card.assignee ? (card.assignee.fullName || card.assignee.displayName || card.assignee.username) : 'Unassigned'}
                            </span>
                            {card.externalId && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-400 font-mono text-xs">{card.externalId}</span>
                              </>
                            )}
                          </div>
                          {card.status && (
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                card.status === 'in_progress' ? 'bg-primary-100 text-blue-700' :
                                card.status === 'completed' ? 'bg-green-100 text-green-700' :
                                card.status === 'blocked' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {card.status === 'in_progress' ? 'In Progress' :
                                 card.status === 'completed' ? 'Completed' :
                                 card.status === 'blocked' ? 'Blocked' :
                                 card.status === 'not_started' ? 'Not Started' :
                                 card.status}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCardSelection(false)}
                className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
          dailyStandupCount={selectedCard.sprint.dailyStandupCount || 1}
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
      {editingSnap && (
        <EditSnapModal
          snap={editingSnap}
          onClose={() => setEditingSnap(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </AppLayout>
  );
}
