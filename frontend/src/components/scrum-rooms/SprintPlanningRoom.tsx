import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import { cardsApi } from '../../services/api/cards';
import { sprintsApi } from '../../services/api/sprints';
import { ScrumRoom, SprintPlanningData, SprintPlanningItem } from '../../types/scrumRooms';
import { Card, CardPriority } from '../../types/card';
import { Sprint, SprintStatus } from '../../types/sprint';
import { useToast } from '../../hooks/useToast';
import { useProjectSelection } from '../../context/ProjectSelectionContext';

interface Props { room: ScrumRoom; onUpdate: () => void; }

const PRIORITY_BADGE: Record<CardPriority, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const COLUMNS: { key: SprintPlanningItem['status']; label: string; color: string; emptyText: string }[] = [
  { key: 'ready', label: 'Backlog', color: 'border-gray-200', emptyText: 'Load backlog cards above' },
  { key: 'in_scope', label: 'In Sprint', color: 'border-primary-300', emptyText: 'Move cards here to commit' },
  { key: 'out_of_scope', label: 'Deferred', color: 'border-red-200', emptyText: 'Deferred items' },
];

export const SprintPlanningRoom = ({ room, onUpdate }: Props) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { selectedProjectId } = useProjectSelection();
  const data = room.data as SprintPlanningData;

  const [items, setItems] = useState<SprintPlanningItem[]>(data?.items || []);
  const [capacity, setCapacity] = useState(data?.capacity || 0);
  const [sprintGoals, setSprintGoals] = useState<string[]>(data?.sprintGoals || []);
  const [newGoal, setNewGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [backlogCards, setBacklogCards] = useState<Card[]>([]);
  const [loadingBacklog, setLoadingBacklog] = useState(false);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [targetSprintId, setTargetSprintId] = useState('');

  const inScopePoints = items.filter(i => i.status === 'in_scope').reduce((s, i) => s + (i.estimate || 0), 0);
  const workloadPct = capacity > 0 ? Math.round((inScopePoints / capacity) * 100) : 0;
  const barColor = workloadPct <= 80 ? 'bg-green-500' : workloadPct <= 100 ? 'bg-yellow-500' : 'bg-red-500';

  useEffect(() => {
    if (selectedProjectId) {
      loadBacklog();
      loadSprints();
    }
  }, [selectedProjectId]);

  const loadBacklog = async () => {
    if (!selectedProjectId) return;
    setLoadingBacklog(true);
    try {
      const cards = await cardsApi.getAll({ projectId: selectedProjectId, backlog: true });
      setBacklogCards(cards.filter(c => c.cardType !== 'epic'));
    } catch { /* non-fatal */ }
    finally { setLoadingBacklog(false); }
  };

  const loadSprints = async () => {
    if (!selectedProjectId) return;
    try {
      const s = await sprintsApi.getAll({ projectId: selectedProjectId, status: SprintStatus.UPCOMING });
      setSprints(s);
      if (s.length > 0) setTargetSprintId(s[0].id);
    } catch { /* non-fatal */ }
  };

  const importFromBacklog = () => {
    const existingCardIds = new Set(items.filter(i => i.cardId).map(i => i.cardId!));
    const newItems: SprintPlanningItem[] = backlogCards
      .filter(c => !existingCardIds.has(c.id))
      .map((c, idx) => ({
        itemId: `card-${c.id}`,
        cardId: c.id,
        title: c.title,
        estimate: c.storyPoints || 0,
        priority: c.priority,
        cardType: c.cardType,
        status: 'ready' as const,
        order: items.length + idx,
      }));
    if (newItems.length === 0) { toast.info('All backlog cards are already loaded'); return; }
    setItems(prev => [...prev, ...newItems]);
    toast.success(`${newItems.length} card(s) loaded from backlog`);
  };

  const addManualItem = () => {
    setItems(prev => [...prev, { itemId: `item-${Date.now()}`, title: '', estimate: 0, status: 'ready', order: prev.length }]);
  };

  const updateItem = (itemId: string, field: keyof SprintPlanningItem, value: string | number) => {
    setItems(prev => prev.map(i => i.itemId === itemId ? { ...i, [field]: value } : i));
  };

  const deleteItem = (itemId: string) => setItems(prev => prev.filter(i => i.itemId !== itemId));

  const moveItem = (itemId: string, status: SprintPlanningItem['status']) => {
    setItems(prev => prev.map(i => i.itemId === itemId ? { ...i, status } : i));
  };

  const save = async () => {
    try {
      setLoading(true);
      await scrumRoomsApi.updateData(room.id, { data: { capacity, items, sprintGoals, actualWorkload: inScopePoints } });
      onUpdate();
      toast.success('Sprint plan saved');
    } catch (e: any) { toast.error(e.message || 'Failed to save'); }
    finally { setLoading(false); }
  };

  const commitToSprint = async () => {
    if (!targetSprintId) { toast.warning('Select a sprint to commit to'); return; }
    const inScopeItems = items.filter(i => i.status === 'in_scope' && i.cardId);
    if (inScopeItems.length === 0) { toast.warning('No linked cards in sprint scope'); return; }
    setCommitting(true);
    try {
      await Promise.all(inScopeItems.map(i => cardsApi.update(i.cardId!, { sprintId: targetSprintId })));
      await save();
      toast.success(`${inScopeItems.length} card(s) committed to sprint`);
    } catch (e: any) { toast.error(e.message || 'Failed to commit'); }
    finally { setCommitting(false); }
  };

  const getByStatus = (s: SprintPlanningItem['status']) => items.filter(i => i.status === s).sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/scrum-rooms')} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{room.name}</h1>
            {room.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{room.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={save} disabled={loading} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
            {loading ? 'Saving…' : 'Save'}
          </button>
          {sprints.length > 0 && (
            <button onClick={commitToSprint} disabled={committing} className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {committing ? 'Committing…' : 'Commit to Sprint'}
            </button>
          )}
        </div>
      </div>

      {/* Top controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Capacity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Capacity</h3>
          <div className="flex items-center gap-3 mb-3">
            <input type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} min={0} placeholder="Story points" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <span className="text-sm text-gray-500 whitespace-nowrap">pts total</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Committed: <strong className="text-gray-800">{inScopePoints} pts</strong></span>
              <span className={`font-semibold ${workloadPct > 100 ? 'text-red-600' : workloadPct > 80 ? 'text-yellow-600' : 'text-green-600'}`}>{workloadPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(workloadPct, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-400">
              {workloadPct > 100 ? 'Over capacity — remove items' : workloadPct > 80 ? 'Approaching limit' : 'Healthy utilization'}
            </p>
          </div>
        </div>

        {/* Sprint selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Target Sprint</h3>
          {sprints.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming sprints found</p>
          ) : (
            <select value={targetSprintId} onChange={e => setTargetSprintId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name} · {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}</option>)}
            </select>
          )}
          <button onClick={loadBacklog} disabled={loadingBacklog} className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            {loadingBacklog ? 'Loading…' : `Import from Backlog (${backlogCards.length})`}
          </button>
          {backlogCards.length > 0 && (
            <button onClick={importFromBacklog} className="mt-2 w-full px-3 py-2 bg-primary-50 text-primary-700 text-sm font-semibold rounded-lg hover:bg-primary-100 transition-colors">
              Load {backlogCards.length} cards into board
            </button>
          )}
        </div>

        {/* Sprint goals */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Sprint Goals</h3>
          <div className="flex gap-2 mb-2">
            <input value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newGoal.trim()) { setSprintGoals(prev => [...prev, newGoal.trim()]); setNewGoal(''); } }} placeholder="Add a goal…" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <button onClick={() => { if (newGoal.trim()) { setSprintGoals(prev => [...prev, newGoal.trim()]); setNewGoal(''); } }} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors">Add</button>
          </div>
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {sprintGoals.length === 0 ? (
              <p className="text-xs text-gray-400">No goals yet</p>
            ) : sprintGoals.map((g, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg">
                <svg className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span className="flex-1 text-xs text-gray-800">{g}</span>
                <button onClick={() => setSprintGoals(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 text-xs">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const colItems = getByStatus(col.key);
          const colPoints = colItems.reduce((s, i) => s + (i.estimate || 0), 0);
          return (
            <div key={col.key} className={`bg-white rounded-xl border-2 ${col.color} flex flex-col min-h-96`}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{col.label}</h3>
                  <p className="text-xs text-gray-400">{colItems.length} item{colItems.length !== 1 ? 's' : ''}{colPoints > 0 ? ` · ${colPoints} pts` : ''}</p>
                </div>
                {col.key === 'ready' && (
                  <button onClick={addManualItem} className="p-1 text-gray-400 hover:text-primary-600 rounded transition-colors" title="Add item manually">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                )}
              </div>

              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {colItems.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">{col.emptyText}</p>
                ) : colItems.map(item => (
                  <div key={item.itemId} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-white transition-colors">
                    {/* Title */}
                    <input
                      value={item.title}
                      onChange={e => updateItem(item.itemId, 'title', e.target.value)}
                      placeholder="Item title…"
                      className="w-full text-sm font-medium text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded px-1 -mx-1 mb-2"
                    />
                    <div className="flex items-center gap-2">
                      {item.priority && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase flex-shrink-0 ${PRIORITY_BADGE[item.priority as CardPriority] || 'bg-gray-100 text-gray-600'}`}>
                          {item.priority}
                        </span>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <input
                          type="number"
                          value={item.estimate}
                          onChange={e => updateItem(item.itemId, 'estimate', Number(e.target.value))}
                          min={0}
                          className="w-14 text-xs text-right border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          title="Story points"
                        />
                        <span className="text-xs text-gray-400">pts</span>
                      </div>
                    </div>

                    {/* Status move buttons */}
                    <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                      {COLUMNS.filter(c => c.key !== col.key).map(target => (
                        <button
                          key={target.key}
                          onClick={() => moveItem(item.itemId, target.key)}
                          className="flex-1 text-xs py-1 rounded border border-gray-200 text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors truncate"
                        >
                          → {target.label}
                        </button>
                      ))}
                      <button onClick={() => deleteItem(item.itemId)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
