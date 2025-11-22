import { useState, useEffect } from 'react';
import { snapsApi } from '../../services/api/snaps';
import { Snap } from '../../types/snap';
import SnapCard from './SnapCard';
import CreateSnapModal from './CreateSnapModal';
import EditSnapModal from './EditSnapModal';

interface SnapsListProps {
  cardId: string;
  cardTitle: string;
  isLocked?: boolean;
}

export default function SnapsList({ cardId, cardTitle, isLocked = false }: SnapsListProps) {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSnap, setEditingSnap] = useState<Snap | null>(null);
  const [deletingSnapId, setDeletingSnapId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadSnaps();
  }, [cardId]);

  const loadSnaps = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await snapsApi.getByCard(cardId);
      setSnaps(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (snapId: string) => {
    if (!confirm('Are you sure you want to delete this snap? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingSnapId(snapId);
      await snapsApi.delete(snapId);
      await loadSnaps();
    } catch (err: any) {
      alert(`Failed to delete snap: ${err.message}`);
    } finally {
      setDeletingSnapId(null);
    }
  };

  // Categorize snaps
  const todaySnaps = snaps.filter((s) => {
    const snapDate = new Date(s.snapDate).toISOString().split('T')[0];
    return snapDate === today;
  });

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  const yesterdaySnaps = snaps.filter((s) => {
    const snapDate = new Date(s.snapDate).toISOString().split('T')[0];
    return snapDate === yesterday;
  });

  const olderSnaps = snaps.filter((s) => {
    const snapDate = new Date(s.snapDate).toISOString().split('T')[0];
    return snapDate !== today && snapDate !== yesterday;
  });

  const yesterdaySnap = yesterdaySnaps.length > 0 ? yesterdaySnaps[0] : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <svg className="animate-spin h-8 w-8 text-teal-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Snaps</h3>
        {!isLocked && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
          >
            + Add Snap
          </button>
        )}
      </div>

      {/* Today's Snaps */}
      {todaySnaps.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">Today</h4>
          <div className="space-y-3">
            {todaySnaps.map((snap) => (
              <SnapCard
                key={snap.id}
                snap={snap}
                isToday={true}
                onEdit={!snap.isLocked ? () => setEditingSnap(snap) : undefined}
                onDelete={!snap.isLocked && deletingSnapId !== snap.id ? () => handleDelete(snap.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Yesterday's Snaps (Expanded) */}
      {yesterdaySnaps.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center gap-2">
            Yesterday
            {yesterdaySnaps.every(snap => snap.isLocked) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                🔒 Locked
              </span>
            )}
          </h4>
          <div className="space-y-3">
            {yesterdaySnaps.map((snap) => (
              <SnapCard key={snap.id} snap={snap} />
            ))}
          </div>
        </div>
      )}

      {/* Older Snaps (Collapsed) */}
      {olderSnaps.length > 0 && (
        <details>
          <summary className="cursor-pointer text-md font-medium text-gray-700 hover:text-gray-900">
            View Full History ({olderSnaps.length} older snaps)
          </summary>
          <div className="mt-3 space-y-3">
            {olderSnaps.map((snap) => (
              <SnapCard key={snap.id} snap={snap} />
            ))}
          </div>
        </details>
      )}

      {/* Empty State */}
      {snaps.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No snaps yet for this card</p>
          {!isLocked && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
            >
              Add Your First Snap
            </button>
          )}
        </div>
      )}

      {/* Create Snap Modal */}
      {showCreateModal && (
        <CreateSnapModal
          cardId={cardId}
          cardTitle={cardTitle}
          yesterdaySnap={yesterdaySnap}
          olderSnaps={olderSnaps}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadSnaps}
        />
      )}

      {/* Edit Snap Modal */}
      {editingSnap && (
        <EditSnapModal
          snap={editingSnap}
          yesterdaySnap={yesterdaySnap}
          olderSnaps={olderSnaps}
          onClose={() => setEditingSnap(null)}
          onSuccess={loadSnaps}
        />
      )}
    </div>
  );
}
