import { useDroppable } from '@dnd-kit/core';
import { Card, CardStatus } from '../../types/card';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  id: CardStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  count: number;
  cards: Card[];
  onCardClick: (card: Card) => void;
  onDelete: (card: Card) => void;
  isHighlighted: boolean;
}

export function KanbanColumn({
  id,
  title,
  color,
  bgColor,
  borderColor,
  count,
  cards,
  onCardClick,
  onDelete,
  isHighlighted,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`flex flex-col rounded-xl border-2 transition-all duration-200 ${borderColor} ${
        isOver ? 'ring-4 ring-primary-300 shadow-xl scale-[1.02]' : ''
      } ${isHighlighted ? 'ring-2 ring-primary-200' : ''}`}
    >
      {/* Column Header */}
      <div className={`bg-gradient-to-r ${color} p-4 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <span className="bg-white/30 text-white px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
            {count}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 space-y-3 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto ${bgColor} ${
          isOver ? 'bg-opacity-70' : ''
        } transition-colors duration-200 rounded-b-lg`}
      >
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <svg
              className="w-12 h-12 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-sm font-medium">No cards</p>
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
