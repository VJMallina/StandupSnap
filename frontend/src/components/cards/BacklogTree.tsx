import { useState } from 'react';
import { Card, CardPriority } from '../../types/card';

const PRIORITY_DOT: Record<CardPriority, string> = {
  [CardPriority.CRITICAL]: 'bg-red-500',
  [CardPriority.HIGH]:     'bg-orange-400',
  [CardPriority.MEDIUM]:   'bg-blue-400',
  [CardPriority.LOW]:      'bg-gray-300',
};

const PRIORITY_TITLE: Record<CardPriority, string> = {
  [CardPriority.CRITICAL]: 'Critical',
  [CardPriority.HIGH]:     'High',
  [CardPriority.MEDIUM]:   'Medium',
  [CardPriority.LOW]:      'Low',
};

const AVATAR_PALETTE = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500',  'bg-cyan-500', 'bg-pink-500',    'bg-indigo-500',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

interface BacklogTreeProps {
  epics: Card[];
  cards: Card[];
  onCardClick: (card: Card) => void;
  onEpicClick: (card: Card) => void;
  onCreateCard?: (epicId?: string) => void;
}

export function BacklogTree({ epics, cards, onCardClick, onEpicClick, onCreateCard }: BacklogTreeProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const getEpicCards = (epicId: string) => cards.filter(c => c.parentId === epicId);
  const orphanCards = cards.filter(c => !c.parentId || !epics.some(e => e.id === c.parentId));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {cards.length} {cards.length === 1 ? 'card' : 'cards'} in backlog
        </span>
        {onCreateCard && (
          <button
            onClick={() => onCreateCard()}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add card
          </button>
        )}
      </div>

      {epics.length === 0 && cards.length === 0 && (
        <div className="text-center py-16">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-semibold text-gray-400">Backlog is empty</p>
          <p className="text-xs text-gray-300 mt-1">All cards are assigned to sprints</p>
        </div>
      )}

      {/* Epic groups */}
      {epics.map(epic => {
        const epicCards = getEpicCards(epic.id);
        const isCollapsed = !!collapsed[epic.id];

        return (
          <div key={epic.id} className="border-b border-gray-50 last:border-b-0">
            {/* Epic row */}
            <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50/70 group">
              <button
                onClick={() => toggle(epic.id)}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="w-5 h-5 rounded flex items-center justify-center bg-purple-100 flex-shrink-0">
                <svg className="w-3 h-3 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>

              <button
                onClick={() => onEpicClick(epic)}
                className="flex-1 flex items-center gap-2 min-w-0 text-left"
              >
                {epic.externalId && (
                  <span className="text-[10px] font-mono font-bold text-purple-400 flex-shrink-0">
                    {epic.externalId}
                  </span>
                )}
                <span className="text-sm font-semibold text-gray-800 truncate group-hover:text-purple-700 transition-colors">
                  {epic.title}
                </span>
              </button>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {epicCards.length}
                </span>
                {onCreateCard && (
                  <button
                    onClick={e => { e.stopPropagation(); onCreateCard(epic.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                    title="Add card to this epic"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {!isCollapsed && (
              <>
                {epicCards.map(card => (
                  <CardRow key={card.id} card={card} onClick={() => onCardClick(card)} />
                ))}
                {epicCards.length === 0 && (
                  <p className="pl-14 pr-4 py-2 text-xs text-gray-300 italic">
                    No backlog cards in this epic
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Orphan cards (no epic) */}
      {orphanCards.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/40">
            <div className="w-5 h-5 flex-shrink-0" />
            <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-200 flex-shrink-0">
              <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-500 flex-1">No Epic</span>
            <span className="text-xs font-medium text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
              {orphanCards.length}
            </span>
          </div>
          {orphanCards.map(card => (
            <CardRow key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardRow({ card, onClick }: { card: Card; onClick: () => void }) {
  const name = card.assignee?.name || '';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 pl-12 pr-4 py-2.5 hover:bg-primary-50/50 group text-left border-b border-gray-50 last:border-b-0 transition-colors"
    >
      {/* Priority dot */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[card.priority]}`}
        title={PRIORITY_TITLE[card.priority]}
      />

      {/* ID */}
      {card.externalId && (
        <span className="text-[10px] font-mono font-bold text-primary-500 flex-shrink-0 w-16">
          {card.externalId}
        </span>
      )}

      {/* Title */}
      <span className="flex-1 text-sm text-gray-700 truncate group-hover:text-gray-900 transition-colors min-w-0">
        {card.title}
      </span>

      {/* SP badge */}
      {card.storyPoints != null && (
        <span className="text-[10px] font-bold text-primary-600 bg-primary-50 border border-primary-100 px-1.5 py-0.5 rounded flex-shrink-0 tabular-nums">
          {card.storyPoints}SP
        </span>
      )}

      {/* Assignee avatar */}
      <div className="flex-shrink-0">
        {name ? (
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${avatarColor(name)}`}
            title={name}
          >
            {initials(name)}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border border-dashed border-gray-200 flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Chevron */}
      <svg
        className="w-3.5 h-3.5 text-gray-200 group-hover:text-primary-300 transition-colors flex-shrink-0"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
