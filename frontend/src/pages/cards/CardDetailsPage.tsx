import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cardsApi } from '../../services/api/cards';
import { Card, CardStatus, CardRAG, CardPriority } from '../../types/card';
import AppLayout from '../../components/AppLayout';
import EditCardModal from '../../components/cards/EditCardModal';
import SnapsList from '../../components/snaps/SnapsList';

export default function CardDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadCard();
    }
  }, [id]);

  const loadCard = async () => {
    try {
      setLoading(true);
      const data = await cardsApi.getById(id!);
      setCard(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // M7-UC03: Delete Card
  const handleDelete = async () => {
    if (!card) return;
    if (!window.confirm(`Are you sure you want to delete "${card.title}"?\n\nDeleting this card will permanently remove all associated snaps.\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await cardsApi.delete(card.id);
      navigate(`/cards?projectId=${card.project.id}`);
    } catch (err: any) {
      alert('Failed to delete card: ' + err.message);
    }
  };

  // M7-UC06: Mark as Completed
  const handleMarkCompleted = async () => {
    if (!card) return;

    try {
      setLoading(true);
      setError(null);
      await cardsApi.markAsCompleted(card.id);
      setShowCompleteModal(false);
      await loadCard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: CardStatus) => {
    const configs = {
      [CardStatus.NOT_STARTED]: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Not Started' },
      [CardStatus.IN_PROGRESS]: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'In Progress' },
      [CardStatus.COMPLETED]: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
      [CardStatus.CLOSED]: { color: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Closed' },
    };
    return configs[status];
  };

  const getRAGBadge = (rag?: CardRAG) => {
    if (!rag) return { color: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Not Calculated' };

    const configs = {
      [CardRAG.RED]: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Red' },
      [CardRAG.AMBER]: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Amber' },
      [CardRAG.GREEN]: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Green' },
    };
    return configs[rag];
  };

  const getPriorityBadge = (priority: CardPriority) => {
    const configs = {
      [CardPriority.LOW]: { color: 'bg-gray-100 text-gray-600', label: 'Low', icon: '↓' },
      [CardPriority.MEDIUM]: { color: 'bg-blue-100 text-blue-700', label: 'Medium', icon: '−' },
      [CardPriority.HIGH]: { color: 'bg-orange-100 text-orange-700', label: 'High', icon: '↑' },
      [CardPriority.CRITICAL]: { color: 'bg-red-100 text-red-700', label: 'Critical', icon: '⚠' },
    };
    return configs[priority];
  };

  if (loading && !card) {
    return (
      <AppLayout>
        <div className="p-6">Loading...</div>
      </AppLayout>
    );
  }

  if (error && !card) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 text-red-600 p-4 rounded">
            Error: {error}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!card) {
    return (
      <AppLayout>
        <div className="p-6">Card not found</div>
      </AppLayout>
    );
  }

  const statusBadge = getStatusBadge(card.status);
  const ragBadge = getRAGBadge(card.ragStatus);
  const priorityBadge = getPriorityBadge(card.priority);

  const isLocked = card.sprint.isClosed || card.status === CardStatus.CLOSED;
  const canEdit = !isLocked && !card.project.isArchived;
  const canDelete = !isLocked && !card.project.isArchived;
  const canComplete = !isLocked && card.status !== CardStatus.COMPLETED && !card.project.isArchived;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{card.title}</h1>
                {isLocked && (
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>
              {card.externalId && (
                <p className="text-gray-600 text-sm">External ID: {card.externalId}</p>
              )}
              <div className="flex gap-2 mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${priorityBadge.color}`}>
                  {priorityBadge.icon} {priorityBadge.label}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {canEdit && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Edit Card
                </button>
              )}
              {canComplete && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Mark Completed
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => navigate(`/cards?projectId=${card.project.id}`)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Back to Cards
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isLocked && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-sm text-yellow-700">
                This card is locked because the sprint is {card.sprint.isClosed ? 'closed' : 'completed'}. No edits or snaps can be added.
              </p>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Card Information */}
          <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Card Information</h2>

            {card.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{card.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Project</h3>
                <p className="text-gray-900 font-medium">{card.project.name}</p>
                <button
                  onClick={() => navigate(`/projects/${card.project.id}`)}
                  className="text-blue-600 hover:underline text-sm mt-1"
                >
                  View Project →
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Sprint</h3>
                <p className="text-gray-900 font-medium">{card.sprint.name}</p>
                <button
                  onClick={() => navigate(`/sprints/${card.sprint.id}`)}
                  className="text-blue-600 hover:underline text-sm mt-1"
                >
                  View Sprint →
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Assigned To</h3>
                <p className="text-gray-900">{card.assignee.fullName}</p>
                <p className="text-sm text-gray-500">{card.assignee.designationRole}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Estimated Time</h3>
                <p className="text-gray-900 font-semibold text-lg">{card.estimatedTime} hours</p>
              </div>

              {card.completedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Completed At</h3>
                  <p className="text-gray-900">{formatDate(card.completedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* RAG Status & Sprint Info */}
          <div className="space-y-6">
            {/* RAG Status Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">RAG Status</h2>
              <div className="flex items-center justify-center py-4">
                <span className={`px-6 py-3 rounded-full text-lg font-bold border-2 ${ragBadge.color}`}>
                  {ragBadge.label}
                </span>
              </div>
              <p className="text-sm text-gray-600 text-center mt-4">
                {card.ragStatus
                  ? 'RAG status is calculated based on snap updates and estimated time.'
                  : 'RAG status will be calculated once snaps are added.'}
              </p>
            </div>

            {/* Sprint Details Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Sprint Details</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Sprint Period</p>
                  <p className="text-sm font-medium">
                    {new Date(card.sprint.startDate).toLocaleDateString()} - {new Date(card.sprint.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sprint Status</p>
                  <p className="text-sm font-medium capitalize">{card.sprint.status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Snaps Section - M8 Snap Management */}
        <div className="bg-white shadow rounded-lg p-6">
          <SnapsList
            cardId={card.id}
            cardTitle={card.title}
            isLocked={isLocked}
          />
        </div>

        {/* Metadata */}
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Metadata</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Card ID</p>
              <p className="text-gray-900 font-mono text-xs">{card.id}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Created At</p>
              <p className="text-gray-900">{formatDate(card.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Last Updated</p>
              <p className="text-gray-900">{formatDate(card.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && card && (
        <EditCardModal
          card={card}
          onClose={() => setShowEditModal(false)}
          onSuccess={loadCard}
        />
      )}

      {/* Mark Completed Modal - M7-UC06 */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Mark Card as Completed</h3>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                <p className="text-sm text-green-700">
                  Mark "{card.title}" as completed? The RAG status will be preserved.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleMarkCompleted}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Marking...' : 'Yes, Mark Completed'}
              </button>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
