import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardRAG, CardType, CardPriority } from '../../types/card';

interface KanbanCardProps {
  card: Card;
  onClick: (card: Card) => void;
  onDelete: (card: Card) => void;
  isDragging?: boolean;
}

const TYPE_BADGE: Record<CardType, { label: string; cls: string }> = {
  [CardType.EPIC]:     { label: 'Epic', cls: 'bg-purple-100 text-purple-700' },
  [CardType.CARD]:     { label: 'Card', cls: 'bg-blue-100 text-blue-700' },
  [CardType.SUB_CARD]: { label: 'Sub',  cls: 'bg-gray-100 text-gray-500' },
};

const RAG_BORDER: Record<CardRAG, string> = {
  [CardRAG.RED]:   'border-l-red-500',
  [CardRAG.AMBER]: 'border-l-amber-400',
  [CardRAG.GREEN]: 'border-l-green-500',
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

function CardId({ id }: { id?: string }) {
  if (!id) return null;
  const dash = id.lastIndexOf('-');
  if (dash === -1) return (
    <span className="text-[10px] font-mono font-bold text-primary-600 tracking-wide">{id}</span>
  );
  return (
    <span className="text-[10px] font-mono font-bold tracking-wide leading-none">
      <span className="text-primary-600">{id.slice(0, dash)}</span>
      <span className="text-gray-400">{id.slice(dash)}</span>
    </span>
  );
}

function PriorityBars({ priority }: { priority: CardPriority }) {
  const cfg: Record<CardPriority, { active: number; color: string }> = {
    [CardPriority.LOW]:      { active: 1, color: '#9ca3af' },
    [CardPriority.MEDIUM]:   { active: 2, color: '#3b82f6' },
    [CardPriority.HIGH]:     { active: 3, color: '#f59e0b' },
    [CardPriority.CRITICAL]: { active: 4, color: '#ef4444' },
  };
  const { active, color } = cfg[priority] ?? cfg[CardPriority.MEDIUM];
  const heights = [3, 5, 7, 9];
  return (
    <svg width="16" height="9" viewBox="0 0 16 9" aria-label={priority}>
      {heights.map((h, i) => (
        <rect key={i} x={i * 4} y={9 - h} width="3" height={h} rx="0.5"
          fill={i < active ? color : '#e5e7eb'} />
      ))}
    </svg>
  );
}

export function KanbanCard({ card, onClick, isDragging = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: card.id });

  const ragBorder = card.ragStatus ? RAG_BORDER[card.ragStatus] : 'border-l-gray-200';
  const badge = TYPE_BADGE[card.cardType] ?? TYPE_BADGE[CardType.CARD];
  const isLocked = (card.sprint?.isClosed ?? false) || card.status === 'closed';
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && card.status !== 'completed';
  const parentEpic = card.parent?.cardType === CardType.EPIC ? card.parent : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className={`group bg-white rounded-lg border border-gray-200 border-l-4 ${ragBorder} select-none
        cursor-grab active:cursor-grabbing transition-all duration-150 overflow-hidden
        ${isSortableDragging || isDragging
          ? 'opacity-30 shadow-xl scale-95'
          : 'hover:border-gray-300 hover:shadow-md'
        }`}
    >
      {/* Epic label strip — shown only when card belongs to an epic */}
      {parentEpic && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border-b border-purple-100">
          <svg className="w-2.5 h-2.5 text-purple-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span className="text-[10px] font-semibold text-purple-600 truncate leading-none">
            {parentEpic.externalId
              ? `${parentEpic.externalId} · ${parentEpic.title}`
              : parentEpic.title}
          </span>
        </div>
      )}

      <div className="px-3 py-2.5 space-y-2">

        {/* Row 1 — type badge + ID + priority */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
            <CardId id={card.externalId || `#${card.id.slice(0, 6)}`} />
          </div>
          <PriorityBars priority={card.priority} />
        </div>

        {/* Row 2 — title */}
        <p className={`text-sm font-medium leading-snug line-clamp-2 ${isLocked ? 'text-gray-400' : 'text-gray-800'}`}>
          {isLocked && (
            <svg className="w-3 h-3 inline mr-0.5 mb-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          )}
          {card.title}
        </p>

        {/* Row 3 — labels (optional) */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.slice(0, 2).map((l) => (
              <span key={l} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{l}</span>
            ))}
            {card.labels.length > 2 && (
              <span className="text-[10px] text-gray-400">+{card.labels.length - 2}</span>
            )}
          </div>
        )}

        {/* Row 4 — footer: meta + assignee */}
        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {card.storyPoints != null && (
              <span className="text-[11px] font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                {card.storyPoints} SP
              </span>
            )}
            {card.dueDate && (
              <span className={`text-[11px] ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                {new Date(card.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {!card.storyPoints && !card.dueDate && (
              <span className="text-[11px] text-gray-300">—</span>
            )}
          </div>

          {card.assignee ? (
            <div className="relative group/av flex-shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-white ${avatarColor(card.assignee.name || '?')}`}>
                {initials(card.assignee.name || '?')}
              </div>
              <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover/av:opacity-100 transition-opacity pointer-events-none z-50">
                {card.assignee.name}
              </div>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
