import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import { cardsApi } from '../../services/api/cards';
import { ScrumRoom, PlanningPokerData, PlanningPokerRound, DeckType } from '../../types/scrumRooms';
import { Card } from '../../types/card';
import { useToast } from '../../hooks/useToast';
import { useProjectSelection } from '../../context/ProjectSelectionContext';

interface Props { room: ScrumRoom; onUpdate: () => void; }

const DECKS: Record<DeckType, string[]> = {
  [DeckType.FIBONACCI]: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '?'],
  [DeckType.MODIFIED_FIBONACCI]: ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '?'],
  [DeckType.T_SHIRT]: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  [DeckType.CUSTOM]: [],
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-600 bg-red-50',
  high: 'text-orange-600 bg-orange-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-green-600 bg-green-50',
};

export const PlanningPokerRoom = ({ room, onUpdate }: Props) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { selectedProjectId } = useProjectSelection();
  const data = room.data as PlanningPokerData;

  const [deckType, setDeckType] = useState<DeckType>(data?.deckType || DeckType.FIBONACCI);
  const [customDeck, setCustomDeck] = useState<string[]>(data?.customDeck || []);
  const [customCardInput, setCustomCardInput] = useState('');
  const [itemName, setItemName] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [savingEstimate, setSavingEstimate] = useState(false);
  const [backlogCards, setBacklogCards] = useState<Card[]>([]);
  const [loadingBacklog, setLoadingBacklog] = useState(false);
  const [showBacklogPicker, setShowBacklogPicker] = useState(false);

  const currentUserId = localStorage.getItem('userId') || 'anonymous';
  const currentRound = data?.rounds?.[data.rounds.length - 1];
  const isActiveRound = currentRound && !currentRound.revealed;
  const userVote = currentRound?.votes?.[currentUserId];
  const deck = deckType === DeckType.CUSTOM ? customDeck : DECKS[deckType];

  useEffect(() => {
    if (selectedProjectId) loadBacklog();
  }, [selectedProjectId]);

  const loadBacklog = async () => {
    if (!selectedProjectId) return;
    setLoadingBacklog(true);
    try {
      const cards = await cardsApi.getAll({ projectId: selectedProjectId, backlog: true });
      setBacklogCards(cards.filter(c => c.cardType === 'card'));
    } catch { /* non-fatal */ }
    finally { setLoadingBacklog(false); }
  };

  const handlePickCard = (card: Card) => {
    setSelectedCardId(card.id);
    setItemName(card.title);
    setShowBacklogPicker(false);
  };

  const startRound = async () => {
    if (!itemName.trim()) { toast.warning('Enter an item name or pick a backlog card'); return; }
    try {
      setLoading(true);
      const newRound: PlanningPokerRound = {
        roundId: `round-${Date.now()}`,
        itemName: itemName.trim(),
        cardId: selectedCardId || undefined,
        votes: {},
        revealed: false,
        finalValue: null,
        timestamp: new Date().toISOString(),
      };
      await scrumRoomsApi.updateData(room.id, {
        data: { ...data, deckType, customDeck: deckType === DeckType.CUSTOM ? customDeck : undefined, rounds: [...(data?.rounds || []), newRound], participants: data?.participants || [] },
      });
      setItemName('');
      setSelectedCardId('');
      onUpdate();
      toast.success('Round started');
    } catch (e: any) { toast.error(e.message || 'Failed to start round'); }
    finally { setLoading(false); }
  };

  const vote = async (card: string) => {
    if (!currentRound || currentRound.revealed) return;
    try {
      setLoading(true);
      const updatedRounds = data.rounds.map(r =>
        r.roundId === currentRound.roundId ? { ...r, votes: { ...r.votes, [currentUserId]: card } } : r
      );
      await scrumRoomsApi.updateData(room.id, { data: { ...data, rounds: updatedRounds } });
      onUpdate();
    } catch (e: any) { toast.error(e.message || 'Failed to vote'); }
    finally { setLoading(false); }
  };

  const reveal = async () => {
    if (!currentRound) return;
    try {
      setLoading(true);
      const numericVotes = Object.values(currentRound.votes).filter(v => v !== '?' && !isNaN(Number(v))).map(Number);
      let stats: Partial<PlanningPokerRound> = {};
      if (numericVotes.length > 0) {
        const sum = numericVotes.reduce((a, b) => a + b, 0);
        const mean = Math.round((sum / numericVotes.length) * 10) / 10;
        const sorted = [...numericVotes].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        const freq: Record<string, number> = {};
        Object.values(currentRound.votes).forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
        const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
        stats = { mean, median, mode };
      }
      const updatedRounds = data.rounds.map(r =>
        r.roundId === currentRound.roundId ? { ...r, revealed: true, ...stats } : r
      );
      await scrumRoomsApi.updateData(room.id, { data: { ...data, rounds: updatedRounds } });
      onUpdate();
      toast.success('Votes revealed');
    } catch (e: any) { toast.error(e.message || 'Failed to reveal'); }
    finally { setLoading(false); }
  };

  const saveFinalEstimate = async (estimate: string | number) => {
    if (!currentRound) return;
    try {
      setLoading(true);
      const updatedRounds = data.rounds.map(r =>
        r.roundId === currentRound.roundId ? { ...r, finalValue: estimate } : r
      );
      await scrumRoomsApi.updateData(room.id, { data: { ...data, rounds: updatedRounds } });
      onUpdate();
      toast.success('Estimate set');
    } catch (e: any) { toast.error(e.message || 'Failed to set estimate'); }
    finally { setLoading(false); }
  };

  const saveEstimateToCard = async () => {
    if (!currentRound?.cardId || currentRound.finalValue === null) return;
    setSavingEstimate(true);
    try {
      await cardsApi.update(currentRound.cardId, { storyPoints: Number(currentRound.finalValue) });
      const updatedRounds = data.rounds.map(r =>
        r.roundId === currentRound.roundId ? { ...r, estimateSaved: true } : r
      );
      await scrumRoomsApi.updateData(room.id, { data: { ...data, rounds: updatedRounds } });
      onUpdate();
      toast.success(`Estimate ${currentRound.finalValue} saved to card`);
    } catch (e: any) { toast.error(e.message || 'Failed to save to card'); }
    finally { setSavingEstimate(false); }
  };

  const historyRounds = [...(data?.rounds || [])].reverse().slice(isActiveRound ? 1 : 0);

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
            {room.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{room.description}</p>}
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 flex-shrink-0">Planning Poker</span>
      </div>

      {/* Setup — shown when no active round */}
      {!isActiveRound && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Deck picker */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Deck Type</h3>
            <div className="space-y-2">
              {Object.values(DeckType).map(d => (
                <label key={d} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${deckType === d ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" className="accent-primary-600" checked={deckType === d} onChange={() => setDeckType(d)} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.split('_').map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ')}</p>
                    <p className="text-xs text-gray-400">{DECKS[d].slice(0, 7).join(', ')}{DECKS[d].length > 7 ? '…' : ''}</p>
                  </div>
                </label>
              ))}
            </div>
            {deckType === DeckType.CUSTOM && (
              <div className="mt-4">
                <div className="flex gap-2 mb-2">
                  <input value={customCardInput} onChange={e => setCustomCardInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setCustomDeck(prev => [...prev, customCardInput.trim()]); setCustomCardInput(''); } }} placeholder="Add value, press Enter" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {customDeck.map(c => (
                    <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-md text-xs font-medium">
                      {c}
                      <button onClick={() => setCustomDeck(prev => prev.filter(x => x !== c))} className="text-gray-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* New round */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Start Round</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={itemName} onChange={e => setItemName(e.target.value)} onKeyDown={e => e.key === 'Enter' && startRound()} placeholder="Story or item name…" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <button onClick={() => setShowBacklogPicker(v => !v)} disabled={loadingBacklog} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5" title="Pick from backlog">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  Backlog
                </button>
              </div>

              {showBacklogPicker && (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {backlogCards.length === 0 ? (
                    <p className="p-3 text-xs text-gray-400 text-center">No backlog cards found</p>
                  ) : backlogCards.map(c => (
                    <button key={c.id} onClick={() => handlePickCard(c)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${PRIORITY_COLORS[c.priority] || 'text-gray-600 bg-gray-50'}`}>{c.priority}</span>
                      <span className="text-sm text-gray-900 truncate flex-1">{c.title}</span>
                      {c.storyPoints && <span className="text-xs text-gray-400 flex-shrink-0">{c.storyPoints}pts</span>}
                    </button>
                  ))}
                </div>
              )}

              {selectedCardId && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg text-xs text-primary-700">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  Linked to backlog card
                </div>
              )}

              <button onClick={startRound} disabled={loading || !itemName.trim()} className="w-full px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors">
                {loading ? 'Starting…' : 'Start Round'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active round */}
      {isActiveRound && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Estimating</p>
              <p className="text-xl font-bold text-gray-900">{currentRound.itemName}</p>
              {currentRound.cardId && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs text-primary-600">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  Linked to card
                </span>
              )}
            </div>
            <button onClick={reveal} disabled={loading || Object.keys(currentRound.votes).length === 0} className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors">
              Reveal Votes
            </button>
          </div>

          <p className="text-xs font-medium text-gray-500 mb-3">{Object.keys(currentRound.votes).length} vote(s) cast</p>
          <div className="flex flex-wrap gap-2">
            {deck.map(card => (
              <button
                key={card}
                onClick={() => vote(card)}
                disabled={loading}
                className={`w-12 h-16 flex items-center justify-center text-base font-bold rounded-xl border-2 transition-all ${
                  userVote === card
                    ? 'border-primary-600 bg-primary-600 text-white shadow-lg scale-105'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50'
                } disabled:opacity-50`}
              >
                {card}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Revealed results */}
      {currentRound?.revealed && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Results</p>
              <p className="text-xl font-bold text-gray-900">{currentRound.itemName}</p>
            </div>
            {currentRound.cardId && currentRound.finalValue !== null && !currentRound.estimateSaved && (
              <button onClick={saveEstimateToCard} disabled={savingEstimate} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                {savingEstimate ? 'Saving…' : 'Save to Card'}
              </button>
            )}
            {currentRound.estimateSaved && (
              <span className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg border border-green-200">✓ Saved to card</span>
            )}
          </div>

          {/* Votes */}
          <div className="flex flex-wrap gap-2 mb-5">
            {Object.entries(currentRound.votes).map(([uid, v]) => (
              <div key={uid} className="w-12 h-16 flex flex-col items-center justify-center border-2 border-gray-200 rounded-xl bg-gray-50">
                <span className="text-lg font-bold text-primary-600">{String(v)}</span>
                <span className="text-xs text-gray-400 mt-0.5 truncate max-w-full px-1">{uid === currentUserId ? 'You' : `…${uid.slice(-4)}`}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          {currentRound.mean !== undefined && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[['Mean', currentRound.mean?.toFixed(1)], ['Median', currentRound.median?.toFixed(1)], ['Mode', currentRound.mode]].map(([label, val]) => (
                <div key={label as string} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-xl font-bold text-gray-900">{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Final estimate picker */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Final Estimate {currentRound.finalValue !== null && <span className="text-primary-600">· {currentRound.finalValue}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {deck.filter(c => c !== '?').map(card => (
                <button
                  key={card}
                  onClick={() => saveFinalEstimate(card)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                    currentRound.finalValue === card
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-400'
                  }`}
                >
                  {card}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Round history */}
      {historyRounds.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Round History</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {historyRounds.map(r => (
              <div key={r.roundId} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.itemName}</p>
                  <p className="text-xs text-gray-400">{new Date(r.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs text-gray-400">Votes</p>
                    <p className="text-sm font-medium">{Object.keys(r.votes).length}</p>
                  </div>
                  {r.finalValue !== null ? (
                    <div>
                      <p className="text-xs text-gray-400">Final</p>
                      <p className="text-base font-bold text-primary-600">{r.finalValue}</p>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">No consensus</span>
                  )}
                  {r.estimateSaved && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Saved</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
