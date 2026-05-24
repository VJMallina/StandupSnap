import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cardsApi } from '../../services/api/cards';
import { sprintsApi } from '../../services/api/sprints';
import { teamMembersApi } from '../../services/api/teamMembers';
import { projectsApi } from '../../services/api/projects';
import { workflowApi } from '../../services/api/workflow';
import { Card, CardRAG, CardPriority, WorkflowLane, UpdateCardRequest, TransitionMode } from '../../types/card';
import { Sprint } from '../../types/sprint';
import { TeamMember } from '../../types/teamMember';
import { Project } from '../../types/project';
import AppLayout from '../../components/AppLayout';
import { Select } from '../../components/ui/Select';
import CreateCardModal from '../../components/cards/CreateCardModal';
import { KanbanBoard } from '../../components/cards/KanbanBoard';

type ViewMode = 'kanban' | 'backlog' | 'grid';

export default function CardsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cards, setCards] = useState<Card[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [workflowLanes, setWorkflowLanes] = useState<WorkflowLane[]>([]);
  const [transitionMode, setTransitionMode] = useState<TransitionMode>(TransitionMode.FREE);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(searchParams.get('projectId') || '');
  const [selectedSprintId, setSelectedSprintId] = useState<string>(searchParams.get('sprintId') || '');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [selectedRAG, setSelectedRAG] = useState<CardRAG | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<CardPriority | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('cardsViewMode') as ViewMode) || 'kanban';
  });

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadSprints(selectedProjectId);
      loadTeamMembers(selectedProjectId);
      loadWorkflow(selectedProjectId);
    } else {
      setWorkflowLanes([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadCards();
  }, [selectedProjectId, selectedSprintId, selectedAssigneeId, selectedRAG, selectedPriority, searchQuery, viewMode]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      const activeProjects = data.filter((p: Project) => !p.isArchived);
      setProjects(activeProjects);

      if (searchParams.get('projectId')) {
        const urlProjectId = searchParams.get('projectId')!;
        if (activeProjects.some((p: Project) => p.id === urlProjectId)) {
          setSelectedProjectId(urlProjectId);
          localStorage.setItem('lastSelectedProjectId', urlProjectId);
          return;
        }
      }

      if (activeProjects.length === 1) {
        setSelectedProjectId(activeProjects[0].id);
      } else if (activeProjects.length > 1) {
        const last = localStorage.getItem('lastSelectedProjectId');
        const found = last && activeProjects.find((p: Project) => p.id === last);
        setSelectedProjectId(found ? last! : activeProjects[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSprintId('');
    setSelectedAssigneeId('');
    if (projectId) localStorage.setItem('lastSelectedProjectId', projectId);
  };

  const loadSprints = async (projectId: string) => {
    try {
      const data = await sprintsApi.getAll({ projectId });
      setSprints(data);
    } catch (err: any) {
      console.error('Failed to load sprints:', err);
    }
  };

  const loadTeamMembers = async (projectId: string) => {
    try {
      const data = await teamMembersApi.getProjectTeam(projectId);
      setTeamMembers(data);
    } catch (err: any) {
      console.error('Failed to load team members:', err);
    }
  };

  const loadWorkflow = async (projectId: string) => {
    try {
      const workflow = await workflowApi.getDefaultWorkflow(projectId);
      const sorted = [...(workflow.lanes || [])].sort((a, b) => a.order - b.order);
      setWorkflowLanes(sorted);
      setTransitionMode(workflow.transitionMode ?? TransitionMode.FREE);
    } catch {
      setWorkflowLanes([]);
    }
  };

  const loadCards = async () => {
    try {
      setLoading(true);
      const isBacklog = viewMode === 'backlog';
      const data: Card[] = await cardsApi.getAll({
        projectId: selectedProjectId || undefined,
        sprintId: isBacklog ? undefined : (selectedSprintId || undefined),
        assigneeId: selectedAssigneeId || undefined,
        ragStatus: selectedRAG || undefined,
        priority: selectedPriority || undefined,
        search: searchQuery || undefined,
        backlog: isBacklog ? true : undefined,
      });
      // Kanban/grid view should never show backlog (unsprinted) cards — those belong in the backlog view
      const filtered = isBacklog ? data : data.filter((c) => !!c.sprint);
      setCards(filtered);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (card: Card) => {
    if (!window.confirm(`Are you sure you want to delete "${card.title}"?\n\nThis will permanently remove the card and all associated snaps.`)) return;
    try {
      await cardsApi.delete(card.id);
      loadCards();
    } catch (err: any) {
      alert('Failed to delete card: ' + err.message);
    }
  };

  const handleLaneChange = async (cardId: string, laneId: string) => {
    // Enforce transition mode before moving
    if (transitionMode !== TransitionMode.FREE) {
      const card = cards.find((c) => c.id === cardId);
      const fromOrder = workflowLanes.find((l) => l.id === card?.laneId)?.order ?? -1;
      const toOrder = workflowLanes.find((l) => l.id === laneId)?.order ?? -1;
      const diff = toOrder - fromOrder;
      const allowed =
        transitionMode === TransitionMode.SEQUENTIAL ? Math.abs(diff) === 1 : diff === 1;
      if (!allowed) return;
    }

    // Optimistically move the card in local state so the UI updates instantly
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, laneId } : c));

    try {
      await cardsApi.moveToLane(cardId, laneId);
    } catch (err: any) {
      // Revert to server state on failure
      await loadCards();
      alert('Failed to move card: ' + err.message);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('cardsViewMode', mode);
  };

  const clearFilters = () => {
    handleProjectChange('');
    setSelectedSprintId('');
    setSelectedAssigneeId('');
    setSelectedRAG('');
    setSelectedPriority('');
    setSearchQuery('');
  };

  const getRAGBadge = (rag?: CardRAG) => {
    if (!rag) return { color: 'bg-gray-100 text-gray-500', label: 'N/A' };
    return {
      [CardRAG.RED]: { color: 'bg-red-100 text-red-800', label: 'Red' },
      [CardRAG.AMBER]: { color: 'bg-yellow-100 text-yellow-800', label: 'Amber' },
      [CardRAG.GREEN]: { color: 'bg-green-100 text-green-800', label: 'Green' },
    }[rag];
  };

  const getPriorityBadge = (priority: CardPriority) => ({
    [CardPriority.LOW]: { color: 'bg-gray-100 text-gray-600', label: 'Low' },
    [CardPriority.MEDIUM]: { color: 'bg-primary-100 text-primary-700', label: 'Medium' },
    [CardPriority.HIGH]: { color: 'bg-orange-100 text-orange-700', label: 'High' },
    [CardPriority.CRITICAL]: { color: 'bg-red-100 text-red-700', label: 'Critical' },
  }[priority]);

  const handleCardUpdate = async (cardId: string, data: UpdateCardRequest) => {
    await cardsApi.update(cardId, data);
    loadCards();
  };

  const hasActiveFilters = selectedProjectId || selectedSprintId || selectedAssigneeId || selectedRAG || selectedPriority || searchQuery;
  const canCreateCard = selectedProjectId && !projects.find(p => p.id === selectedProjectId)?.isArchived;

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 md:p-5 shadow-lg mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-primary-100 text-sm font-medium mb-1">Work Items</p>
              <h1 className="text-2xl font-bold text-white">Cards</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1">
                {(['kanban', 'backlog', 'grid'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleViewModeChange(mode)}
                    className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                      viewMode === mode
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {mode === 'kanban' && (
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                      </svg>
                    )}
                    {mode === 'backlog' && (
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    )}
                    {mode === 'grid' && (
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    )}
                    {mode}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={!canCreateCard}
                className="flex items-center px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Card
              </button>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>}

        {/* Backlog info banner */}
        {viewMode === 'backlog' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-amber-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Showing cards not assigned to any sprint. Drag a card to a sprint from the card detail view.
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Project"
              value={selectedProjectId}
              onChange={handleProjectChange}
              placeholder="All Projects"
              options={[
                { value: '', label: 'All Projects' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          {viewMode !== 'backlog' && (
            <div className="flex-1 min-w-[150px]">
              <Select
                label="Sprint"
                value={selectedSprintId}
                onChange={setSelectedSprintId}
                disabled={!selectedProjectId}
                placeholder="All Sprints"
                options={[
                  { value: '', label: 'All Sprints' },
                  ...sprints.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </div>
          )}

          <div className="flex-1 min-w-[150px]">
            <Select
              label="Assignee"
              value={selectedAssigneeId}
              onChange={setSelectedAssigneeId}
              disabled={!selectedProjectId}
              placeholder="All Assignees"
              options={[
                { value: '', label: 'All Assignees' },
                ...teamMembers.map((m) => ({ value: m.id, label: m.fullName })),
              ]}
            />
          </div>

          <div className="flex-1 min-w-[120px]">
            <Select
              label="RAG"
              value={selectedRAG}
              onChange={(v) => setSelectedRAG(v as CardRAG | '')}
              placeholder="All RAG"
              options={[
                { value: '', label: 'All RAG' },
                { value: CardRAG.GREEN, label: 'Green' },
                { value: CardRAG.AMBER, label: 'Amber' },
                { value: CardRAG.RED, label: 'Red' },
              ]}
            />
          </div>

          <div className="flex-1 min-w-[120px]">
            <Select
              label="Priority"
              value={selectedPriority}
              onChange={(v) => setSelectedPriority(v as CardPriority | '')}
              placeholder="All Priorities"
              options={[
                { value: '', label: 'All Priorities' },
                { value: CardPriority.LOW, label: 'Low' },
                { value: CardPriority.MEDIUM, label: 'Medium' },
                { value: CardPriority.HIGH, label: 'High' },
                { value: CardPriority.CRITICAL, label: 'Critical' },
              ]}
            />
          </div>

          <div className="flex-[2] min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title..."
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mb-4">
            <button onClick={clearFilters} className="text-sm text-primary-600 hover:underline">
              Clear all filters
            </button>
          </div>
        )}

        {/* Cards View */}
        {loading && cards.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No cards found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {viewMode === 'backlog'
                ? 'No unassigned cards in the backlog.'
                : hasActiveFilters
                ? 'Try adjusting your filters.'
                : selectedProjectId
                ? 'Create the first card for this project.'
                : 'Select a project to view cards.'}
            </p>
            {canCreateCard && !hasActiveFilters && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 inline-flex items-center px-4 py-2 shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Create Card
              </button>
            )}
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            cards={cards}
            lanes={workflowLanes}
            onLaneChange={handleLaneChange}
            onCardClick={(card) => navigate(`/cards/${card.id}`)}
            onDelete={handleDelete}
            transitionMode={transitionMode}
          />
        ) : viewMode === 'backlog' ? (
          <BacklogList cards={cards} onCardClick={(card) => navigate(`/cards/${card.id}`)} onDelete={handleDelete} onCardUpdate={handleCardUpdate} getPriorityBadge={getPriorityBadge} getRAGBadge={getRAGBadge} teamMembers={teamMembers} />
        ) : (
          <GridView cards={cards} onCardClick={(card) => navigate(`/cards/${card.id}`)} onDelete={handleDelete} getPriorityBadge={getPriorityBadge} getRAGBadge={getRAGBadge} />
        )}
      </div>

      {showCreateModal && selectedProjectId && (
        <CreateCardModal
          projectId={selectedProjectId}
          preSelectedSprintId={selectedSprintId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadCards}
        />
      )}
    </AppLayout>
  );
}

const AVATAR_COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-rose-500','bg-amber-500','bg-cyan-500','bg-pink-500','bg-indigo-500'];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function BacklogList({ cards, onCardClick, onDelete, onCardUpdate, getPriorityBadge, getRAGBadge, teamMembers }: {
  cards: Card[];
  onCardClick: (c: Card) => void;
  onDelete: (c: Card) => void;
  onCardUpdate: (cardId: string, data: UpdateCardRequest) => Promise<void>;
  getPriorityBadge: (p: CardPriority) => { color: string; label: string };
  getRAGBadge: (r?: CardRAG) => { color: string; label: string };
  teamMembers: TeamMember[];
}) {
  const [editingCell, setEditingCell] = useState<{ cardId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const isEditing = (cardId: string, field: string) =>
    editingCell?.cardId === cardId && editingCell?.field === field;

  const startEdit = (e: React.MouseEvent, cardId: string, field: string, currentValue: string) => {
    e.stopPropagation();
    setEditingCell({ cardId, field });
    setEditValue(currentValue);
  };

  const commitTextEdit = async (cardId: string, field: string) => {
    setEditingCell(null);
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    let data: UpdateCardRequest = {};
    if (field === 'title') {
      if (!editValue.trim() || editValue.trim() === card.title) return;
      data = { title: editValue.trim() };
    } else if (field === 'storyPoints') {
      const num = editValue === '' ? undefined : Number(editValue);
      if (num === card.storyPoints) return;
      data = { storyPoints: num };
    } else if (field === 'estimatedTime') {
      const num = parseFloat(editValue);
      if (isNaN(num) || num <= 0 || num === card.estimatedTime) return;
      data = { estimatedTime: num };
    } else if (field === 'dueDate') {
      const newDate = editValue || null;
      const oldDate = card.dueDate ? card.dueDate.split('T')[0] : null;
      if (newDate === oldDate) return;
      data = { dueDate: newDate };
    } else {
      return;
    }

    await onCardUpdate(cardId, data);
  };

  const handleKeyDown = (e: React.KeyboardEvent, cardId: string, field: string) => {
    if (e.key === 'Enter') { e.preventDefault(); commitTextEdit(cardId, field); }
    else if (e.key === 'Escape') setEditingCell(null);
  };

  const saveSelect = async (cardId: string, field: string, value: string) => {
    setEditingCell(null);
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    let data: UpdateCardRequest = {};
    if (field === 'priority') {
      if (value === card.priority) return;
      data = { priority: value as CardPriority };
    } else if (field === 'assigneeId') {
      const newVal = value || null;
      const oldVal = card.assignee?.id ?? null;
      if (newVal === oldVal) return;
      data = { assigneeId: newVal };
    }

    if (Object.keys(data).length === 0) return;
    await onCardUpdate(cardId, data);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left">
            <th className="px-4 py-3 font-medium text-gray-500 w-[35%]">Title</th>
            <th className="px-4 py-3 font-medium text-gray-500">Type</th>
            <th className="px-4 py-3 font-medium text-gray-500">Priority</th>
            <th className="px-4 py-3 font-medium text-gray-500">SP</th>
            <th className="px-4 py-3 font-medium text-gray-500">Est.</th>
            <th className="px-4 py-3 font-medium text-gray-500">RAG</th>
            <th className="px-4 py-3 font-medium text-gray-500">Due</th>
            <th className="px-4 py-3 font-medium text-gray-500">Assignee</th>
            <th className="px-4 py-3 w-16" />
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => {
            const pri = getPriorityBadge(card.priority);
            const rag = getRAGBadge(card.ragStatus);
            const assigneeName = card.assignee ? (card.assignee.fullName || card.assignee.displayName || '') : '';

            return (
              <tr key={card.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                {/* Title */}
                <td className="px-4 py-2.5" onClick={(e) => startEdit(e, card.id, 'title', card.title)}>
                  {isEditing(card.id, 'title') ? (
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitTextEdit(card.id, 'title')}
                      onKeyDown={(e) => handleKeyDown(e, card.id, 'title')}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full border border-primary-400 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="cursor-text">
                      <div className="font-medium text-gray-900 truncate max-w-xs hover:text-primary-600 transition-colors">{card.title}</div>
                      {card.externalId && <div className="text-xs text-gray-400 font-mono">{card.externalId}</div>}
                      {card.labels && card.labels.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {card.labels.slice(0, 2).map(l => (
                            <span key={l} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded-full">{l}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {/* Type — display only */}
                <td className="px-4 py-2.5">
                  <span className="capitalize text-gray-600">{card.cardType.replace('_', ' ')}</span>
                </td>

                {/* Priority — select */}
                <td className="px-4 py-2.5" onClick={(e) => { if (!isEditing(card.id, 'priority')) startEdit(e, card.id, 'priority', card.priority); }}>
                  {isEditing(card.id, 'priority') ? (
                    <select
                      autoFocus
                      value={editValue}
                      onChange={(e) => saveSelect(card.id, 'priority', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      onClick={(e) => e.stopPropagation()}
                      className="border border-primary-400 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={CardPriority.LOW}>Low</option>
                      <option value={CardPriority.MEDIUM}>Medium</option>
                      <option value={CardPriority.HIGH}>High</option>
                      <option value={CardPriority.CRITICAL}>Critical</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full cursor-pointer hover:ring-2 hover:ring-primary-200 transition-all ${pri.color}`}>{pri.label}</span>
                  )}
                </td>

                {/* Story Points */}
                <td className="px-4 py-2.5" onClick={(e) => startEdit(e, card.id, 'storyPoints', card.storyPoints?.toString() ?? '')}>
                  {isEditing(card.id, 'storyPoints') ? (
                    <input
                      autoFocus
                      type="number"
                      min="1"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitTextEdit(card.id, 'storyPoints')}
                      onKeyDown={(e) => handleKeyDown(e, card.id, 'storyPoints')}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 border border-primary-400 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <span className="text-gray-600 cursor-text px-1 py-0.5 rounded hover:bg-gray-100 transition-colors">{card.storyPoints ?? '—'}</span>
                  )}
                </td>

                {/* Estimated Time */}
                <td className="px-4 py-2.5" onClick={(e) => startEdit(e, card.id, 'estimatedTime', card.estimatedTime.toString())}>
                  {isEditing(card.id, 'estimatedTime') ? (
                    <input
                      autoFocus
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitTextEdit(card.id, 'estimatedTime')}
                      onKeyDown={(e) => handleKeyDown(e, card.id, 'estimatedTime')}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 border border-primary-400 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <span className="text-gray-600 cursor-text px-1 py-0.5 rounded hover:bg-gray-100 transition-colors">{card.estimatedTime}h</span>
                  )}
                </td>

                {/* RAG — display only */}
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${rag.color}`}>{rag.label}</span>
                </td>

                {/* Due Date */}
                <td className="px-4 py-2.5" onClick={(e) => startEdit(e, card.id, 'dueDate', card.dueDate ? card.dueDate.split('T')[0] : '')}>
                  {isEditing(card.id, 'dueDate') ? (
                    <input
                      autoFocus
                      type="date"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitTextEdit(card.id, 'dueDate')}
                      onKeyDown={(e) => handleKeyDown(e, card.id, 'dueDate')}
                      onClick={(e) => e.stopPropagation()}
                      className="border border-primary-400 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <span className="text-gray-500 text-xs cursor-text px-1 py-0.5 rounded hover:bg-gray-100 transition-colors">
                      {card.dueDate ? new Date(card.dueDate).toLocaleDateString() : '—'}
                    </span>
                  )}
                </td>

                {/* Assignee — select with avatar */}
                <td className="px-4 py-2.5" onClick={(e) => { if (!isEditing(card.id, 'assigneeId')) startEdit(e, card.id, 'assigneeId', card.assignee?.id ?? ''); }}>
                  {isEditing(card.id, 'assigneeId') ? (
                    <select
                      autoFocus
                      value={editValue}
                      onChange={(e) => saveSelect(card.id, 'assigneeId', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      onClick={(e) => e.stopPropagation()}
                      className="border border-primary-400 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 max-w-[140px]"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.fullName}</option>
                      ))}
                    </select>
                  ) : card.assignee ? (
                    <div className="flex items-center gap-2 cursor-pointer">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-white flex-shrink-0 ${getAvatarColor(assigneeName)}`}>
                        {getInitials(assigneeName)}
                      </div>
                      <span className="text-xs text-gray-600 truncate max-w-[80px] hover:text-primary-600 transition-colors">{assigneeName}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic cursor-pointer hover:text-primary-500 transition-colors">Unassigned</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onCardClick(card); }}
                      title="Open card"
                      className="p-1 text-gray-400 hover:text-primary-600 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(card); }}
                      title="Delete card"
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GridView({ cards, onCardClick, onDelete, getPriorityBadge, getRAGBadge }: {
  cards: Card[];
  onCardClick: (c: Card) => void;
  onDelete: (c: Card) => void;
  getPriorityBadge: (p: CardPriority) => { color: string; label: string };
  getRAGBadge: (r?: CardRAG) => { color: string; label: string };
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card, index) => {
        const pri = getPriorityBadge(card.priority);
        const rag = getRAGBadge(card.ragStatus);
        const ragAccent: Record<CardRAG, string> = {
          [CardRAG.RED]: 'from-red-500 to-red-600',
          [CardRAG.AMBER]: 'from-amber-500 to-amber-600',
          [CardRAG.GREEN]: 'from-emerald-500 to-emerald-600',
        };

        return (
          <div
            key={card.id}
            onClick={() => onCardClick(card)}
            className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer transform transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-primary-200"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`h-1.5 bg-gradient-to-r ${card.ragStatus ? ragAccent[card.ragStatus] : 'from-gray-300 to-gray-400'}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-600">{card.title}</h3>
                  {card.externalId && <p className="text-xs text-gray-500 mt-0.5 font-mono">{card.externalId}</p>}
                </div>
                <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${pri.color}`}>{pri.label}</span>
              </div>

              <div className="space-y-1 mb-3 text-xs text-gray-600">
                {card.sprint && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {card.sprint.name}
                  </div>
                )}
                {card.assignee && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {card.assignee.fullName}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex gap-1.5">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${rag.color}`}>{rag.label}</span>
                  {card.storyPoints != null && (
                    <span className="px-2 py-0.5 text-xs bg-primary-50 text-primary-600 rounded-full font-semibold">{card.storyPoints} SP</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(card); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
