import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { assigneesApi, AssigneeDetails, SnapsByDate } from '../../services/api/assignees';
import { Card, CardStatus, CardRAG } from '../../types/card';
import SnapCard from '../../components/snaps/SnapCard';

export default function AssigneeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sprintId = searchParams.get('sprintId');

  const [assignee, setAssignee] = useState<AssigneeDetails | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [snapHistory, setSnapHistory] = useState<SnapsByDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states (M10-UC04)
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ragFilter, setRagFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View mode
  const [viewMode, setViewMode] = useState<'cards' | 'snaps'>('cards');

  useEffect(() => {
    if (id) {
      loadAssigneeData();
    }
  }, [id, sprintId]);

  useEffect(() => {
    if (id && viewMode === 'cards') {
      loadCards();
    }
  }, [id, statusFilter, ragFilter, searchQuery]);

  useEffect(() => {
    if (id && viewMode === 'snaps') {
      loadSnapHistory();
    }
  }, [id, viewMode]);

  const loadAssigneeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await assigneesApi.getById(id!, sprintId || undefined);
      setAssignee(data);
      setCards(data.cards);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async () => {
    try {
      const data = await assigneesApi.getCards(id!, {
        sprintId: sprintId || undefined,
        status: statusFilter || undefined,
        rag: ragFilter || undefined,
        search: searchQuery || undefined,
      });
      setCards(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadSnapHistory = async () => {
    try {
      const data = await assigneesApi.getSnapHistory(id!, sprintId || undefined);
      setSnapHistory(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setRagFilter('');
    setSearchQuery('');
  };

  const getRAGBadge = (rag: string | null) => {
    if (!rag)
      return {
        color: 'bg-gray-100 text-gray-500',
        label: 'No Status',
      };

    const configs = {
      red: { color: 'bg-red-100 text-red-800', label: 'RED' },
      amber: { color: 'bg-yellow-100 text-yellow-800', label: 'AMBER' },
      green: { color: 'bg-green-100 text-green-800', label: 'GREEN' },
    };

    return configs[rag as keyof typeof configs] || configs.green;
  };

  const getStatusBadge = (status: CardStatus) => {
    const configs = {
      [CardStatus.NOT_STARTED]: { color: 'bg-gray-100 text-gray-800', label: 'Not Started' },
      [CardStatus.IN_PROGRESS]: { color: 'bg-teal-100 text-blue-800', label: 'In Progress' },
      [CardStatus.COMPLETED]: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      [CardStatus.CLOSED]: { color: 'bg-gray-100 text-gray-600', label: 'Closed' },
    };
    return configs[status];
  };

  if (loading && !assignee) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin h-10 w-10 text-teal-600" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </AppLayout>
    );
  }

  if (error && !assignee) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 text-red-600 p-4 rounded">Error: {error}</div>
        </div>
      </AppLayout>
    );
  }

  if (!assignee) {
    return (
      <AppLayout>
        <div className="p-6">Assignee not found</div>
      </AppLayout>
    );
  }

  const ragBadge = getRAGBadge(assignee.assigneeRAG);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header - M10-UC02 */}
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              {/* Avatar */}
              <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-2xl mr-4">
                {assignee.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{assignee.fullName}</h1>
                <p className="text-gray-600">{assignee.designationRole}</p>
                {assignee.displayName && (
                  <p className="text-sm text-gray-500">@{assignee.displayName}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate('/assignees')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to Team
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-3xl font-bold text-teal-600">
                {assignee.assignedCardsCount}
              </p>
              <p className="text-sm text-gray-500">Assigned Cards</p>
            </div>

            <div className="text-center">
              <span className={`px-4 py-2 rounded-full text-lg font-bold ${ragBadge.color}`}>
                {ragBadge.label}
              </span>
              <p className="text-sm text-gray-500 mt-2">Overall RAG Status</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Quick Actions</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    viewMode === 'cards'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('snaps')}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    viewMode === 'snaps'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Snap History
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Cards View - M10-UC04 Filtering */}
        {viewMode === 'cards' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Filter Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">All Statuses</option>
                    <option value={CardStatus.NOT_STARTED}>Not Started</option>
                    <option value={CardStatus.IN_PROGRESS}>In Progress</option>
                    <option value={CardStatus.COMPLETED}>Completed</option>
                    <option value={CardStatus.CLOSED}>Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RAG Status
                  </label>
                  <select
                    value={ragFilter}
                    onChange={(e) => setRagFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">All RAG</option>
                    <option value="green">Green</option>
                    <option value="amber">Amber</option>
                    <option value="red">Red</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Card name or ID..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-600">
                Showing {cards.length} card{cards.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Cards List */}
            {cards.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600">No cards found matching your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {cards.map((card) => {
                  const statusBadge = getStatusBadge(card.status);
                  const cardRAGBadge = getRAGBadge(card.ragStatus);

                  return (
                    <div
                      key={card.id}
                      className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/cards/${card.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-gray-900">
                            {card.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {card.description || 'No description'}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cardRAGBadge.color}`}>
                              RAG: {cardRAGBadge.label}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-blue-700">
                              ET: {card.estimatedTime}h
                            </span>
                          </div>
                        </div>

                        <button className="text-teal-600 hover:text-teal-800 text-sm font-medium">
                          View →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Snap History View - M10-UC03 */}
        {viewMode === 'snaps' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Snap History</h3>

              {snapHistory.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-600">No snaps recorded for this assignee</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {snapHistory.map((daySnaps) => (
                    <details
                      key={daySnaps.date}
                      open={daySnaps.isToday || daySnaps.isYesterday}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <summary className="cursor-pointer bg-gray-50 px-4 py-3 font-semibold text-gray-900 hover:bg-gray-100">
                        {daySnaps.isToday
                          ? "Today's Snaps"
                          : daySnaps.isYesterday
                          ? "Yesterday's Snaps"
                          : new Date(daySnaps.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}{' '}
                        ({daySnaps.snaps.length} snap{daySnaps.snaps.length !== 1 ? 's' : ''})
                      </summary>

                      <div className="p-4 space-y-4">
                        {daySnaps.snaps.map((snap) => (
                          <SnapCard key={snap.id} snap={snap} showCardTitle={true} />
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
