import { useState, useEffect } from 'react';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import { RoomType } from '../../types/scrumRooms';

interface Props {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
  preselectedType?: RoomType | null;
}

const ROOM_TYPES: { type: RoomType; label: string; description: string; icon: JSX.Element; color: string }[] = [
  {
    type: RoomType.PLANNING_POKER,
    label: 'Planning Poker',
    description: 'Collaborative estimation with story points',
    color: 'border-blue-300 bg-blue-50 text-blue-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    type: RoomType.RETROSPECTIVE,
    label: 'Retrospective',
    description: 'Reflect on the sprint with structured columns',
    color: 'border-purple-300 bg-purple-50 text-purple-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    type: RoomType.SPRINT_PLANNING,
    label: 'Sprint Planning',
    description: 'Plan capacity and commit backlog items to a sprint',
    color: 'border-primary-300 bg-primary-50 text-primary-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    type: RoomType.REFINEMENT,
    label: 'Refinement',
    description: 'Refine stories with acceptance criteria and notes',
    color: 'border-green-300 bg-green-50 text-green-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
];

export const CreateRoomModal = ({ isOpen, projectId, onClose, onSuccess, preselectedType }: Props) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>(preselectedType || RoomType.PLANNING_POKER);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedType) setType(preselectedType);
  }, [preselectedType]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleClose = () => {
    if (loading) return;
    setName(''); setDescription(''); setError(null);
    setType(preselectedType || RoomType.PLANNING_POKER);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Room name is required'); return; }
    try {
      setLoading(true);
      setError(null);
      await scrumRoomsApi.create({ name: name.trim(), type, description: description.trim() || undefined, projectId });
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Scrum Room</h2>
            <p className="text-sm text-gray-500 mt-0.5">Set up a collaborative space for your ceremony</p>
          </div>
          <button onClick={handleClose} disabled={loading} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Room name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Room Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sprint 24 Planning Poker"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Room type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Room Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_TYPES.map(rt => (
                <button
                  key={rt.type}
                  type="button"
                  onClick={() => setType(rt.type)}
                  disabled={loading}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    type === rt.type ? rt.color + ' border-opacity-100' : 'border-gray-200 hover:border-gray-300 bg-white text-gray-600'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">{rt.icon}</div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${type === rt.type ? '' : 'text-gray-900'}`}>{rt.label}</p>
                    <p className={`text-xs mt-0.5 ${type === rt.type ? 'opacity-80' : 'text-gray-400'}`}>{rt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add context or goals for this room"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} disabled={loading} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating…</>
              ) : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
