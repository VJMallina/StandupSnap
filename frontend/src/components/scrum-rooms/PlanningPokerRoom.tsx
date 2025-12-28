import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import {
  ScrumRoom,
  PlanningPokerData,
  PlanningPokerRound,
  DeckType,
} from '../../types/scrumRooms';

interface PlanningPokerRoomProps {
  room: ScrumRoom;
  onUpdate: () => void;
}

const DECK_OPTIONS = {
  [DeckType.FIBONACCI]: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'],
  [DeckType.MODIFIED_FIBONACCI]: ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?'],
  [DeckType.T_SHIRT]: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  [DeckType.CUSTOM]: [],
};

export const PlanningPokerRoom: React.FC<PlanningPokerRoomProps> = ({ room, onUpdate }) => {
  const navigate = useNavigate();
  const data = room.data as PlanningPokerData;

  const [itemName, setItemName] = useState('');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [customDeck, setCustomDeck] = useState<string[]>(data?.customDeck || []);
  const [customCardInput, setCustomCardInput] = useState('');
  const [deckType, setDeckType] = useState<DeckType>(data?.deckType || DeckType.FIBONACCI);
  const [loading, setLoading] = useState(false);

  const currentUserId = localStorage.getItem('userId') || 'anonymous';
  const currentRound = data?.rounds?.[data.rounds.length - 1];
  const isActiveRound = currentRound && !currentRound.revealed;
  const userVote = currentRound?.votes?.[currentUserId];

  const getCurrentDeck = () => {
    if (deckType === DeckType.CUSTOM) {
      return customDeck;
    }
    return DECK_OPTIONS[deckType];
  };

  const handleStartNewRound = async () => {
    if (!itemName.trim()) {
      alert('Please enter an item name');
      return;
    }

    try {
      setLoading(true);
      const newRound: PlanningPokerRound = {
        roundId: `round-${Date.now()}`,
        itemName: itemName.trim(),
        votes: {},
        revealed: false,
        finalValue: null,
        timestamp: new Date().toISOString(),
      };

      const updatedRounds = [...(data?.rounds || []), newRound];
      const updatedData: PlanningPokerData = {
        ...data,
        deckType,
        customDeck: deckType === DeckType.CUSTOM ? customDeck : undefined,
        rounds: updatedRounds,
        participants: data?.participants || [currentUserId],
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      setItemName('');
      setSelectedCard(null);
      onUpdate();
    } catch (err: any) {
      console.error('Error starting round:', err);
      alert(err.message || 'Failed to start round');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (card: string) => {
    if (!currentRound || currentRound.revealed) return;

    try {
      setLoading(true);
      setSelectedCard(card);

      const updatedVotes = {
        ...currentRound.votes,
        [currentUserId]: card,
      };

      const updatedRounds = data.rounds.map((r) =>
        r.roundId === currentRound.roundId ? { ...r, votes: updatedVotes } : r
      );

      const updatedData: PlanningPokerData = {
        ...data,
        rounds: updatedRounds,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      onUpdate();
    } catch (err: any) {
      console.error('Error voting:', err);
      alert(err.message || 'Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (votes: Record<string, string | number>) => {
    const numericVotes = Object.values(votes)
      .filter((v) => v !== '?' && !isNaN(Number(v)))
      .map(Number);

    if (numericVotes.length === 0) return null;

    const sum = numericVotes.reduce((a, b) => a + b, 0);
    const mean = sum / numericVotes.length;

    const sorted = [...numericVotes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    const frequency: Record<number, number> = {};
    numericVotes.forEach((v) => (frequency[v] = (frequency[v] || 0) + 1));
    const mode = Object.entries(frequency).sort((a, b) => b[1] - a[1])[0]?.[0];

    return { mean, median, mode: Number(mode) };
  };

  const handleReveal = async () => {
    if (!currentRound) return;

    try {
      setLoading(true);

      const stats = calculateStatistics(currentRound.votes);
      const updatedRounds = data.rounds.map((r) =>
        r.roundId === currentRound.roundId
          ? {
              ...r,
              revealed: true,
              mean: stats?.mean,
              median: stats?.median,
              mode: stats?.mode,
            }
          : r
      );

      const updatedData: PlanningPokerData = {
        ...data,
        rounds: updatedRounds,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      onUpdate();
    } catch (err: any) {
      console.error('Error revealing:', err);
      alert(err.message || 'Failed to reveal votes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFinalEstimate = async (estimate: string | number) => {
    if (!currentRound) return;

    try {
      setLoading(true);

      const updatedRounds = data.rounds.map((r) =>
        r.roundId === currentRound.roundId ? { ...r, finalValue: estimate } : r
      );

      const updatedData: PlanningPokerData = {
        ...data,
        rounds: updatedRounds,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      onUpdate();
    } catch (err: any) {
      console.error('Error saving estimate:', err);
      alert(err.message || 'Failed to save estimate');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomCard = () => {
    if (customCardInput.trim() && !customDeck.includes(customCardInput.trim())) {
      setCustomDeck([...customDeck, customCardInput.trim()]);
      setCustomCardInput('');
    }
  };

  const handleRemoveCustomCard = (card: string) => {
    setCustomDeck(customDeck.filter((c) => c !== card));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/scrum-rooms')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">🃏</span>
              <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
            </div>
            {room.description && <p className="text-gray-600 mt-1">{room.description}</p>}
          </div>
        </div>
      </div>

      {/* Deck Configuration */}
      {!isActiveRound && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deck Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Deck Type
              </label>
              <select
                value={deckType}
                onChange={(e) => setDeckType(e.target.value as DeckType)}
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={DeckType.FIBONACCI}>Fibonacci (0, 1, 2, 3, 5, 8, 13, ...)</option>
                <option value={DeckType.MODIFIED_FIBONACCI}>
                  Modified Fibonacci (0, 0.5, 1, 2, 3, 5, 8, ...)
                </option>
                <option value={DeckType.T_SHIRT}>T-Shirt Sizes (XS, S, M, L, XL, XXL)</option>
                <option value={DeckType.CUSTOM}>Custom Deck</option>
              </select>
            </div>

            {deckType === DeckType.CUSTOM && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Cards
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={customCardInput}
                    onChange={(e) => setCustomCardInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomCard()}
                    placeholder="Add card value"
                    className="flex-1 max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddCustomCard}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customDeck.map((card) => (
                    <div
                      key={card}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg"
                    >
                      <span className="text-sm font-medium">{card}</span>
                      <button
                        onClick={() => handleRemoveCustomCard(card)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {customDeck.length === 0 && (
                    <p className="text-sm text-gray-500">No custom cards yet. Add some above.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start New Round */}
      {!isActiveRound && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Start New Round</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Enter story or item name (e.g., 'User Login Feature')"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleStartNewRound()}
            />
            <button
              onClick={handleStartNewRound}
              disabled={loading || !itemName.trim()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Round
            </button>
          </div>
        </div>
      )}

      {/* Active Round */}
      {isActiveRound && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Round</h3>
              <p className="text-2xl font-bold text-primary-600 mt-1">{currentRound.itemName}</p>
            </div>
            <button
              onClick={handleReveal}
              disabled={loading || Object.keys(currentRound.votes).length === 0}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reveal Votes
            </button>
          </div>

          {/* Voting Cards */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Select Your Estimate</h4>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
              {getCurrentDeck().map((card) => (
                <button
                  key={card}
                  onClick={() => handleVote(card)}
                  disabled={loading}
                  className={`aspect-[2/3] flex items-center justify-center text-lg font-bold rounded-lg border-2 transition-all ${
                    userVote === card
                      ? 'border-primary-600 bg-primary-50 text-primary-700 scale-105'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50'
                  } disabled:opacity-50`}
                >
                  {card}
                </button>
              ))}
            </div>
          </div>

          {/* Participants Status */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Votes: {Object.keys(currentRound.votes).length} participant(s)
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(currentRound.votes).map(([userId, _]) => (
                <div
                  key={userId}
                  className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                >
                  {userId === currentUserId ? 'You' : `User ${userId.slice(0, 8)}`} ✓
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revealed Round Results */}
      {currentRound?.revealed && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Round Results</h3>
          <p className="text-xl font-bold text-gray-700 mb-4">{currentRound.itemName}</p>

          {/* All Votes */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">All Votes</h4>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
              {Object.entries(currentRound.votes).map(([userId, vote]) => (
                <div
                  key={userId}
                  className="aspect-[2/3] flex flex-col items-center justify-center text-lg font-bold rounded-lg border-2 border-gray-300 bg-white"
                >
                  <span className="text-2xl text-primary-600">{vote}</span>
                  <span className="text-xs text-gray-500 mt-1">
                    {userId === currentUserId ? 'You' : `...${userId.slice(-4)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          {currentRound.mean !== undefined && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Mean</div>
                <div className="text-2xl font-bold text-gray-900">
                  {currentRound.mean.toFixed(1)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Median</div>
                <div className="text-2xl font-bold text-gray-900">
                  {currentRound.median?.toFixed(1)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Mode</div>
                <div className="text-2xl font-bold text-gray-900">{currentRound.mode}</div>
              </div>
            </div>
          )}

          {/* Final Estimate */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Final Estimate {currentRound.finalValue && `(${currentRound.finalValue})`}
            </h4>
            <div className="flex gap-2">
              {getCurrentDeck()
                .filter((card) => card !== '?')
                .map((card) => (
                  <button
                    key={card}
                    onClick={() => handleSaveFinalEstimate(card)}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                      currentRound.finalValue === card
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400'
                    } disabled:opacity-50`}
                  >
                    {card}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Round History */}
      {data?.rounds && data.rounds.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Round History</h3>
          <div className="space-y-3">
            {[...data.rounds]
              .reverse()
              .slice(isActiveRound ? 1 : 0)
              .map((round) => (
                <div
                  key={round.roundId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{round.itemName}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(round.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Votes</div>
                      <div className="text-sm font-medium">{Object.keys(round.votes).length}</div>
                    </div>
                    {round.finalValue && (
                      <div className="text-center">
                        <div className="text-xs text-gray-600">Final</div>
                        <div className="text-lg font-bold text-primary-600">{round.finalValue}</div>
                      </div>
                    )}
                    {round.revealed && !round.finalValue && (
                      <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        No Consensus
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
