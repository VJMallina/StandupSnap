import { useState } from 'react';
import { Card, CardStatus, WorkflowLane, TransitionMode } from '../../types/card';
import { KanbanBoard } from './KanbanBoard';

interface EpicSwimlaneBoardProps {
  epics: Card[];
  cards: Card[];
  lanes: WorkflowLane[];
  onLaneChange: (cardId: string, laneId: string) => Promise<void>;
  onCardClick: (card: Card) => void;
  onDelete: (card: Card) => void;
  transitionMode?: TransitionMode;
  onCreateCard?: (epicId?: string) => void;
}

function epicProgress(epicId: string, cards: Card[]) {
  const children = cards.filter(c => c.parentId === epicId);
  const done = children.filter(
    c => c.status === CardStatus.COMPLETED || c.status === CardStatus.CLOSED,
  ).length;
  return { total: children.length, done };
}

export function EpicSwimlaneBoard({
  epics, cards, lanes, onLaneChange, onCardClick, onDelete, transitionMode, onCreateCard,
}: EpicSwimlaneBoardProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const getEpicCards = (epicId: string) => cards.filter(c => c.parentId === epicId);
  const orphanCards = cards.filter(c => !c.parentId || !epics.some(e => e.id === c.parentId));

  if (lanes.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-gray-400 text-sm">No workflow lanes configured for this project.</p>
      </div>
    );
  }

  if (epics.length === 0 && orphanCards.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-500">No cards in sprint</p>
        <p className="text-xs text-gray-400 mt-1">Create cards in the Backlog tab and assign them to a sprint</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {epics.map(epic => {
        const epicCards = getEpicCards(epic.id);
        const { total, done } = epicProgress(epic.id, cards);
        const pct = total ? Math.round((done / total) * 100) : 0;
        const isCollapsed = !!collapsed[epic.id];

        return (
          <div key={epic.id} className="rounded-2xl border border-purple-100 overflow-hidden shadow-sm">
            {/* Epic header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-violet-50/60">
              <button
                onClick={() => toggle(epic.id)}
                className="flex-shrink-0 text-purple-400 hover:text-purple-600 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0 flex items-center gap-2">
                {epic.externalId && (
                  <span className="text-[10px] font-mono font-bold text-purple-400 flex-shrink-0">
                    {epic.externalId}
                  </span>
                )}
                <span className="text-sm font-semibold text-gray-800 truncate">{epic.title}</span>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {total > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-purple-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-purple-600 tabular-nums">{done}/{total}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No sprint cards</span>
                )}

                {onCreateCard && (
                  <button
                    onClick={e => { e.stopPropagation(); onCreateCard(epic.id); }}
                    title="Add card to this epic"
                    className="p-1 rounded-md text-purple-400 hover:text-purple-600 hover:bg-purple-100 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {!isCollapsed && (
              <div className="p-4 bg-white">
                <KanbanBoard
                  cards={epicCards}
                  lanes={lanes}
                  onLaneChange={onLaneChange}
                  onCardClick={onCardClick}
                  onDelete={onDelete}
                  transitionMode={transitionMode}
                />
              </div>
            )}
          </div>
        );
      })}

      {orphanCards.length > 0 && (
        <OrphanSection
          cards={orphanCards}
          lanes={lanes}
          onLaneChange={onLaneChange}
          onCardClick={onCardClick}
          onDelete={onDelete}
          transitionMode={transitionMode}
          onCreateCard={onCreateCard}
        />
      )}
    </div>
  );
}

function OrphanSection({
  cards, lanes, onLaneChange, onCardClick, onDelete, transitionMode, onCreateCard,
}: Omit<EpicSwimlaneBoardProps, 'epics'>) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="w-6 h-6 rounded-lg bg-gray-400 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <span className="text-sm font-semibold text-gray-600 flex-1">No Epic</span>
        <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
          {cards.length}
        </span>

        {onCreateCard && (
          <button
            onClick={() => onCreateCard(undefined)}
            title="Add card without epic"
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="p-4 bg-white">
          <KanbanBoard
            cards={cards}
            lanes={lanes}
            onLaneChange={onLaneChange}
            onCardClick={onCardClick}
            onDelete={onDelete}
            transitionMode={transitionMode}
          />
        </div>
      )}
    </div>
  );
}
