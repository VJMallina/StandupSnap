import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import { ScrumRoom, RetrospectiveData, RetroColumn, RetroItem } from '../../types/scrumRooms';

interface RetrospectiveRoomProps {
  room: ScrumRoom;
  onUpdate: () => void;
}

export const RetrospectiveRoom: React.FC<RetrospectiveRoomProps> = ({ room, onUpdate }) => {
  const navigate = useNavigate();
  const data = room.data as RetrospectiveData;

  const [newItemContent, setNewItemContent] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<RetroItem | null>(null);
  const [discussion, setDiscussion] = useState('');
  const [loading, setLoading] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);

  const currentUserId = localStorage.getItem('userId') || 'anonymous';
  const currentUserEmail = localStorage.getItem('userEmail') || 'Anonymous';

  const getRemainingVotes = () => {
    if (!data?.votingEnabled || !data.maxVotesPerPerson) return 0;
    const totalVotesUsed = data.columns.reduce((sum, col) => {
      return (
        sum +
        col.items.reduce((itemSum, item) => {
          return itemSum + (item.votes.includes(currentUserId) ? 1 : 0);
        }, 0)
      );
    }, 0);
    return data.maxVotesPerPerson - totalVotesUsed;
  };

  const handleAddItem = async (columnId: string) => {
    const content = newItemContent[columnId]?.trim();
    if (!content) return;

    try {
      setLoading(true);

      const newItem: RetroItem = {
        itemId: `item-${Date.now()}`,
        content,
        createdBy: currentUserId,
        createdByName: currentUserEmail,
        votes: [],
        timestamp: new Date().toISOString(),
      };

      const updatedColumns = data.columns.map((col) =>
        col.columnId === columnId ? { ...col, items: [...col.items, newItem] } : col
      );

      const updatedData: RetrospectiveData = {
        ...data,
        columns: updatedColumns,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      setNewItemContent({ ...newItemContent, [columnId]: '' });
      onUpdate();
    } catch (err: any) {
      console.error('Error adding item:', err);
      alert(err.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (columnId: string, itemId: string) => {
    if (!data.votingEnabled) return;
    if (data.maxVotesPerPerson && getRemainingVotes() <= 0) {
      alert('You have used all your votes');
      return;
    }

    try {
      setLoading(true);

      const updatedColumns = data.columns.map((col) => {
        if (col.columnId !== columnId) return col;
        return {
          ...col,
          items: col.items.map((item) => {
            if (item.itemId !== itemId) return item;
            const hasVoted = item.votes.includes(currentUserId);
            return {
              ...item,
              votes: hasVoted
                ? item.votes.filter((v) => v !== currentUserId)
                : [...item.votes, currentUserId],
            };
          }),
        };
      });

      const updatedData: RetrospectiveData = {
        ...data,
        columns: updatedColumns,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      onUpdate();
    } catch (err: any) {
      console.error('Error voting:', err);
      alert(err.message || 'Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (columnId: string, itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      setLoading(true);

      const updatedColumns = data.columns.map((col) => {
        if (col.columnId !== columnId) return col;
        return {
          ...col,
          items: col.items.filter((item) => item.itemId !== itemId),
        };
      });

      const updatedData: RetrospectiveData = {
        ...data,
        columns: updatedColumns,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      if (selectedItem?.itemId === itemId) setSelectedItem(null);
      onUpdate();
    } catch (err: any) {
      console.error('Error deleting item:', err);
      alert(err.message || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActionItem = async (columnId: string, itemId: string) => {
    try {
      setLoading(true);

      const updatedColumns = data.columns.map((col) => {
        if (col.columnId !== columnId) return col;
        return {
          ...col,
          items: col.items.map((item) => {
            if (item.itemId !== itemId) return item;
            return { ...item, actionItem: !item.actionItem };
          }),
        };
      });

      const updatedData: RetrospectiveData = {
        ...data,
        columns: updatedColumns,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      onUpdate();
    } catch (err: any) {
      console.error('Error toggling action item:', err);
      alert(err.message || 'Failed to toggle action item');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiscussion = async () => {
    if (!selectedItem) return;

    try {
      setLoading(true);

      const updatedColumns = data.columns.map((col) => ({
        ...col,
        items: col.items.map((item) => {
          if (item.itemId !== selectedItem.itemId) return item;
          return { ...item, discussion: discussion.trim() || undefined };
        }),
      }));

      const updatedData: RetrospectiveData = {
        ...data,
        columns: updatedColumns,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      setSelectedItem(null);
      setDiscussion('');
      onUpdate();
    } catch (err: any) {
      console.error('Error saving discussion:', err);
      alert(err.message || 'Failed to save discussion');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVoting = async () => {
    try {
      setLoading(true);

      const updatedData: RetrospectiveData = {
        ...data,
        votingEnabled: !data.votingEnabled,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      onUpdate();
    } catch (err: any) {
      console.error('Error toggling voting:', err);
      alert(err.message || 'Failed to toggle voting');
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) return;

    try {
      setLoading(true);

      const newColumn: RetroColumn = {
        columnId: `col-${Date.now()}`,
        title: newColumnTitle.trim(),
        order: data.columns.length,
        items: [],
      };

      const updatedData: RetrospectiveData = {
        ...data,
        columns: [...data.columns, newColumn],
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      setNewColumnTitle('');
      setShowAddColumn(false);
      onUpdate();
    } catch (err: any) {
      console.error('Error adding column:', err);
      alert(err.message || 'Failed to add column');
    } finally {
      setLoading(false);
    }
  };

  const openDiscussion = (item: RetroItem) => {
    setSelectedItem(item);
    setDiscussion(item.discussion || '');
  };

  return (
    <div className="p-6 max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/scrum-rooms')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">🔄</span>
              <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
            </div>
            {room.description && <p className="text-gray-600 mt-1">{room.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data?.votingEnabled && data.maxVotesPerPerson && (
            <div className="px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg">
              <span className="text-sm font-medium text-primary-700">
                Votes remaining: {getRemainingVotes()} / {data.maxVotesPerPerson}
              </span>
            </div>
          )}
          <button
            onClick={handleToggleVoting}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              data?.votingEnabled
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            } disabled:opacity-50`}
          >
            {data?.votingEnabled ? 'Disable Voting' : 'Enable Voting'}
          </button>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {data?.columns
          .sort((a, b) => a.order - b.order)
          .map((column) => (
            <div key={column.columnId} className="bg-white rounded-lg border border-gray-200 flex flex-col h-[600px]">
              {/* Column Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-secondary-50">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{column.items.length} items</p>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {column.items.map((item) => (
                  <div
                    key={item.itemId}
                    className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openDiscussion(item)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm text-gray-900 flex-1">{item.content}</p>
                      {item.createdBy === currentUserId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(column.columnId, item.itemId);
                          }}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {item.createdBy === currentUserId ? 'You' : item.createdByName}
                        </span>
                        {data.votingEnabled && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(column.columnId, item.itemId);
                            }}
                            disabled={loading}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              item.votes.includes(currentUserId)
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                            </svg>
                            {item.votes.length}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.discussion && (
                          <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {item.actionItem && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                            Action
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Item Form */}
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemContent[column.columnId] || ''}
                    onChange={(e) =>
                      setNewItemContent({ ...newItemContent, [column.columnId]: e.target.value })
                    }
                    onKeyPress={(e) =>
                      e.key === 'Enter' && handleAddItem(column.columnId)
                    }
                    placeholder="Add item..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <button
                    onClick={() => handleAddItem(column.columnId)}
                    disabled={loading || !newItemContent[column.columnId]?.trim()}
                    className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}

        {/* Add Column Button */}
        {!showAddColumn ? (
          <button
            onClick={() => setShowAddColumn(true)}
            className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary-400 hover:bg-primary-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-primary-600 h-[600px]"
          >
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">Add Column</span>
          </button>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-[600px] p-6">
            <h3 className="font-semibold text-gray-900 mb-4">New Column</h3>
            <input
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddColumn()}
              placeholder="Column title (e.g., Kudos)"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddColumn}
                disabled={loading || !newColumnTitle.trim()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddColumn(false);
                  setNewColumnTitle('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Discussion Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Item Discussion</h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-gray-900">{selectedItem.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-gray-600">By {selectedItem.createdByName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {selectedItem.votes.length} votes
                    </span>
                    <button
                      onClick={() =>
                        handleToggleActionItem(
                          data.columns.find((c) => c.items.some((i) => i.itemId === selectedItem.itemId))?.columnId || '',
                          selectedItem.itemId
                        )
                      }
                      className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                        selectedItem.actionItem
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {selectedItem.actionItem ? 'Remove Action' : 'Mark as Action'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discussion Notes
                </label>
                <textarea
                  value={discussion}
                  onChange={(e) => setDiscussion(e.target.value)}
                  placeholder="Add discussion notes or outcomes..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDiscussion}
                  disabled={loading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Save Discussion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
