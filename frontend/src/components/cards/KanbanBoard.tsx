import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardStatus } from '../../types/card';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  cards: Card[];
  onStatusChange: (cardId: string, newStatus: CardStatus) => Promise<void>;
  onCardClick: (card: Card) => void;
  onDelete: (card: Card) => void;
}

const COLUMNS = [
  {
    id: CardStatus.NOT_STARTED,
    title: 'Not Started',
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  {
    id: CardStatus.IN_PROGRESS,
    title: 'In Progress',
    color: 'from-primary-500 to-primary-600',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-200',
  },
  {
    id: CardStatus.COMPLETED,
    title: 'Completed',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    id: CardStatus.CLOSED,
    title: 'Closed',
    color: 'from-gray-700 to-gray-800',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
];

export function KanbanBoard({ cards, onStatusChange, onCardClick, onDelete }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [dragStartColumn, setDragStartColumn] = useState<CardStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    if (card) {
      setActiveCard(card);
      setDragStartColumn(card.status);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveCard(null);
      setDragStartColumn(null);
      return;
    }

    const cardId = active.id as string;
    const newStatus = over.id as CardStatus;

    const card = cards.find((c) => c.id === cardId);

    if (card && card.status !== newStatus) {
      try {
        await onStatusChange(cardId, newStatus);
      } catch (error) {
        console.error('Failed to update card status:', error);
      }
    }

    setActiveCard(null);
    setDragStartColumn(null);
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    setDragStartColumn(null);
  };

  const getCardsForColumn = (status: CardStatus) => {
    return cards.filter((card) => card.status === status);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {COLUMNS.map((column) => {
          const columnCards = getCardsForColumn(column.id);
          return (
            <SortableContext
              key={column.id}
              id={column.id}
              items={columnCards.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <KanbanColumn
                id={column.id}
                title={column.title}
                color={column.color}
                bgColor={column.bgColor}
                borderColor={column.borderColor}
                count={columnCards.length}
                cards={columnCards}
                onCardClick={onCardClick}
                onDelete={onDelete}
                isHighlighted={dragStartColumn !== null && dragStartColumn !== column.id}
              />
            </SortableContext>
          );
        })}
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="rotate-3 scale-105 opacity-90">
            <KanbanCard
              card={activeCard}
              onClick={() => {}}
              onDelete={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
