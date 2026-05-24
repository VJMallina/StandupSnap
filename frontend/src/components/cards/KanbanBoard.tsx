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
}

export function KanbanBoard({ cards, lanes, onLaneChange, onCardClick, onDelete, transitionMode = TransitionMode.FREE }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [dragStartLaneId, setDragStartLaneId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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

    // Clear drag state immediately so the overlay disappears at once
    setActiveCard(null);
    setDragStartLaneId(null);

    if (!over) return;

    const cardId = active.id as string;
    const newLaneId = over.id as string;
    const card = cards.find((c) => c.id === cardId);

    if (card && card.laneId !== newLaneId) {
      onLaneChange(cardId, newLaneId).catch((err) => {
        console.error('Failed to move card:', err);
      });
    }
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    setDragStartLaneId(null);
  };

  const getCardsForLane = (laneId: string) =>
    cards.filter((card) => card.laneId === laneId);

  const unassignedCards = cards.filter((card) => !card.laneId);

  if (sortedLanes.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
        <p className="text-gray-500">No workflow lanes configured for this project.</p>
      </div>
    );
  }

  const gridCols =
    sortedLanes.length <= 2 ? 'grid-cols-2' :
    sortedLanes.length === 3 ? 'grid-cols-3' :
    sortedLanes.length === 4 ? 'grid-cols-4' :
    'grid-cols-4';

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:${gridCols} gap-4 mb-8`}>
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
                lanes={sortedLanes}
                onCardClick={onCardClick}
                onDelete={onDelete}
                onLaneChange={onLaneChange}
                isHighlighted={dragStartLaneId !== null && dragStartLaneId !== lane.id}
                transitionMode={transitionMode}
              />
            </SortableContext>
          );
        })}

        {/* Unassigned column shown only if cards lack a lane */}
        {unassignedCards.length > 0 && (
          <SortableContext
            id="unassigned"
            items={unassignedCards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              id="unassigned"
              title="Unassigned"
              color="#6B7280"
              count={unassignedCards.length}
              cards={unassignedCards}
              lanes={sortedLanes}
              onCardClick={onCardClick}
              onDelete={onDelete}
              onLaneChange={onLaneChange}
              isHighlighted={dragStartLaneId !== null}
              transitionMode={transitionMode}
            />
          </SortableContext>
        )}
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="rotate-3 scale-105 opacity-90">
            <KanbanCard card={activeCard} onClick={() => {}} onDelete={() => {}} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
