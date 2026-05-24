import { useDroppable } from '@dnd-kit/core';
import { Card, WorkflowLane, TransitionMode } from '../../types/card';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  cards: Card[];
  lanes: WorkflowLane[];
  onCardClick: (card: Card) => void;
  onDelete: (card: Card) => void;
  onLaneChange: (cardId: string, laneId: string) => void;
  isHighlighted: boolean;
  transitionMode?: TransitionMode;
}

export function KanbanColumn({
  id,
  title,
  color,
  count,
  cards,
  lanes,
  onCardClick,
  onDelete,
  onLaneChange,
  isHighlighted,
  transitionMode,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`flex flex-col rounded-xl border-2 transition-all duration-200 ${
        isOver ? 'ring-4 ring-primary-300 shadow-xl scale-[1.02] border-primary-300' : 'border-gray-200'
      } ${isHighlighted ? 'ring-2 ring-primary-200' : ''}`}
    >
      {/* Column Header */}
      <div
        className="p-4 rounded-t-lg"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-base truncate">{title}</h3>
          <span className="bg-white/30 text-white px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm ml-2 flex-shrink-0">
            {count}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 space-y-3 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto bg-gray-50 ${
          isOver ? 'bg-primary-50' : ''
        } transition-colors duration-200 rounded-b-lg`}
      >
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
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
              lanes={lanes}
              onLaneChange={onLaneChange}
              transitionMode={transitionMode}
            />
          ))
        )}
      </div>
    </div>
  );
}
