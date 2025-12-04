import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { scrumRoomsApi } from '../services/api/scrumRooms';
import { ScrumRoom, RoomType, RoomStatus } from '../types/scrumRooms';
import { CreateRoomModal } from '../components/scrum-rooms/CreateRoomModal';

const ScrumRoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();

  const [rooms, setRooms] = useState<ScrumRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [preselectedType, setPreselectedType] = useState<RoomType | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      navigate('/projects');
      return;
    }

    fetchRooms();
  }, [selectedProjectId]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await scrumRoomsApi.getAll({
        projectId: selectedProjectId,
        includeArchived: false,
      });
      setRooms(data);
    } catch (err: any) {
      console.error('Error fetching rooms:', err);
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = (room: ScrumRoom) => {
    navigate(`/scrum-rooms/${room.id}`);
  };

  const handleDeleteRoom = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
      await scrumRoomsApi.delete(id);
      fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to delete room');
    }
  };

  const getRoomTypeInfo = (type: RoomType) => {
    const info = {
      [RoomType.PLANNING_POKER]: {
        icon: '🃏',
        title: 'Planning Poker',
        description: 'Collaborative estimation using story points',
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-600',
      },
      [RoomType.RETROSPECTIVE]: {
        icon: '🔄',
        title: 'Retrospective',
        description: 'Reflect on the sprint with structured feedback',
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-600',
      },
      [RoomType.SPRINT_PLANNING]: {
        icon: '📋',
        title: 'Sprint Planning',
        description: 'Plan sprint capacity and prioritize backlog',
        color: 'from-teal-500 to-teal-600',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        textColor: 'text-teal-600',
      },
      [RoomType.REFINEMENT]: {
        icon: '✨',
        title: 'Refinement',
        description: 'Refine stories with acceptance criteria',
        color: 'from-green-500 to-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-600',
      },
      [RoomType.MOM]: {
        icon: '📝',
        title: 'Meeting Minutes',
        description: 'Capture minutes with AI-powered summaries',
        color: 'from-orange-500 to-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-600',
      },
    };
    return info[type];
  };

  const getRoomsByType = (type: RoomType) => {
    return rooms.filter((room) => room.type === type);
  };

  const handleCreateRoom = (type: RoomType) => {
    setPreselectedType(type);
    setIsCreateModalOpen(true);
  };

  const handleBackToTypes = () => {
    setSelectedRoomType(null);
  };

  if (!selectedProjectId) {
    return null;
  }

  // Show individual room instances when a type is selected
  if (selectedRoomType) {
    const typeInfo = getRoomTypeInfo(selectedRoomType);
    const roomsOfType = getRoomsByType(selectedRoomType);

    return (
      <AppLayout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToTypes}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{typeInfo.icon}</span>
                  <h1 className="text-2xl font-bold text-gray-900">{typeInfo.title} Rooms</h1>
                </div>
                <p className="text-gray-600 mt-1">{typeInfo.description}</p>
              </div>
            </div>

            <button
              onClick={() => handleCreateRoom(selectedRoomType)}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New {typeInfo.title} Room
            </button>
          </div>

          {/* Rooms Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
          ) : roomsOfType.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-4">{typeInfo.icon}</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {typeInfo.title} rooms yet</h3>
              <p className="text-gray-600 mb-6">Create your first {typeInfo.title.toLowerCase()} room to get started</p>
              <button
                onClick={() => handleCreateRoom(selectedRoomType)}
                className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roomsOfType.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleRoomClick(room)}
                  className={`${typeInfo.bgColor} border ${typeInfo.borderColor} rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{typeInfo.icon}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{room.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{typeInfo.title}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteRoom(room.id, e)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {room.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{room.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      room.status === RoomStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                      room.status === RoomStatus.COMPLETED ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {room.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Room Modal */}
        {isCreateModalOpen && (
          <CreateRoomModal
            isOpen={isCreateModalOpen}
            projectId={selectedProjectId}
            onClose={() => {
              setIsCreateModalOpen(false);
              setPreselectedType(null);
            }}
            onSuccess={() => {
              fetchRooms();
              setIsCreateModalOpen(false);
              setPreselectedType(null);
            }}
            preselectedType={preselectedType}
          />
        )}
      </AppLayout>
    );
  }

  // Main view: Show room type cards
  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Scrum Rooms</h1>
          <p className="text-gray-600 mt-1">
            Collaborative spaces for Agile ceremonies and meetings
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {Object.values(RoomType).map((type) => {
              const typeInfo = getRoomTypeInfo(type);
              const roomCount = getRoomsByType(type).length;

              return (
                <div
                  key={type}
                  onClick={() => setSelectedRoomType(type)}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className="flex flex-col items-center text-center">
                    {/* Icon with gradient background */}
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${typeInfo.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <span className="text-4xl">{typeInfo.icon}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-gray-900 mb-2">{typeInfo.title}</h3>

                    {/* Description */}
                    <p className="text-xs text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">
                      {typeInfo.description}
                    </p>

                    {/* Room Count Badge */}
                    <div className={`w-full ${typeInfo.bgColor} ${typeInfo.borderColor} border rounded-lg py-2 px-3 flex items-center justify-between`}>
                      <span className="text-sm font-medium text-gray-700">Rooms</span>
                      <span className={`text-lg font-bold ${typeInfo.textColor}`}>{roomCount}</span>
                    </div>

                    {/* Quick Create Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateRoom(type);
                      }}
                      className={`mt-3 w-full py-2 rounded-lg font-medium transition-colors ${typeInfo.bgColor} ${typeInfo.textColor} hover:opacity-80 flex items-center justify-center gap-2`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Quick Create
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ScrumRoomsPage;
