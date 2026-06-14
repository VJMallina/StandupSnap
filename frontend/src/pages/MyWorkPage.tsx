import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';
import { KanbanBoard } from '../components/cards/KanbanBoard';
import { cardsApi } from '../services/api/cards';
import { workflowApi } from '../services/api/workflow';
import { Card, WorkflowLane, CardRAG, CardStatus, CardPriority } from '../types/card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Snap {
  id: string;
  done: string | null;
  toDo: string | null;
  blockers: string | null;
  finalRAG: string | null;
  snapDate: string;
  card?: { id: string; title: string };
}

interface ProjectBoard {
  projectId: string;
  projectName: string;
  cards: Card[];
  lanes: WorkflowLane[];
}

const RAG_COLORS: Record<string, string> = {
  green: 'bg-green-100 text-green-700 border-green-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};


const PRIORITY_CFG: Record<CardPriority, { bars: number; color: string }> = {
  [CardPriority.LOW]:      { bars: 1, color: '#9ca3af' },
  [CardPriority.MEDIUM]:   { bars: 2, color: '#3b82f6' },
  [CardPriority.HIGH]:     { bars: 3, color: '#f59e0b' },
  [CardPriority.CRITICAL]: { bars: 4, color: '#ef4444' },
};

function PriorityBars({ priority }: { priority: CardPriority }) {
  const { bars, color } = PRIORITY_CFG[priority] ?? PRIORITY_CFG[CardPriority.MEDIUM];
  const heights = [3, 5, 7, 9];
  return (
    <svg width="16" height="9" viewBox="0 0 16 9" className="flex-shrink-0" aria-label={priority}>
      {heights.map((h, i) => (
        <rect key={i} x={i * 4} y={9 - h} width="3" height={h} rx="0.5"
          fill={i < bars ? color : '#e5e7eb'} />
      ))}
    </svg>
  );
}

function BacklogColumn({ cards, onCardClick }: { cards: Card[]; onCardClick: (card: Card) => void }) {
  const RAG_BORDER_MAP: Record<string, string> = {
    red: 'border-l-red-500',
    amber: 'border-l-amber-400',
    green: 'border-l-green-500',
  };

  return (
    <div className="flex flex-col w-[272px] flex-shrink-0">
      {/* Column header — matches KanbanColumn style */}
      <div className="flex items-center gap-2 px-1 mb-2.5">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm bg-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700 flex-1">Backlog</h3>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full min-w-[24px] text-center">
          {cards.length}
        </span>
      </div>

      {/* Card list — hover highlights like Jira, click to open */}
      <div className="flex-1 rounded-xl bg-gray-50/60 p-2 space-y-1.5 min-h-[120px] max-h-[calc(100vh-230px)] overflow-y-auto">
        {cards.map((card) => {
          const ragBorderCls = card.ragStatus ? RAG_BORDER_MAP[card.ragStatus] : 'border-l-gray-200';
          const id = card.externalId || `#${card.id.slice(0, 6)}`;
          const dash = id.lastIndexOf('-');
          return (
            <button
              key={card.id}
              onClick={() => onCardClick(card)}
              className={`group w-full text-left bg-white rounded-lg border border-gray-200 border-l-4 ${ragBorderCls}
                px-3 py-2.5 transition-all duration-100
                hover:border-primary-300 hover:shadow-md hover:bg-primary-50/40 hover:-translate-y-px
                focus:outline-none focus:ring-2 focus:ring-primary-400`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-mono font-bold tracking-wide leading-none">
                  {dash === -1 ? (
                    <span className="text-primary-600">{id}</span>
                  ) : (
                    <>
                      <span className="text-primary-600">{id.slice(0, dash)}</span>
                      <span className="text-gray-400">{id.slice(dash)}</span>
                    </>
                  )}
                </span>
                <PriorityBars priority={card.priority} />
              </div>
              <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-primary-900">
                {card.title}
              </p>
              {card.sprint && (
                <p className="text-[11px] text-gray-400 mt-1 truncate">{card.sprint.name}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProjectTabContent({
  board,
  onLaneChange,
  onCardClick,
}: {
  board: ProjectBoard;
  onLaneChange: (cardId: string, laneId: string) => Promise<void>;
  onCardClick: (card: Card) => void;
}) {
  const laneCards = board.cards.filter((c) => !!c.laneId);
  const backlogCards = board.cards.filter((c) => !c.laneId);

  return (
    <div className="flex-1 overflow-auto px-6 pt-5 pb-6">
      <KanbanBoard
        cards={laneCards}
        lanes={board.lanes}
        onLaneChange={onLaneChange}
        onCardClick={onCardClick}
        onDelete={() => {}}
        trailingSlot={backlogCards.length > 0
          ? <BacklogColumn cards={backlogCards} onCardClick={onCardClick} />
          : undefined
        }
      />
    </div>
  );
}

export default function MyWorkPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [boards, setBoards] = useState<ProjectBoard[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [recentSnaps, setRecentSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) loadMyWork();
  }, [user?.id]);

  const loadMyWork = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const authHeaders = { Authorization: `Bearer ${token}` };

      // Fix: pass actual UUID, not literal "me"
      const [allCards, snapsRes] = await Promise.all([
        cardsApi.getAll({ assigneeId: user.id }),
        fetch(`${API_URL}/snaps?createdById=${user.id}&limit=10`, { headers: authHeaders }),
      ]);

      if (snapsRes.ok) {
        const snapsData = await snapsRes.json();
        setRecentSnaps(Array.isArray(snapsData) ? snapsData : snapsData.snaps || []);
      }

      // Group cards by project
      const projectMap = new Map<string, { name: string; cards: Card[] }>();
      for (const card of allCards) {
        const pid = card.project?.id;
        if (!pid) continue;
        if (!projectMap.has(pid)) {
          projectMap.set(pid, { name: card.project.name, cards: [] });
        }
        projectMap.get(pid)!.cards.push(card);
      }

      if (projectMap.size === 0) {
        setBoards([]);
        setLoading(false);
        return;
      }

      // Fetch default workflow lanes for each project in parallel
      const projectIds = [...projectMap.keys()];
      const workflowResults = await Promise.allSettled(
        projectIds.map((id) => workflowApi.getDefaultWorkflow(id))
      );

      const boardList: ProjectBoard[] = projectIds.map((projectId, i) => {
        const proj = projectMap.get(projectId)!;
        const wfResult = workflowResults[i];
        return {
          projectId,
          projectName: proj.name,
          cards: proj.cards,
          lanes: wfResult.status === 'fulfilled' ? wfResult.value.lanes : [],
        };
      });

      setBoards(boardList);
      setActiveTab((prev) => {
        // keep active tab if still valid, otherwise default to first
        return prev && boardList.some((b) => b.projectId === prev)
          ? prev
          : boardList[0].projectId;
      });
    } catch {
      setError('Failed to load your work. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaneChange = async (cardId: string, newLaneId: string) => {
    // Optimistic update
    setBoards((prev) =>
      prev.map((b) => ({
        ...b,
        cards: b.cards.map((c) => (c.id === cardId ? { ...c, laneId: newLaneId } : c)),
      }))
    );
    try {
      await cardsApi.moveToLane(cardId, newLaneId);
    } catch {
      loadMyWork(); // revert via reload on failure
    }
  };

  const handleCardClick = (card: Card) => navigate(`/cards/${card.id}`);

  // Stats across all projects
  const allCards = boards.flatMap((b) => b.cards);
  const activeCards = allCards.filter(
    (c) => c.status !== CardStatus.COMPLETED && c.status !== CardStatus.CLOSED
  );
  const blockedCards = allCards.filter(
    (c) => c.ragStatus === CardRAG.RED
  );
  const completedCards = allCards.filter(
    (c) => c.status === CardStatus.COMPLETED || c.status === CardStatus.CLOSED
  );

  const activeBoard = boards.find((b) => b.projectId === activeTab);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 bg-white border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Work</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Cards assigned to you, organised by project board.
              </p>
            </div>
            <button
              onClick={loadMyWork}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors mt-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900">{activeCards.length}</span>
              <span className="text-xs text-gray-400 font-medium">Active</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-red-500">{blockedCards.length}</span>
              <span className="text-xs text-gray-400 font-medium">Red RAG</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-green-500">{completedCards.length}</span>
              <span className="text-xs text-gray-400 font-medium">Completed</span>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <button
                onClick={loadMyWork}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!error && boards.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium text-gray-500">No cards assigned to you.</p>
              <p className="text-xs text-gray-400 mt-1">Cards assigned to you across projects will appear here.</p>
            </div>
          </div>
        )}

        {/* Board area */}
        {!error && boards.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0">

            {/* Project tabs */}
            <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6">
              <div className="flex overflow-x-auto">
                {boards.map((board) => (
                  <button
                    key={board.projectId}
                    onClick={() => setActiveTab(board.projectId)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                      ${activeTab === board.projectId
                        ? 'border-primary-600 text-primary-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {board.projectName}
                    <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold
                      ${activeTab === board.projectId
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {board.cards.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Kanban board + backlog for active tab */}
            {activeBoard && <ProjectTabContent
              board={activeBoard}
              onLaneChange={handleLaneChange}
              onCardClick={handleCardClick}
            />}
          </div>
        )}

        {/* Recent snaps — compact strip at bottom */}
        {recentSnaps.length > 0 && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-4 max-h-52 overflow-y-auto">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Snaps</h2>
            <div className="space-y-2">
              {recentSnaps.map((snap) => (
                <div key={snap.id} className="flex items-start justify-between gap-4 bg-white rounded-lg border border-gray-200 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    {snap.card && (
                      <button
                        onClick={() => navigate(`/cards/${snap.card!.id}`)}
                        className="text-xs font-medium text-primary-600 hover:text-primary-800 truncate block mb-0.5 text-left w-full"
                      >
                        {snap.card.title}
                      </button>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {snap.done && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Done:</span> {snap.done}
                        </p>
                      )}
                      {snap.toDo && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">To Do:</span> {snap.toDo}
                        </p>
                      )}
                      {snap.blockers && (
                        <p className="text-xs text-red-600">
                          <span className="font-medium">Blockers:</span> {snap.blockers}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {snap.finalRAG && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase ${RAG_COLORS[snap.finalRAG.toLowerCase()] || ''}`}>
                        {snap.finalRAG}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {new Date(snap.snapDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
