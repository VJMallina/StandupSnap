import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { scrumRoomsApi } from '../services/api/scrumRooms';
import { ScrumRoom, RoomType } from '../types/scrumRooms';
import { PlanningPokerRoom } from '../components/scrum-rooms/PlanningPokerRoom';
import { RetrospectiveRoom } from '../components/scrum-rooms/RetrospectiveRoom';
import { MOMRoom } from '../components/scrum-rooms/MOMRoom';
import { SprintPlanningRoom } from '../components/scrum-rooms/SprintPlanningRoom';
import { RefinementRoom } from '../components/scrum-rooms/RefinementRoom';

const ScrumRoomDetailPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<ScrumRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      navigate('/scrum-rooms');
      return;
    }

    fetchRoom();
  }, [roomId]);

  const fetchRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await scrumRoomsApi.getById(roomId!);
      setRoom(data);
    } catch (err: any) {
      console.error('Error fetching room:', err);
      setError(err.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomUpdate = () => {
    fetchRoom();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading room...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !room) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Room Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The room you are looking for does not exist.'}</p>
            <button
              onClick={() => navigate('/scrum-rooms')}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Back to Rooms
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const renderRoomComponent = () => {
    switch (room.type) {
      case RoomType.PLANNING_POKER:
        return <PlanningPokerRoom room={room} onUpdate={handleRoomUpdate} />;
      case RoomType.RETROSPECTIVE:
        return <RetrospectiveRoom room={room} onUpdate={handleRoomUpdate} />;
      case RoomType.MOM:
        return <MOMRoom room={room} onUpdate={handleRoomUpdate} />;
      case RoomType.SPRINT_PLANNING:
        return <SprintPlanningRoom room={room} onUpdate={handleRoomUpdate} />;
      case RoomType.REFINEMENT:
        return <RefinementRoom room={room} onUpdate={handleRoomUpdate} />;
      default:
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❓</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unknown Room Type</h3>
            <p className="text-gray-600">This room type is not supported.</p>
          </div>
        );
    }
  };

  return <AppLayout>{renderRoomComponent()}</AppLayout>;
};

export default ScrumRoomDetailPage;
