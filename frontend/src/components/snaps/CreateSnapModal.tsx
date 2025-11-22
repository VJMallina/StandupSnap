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
  const [suggestedRAG, setSuggestedRAG] = useState<SnapRAG | ''>('');
  const [overrideRAG, setOverrideRAG] = useState<SnapRAG | ''>('');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isParsed, setIsParsed] = useState(false);

  const handleParse = async () => {
    if (!rawInput.trim()) {
      setError('Please enter a snap update');
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const parsedData = await snapsApi.parse(cardId, rawInput.trim());
      setDone(parsedData.done || '');
      setToDo(parsedData.toDo || '');
      setBlockers(parsedData.blockers || '');
      setSuggestedRAG(parsedData.suggestedRAG as SnapRAG || '');
      setOverrideRAG('');
      setIsParsed(true);
    } catch (err: any) {
      setError(err.message || 'Failed to parse snap');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const data: CreateSnapRequest = {
        cardId,
        rawInput: rawInput.trim(),
        done: done.trim() || undefined,
        toDo: toDo.trim() || undefined,
        blockers: blockers.trim() || undefined,
        suggestedRAG: suggestedRAG as SnapRAG || undefined,
        finalRAG: overrideRAG as SnapRAG || undefined,
      };

      await snapsApi.create(data);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create snap');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setIsParsed(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-10 mx-auto w-full max-w-4xl shadow-2xl rounded-xl bg-white mb-10 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Add Snap for {cardTitle}</h3>
            <button
              onClick={onClose}
              className="text-teal-100 hover:text-white transition-colors"
              disabled={loading || parsing}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">

        {/* Past Snaps Section */}
        {(yesterdaySnap || olderSnaps.length > 0) && (
          <div className="mb-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Past Snaps</h4>

            {/* Yesterday's Snap */}
            {yesterdaySnap && (
              <details className="border border-teal-200 rounded-lg overflow-hidden">
                <summary className="px-4 py-3 bg-teal-50 cursor-pointer hover:bg-teal-100 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-teal-900">
                      Yesterday's Snap ({new Date(yesterdaySnap.snapDate).toLocaleDateString()})
                    </span>
                    {yesterdaySnap.isLocked && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                        🔒 Locked
                      </span>
                    )}
                  </div>
                  {yesterdaySnap.finalRAG && (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      yesterdaySnap.finalRAG === SnapRAG.GREEN ? 'bg-green-100 text-green-800' :
                      yesterdaySnap.finalRAG === SnapRAG.AMBER ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {yesterdaySnap.finalRAG.toUpperCase()}
                    </span>
                  )}
                </summary>
                <div className="px-4 py-3 bg-white space-y-2 text-sm">
                  {yesterdaySnap.done && (
                    <div className="border-l-4 border-green-500 pl-3">
                      <span className="font-medium text-green-700">Done: </span>
                      <span className="text-gray-700">{yesterdaySnap.done}</span>
                    </div>
                  )}
                  {yesterdaySnap.toDo && (
                    <div className="border-l-4 border-teal-500 pl-3">
                      <span className="font-medium text-teal-700">To Do: </span>
                      <span className="text-gray-700">{yesterdaySnap.toDo}</span>
                    </div>
                  )}
                  {yesterdaySnap.blockers && (
                    <div className="border-l-4 border-red-500 pl-3">
                      <span className="font-medium text-red-700">Blockers: </span>
                      <span className="text-gray-700">{yesterdaySnap.blockers}</span>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Older Snaps */}
            {olderSnaps.map((snap) => (
              <details key={snap.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <summary className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">
                      {new Date(snap.snapDate).toLocaleDateString()}
                    </span>
                    {snap.isLocked && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                        🔒 Locked
                      </span>
                    )}
                  </div>
                  {snap.finalRAG && (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      snap.finalRAG === SnapRAG.GREEN ? 'bg-green-100 text-green-800' :
                      snap.finalRAG === SnapRAG.AMBER ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {snap.finalRAG.toUpperCase()}
                    </span>
                  )}
                </summary>
                <div className="px-4 py-3 bg-white space-y-2 text-sm">
                  {snap.done && (
                    <div className="border-l-4 border-green-500 pl-3">
                      <span className="font-medium text-green-700">Done: </span>
                      <span className="text-gray-700">{snap.done}</span>
                    </div>
                  )}
                  {snap.toDo && (
                    <div className="border-l-4 border-teal-500 pl-3">
                      <span className="font-medium text-teal-700">To Do: </span>
                      <span className="text-gray-700">{snap.toDo}</span>
                    </div>
                  )}
                  {snap.blockers && (
                    <div className="border-l-4 border-red-500 pl-3">
                      <span className="font-medium text-red-700">Blockers: </span>
                      <span className="text-gray-700">{snap.blockers}</span>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!isParsed ? (
          /* Step 1: Enter raw input */
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's your update? (Write in normal English)
              </label>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Example: Completed API integration for user auth. Working on frontend UI next. Blocked on database permissions."
                disabled={parsing}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Standup Snap will automatically parse your update into Done, To Do, and Blockers sections.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={parsing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParse}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-teal-300"
                disabled={parsing || !rawInput.trim()}
              >
                {parsing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate Snap'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Review and edit parsed results */
          <div>
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium">✓ Snap Generated! Review and edit below, then save.</p>
            </div>

            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-xs font-medium text-gray-500 mb-1">Original Input:</p>
              <p className="text-sm text-gray-700">{rawInput}</p>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-green-600">✓</span> Done
                </label>
                <textarea
                  value={done}
                  onChange={(e) => setDone(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="What was completed"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-teal-600">→</span> To Do
                </label>
                <textarea
                  value={toDo}
                  onChange={(e) => setToDo(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="What's planned next"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-600">⚠</span> Blockers
                </label>
                <textarea
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Any blockers or issues (leave empty if none)"
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Snap Suggested RAG</label>
                  <select
                    value={suggestedRAG}
                    onChange={(e) => setSuggestedRAG(e.target.value as SnapRAG | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={loading}
                  >
                    <option value="">None</option>
                    <option value={SnapRAG.GREEN}>🟢 Green - On Track</option>
                    <option value={SnapRAG.AMBER}>🟡 Amber - At Risk</option>
                    <option value={SnapRAG.RED}>🔴 Red - Off Track</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Override RAG Status</label>
                  <select
                    value={overrideRAG}
                    onChange={(e) => setOverrideRAG(e.target.value as SnapRAG | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={loading}
                  >
                    <option value="">Keep suggested</option>
                    <option value={SnapRAG.GREEN}>🟢 Green - On Track</option>
                    <option value={SnapRAG.AMBER}>🟡 Amber - At Risk</option>
                    <option value={SnapRAG.RED}>🔴 Red - Off Track</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                ← Back to Edit Input
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-300"
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
                    'Save Snap'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
