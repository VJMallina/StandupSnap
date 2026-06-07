import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Props {
  incidentId: string;
  onClose: () => void;
  onResolved: () => void;
}

export default function ResolveIncidentModal({ incidentId, onClose, onResolved }: Props) {
  const [summary, setSummary] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const handleResolve = async () => {
    if (!summary.trim()) { setError('Please provide a resolution summary.'); return; }
    setResolving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ resolutionSummary: summary.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to resolve');
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve');
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Resolve Incident</h2>
          <p className="text-sm text-gray-500 mb-5">
            Describe what fixed it. The AI will generate a post-mortem using this and the full timeline.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
          )}
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            rows={4}
            placeholder="e.g. Increased Stripe webhook timeout from 10s to 30s and deployed hotfix v2.4.1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            After resolving, the AI will generate a post-mortem in the background (~10s).
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={!summary.trim() || resolving}
            className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {resolving ? 'Resolving...' : 'Confirm Resolve'}
          </button>
        </div>
      </div>
    </div>
  );
}
