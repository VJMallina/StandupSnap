import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardRAG, CardPriority } from '../../types/card';

interface KanbanCardProps {
  card: Card;
  onClick: (card: Card) => void;
  onDelete: (card: Card) => void;
  isDragging?: boolean;
}

export function KanbanCard({ card, onClick, isDragging = false }: KanbanCardProps) {
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

  const getRAGColor = (rag: CardRAG | null) => {
    if (!rag) return 'bg-gradient-to-r from-gray-300 to-gray-400';
    switch (rag) {
      case 'green':
        return 'bg-gradient-to-r from-green-400 to-green-500';
      case 'amber':
        return 'bg-gradient-to-r from-amber-400 to-amber-500';
      case 'red':
        return 'bg-gradient-to-r from-red-400 to-red-500';
    }
  };

  const getPriorityIcon = (priority: CardPriority) => {
    switch (priority) {
      case 'critical':
        return '🔥';
      case 'high':
        return '⬆️';
      case 'medium':
        return '➡️';
      case 'low':
        return '⬇️';
    }
  };

  const isLocked = card.sprint.isClosed || card.status === 'closed';

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
      {/* RAG Status Bar */}
      <div className={`h-2 rounded-t-lg ${getRAGColor(card.ragStatus ?? null)}`} />

      <div className="p-3" onClick={() => onClick(card)}>
        {/* Header: ID + Priority */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {card.externalId || `#${card.id.slice(0, 6)}`}
          </span>
          <span className="text-lg">{getPriorityIcon(card.priority)}</span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2 min-h-[2.5rem]">
          {isLocked && (
            <svg
              className="w-3 h-3 inline mr-1 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {card.title}
        </h4>

        {/* Assignee */}
        {card.assignee && (
          <div className="flex items-center text-xs text-gray-600 mb-2">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
            <span className="truncate">{card.assignee.fullName}</span>
          </div>
        )}

        {/* Footer: Snaps count + Estimated time */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center text-xs text-gray-500">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="font-semibold">{card.snapsCount || 0}</span>
          </div>

          <div className="flex items-center text-xs text-gray-500">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            <span>{card.estimatedTime}h</span>
          </div>
        </div>

        {/* RAG Badge */}
        {card.ragStatus && (
          <div className="mt-2">
            <span
              className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                card.ragStatus === 'green'
                  ? 'bg-green-100 text-green-700'
                  : card.ragStatus === 'amber'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {card.ragStatus}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
