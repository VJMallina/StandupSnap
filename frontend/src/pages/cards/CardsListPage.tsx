import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cardsApi } from '../../services/api/cards';
import { sprintsApi } from '../../services/api/sprints';
import { teamMembersApi } from '../../services/api/teamMembers';
import { projectsApi } from '../../services/api/projects';
import { workflowApi } from '../../services/api/workflow';
import { Card, CardPriority, CardType, WorkflowLane, TransitionMode } from '../../types/card';
import { Sprint } from '../../types/sprint';
import { TeamMember } from '../../types/teamMember';
import { Project } from '../../types/project';
import AppLayout from '../../components/AppLayout';
import CreateCardModal from '../../components/cards/CreateCardModal';
import { KanbanBoard } from '../../components/cards/KanbanBoard';
import { BacklogTree } from '../../components/cards/BacklogTree';

type Tab = 'board' | 'backlog';

const PRIORITY_CHIP: Record<CardPriority, { active: string; inactive: string; label: string }> = {
  [CardPriority.CRITICAL]: {
    active:   'bg-red-100 border-red-300 text-red-700 shadow-sm',
    inactive: 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
    label: 'Critical',
  },
  [CardPriority.HIGH]: {
    active:   'bg-orange-100 border-orange-300 text-orange-700 shadow-sm',
    inactive: 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
    label: 'High',
  },
  [CardPriority.MEDIUM]: {
    active:   'bg-blue-100 border-blue-300 text-blue-700 shadow-sm',
    inactive: 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
    label: 'Medium',
  },
  [CardPriority.LOW]: {
    active:   'bg-gray-100 border-gray-300 text-gray-600 shadow-sm',
    inactive: 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
    label: 'Low',
  },
};

export default function CardsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Tab & filters ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>(
    () => (localStorage.getItem('cardsTab') as Tab) || 'board',
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    searchParams.get('projectId') || '',
  );
  const [selectedSprintId, setSelectedSprintId] = useState<string>(
    searchParams.get('sprintId') || '',
  );
  const [selectedPriority, setSelectedPriority] = useState<CardPriority | ''>('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [selectedEpicId, setSelectedEpicId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ── Reference data ───────────────────────────────────────────────
  const [projects, setProjects]     = useState<Project[]>([]);
  const [sprints, setSprints]       = useState<Sprint[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [workflowLanes, setWorkflowLanes] = useState<WorkflowLane[]>([]);
  const [transitionMode, setTransitionMode] = useState<TransitionMode>(TransitionMode.FREE);

  // ── Card data ────────────────────────────────────────────────────
  const [epics, setEpics]             = useState<Card[]>([]);
  const [boardCards, setBoardCards]   = useState<Card[]>([]);
  const [backlogCards, setBacklogCards] = useState<Card[]>([]);

  // ── UI ───────────────────────────────────────────────────────────
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ── Bootstrap ────────────────────────────────────────────────────
  useEffect(() => {
    projectsApi.getAll().then((data: Project[]) => {
      const active = data.filter(p => !p.isArchived);
      setProjects(active);

      let initial = '';
      const urlId = searchParams.get('projectId');
      if (urlId && active.some(p => p.id === urlId)) {
        initial = urlId;
      } else {
        const last = localStorage.getItem('lastSelectedProjectId');
        const found = last && active.find(p => p.id === last);
        initial = found ? last! : (active[0]?.id || '');
      }
      setSelectedProjectId(initial);
    }).catch((e: Error) => setError(e.message));
  }, []);

  // When project changes, reload reference data + epics
  useEffect(() => {
    if (!selectedProjectId) {
      setWorkflowLanes([]);
      setSprints([]);
      setTeamMembers([]);
      setEpics([]);
      setBoardCards([]);
      setBacklogCards([]);
      return;
    }

    Promise.all([
      sprintsApi.getAll({ projectId: selectedProjectId })
        .then(setSprints).catch(() => setSprints([])),
      teamMembersApi.getProjectTeam(selectedProjectId)
        .then(setTeamMembers).catch(() => setTeamMembers([])),
      workflowApi.getDefaultWorkflow(selectedProjectId).then(wf => {
        setWorkflowLanes([...(wf.lanes || [])].sort((a, b) => a.order - b.order));
        setTransitionMode(wf.transitionMode ?? TransitionMode.FREE);
      }).catch(() => setWorkflowLanes([])),
      cardsApi.getAll({ projectId: selectedProjectId, cardType: CardType.EPIC })
        .then(setEpics).catch(() => setEpics([])),
    ]);
  }, [selectedProjectId]);

  // Reload card data when tab / filters change
  useEffect(() => {
    if (!selectedProjectId) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        if (activeTab === 'board') {
          const data = await cardsApi.getAll({
            projectId: selectedProjectId,
            cardType:  CardType.CARD,
            sprintId:  selectedSprintId || undefined,
            priority:  selectedPriority || undefined,
            assigneeId: selectedAssigneeId || undefined,
            parentId:  selectedEpicId || undefined,
            search:    searchQuery || undefined,
          });
          // On board, only show cards that belong to a sprint
          const sprinted = selectedSprintId
            ? data
            : data.filter(c => c.sprint !== null);
          if (!cancelled) setBoardCards(sprinted);
        } else {
          const data = await cardsApi.getAll({
            projectId: selectedProjectId,
            cardType:  CardType.CARD,
            backlog:   true,
            priority:  selectedPriority || undefined,
            assigneeId: selectedAssigneeId || undefined,
            search:    searchQuery || undefined,
          });
          if (!cancelled) setBacklogCards(data);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [activeTab, selectedProjectId, selectedSprintId, selectedPriority, selectedAssigneeId, selectedEpicId, searchQuery]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleLaneChange = async (cardId: string, laneId: string) => {
    if (transitionMode !== TransitionMode.FREE) {
      const card = boardCards.find(c => c.id === cardId);
      const fromOrder = workflowLanes.find(l => l.id === card?.laneId)?.order ?? -1;
      const toOrder   = workflowLanes.find(l => l.id === laneId)?.order ?? -1;
      const diff = toOrder - fromOrder;
      const allowed = transitionMode === TransitionMode.SEQUENTIAL
        ? Math.abs(diff) === 1 : diff === 1;
      if (!allowed) return;
    }
    setBoardCards(prev => prev.map(c => c.id === cardId ? { ...c, laneId } : c));
    try {
      await cardsApi.moveToLane(cardId, laneId);
    } catch {
      // Revert on failure
      const fresh = await cardsApi.getAll({
        projectId: selectedProjectId, cardType: CardType.CARD,
        sprintId: selectedSprintId || undefined,
      });
      setBoardCards(selectedSprintId ? fresh : fresh.filter(c => c.sprint !== null));
    }
  };

  const handleDelete = async (card: Card) => {
    if (!window.confirm(`Delete "${card.title}"? This cannot be undone.`)) return;
    try {
      await cardsApi.delete(card.id);
      setBoardCards(prev => prev.filter(c => c.id !== card.id));
      setBacklogCards(prev => prev.filter(c => c.id !== card.id));
    } catch (e: any) {
      alert('Failed to delete card: ' + e.message);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    localStorage.setItem('cardsTab', tab);
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSprintId('');
    setSelectedAssigneeId('');
    setSelectedEpicId('');
    setSelectedPriority('');
    setSearchQuery('');
    if (projectId) localStorage.setItem('lastSelectedProjectId', projectId);
  };

  const handleCreateSuccess = async () => {
    // Refresh epics + cards after creation
    const [newEpics] = await Promise.all([
      cardsApi.getAll({ projectId: selectedProjectId, cardType: CardType.EPIC }).catch(() => epics),
    ]);
    setEpics(newEpics);
    // Re-trigger card load by bumping a dummy counter would be overkill;
    // just fetch directly.
    if (activeTab === 'board') {
      const data = await cardsApi.getAll({
        projectId: selectedProjectId, cardType: CardType.CARD,
        sprintId: selectedSprintId || undefined,
      }).catch(() => boardCards);
      setBoardCards(selectedSprintId ? data : data.filter(c => c.sprint !== null));
    } else {
      const data = await cardsApi.getAll({
        projectId: selectedProjectId, cardType: CardType.CARD, backlog: true,
      }).catch(() => backlogCards);
      setBacklogCards(data);
    }
  };

  const togglePriority = (p: CardPriority) =>
    setSelectedPriority(prev => prev === p ? '' : p);

  const clearFilters = () => {
    setSelectedPriority('');
    setSelectedAssigneeId('');
    setSelectedEpicId('');
    setSearchQuery('');
  };

  // ── Derived ──────────────────────────────────────────────────────
  const canCreateCard = !!selectedProjectId &&
    !projects.find(p => p.id === selectedProjectId)?.isArchived;
  const hasFilters = !!selectedPriority || !!selectedAssigneeId || !!selectedEpicId || !!searchQuery;
  const selectedAssigneeName = teamMembers.find(
    m => (m.userId || m.id) === selectedAssigneeId,
  )?.fullName;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            {/* Title + project picker */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                  Work Items
                </p>
                <h1 className="text-xl font-bold text-gray-900">Cards</h1>
              </div>

              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={e => handleProjectChange(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer shadow-sm"
                >
                  <option value="">All Projects</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.key ? `[${p.key}] ` : ''}{p.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Create button */}
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!canCreateCard}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-primary-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </button>
          </div>

          {/* ── Tabs ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-0.5">
            {(['board', 'backlog'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-all -mb-px ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                {tab === 'board' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                )}
                {tab === 'board' ? 'Board' : 'Backlog'}
              </button>
            ))}
            <div className="flex-1 border-b-2 border-transparent" />
          </div>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────── */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3 flex-wrap flex-shrink-0">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search cards…"
              className="pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
            />
          </div>

          <div className="h-5 w-px bg-gray-200 flex-shrink-0" />

          {/* Priority chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.keys(PRIORITY_CHIP) as CardPriority[]).map(p => (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  selectedPriority === p ? PRIORITY_CHIP[p].active : PRIORITY_CHIP[p].inactive
                }`}
              >
                {PRIORITY_CHIP[p].label}
              </button>
            ))}
          </div>

          {/* Sprint (board only) */}
          {activeTab === 'board' && sprints.length > 0 && (
            <>
              <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
              <div className="relative">
                <select
                  value={selectedSprintId}
                  onChange={e => setSelectedSprintId(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                >
                  <option value="">All Sprints</option>
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <svg
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </>
          )}

          {/* Epic filter (board only) */}
          {activeTab === 'board' && epics.length > 0 && (
            <>
              <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
              {selectedEpicId ? (
                <button
                  onClick={() => setSelectedEpicId('')}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold rounded-full hover:bg-purple-100 transition-colors"
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  {epics.find(e => e.id === selectedEpicId)?.externalId || epics.find(e => e.id === selectedEpicId)?.title || 'Epic'}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <div className="relative">
                  <select
                    value={selectedEpicId}
                    onChange={e => setSelectedEpicId(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                  >
                    <option value="">All Epics</option>
                    {epics.map(ep => (
                      <option key={ep.id} value={ep.id}>
                        {ep.externalId ? `${ep.externalId} · ${ep.title}` : ep.title}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </>
          )}

          {/* Assignee */}
          {teamMembers.length > 0 && (
            <>
              <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
              {selectedAssigneeId ? (
                <button
                  onClick={() => setSelectedAssigneeId('')}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full hover:bg-indigo-100 transition-colors"
                >
                  {selectedAssigneeName}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <div className="relative">
                  <select
                    value={selectedAssigneeId}
                    onChange={e => setSelectedAssigneeId(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  >
                    <option value="">All Assignees</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.userId || m.id}>{m.fullName}</option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </>
          )}

          {/* Clear */}
          {hasFilters && (
            <>
              <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          {!selectedProjectId ? (
            <EmptyProjectState />
          ) : loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : activeTab === 'board' ? (
            <KanbanBoard
              cards={boardCards}
              lanes={workflowLanes}
              onLaneChange={handleLaneChange}
              onCardClick={card => navigate(`/cards/${card.id}`)}
              onDelete={handleDelete}
              transitionMode={transitionMode}
            />
          ) : (
            <BacklogTree
              epics={epics}
              cards={backlogCards}
              onCardClick={card => navigate(`/cards/${card.id}`)}
              onEpicClick={card => navigate(`/cards/${card.id}`)}
              onCreateCard={canCreateCard ? () => setShowCreateModal(true) : undefined}
            />
          )}
        </div>
      </div>

      {showCreateModal && selectedProjectId && (
        <CreateCardModal
          projectId={selectedProjectId}
          preSelectedSprintId={selectedSprintId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </AppLayout>
  );
}

function EmptyProjectState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-500">Select a project</p>
      <p className="text-xs text-gray-400 mt-1">Choose a project above to view its cards</p>
    </div>
  );
}
