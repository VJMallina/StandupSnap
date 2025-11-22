import React, { useState } from 'react';
import { snapsApi } from '../../services/api/snaps';
import { Snap, SnapRAG, UpdateSnapRequest } from '../../types/snap';

interface EditSnapModalProps {
  snap: Snap;
  yesterdaySnap?: Snap | null;
  olderSnaps?: Snap[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSnapModal({
  snap,
  yesterdaySnap,
  olderSnaps = [],
  onClose,
  onSuccess,
}: EditSnapModalProps) {
  const [rawInput, setRawInput] = useState(snap.rawInput || '');
  const [done, setDone] = useState(snap.done || '');
  const [toDo, setToDo] = useState(snap.toDo || '');
  const [blockers, setBlockers] = useState(snap.blockers || '');
  const [suggestedRAG, setSuggestedRAG] = useState<SnapRAG | ''>(snap.suggestedRAG || '');
  const [finalRAG, setFinalRAG] = useState<SnapRAG | ''>(snap.finalRAG || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOlderSnaps, setShowOlderSnaps] = useState(false);
  const [regenerate, setRegenerate] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rawInput.trim()) {
      setError('Raw input cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: UpdateSnapRequest = {
        rawInput: rawInput.trim(),
        done: done.trim() || undefined,
        toDo: toDo.trim() || undefined,
        blockers: blockers.trim() || undefined,
        suggestedRAG: suggestedRAG ? (suggestedRAG as SnapRAG) : undefined,
        finalRAG: finalRAG ? (finalRAG as SnapRAG) : undefined,
        regenerate,
      };

      await snapsApi.update(snap.id, data);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update snap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-10 mx-auto w-full max-w-4xl shadow-2xl rounded-xl bg-white mb-10 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">
              Edit Snap ({new Date(snap.snapDate).toLocaleDateString()})
            </h3>
            <button
              onClick={onClose}
              className="text-teal-100 hover:text-white transition-colors"
              disabled={loading}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">

        {/* Lock Warning */}
        {snap.isLocked && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ This snap is locked and cannot be edited.
            </p>
          </div>
        )}

        {/* Prior Context Section */}
        {yesterdaySnap && (
          <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-md">
            <h4 className="text-sm font-semibold text-teal-900 mb-2 flex items-center gap-2">
              Yesterday's Snap ({new Date(yesterdaySnap.snapDate).toLocaleDateString()})
              {yesterdaySnap.isLocked && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                  🔒 Locked
                </span>
              )}
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
                  <span className="font-medium text-teal-700">To Do: </span>
                  <span className="text-gray-700">{yesterdaySnap.toDo}</span>
                </div>
              )}
              {yesterdaySnap.blockers && (
                <div>
                  <span className="font-medium text-red-700">Blockers: </span>
                  <span className="text-gray-700">{yesterdaySnap.blockers}</span>
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
              className="text-sm text-teal-600 hover:text-teal-800 font-medium"
            >
              {showOlderSnaps ? '▼' : '▶'} View Full History ({olderSnaps.length} older snaps)
            </button>
            {showOlderSnaps && (
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {olderSnaps.map((s) => (
                  <div key={s.id} className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                    <div className="font-medium text-gray-600 mb-1">
                      {new Date(s.snapDate).toLocaleDateString()}
                    </div>
                    {s.done && <div className="text-gray-700">{s.done}</div>}
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
              Raw Input
            </label>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              disabled={loading || snap.isLocked}
              required
            />
          </div>

          {/* Regenerate Checkbox */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="regenerate"
              checked={regenerate}
              onChange={(e) => setRegenerate(e.target.checked)}
              className="rounded"
              disabled={loading || snap.isLocked}
            />
            <label htmlFor="regenerate" className="text-sm text-gray-700">
              Regenerate using Standup Snap
            </label>
          </div>

          {/* Structured Fields */}
          {!regenerate && (
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Done</label>
                <textarea
                  value={done}
                  onChange={(e) => setDone(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={loading || snap.isLocked}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Do</label>
                <textarea
                  value={toDo}
                  onChange={(e) => setToDo(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={loading || snap.isLocked}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blockers</label>
                <textarea
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={loading || snap.isLocked}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suggested RAG (AI)
                  </label>
                  <select
                    value={suggestedRAG}
                    onChange={(e) => setSuggestedRAG(e.target.value as SnapRAG | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={loading || snap.isLocked}
                  >
                    <option value="">None</option>
                    <option value={SnapRAG.GREEN}>Green</option>
                    <option value={SnapRAG.AMBER}>Amber</option>
                    <option value={SnapRAG.RED}>Red</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Final RAG (Your Override)
                  </label>
                  <select
                    value={finalRAG}
                    onChange={(e) => setFinalRAG(e.target.value as SnapRAG | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={loading || snap.isLocked}
                  >
                    <option value="">None</option>
                    <option value={SnapRAG.GREEN}>Green</option>
                    <option value={SnapRAG.AMBER}>Amber</option>
                    <option value={SnapRAG.RED}>Red</option>
                  </select>
                </div>
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
            {!snap.isLocked && (
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-teal-300"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            )}
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
