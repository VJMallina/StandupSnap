import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Severity = 'P1' | 'P2' | 'P3' | 'P4';
const SEV_LABELS: Record<Severity, { label: string; desc: string; color: string }> = {
  P1: { label: 'P1 — Critical', desc: 'Complete service outage, data loss, major revenue impact', color: 'border-red-400 bg-red-50' },
  P2: { label: 'P2 — High', desc: 'Major feature broken, significant user impact', color: 'border-orange-400 bg-orange-50' },
  P3: { label: 'P3 — Medium', desc: 'Partial degradation, workaround available', color: 'border-yellow-400 bg-yellow-50' },
  P4: { label: 'P4 — Low', desc: 'Minor issue, minimal user impact', color: 'border-blue-400 bg-blue-50' },
};

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function DeclareIncidentModal({ projectId, onClose }: Props) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('P2');
  const [declaring, setDeclaring] = useState(false);
  const [error, setError] = useState('');

  const handleDeclare = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setDeclaring(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, severity, projectId }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to declare incident');
      const incident = await res.json();
      navigate(`/war-room/${incident.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to declare incident');
      setDeclaring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Declare Incident</h2>
              <p className="text-sm text-gray-500">Opens a live War Room for your team</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Payment service down for EU users"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              {(Object.keys(SEV_LABELS) as Severity[]).map(s => (
                <label key={s} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${severity === s ? SEV_LABELS[s].color : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="severity" value={s} checked={severity === s} onChange={() => setSeverity(s)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{SEV_LABELS[s].label}</p>
                    <p className="text-xs text-gray-500">{SEV_LABELS[s].desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What do you know so far? <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of what's happening and who is affected"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDeclare}
            disabled={!title.trim() || declaring}
            className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {declaring ? 'Opening War Room...' : '🚨 Declare Incident'}
          </button>
        </div>
      </div>
    </div>
  );
}
