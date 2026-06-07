import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { scrumRoomsApi } from '../services/api/scrumRooms';
import { ScrumRoom, RoomType, RoomStatus } from '../types/scrumRooms';
import { CreateRoomModal } from '../components/scrum-rooms/CreateRoomModal';

const ROOM_TYPE_META: Record<RoomType, { label: string; color: string; badge: string; badgeText: string; icon: JSX.Element }> = {
  [RoomType.PLANNING_POKER]: {
    label: 'Planning Poker',
    color: 'bg-blue-500',
    badge: 'bg-blue-50',
    badgeText: 'text-blue-700',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  [RoomType.RETROSPECTIVE]: {
    label: 'Retrospective',
    color: 'bg-purple-500',
    badge: 'bg-purple-50',
    badgeText: 'text-purple-700',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  [RoomType.SPRINT_PLANNING]: {
    label: 'Sprint Planning',
    color: 'bg-primary-500',
    badge: 'bg-primary-50',
    badgeText: 'text-primary-700',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  [RoomType.REFINEMENT]: {
    label: 'Refinement',
    color: 'bg-green-500',
    badge: 'bg-green-50',
    badgeText: 'text-green-700',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
};

const STATUS_STYLES: Record<RoomStatus, string> = {
  [RoomStatus.ACTIVE]: 'bg-green-100 text-green-700',
  [RoomStatus.COMPLETED]: 'bg-blue-100 text-blue-700',
  [RoomStatus.ARCHIVED]: 'bg-gray-100 text-gray-600',
};

export default function ScrumRoomsPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();
  const [rooms, setRooms] = useState<ScrumRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<RoomType | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preselectedType, setPreselectedType] = useState<RoomType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) { navigate('/projects'); return; }
    fetchRooms();
  }, [selectedProjectId]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await scrumRoomsApi.getAll({ projectId: selectedProjectId!, includeArchived: false });
      setRooms(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await scrumRoomsApi.delete(id);
      setRooms(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const openCreate = (type?: RoomType) => {
    setPreselectedType(type ?? null);
    setShowCreateModal(true);
  };

  const filtered = activeType === 'all' ? rooms : rooms.filter(r => r.type === activeType);
  const countByType = (type: RoomType) => rooms.filter(r => r.type === type).length;

  if (!selectedProjectId) return null;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scrum Rooms</h1>
            <p className="text-sm text-gray-500 mt-1">Collaborative spaces for Agile ceremonies</p>
          </div>
          <button
            onClick={() => openCreate()}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Room
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeType === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All <span className="ml-1.5 text-xs font-semibold text-gray-400">{rooms.length}</span>
          </button>
          {Object.values(RoomType).map(type => {
            const meta = ROOM_TYPE_META[type];
            return (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <span className={`w-2 h-2 rounded-full ${meta.color}`} />
                {meta.label}
                <span className="ml-0.5 text-xs font-semibold text-gray-400">{countByType(type)}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Room list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No rooms yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              {activeType === 'all' ? 'Create your first room to get started' : `Create a ${ROOM_TYPE_META[activeType as RoomType]?.label} room`}
            </p>
            <button
              onClick={() => openCreate(activeType !== 'all' ? activeType as RoomType : undefined)}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Room
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(room => {
              const meta = ROOM_TYPE_META[room.type];
              return (
                <div
                  key={room.id}
                  onClick={() => navigate(`/scrum-rooms/${room.id}`)}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
                >
                  {/* Type dot */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.badge}`}>
                    <span className={meta.badgeText}>{meta.icon}</span>
                  </div>

                  {/* Name + description */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{room.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium ${meta.badgeText}`}>{meta.label}</span>
                      {room.description && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-400 truncate">{room.description}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status + date */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[room.status]}`}>
                      {room.status.charAt(0) + room.status.slice(1).toLowerCase()}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {new Date(room.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(room.id); }}
                      disabled={deletingId === room.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick-create strip */}
        {!loading && rooms.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Quick Create</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(RoomType).map(type => {
                const meta = ROOM_TYPE_META[type];
                return (
                  <button
                    key={type}
                    onClick={() => openCreate(type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${meta.badge} ${meta.badgeText} hover:opacity-80 transition-opacity`}
                  >
                    {meta.icon}
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateRoomModal
          isOpen={showCreateModal}
          projectId={selectedProjectId!}
          preselectedType={preselectedType}
          onClose={() => { setShowCreateModal(false); setPreselectedType(null); }}
          onSuccess={() => { fetchRooms(); setShowCreateModal(false); setPreselectedType(null); }}
        />
      )}
    </AppLayout>
  );
}
