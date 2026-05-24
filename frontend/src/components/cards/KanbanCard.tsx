import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardRAG, CardType, WorkflowLane, TransitionMode } from '../../types/card';

interface KanbanCardProps {
  card: Card;
  onClick: (card: Card) => void;
  onDelete: (card: Card) => void;
  isDragging?: boolean;
  lanes?: WorkflowLane[];
  onLaneChange?: (cardId: string, laneId: string) => void;
  transitionMode?: TransitionMode;
}


const TYPE_BADGE: Record<CardType, { label: string; className: string }> = {
  [CardType.EPIC]: { label: 'Epic', className: 'bg-purple-100 text-purple-700' },
  [CardType.CARD]: { label: 'Card', className: 'bg-blue-100 text-blue-700' },
  [CardType.SUB_CARD]: { label: 'Sub', className: 'bg-gray-100 text-gray-600' },
};

const RAG_GRADIENT: Record<CardRAG, string> = {
  [CardRAG.GREEN]: 'from-green-400 to-green-500',
  [CardRAG.AMBER]: 'from-amber-400 to-amber-500',
  [CardRAG.RED]: 'from-red-400 to-red-500',
};

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
];

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

export function KanbanCard({ card, onClick, isDragging = false, lanes = [], onLaneChange, transitionMode = TransitionMode.FREE }: KanbanCardProps) {
  const [showLanePicker, setShowLanePicker] = useState(false);
  const lanePickerRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (!showLanePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (lanePickerRef.current && !lanePickerRef.current.contains(e.target as Node)) {
        setShowLanePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLanePicker]);

  const currentLane = lanes.find((l) => l.id === card.laneId);
  const isLocked = (card.sprint?.isClosed ?? false) || card.status === 'closed';
  const typeBadge = TYPE_BADGE[card.cardType] ?? TYPE_BADGE[CardType.CARD];

  const isLaneReachable = (targetLane: WorkflowLane): boolean => {
    if (transitionMode === TransitionMode.FREE) return true;
    if (!currentLane) return false;
    const diff = targetLane.order - currentLane.order;
    if (transitionMode === TransitionMode.FORWARD) return diff === 1;
    return Math.abs(diff) === 1; // SEQUENTIAL
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-move ${
        isSortableDragging || isDragging ? 'opacity-50 scale-95' : 'hover:-translate-y-1'
      }`}
    >
      {/* RAG bar */}
      <div
        className={`h-2 rounded-t-lg bg-gradient-to-r ${
          card.ragStatus ? RAG_GRADIENT[card.ragStatus] : 'from-gray-300 to-gray-400'
        }`}
      />

      <div className="p-3" onClick={() => onClick(card)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2 gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeBadge.className} flex-shrink-0`}>
              {typeBadge.label}
            </span>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded truncate">
              {card.externalId || `#${card.id.slice(0, 6)}`}
            </span>
          </div>

          {/* Lane status pill / picker */}
          {lanes.length > 0 && (
            <div className="relative flex-shrink-0" ref={lanePickerRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLocked && onLaneChange) setShowLanePicker((v) => !v);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${
                  isLocked || !onLaneChange
                    ? 'cursor-default'
                    : 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 cursor-pointer'
                }`}
                style={{
                  backgroundColor: currentLane ? `${currentLane.color}22` : '#f3f4f6',
                  color: currentLane ? currentLane.color : '#6b7280',
                  border: `1px solid ${currentLane ? `${currentLane.color}55` : '#e5e7eb'}`,
                }}
                title={isLocked ? 'Locked' : 'Change lane'}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentLane?.color ?? '#9ca3af' }}
                />
                <span className="max-w-[64px] truncate">
                  {currentLane?.name ?? 'No lane'}
                </span>
                {!isLocked && onLaneChange && (
                  <svg className="w-2.5 h-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Dropdown */}
              {showLanePicker && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    Move to lane
                  </p>
                  {lanes.map((lane) => {
                    const isCurrent = lane.id === card.laneId;
                    const reachable = isCurrent || isLaneReachable(lane);
                    return (
                      <button
                        key={lane.id}
                        disabled={!reachable}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isCurrent && reachable) onLaneChange!(card.id, lane.id);
                          setShowLanePicker(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                          isCurrent ? 'bg-gray-50 font-semibold' :
                          reachable ? 'hover:bg-gray-50' :
                          'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm" style={{ backgroundColor: lane.color }} />
                        <span className="truncate text-gray-800">{lane.name}</span>
                        {!reachable && (
                          <svg className="w-3 h-3 text-gray-400 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {isCurrent && (
                          <svg className="w-3.5 h-3.5 text-primary-600 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2 min-h-[2.5rem]">
          {isLocked && (
            <svg className="w-3 h-3 inline mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          )}
          {card.title}
        </h4>

        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.slice(0, 3).map((label) => (
              <span key={label} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {label}
              </span>
            ))}
            {card.labels.length > 3 && (
              <span className="text-[10px] text-gray-400">+{card.labels.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {card.snapsCount ?? 0}
            </span>
            {card.storyPoints != null && (
              <span className="bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded font-semibold">
                {card.storyPoints} SP
              </span>
            )}
            <span className="text-gray-400">{card.estimatedTime}h</span>
          </div>

          {/* Assignee avatar */}
          {card.assignee ? (
            <div
              className="relative group"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ring-2 ring-white ${getAvatarColor(card.assignee.fullName || card.assignee.displayName || '?')}`}
              >
                {getInitials(card.assignee.fullName || card.assignee.displayName || '?')}
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {card.assignee.fullName || card.assignee.displayName}
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Due date */}
        {card.dueDate && (
          <div className="mt-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              new Date(card.dueDate) < new Date() && card.status !== 'completed'
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-500'
            }`}>
              Due {new Date(card.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
