import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import { cardsApi } from '../../services/api/cards';
import { ScrumRoom, RefinementData, RefinementItem } from '../../types/scrumRooms';
import { Card } from '../../types/card';
import { useToast } from '../../hooks/useToast';
import { useProjectSelection } from '../../context/ProjectSelectionContext';

interface Props { room: ScrumRoom; onUpdate: () => void; }

export const RefinementRoom = ({ room, onUpdate }: Props) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { selectedProjectId } = useProjectSelection();
  const data = room.data as RefinementData;

  const [items, setItems] = useState<RefinementItem[]>(data?.items || []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [backlogCards, setBacklogCards] = useState<Card[]>([]);
  const [loadingBacklog, setLoadingBacklog] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newCriteria, setNewCriteria] = useState('');
  const [editingNoteIdx, setEditingNoteIdx] = useState<{ itemId: string; idx: number } | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');

  useEffect(() => {
    if (selectedProjectId) loadBacklog();
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

  const save = async (updated: RefinementItem[]) => {
    try {
      await scrumRoomsApi.updateData(room.id, { data: { items: updated } });
      onUpdate();
    } catch (e: any) { toast.error(e.message || 'Failed to save'); }
  };

  const importFromBacklog = () => {
    const existingCardIds = new Set(items.filter(i => i.cardId).map(i => i.cardId!));
    const newItems: RefinementItem[] = backlogCards
      .filter(c => !existingCardIds.has(c.id))
      .map(c => ({
        itemId: `card-${c.id}`,
        cardId: c.id,
        title: c.title,
        notes: [],
        acceptanceCriteria: c.acceptanceCriteria ? c.acceptanceCriteria.split('\n').filter(Boolean) : [],
        estimate: c.storyPoints,
        criteriaPushed: false,
      }));
    if (newItems.length === 0) { toast.info('All backlog cards already loaded'); return; }
    const updated = [...items, ...newItems];
    setItems(updated);
    save(updated);
    toast.success(`${newItems.length} card(s) loaded`);
  };

  const addManualItem = () => {
    if (!newItemTitle.trim()) return;
    const newItem: RefinementItem = {
      itemId: `item-${Date.now()}`,
      title: newItemTitle.trim(),
      notes: [],
      acceptanceCriteria: [],
    };
    const updated = [...items, newItem];
    setItems(updated);
    save(updated);
    setNewItemTitle('');
    setExpandedId(newItem.itemId);
  };

  const deleteItem = (itemId: string) => {
    const updated = items.filter(i => i.itemId !== itemId);
    setItems(updated);
    save(updated);
  };

  const addNote = (itemId: string) => {
    if (!newNote.trim()) return;
    const updated = items.map(i => i.itemId === itemId ? { ...i, notes: [...i.notes, newNote.trim()] } : i);
    setItems(updated);
    save(updated);
    setNewNote('');
  };

  const removeNote = (itemId: string, idx: number) => {
    const updated = items.map(i => i.itemId === itemId ? { ...i, notes: i.notes.filter((_, j) => j !== idx) } : i);
    setItems(updated);
    save(updated);
  };

  const saveEditedNote = (itemId: string, idx: number) => {
    if (!editingNoteText.trim()) return;
    const updated = items.map(i => i.itemId === itemId ? { ...i, notes: i.notes.map((n, j) => j === idx ? editingNoteText.trim() : n) } : i);
    setItems(updated);
    save(updated);
    setEditingNoteIdx(null);
    setEditingNoteText('');
  };

  const addCriteria = (itemId: string) => {
    if (!newCriteria.trim()) return;
    const updated = items.map(i => i.itemId === itemId ? { ...i, acceptanceCriteria: [...i.acceptanceCriteria, newCriteria.trim()], criteriaPushed: false } : i);
    setItems(updated);
    save(updated);
    setNewCriteria('');
  };

  const removeCriteria = (itemId: string, idx: number) => {
    const updated = items.map(i => i.itemId === itemId ? { ...i, acceptanceCriteria: i.acceptanceCriteria.filter((_, j) => j !== idx), criteriaPushed: false } : i);
    setItems(updated);
    save(updated);
  };

  const updateEstimate = (itemId: string, estimate: number) => {
    setItems(prev => prev.map(i => i.itemId === itemId ? { ...i, estimate } : i));
  };

  const pushToCard = async (item: RefinementItem) => {
    if (!item.cardId) return;
    setPushingId(item.itemId);
    try {
      await cardsApi.update(item.cardId, {
        acceptanceCriteria: item.acceptanceCriteria.join('\n'),
        storyPoints: item.estimate,
      });
      const updated = items.map(i => i.itemId === item.itemId ? { ...i, criteriaPushed: true } : i);
      setItems(updated);
      await save(updated);
      toast.success('Acceptance criteria pushed to card');
    } catch (e: any) { toast.error(e.message || 'Failed to push'); }
    finally { setPushingId(null); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/scrum-rooms')} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{room.name}</h1>
            {room.description && <p className="text-sm text-gray-500 truncate">{room.description}</p>}
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 flex-shrink-0">Refinement</span>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <input
            value={newItemTitle}
            onChange={e => setNewItemTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addManualItem()}
            placeholder="Add item manually…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button onClick={addManualItem} disabled={!newItemTitle.trim()} className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors">Add</button>
        </div>
        <button
          onClick={importFromBacklog}
          disabled={loadingBacklog}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          {loadingBacklog ? 'Loading…' : `Import from Backlog (${backlogCards.length})`}
        </button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">No items yet</p>
          <p className="text-xs text-gray-400 mt-1">Add items manually or import from backlog</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const isExpanded = expandedId === item.itemId;
            return (
              <div key={item.itemId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Item header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : item.itemId)}
                >
                  <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.cardId && <span className="text-xs text-primary-600 flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>Linked</span>}
                      {item.acceptanceCriteria.length > 0 && <span className="text-xs text-gray-400">{item.acceptanceCriteria.length} criteria</span>}
                      {item.notes.length > 0 && <span className="text-xs text-gray-400">{item.notes.length} note{item.notes.length !== 1 ? 's' : ''}</span>}
                      {item.criteriaPushed && <span className="text-xs text-green-600 font-medium">✓ Pushed</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        value={item.estimate ?? ''}
                        onChange={e => updateEstimate(item.itemId, Number(e.target.value))}
                        onBlur={() => save(items)}
                        placeholder="pts"
                        min={0}
                        className="w-16 text-sm text-right border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <span className="text-xs text-gray-400">pts</span>
                    </div>
                    {item.cardId && item.acceptanceCriteria.length > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); pushToCard(item); }}
                        disabled={pushingId === item.itemId}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${item.criteriaPushed ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-primary-600 text-white hover:bg-primary-700'} disabled:opacity-40`}
                      >
                        {pushingId === item.itemId ? '…' : item.criteriaPushed ? '✓ Pushed' : 'Push to Card'}
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteItem(item.itemId); }} className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                    {/* Acceptance Criteria */}
                    <div className="p-5">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Acceptance Criteria</h4>
                      <div className="space-y-2 mb-3">
                        {item.acceptanceCriteria.length === 0 ? (
                          <p className="text-xs text-gray-400">No criteria yet</p>
                        ) : item.acceptanceCriteria.map((c, idx) => (
                          <div key={idx} className="flex items-start gap-2 group">
                            <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="flex-1 text-sm text-gray-700">{c}</span>
                            <button onClick={() => removeCriteria(item.itemId, idx)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={newCriteria} onChange={e => setNewCriteria(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCriteria(item.itemId)} placeholder="Given… When… Then…" className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                        <button onClick={() => addCriteria(item.itemId)} disabled={!newCriteria.trim()} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors">Add</button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="p-5">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Notes</h4>
                      <div className="space-y-2 mb-3">
                        {item.notes.length === 0 ? (
                          <p className="text-xs text-gray-400">No notes yet</p>
                        ) : item.notes.map((n, idx) => (
                          <div key={idx} className="group">
                            {editingNoteIdx?.itemId === item.itemId && editingNoteIdx.idx === idx ? (
                              <div className="flex gap-2">
                                <input value={editingNoteText} onChange={e => setEditingNoteText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEditedNote(item.itemId, idx); if (e.key === 'Escape') setEditingNoteIdx(null); }} className="flex-1 px-2 py-1 border border-primary-300 rounded text-xs focus:outline-none" autoFocus />
                                <button onClick={() => saveEditedNote(item.itemId, idx)} className="text-xs text-primary-600 font-medium">Save</button>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                                <span className="flex-1 text-sm text-gray-700 cursor-pointer" onDoubleClick={() => { setEditingNoteIdx({ itemId: item.itemId, idx }); setEditingNoteText(n); }}>{n}</span>
                                <button onClick={() => removeNote(item.itemId, idx)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote(item.itemId)} placeholder="Add a note…" className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
                        <button onClick={() => addNote(item.itemId)} disabled={!newNote.trim()} className="px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors">Add</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
