import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import { ScrumRoom, RefinementData, RefinementItem } from '../../types/scrumRooms';

interface RefinementRoomProps {
  room: ScrumRoom;
  onUpdate: () => void;
}

export const RefinementRoom: React.FC<RefinementRoomProps> = ({ room, onUpdate }) => {
  const navigate = useNavigate();
  const data = room.data as RefinementData;

  const [items, setItems] = useState<RefinementItem[]>(data?.items || []);
  const [selectedItem, setSelectedItem] = useState<RefinementItem | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);

      const updatedData: RefinementData = {
        items,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      onUpdate();
      alert('Refinement saved successfully');
    } catch (err: any) {
      console.error('Error saving:', err);
      alert(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem: RefinementItem = {
      itemId: `item-${Date.now()}`,
      title: '',
      notes: [],
      acceptanceCriteria: [],
      aiSuggestions: [],
      estimate: 0,
    };
    setItems([...items, newItem]);
    setSelectedItem(newItem);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    setItems(items.filter((item) => item.itemId !== itemId));
    if (selectedItem?.itemId === itemId) setSelectedItem(null);
  };

  const handleUpdateItem = (itemId: string, updates: Partial<RefinementItem>) => {
    setItems(items.map((item) => (item.itemId === itemId ? { ...item, ...updates } : item)));
    if (selectedItem?.itemId === itemId) {
      setSelectedItem({ ...selectedItem, ...updates });
    }
  };

  const handleAddNote = (itemId: string) => {
    const note = prompt('Enter note:');
    if (!note?.trim()) return;

    const item = items.find((i) => i.itemId === itemId);
    if (!item) return;

    handleUpdateItem(itemId, {
      notes: [...item.notes, note.trim()],
    });
  };

  const handleRemoveNote = (itemId: string, noteIndex: number) => {
    const item = items.find((i) => i.itemId === itemId);
    if (!item) return;

    handleUpdateItem(itemId, {
      notes: item.notes.filter((_, idx) => idx !== noteIndex),
    });
  };

  const handleAddAcceptanceCriteria = (itemId: string) => {
    const criteria = prompt('Enter acceptance criteria:');
    if (!criteria?.trim()) return;

    const item = items.find((i) => i.itemId === itemId);
    if (!item) return;

    handleUpdateItem(itemId, {
      acceptanceCriteria: [...item.acceptanceCriteria, criteria.trim()],
    });
  };

  const handleRemoveAcceptanceCriteria = (itemId: string, criteriaIndex: number) => {
    const item = items.find((i) => i.itemId === itemId);
    if (!item) return;

    handleUpdateItem(itemId, {
      acceptanceCriteria: item.acceptanceCriteria.filter((_, idx) => idx !== criteriaIndex),
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
              <span className="text-3xl">✨</span>
              <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
            </div>
            {room.description && <p className="text-gray-600 mt-1">{room.description}</p>}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Refinement'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items List */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Stories ({items.length})</h3>
            <button
              onClick={handleAddItem}
              className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
            >
              + Add
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
            {items.map((item) => (
              <div
                key={item.itemId}
                onClick={() => setSelectedItem(item)}
                className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                  selectedItem?.itemId === item.itemId
                    ? 'bg-teal-50 border-l-4 border-l-teal-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {item.title || 'Untitled Story'}
                    </h4>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {item.notes.length} notes
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {item.acceptanceCriteria.length} AC
                      </span>
                      {item.estimate > 0 && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded font-medium">
                          {item.estimate} pts
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.itemId);
                    }}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">No stories yet. Click "+ Add" to create one.</p>
              </div>
            )}
          </div>
        </div>

        {/* Details Panel */}
        {selectedItem ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Estimate */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Story Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={selectedItem.title}
                    onChange={(e) => handleUpdateItem(selectedItem.itemId, { title: e.target.value })}
                    placeholder="Enter story title..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimate (Story Points)
                  </label>
                  <input
                    type="number"
                    value={selectedItem.estimate || 0}
                    onChange={(e) =>
                      handleUpdateItem(selectedItem.itemId, { estimate: Number(e.target.value) })
                    }
                    min="0"
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Discussion Notes</h3>
                <button
                  onClick={() => handleAddNote(selectedItem.itemId)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Note
                </button>
              </div>
              <div className="space-y-2">
                {selectedItem.notes.map((note, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <svg
                      className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="flex-1 text-sm text-gray-900">{note}</span>
                    <button
                      onClick={() => handleRemoveNote(selectedItem.itemId, idx)}
                      className="text-red-600 hover:text-red-800"
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
                  </div>
                ))}
                {selectedItem.notes.length === 0 && (
                  <p className="text-sm text-gray-500">No notes yet</p>
                )}
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Acceptance Criteria</h3>
                <button
                  onClick={() => handleAddAcceptanceCriteria(selectedItem.itemId)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Criteria
                </button>
              </div>
              <div className="space-y-2">
                {selectedItem.acceptanceCriteria.map((criteria, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <svg
                      className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="flex-1 text-sm text-gray-900">{criteria}</span>
                    <button
                      onClick={() => handleRemoveAcceptanceCriteria(selectedItem.itemId, idx)}
                      className="text-red-600 hover:text-red-800"
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
                  </div>
                ))}
                {selectedItem.acceptanceCriteria.length === 0 && (
                  <p className="text-sm text-gray-500">No acceptance criteria yet</p>
                )}
              </div>
            </div>

            {/* AI Suggestions (Placeholder) */}
            {selectedItem.aiSuggestions && selectedItem.aiSuggestions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  AI Suggestions
                </h3>
                <div className="space-y-2">
                  {selectedItem.aiSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-gray-900"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 flex items-center justify-center p-12">
            <div className="text-center text-gray-500">
              <svg
                className="h-16 w-16 mx-auto mb-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Story Selected</h3>
              <p className="text-gray-600">Select a story from the list to view and edit details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
