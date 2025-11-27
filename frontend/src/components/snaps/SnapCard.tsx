import { Snap, SnapRAG } from '../../types/snap';

interface SnapCardProps {
  snap: Snap;
  onEdit?: () => void;
  onDelete?: () => void;
  showCardTitle?: boolean;
  isToday?: boolean;
  slotTimes?: Record<string, string>;
}

export default function SnapCard({
  snap,
  onEdit,
  onDelete,
  showCardTitle = false,
  isToday = false,
  slotTimes,
}: SnapCardProps) {
  const getRAGColor = (rag: SnapRAG | null) => {
    if (!rag) return 'bg-gray-100 text-gray-800';
    switch (rag) {
      case SnapRAG.GREEN:
        return 'bg-green-100 text-green-800';
      case SnapRAG.AMBER:
        return 'bg-yellow-100 text-yellow-800';
      case SnapRAG.RED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className={`border rounded-lg p-4 ${snap.isLocked ? 'bg-gray-50' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {showCardTitle && snap.card && (
              <span className="font-medium text-gray-900">{snap.card.title}</span>
            )}
            <span className="text-sm text-gray-500">
              {formatDate(snap.snapDate)} at {formatTime(snap.createdAt)}
            </span>
            {snap.slotNumber && snap.slotNumber > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Slot {snap.slotNumber}
                {slotTimes?.[snap.slotNumber.toString()] && (
                  <span className="ml-1 text-blue-700">
                    ({slotTimes[snap.slotNumber.toString()]})
                  </span>
                )}
              </span>
            )}
            {snap.isLocked && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                🔒 Locked
              </span>
            )}
            {isToday && !snap.isLocked && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                Today
              </span>
            )}
          </div>
          {snap.createdBy && (
            <div className="text-sm text-gray-600">
              By {snap.createdBy.name}
            </div>
          )}
        </div>

        {/* Actions */}
        {isToday && !snap.isLocked && (onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-teal-600 hover:text-teal-800 text-sm font-medium"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Sections */}
      <div className="space-y-3">
        {/* Done */}
        {snap.done && (
          <div className="border-l-4 border-green-500 pl-3">
            <div className="text-xs font-semibold text-green-700 uppercase mb-1">Done</div>
            <div className="text-sm text-gray-700">{snap.done}</div>
          </div>
        )}

        {/* To Do */}
        {snap.toDo && (
          <div className="border-l-4 border-teal-500 pl-3">
            <div className="text-xs font-semibold text-teal-700 uppercase mb-1">To Do</div>
            <div className="text-sm text-gray-700">{snap.toDo}</div>
          </div>
        )}

        {/* Blockers */}
        {snap.blockers && (
          <div className="border-l-4 border-red-500 pl-3">
            <div className="text-xs font-semibold text-red-700 uppercase mb-1">Blockers</div>
            <div className="text-sm text-gray-700">{snap.blockers}</div>
          </div>
        )}

        {/* Raw Input (collapsible) */}
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
            View raw input
          </summary>
          <div className="mt-2 p-2 bg-gray-100 rounded text-gray-700">
            {snap.rawInput}
          </div>
        </details>
      </div>

      {/* Footer - RAG Status */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        {snap.suggestedRAG && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Snap Suggested:</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${getRAGColor(snap.suggestedRAG)}`}>
              {snap.suggestedRAG.toUpperCase()}
            </span>
          </div>
        )}
        {snap.finalRAG && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Final Status:</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${getRAGColor(snap.finalRAG)}`}>
              {snap.finalRAG.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
