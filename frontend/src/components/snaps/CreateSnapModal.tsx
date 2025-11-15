import React, { useState } from 'react';
import { snapsApi } from '../../services/api/snaps';
import { Snap, SnapRAG, CreateSnapRequest } from '../../types/snap';

interface CreateSnapModalProps {
  cardId: string;
  cardTitle: string;
  yesterdaySnap?: Snap | null;
  olderSnaps?: Snap[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSnapModal({
  cardId,
  cardTitle,
  yesterdaySnap,
  olderSnaps = [],
  onClose,
  onSuccess,
}: CreateSnapModalProps) {
  const [rawInput, setRawInput] = useState('');
  const [done, setDone] = useState('');
  const [toDo, setToDo] = useState('');
  const [blockers, setBlockers] = useState('');
  const [finalRAG, setFinalRAG] = useState<SnapRAG | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOlderSnaps, setShowOlderSnaps] = useState(false);
  const [useAI, setUseAI] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rawInput.trim()) {
      setError('Please enter a snap update');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: CreateSnapRequest = {
        cardId,
        rawInput: rawInput.trim(),
      };

      // If user wants to use AI (default), don't send manual fields
      // If user manually filled fields, send them
      if (!useAI) {
        if (done.trim()) data.done = done.trim();
        if (toDo.trim()) data.toDo = toDo.trim();
        if (blockers.trim()) data.blockers = blockers.trim();
        if (finalRAG) data.finalRAG = finalRAG as SnapRAG;
      }

      await snapsApi.create(data);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create snap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Add Snap for {cardTitle}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Prior Context Section */}
        {yesterdaySnap && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              Yesterday's Snap ({new Date(yesterdaySnap.snapDate).toLocaleDateString()})
            </h4>
            <div className="space-y-2 text-sm">
              {yesterdaySnap.done && (
                <div>
                  <span className="font-medium text-green-700">Done: </span>
                  <span className="text-gray-700">{yesterdaySnap.done}</span>
                </div>
              )}
              {yesterdaySnap.toDo && (
                <div>
                  <span className="font-medium text-blue-700">To Do: </span>
                  <span className="text-gray-700">{yesterdaySnap.toDo}</span>
                </div>
              )}
              {yesterdaySnap.blockers && (
                <div>
                  <span className="font-medium text-red-700">Blockers: </span>
                  <span className="text-gray-700">{yesterdaySnap.blockers}</span>
                </div>
              )}
              {yesterdaySnap.finalRAG && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Status: </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      yesterdaySnap.finalRAG === SnapRAG.GREEN
                        ? 'bg-green-100 text-green-800'
                        : yesterdaySnap.finalRAG === SnapRAG.AMBER
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {yesterdaySnap.finalRAG.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Older Snaps (Collapsed) */}
        {olderSnaps.length > 0 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowOlderSnaps(!showOlderSnaps)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showOlderSnaps ? '▼' : '▶'} View Full History ({olderSnaps.length} older snaps)
            </button>
            {showOlderSnaps && (
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {olderSnaps.map((snap) => (
                  <div key={snap.id} className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                    <div className="font-medium text-gray-600 mb-1">
                      {new Date(snap.snapDate).toLocaleDateString()}
                    </div>
                    {snap.done && <div className="text-gray-700">{snap.done}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Raw Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's your update? (Write in normal English)
            </label>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Example: Completed API integration for user auth. Working on frontend UI next. Blocked on database permissions."
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              AI will automatically parse your update into Done, To Do, and Blockers sections.
            </p>
          </div>

          {/* AI Toggle */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="useAI"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="rounded"
              disabled={loading}
            />
            <label htmlFor="useAI" className="text-sm text-gray-700">
              Use AI to parse my update
            </label>
          </div>

          {/* Manual Fields (if AI is disabled) */}
          {!useAI && (
            <div className="space-y-4 mb-4 p-4 bg-gray-50 border border-gray-200 rounded">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Done</label>
                <input
                  type="text"
                  value={done}
                  onChange={(e) => setDone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What was completed"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Do</label>
                <input
                  type="text"
                  value={toDo}
                  onChange={(e) => setToDo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What's planned next"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blockers</label>
                <input
                  type="text"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any blockers or issues"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RAG Status</label>
                <select
                  value={finalRAG}
                  onChange={(e) => setFinalRAG(e.target.value as SnapRAG | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">Select status...</option>
                  <option value={SnapRAG.GREEN}>Green - On Track</option>
                  <option value={SnapRAG.AMBER}>Amber - At Risk</option>
                  <option value={SnapRAG.RED}>Red - Off Track</option>
                </select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Snap'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
