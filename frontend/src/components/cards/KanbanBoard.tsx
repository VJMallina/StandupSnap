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
import { Card, WorkflowLane, TransitionMode } from '../../types/card';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  cards: Card[];
  lanes: WorkflowLane[];
  onLaneChange: (cardId: string, laneId: string) => Promise<void>;
  onCardClick: (card: Card) => void;
  onDelete: (card: Card) => void;
  transitionMode?: TransitionMode;
  trailingSlot?: JSX.Element;
}

export function KanbanBoard({ cards, lanes, onLaneChange, onCardClick, onDelete, trailingSlot }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [dragStartLaneId, setDragStartLaneId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const sortedLanes = [...lanes].sort((a, b) => a.order - b.order);

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    if (card) {
      setActiveCard(card);
      setDragStartLaneId(card.laneId ?? null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setDragStartLaneId(null);

    if (!over) return;
    const card = cards.find((c) => c.id === active.id);
    if (card && card.laneId !== over.id) {
      onLaneChange(active.id as string, over.id as string).catch(console.error);
    }
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    setDragStartLaneId(null);
  };

  const getCardsForLane = (laneId: string) => cards.filter((c) => c.laneId === laneId);
  const unassignedCards = cards.filter((c) => !c.laneId);

  if (sortedLanes.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <p className="text-gray-400 text-sm">No workflow lanes configured for this project.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Horizontally scrollable lane container */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 items-start">
        {sortedLanes.map((lane) => {
          const laneCards = getCardsForLane(lane.id);
          return (
            <SortableContext
              key={lane.id}
              id={lane.id}
              items={laneCards.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <KanbanColumn
                id={lane.id}
                title={lane.name}
                color={lane.color}
                count={laneCards.length}
                cards={laneCards}
                onCardClick={onCardClick}
                onDelete={onDelete}
                isHighlighted={dragStartLaneId !== null && dragStartLaneId !== lane.id}
              />
            </SortableContext>
          );
        })}

        {unassignedCards.length > 0 && (
          <SortableContext
            id="unassigned"
            items={unassignedCards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              id="unassigned"
              title="Unassigned"
              color="#9ca3af"
              count={unassignedCards.length}
              cards={unassignedCards}
              onCardClick={onCardClick}
              onDelete={onDelete}
              isHighlighted={dragStartLaneId !== null}
            />
          </SortableContext>
        )}

        {trailingSlot}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="rotate-1 scale-105 shadow-2xl opacity-95 w-[272px]">
            <KanbanCard card={activeCard} onClick={() => {}} onDelete={() => {}} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
