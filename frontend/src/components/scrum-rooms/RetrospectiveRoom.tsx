import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, DragEndEvent, PointerSensor,
  useSensor, useSensors, closestCenter, useDraggable, useDroppable,
} from '@dnd-kit/core';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import { cardsApi } from '../../services/api/cards';
import { sprintsApi } from '../../services/api/sprints';
import { ScrumRoom, RetrospectiveData, RetroColumn, RetroItem } from '../../types/scrumRooms';
import { Sprint, SprintStatus } from '../../types/sprint';
import { useToast } from '../../hooks/useToast';
import { useProjectSelection } from '../../context/ProjectSelectionContext';
import { useAuth } from '../../context/AuthContext';

interface Props { room: ScrumRoom; onUpdate: () => void; }

const COLUMN_COLORS: Record<number, { header: string; dot: string }> = {
  0: { header: 'border-green-300 bg-green-50', dot: 'bg-green-500' },
  1: { header: 'border-red-300 bg-red-50', dot: 'bg-red-500' },
  2: { header: 'border-blue-300 bg-blue-50', dot: 'bg-blue-500' },
  3: { header: 'border-yellow-300 bg-yellow-50', dot: 'bg-yellow-500' },
};

const DraggableItem = ({ item, colId, currentUserId, votingEnabled, maxVotes, loading, onDelete, onVote, onConvertToCard, onClick }: {
  item: RetroItem; colId: string; currentUserId: string; votingEnabled: boolean; maxVotes: number;
  loading: boolean; onDelete: (colId: string, itemId: string) => void;
  onVote: (colId: string, itemId: string) => void;
  onConvertToCard: (colId: string, item: RetroItem) => void;
  onClick: (item: RetroItem) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.itemId });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 } : undefined;
  const hasVoted = item.votes.includes(currentUserId);
  const userVoteCount = item.votes.filter(v => v === currentUserId).length;

  return (
    <div
      ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={() => !isDragging && onClick(item)}
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-gray-800 flex-1 leading-relaxed">{item.content}</p>
        {item.createdBy === currentUserId && (
          <button onClick={e => { e.stopPropagation(); onDelete(colId, item.itemId); }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {item.actionItem && (
            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 text-xs rounded font-medium">Action</span>
          )}
          {item.convertedCardId && (
            <span className="px-1.5 py-0.5 bg-green-50 text-green-600 border border-green-200 text-xs rounded font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Card created
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {item.actionItem && !item.convertedCardId && (
            <button
              onClick={e => { e.stopPropagation(); onConvertToCard(colId, item); }}
              disabled={loading}
              className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-primary-50 text-primary-600 text-xs rounded border border-primary-200 hover:bg-primary-100 transition-all"
              title="Convert to card"
            >
              → Card
            </button>
          )}
          {votingEnabled && (
            <button
              onClick={e => { e.stopPropagation(); onVote(colId, item.itemId); }}
              disabled={loading || (!hasVoted && userVoteCount >= maxVotes)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                hasVoted ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-40`}
            >
              <svg className="w-3 h-3" fill={hasVoted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              {item.votes.length}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const DroppableColumn = ({ colId, children }: { colId: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  return (
    <div ref={setNodeRef} className={`flex-1 space-y-2 min-h-24 rounded-lg transition-colors ${isOver ? 'bg-primary-50' : ''}`}>
      {children}
    </div>
  );
};

export const RetrospectiveRoom = ({ room, onUpdate }: Props) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { selectedProjectId } = useProjectSelection();
  const data = room.data as RetrospectiveData;

  const [columns, setColumns] = useState<RetroColumn[]>(data?.columns || []);
  const [votingEnabled, setVotingEnabled] = useState(data?.votingEnabled ?? true);
  const [maxVotes] = useState(data?.maxVotesPerPerson || 3);
  const [converting, setConverting] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [sprintStats, setSprintStats] = useState<{ completed: number; total: number; velocity: number } | null>(null);

  const currentUserId = user?.id || localStorage.getItem('userId') || 'anonymous';
  const currentUserName = user?.name || user?.username || 'You';

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (selectedProjectId) loadSprintContext();
  }, [selectedProjectId]);

  const loadSprintContext = async () => {
    if (!selectedProjectId) return;
    try {
      const [activeSprints, cards] = await Promise.all([
        sprintsApi.getAll({ projectId: selectedProjectId, status: SprintStatus.ACTIVE }),
        cardsApi.getAll({ projectId: selectedProjectId }),
      ]);
      if (activeSprints.length > 0) {
        const sprint = activeSprints[0];
        setActiveSprint(sprint);
        const sprintCards = cards.filter(c => c.sprint?.id === sprint.id);
        const completed = sprintCards.filter(c => c.status === 'completed').length;
        setSprintStats({ completed, total: sprintCards.length, velocity: sprintCards.filter(c => c.status === 'completed').reduce((s, c) => s + (c.storyPoints || 0), 0) });
      }
    } catch { /* non-fatal */ }
  };

  const save = async (updatedColumns: RetroColumn[], updatedVoting?: boolean) => {
    try {
      await scrumRoomsApi.updateData(room.id, {
        data: { columns: updatedColumns, votingEnabled: updatedVoting ?? votingEnabled, maxVotesPerPerson: maxVotes },
      });
      onUpdate();
    } catch (e: any) { toast.error(e.message || 'Failed to save'); }
  };

  const addItem = async (colId: string) => {
    if (!newItemText.trim()) return;
    const newItem: RetroItem = {
      itemId: `item-${Date.now()}`,
      content: newItemText.trim(),
      createdBy: currentUserId,
      createdByName: currentUserName,
      votes: [],
      timestamp: new Date().toISOString(),
    };
    const updated = columns.map(c => c.columnId === colId ? { ...c, items: [...c.items, newItem] } : c);
    setColumns(updated);
    setNewItemText('');
    setAddingTo(null);
    await save(updated);
    toast.success('Item added');
  };

  const deleteItem = async (colId: string, itemId: string) => {
    const updated = columns.map(c => c.columnId === colId ? { ...c, items: c.items.filter(i => i.itemId !== itemId) } : c);
    setColumns(updated);
    await save(updated);
  };

  const handleVote = async (colId: string, itemId: string) => {
    const updated = columns.map(c => {
      if (c.columnId !== colId) return c;
      return {
        ...c, items: c.items.map(i => {
          if (i.itemId !== itemId) return i;
          const hasVoted = i.votes.includes(currentUserId);
          return { ...i, votes: hasVoted ? i.votes.filter(v => v !== currentUserId) : [...i.votes, currentUserId] };
        }),
      };
    });
    setColumns(updated);
    await save(updated);
  };

  const toggleActionItem = async (colId: string, itemId: string) => {
    const updated = columns.map(c => c.columnId === colId ? { ...c, items: c.items.map(i => i.itemId === itemId ? { ...i, actionItem: !i.actionItem } : i) } : c);
    setColumns(updated);
    await save(updated);
  };

  const convertToCard = async (colId: string, item: RetroItem) => {
    if (!selectedProjectId) { toast.warning('No project selected'); return; }
    setConverting(item.itemId);
    try {
      const card = await cardsApi.create({ title: item.content, projectId: selectedProjectId, estimatedTime: 0 });
      const updated = columns.map(c => c.columnId === colId ? { ...c, items: c.items.map(i => i.itemId === item.itemId ? { ...i, convertedCardId: card.id } : i) } : c);
      setColumns(updated);
      await save(updated);
      toast.success('Card created in backlog');
    } catch (e: any) { toast.error(e.message || 'Failed to create card'); }
    finally { setConverting(null); }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sourceColId = columns.find(c => c.items.some(i => i.itemId === active.id))?.columnId;
    const targetColId = over.id as string;
    if (!sourceColId || sourceColId === targetColId) return;
    const item = columns.find(c => c.columnId === sourceColId)?.items.find(i => i.itemId === active.id);
    if (!item) return;
    const updated = columns.map(c => {
      if (c.columnId === sourceColId) return { ...c, items: c.items.filter(i => i.itemId !== active.id) };
      if (c.columnId === targetColId) return { ...c, items: [...c.items, item] };
      return c;
    });
    setColumns(updated);
    await save(updated);
  };

  const toggleVoting = async () => {
    const next = !votingEnabled;
    setVotingEnabled(next);
    await save(columns, next);
  };

  const totalActionItems = columns.reduce((s, c) => s + c.items.filter(i => i.actionItem).length, 0);
  const convertedCount = columns.reduce((s, c) => s + c.items.filter(i => i.convertedCardId).length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/scrum-rooms')} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{room.name}</h1>
            {room.description && <p className="text-sm text-gray-500 truncate">{room.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={toggleVoting} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${votingEnabled ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {votingEnabled ? 'Voting On' : 'Voting Off'}
          </button>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">Retrospective</span>
        </div>
      </div>

      {/* Sprint stats banner */}
      {activeSprint && sprintStats && (
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl border border-primary-200 p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Active Sprint</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{activeSprint.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Completed</p>
            <p className="text-sm font-semibold text-gray-900">{sprintStats.completed} / {sprintStats.total} cards</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Velocity</p>
            <p className="text-sm font-semibold text-gray-900">{sprintStats.velocity} pts</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Action Items</p>
            <p className="text-sm font-semibold text-gray-900">{totalActionItems} ({convertedCount} → cards)</p>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col, idx) => {
            const colors = COLUMN_COLORS[idx % 4];
            const sorted = [...col.items].sort((a, b) => b.votes.length - a.votes.length);
            return (
              <div key={col.columnId} className="bg-white rounded-xl border border-gray-200 flex flex-col min-h-96">
                {/* Column header */}
                <div className={`px-4 py-3 border-b-2 ${colors.header} rounded-t-xl flex items-center gap-2`}>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <h3 className="text-sm font-semibold text-gray-900 flex-1 truncate">{col.title}</h3>
                  <span className="text-xs text-gray-400 font-medium">{col.items.length}</span>
                </div>

                {/* Items */}
                <div className="flex-1 p-3">
                  <DroppableColumn colId={col.columnId}>
                    {sorted.map(item => (
                      <DraggableItem
                        key={item.itemId}
                        item={item}
                        colId={col.columnId}
                        currentUserId={currentUserId}
                        votingEnabled={votingEnabled}
                        maxVotes={maxVotes}
                        loading={converting === item.itemId}
                        onDelete={deleteItem}
                        onVote={handleVote}
                        onConvertToCard={convertToCard}
                        onClick={item => toggleActionItem(col.columnId, item.itemId)}
                      />
                    ))}
                  </DroppableColumn>
                </div>

                {/* Add item */}
                <div className="p-3 border-t border-gray-100">
                  {addingTo === col.columnId ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={newItemText}
                        onChange={e => setNewItemText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(col.columnId); } if (e.key === 'Escape') { setAddingTo(null); setNewItemText(''); } }}
                        placeholder="Type and press Enter…"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => addItem(col.columnId)} className="flex-1 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors">Add</button>
                        <button onClick={() => { setAddingTo(null); setNewItemText(''); }} className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingTo(col.columnId)} className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add item
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DndContext>

      {/* Instructions */}
      <p className="text-xs text-gray-400 text-center mt-4">
        Click an item to toggle as action item · Drag items between columns · Action items can be converted to backlog cards
      </p>
    </div>
  );
};
