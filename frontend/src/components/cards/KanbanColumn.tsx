import { useDroppable } from '@dnd-kit/core';
import { Card } from '../../types/card';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  cards: Card[];
  onCardClick: (card: Card) => void;
  onDelete: (card: Card) => void;
  isHighlighted: boolean;
}

export function KanbanColumn({ id, title, color, count, cards, onCardClick, onDelete, isHighlighted }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col w-[272px] flex-shrink-0">

      {/* Column header */}
      <div className="flex items-center gap-2 px-1 mb-2.5">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
          style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold text-gray-700 flex-1 truncate">{title}</h3>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full min-w-[24px] text-center">
          {count}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-230px)] overflow-y-auto
          transition-colors duration-150
          ${isOver
            ? 'bg-primary-50 ring-2 ring-inset ring-primary-300'
            : isHighlighted
            ? 'bg-gray-50 ring-1 ring-inset ring-gray-200'
            : 'bg-gray-50/60'
          }`}
      >
        {cards.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-gray-300 font-medium select-none">
              {isOver ? 'Drop here' : 'No cards'}
            </p>
          </div>
        ) : (
          cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onClick={onCardClick}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

    </div>
  );
}
