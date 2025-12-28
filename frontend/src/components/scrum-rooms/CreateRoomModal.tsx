import React, { useState, useEffect } from 'react';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import { RoomType } from '../../types/scrumRooms';

interface CreateRoomModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
  preselectedType?: RoomType | null;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  projectId,
  onClose,
  onSuccess,
  preselectedType,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>(preselectedType || RoomType.PLANNING_POKER);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedType) {
      setType(preselectedType);
    }
  }, [preselectedType]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    if (!loading) {
      setName('');
      setType(preselectedType || RoomType.PLANNING_POKER);
      setDescription('');
      setError(null);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Room name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await scrumRoomsApi.create({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        projectId,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error creating room:', err);
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const getRoomTypeDescription = (roomType: RoomType) => {
    switch (roomType) {
      case RoomType.PLANNING_POKER:
        return 'Collaborative estimation using story points or other scales';
      case RoomType.RETROSPECTIVE:
        return 'Reflect on the sprint with structured feedback columns';
      case RoomType.SPRINT_PLANNING:
        return 'Plan sprint capacity and prioritize backlog items';
      case RoomType.REFINEMENT:
        return 'Refine user stories with acceptance criteria and notes';
      case RoomType.MOM:
        return 'Capture meeting minutes with AI-powered summaries';
    }
  };

  const getRoomTypeIcon = (roomType: RoomType) => {
    switch (roomType) {
      case RoomType.PLANNING_POKER:
        return '🃏';
      case RoomType.RETROSPECTIVE:
        return '🔄';
      case RoomType.SPRINT_PLANNING:
        return '📋';
      case RoomType.REFINEMENT:
        return '✨';
      case RoomType.MOM:
        return '📝';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Scrum Room</h2>
            <p className="text-sm text-gray-600 mt-1">
              Set up a collaborative space for your Agile ceremony
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sprint 24 Planning Poker"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-3">
              {Object.values(RoomType).map((roomType) => (
                <label
                  key={roomType}
                  className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    type === roomType
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="roomType"
                    value={roomType}
                    checked={type === roomType}
                    onChange={(e) => setType(e.target.value as RoomType)}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500"
                    disabled={loading}
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getRoomTypeIcon(roomType)}</span>
                      <span className="font-medium text-gray-900">
                        {roomType.split('_').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {getRoomTypeDescription(roomType)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional: Add context or goals for this room"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={loading}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
