import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import { ScrumRoom, SprintPlanningData, SprintPlanningItem } from '../../types/scrumRooms';

interface SprintPlanningRoomProps {
  room: ScrumRoom;
  onUpdate: () => void;
}

export const SprintPlanningRoom: React.FC<SprintPlanningRoomProps> = ({ room, onUpdate }) => {
  const navigate = useNavigate();
  const data = room.data as SprintPlanningData;

  const [capacity, setCapacity] = useState(data?.capacity || 0);
  const [items, setItems] = useState<SprintPlanningItem[]>(data?.items || []);
  const [sprintGoals, setSprintGoals] = useState<string[]>(data?.sprintGoals || []);
  const [newGoal, setNewGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const actualWorkload = items
    .filter((item) => item.status === 'in_scope')
    .reduce((sum, item) => sum + item.estimate, 0);

  const workloadPercentage = capacity > 0 ? (actualWorkload / capacity) * 100 : 0;

  const handleSave = async () => {
    try {
      setLoading(true);

      const updatedData: SprintPlanningData = {
        capacity,
        items,
        sprintGoals,
        actualWorkload,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      onUpdate();
      alert('Sprint plan saved successfully');
    } catch (err: any) {
      console.error('Error saving:', err);
      alert(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem: SprintPlanningItem = {
      itemId: `item-${Date.now()}`,
      title: '',
      estimate: 0,
      status: 'ready',
      order: items.length,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (
    itemId: string,
    field: keyof SprintPlanningItem,
    value: string | number
  ) => {
    setItems(items.map((item) => (item.itemId === itemId ? { ...item, [field]: value } : item)));
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter((item) => item.itemId !== itemId));
  };

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    const index = items.findIndex((item) => item.itemId === itemId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    )
      return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    newItems.forEach((item, idx) => (item.order = idx));
    setItems(newItems);
  };

  const handleAddGoal = () => {
    if (newGoal.trim() && !sprintGoals.includes(newGoal.trim())) {
      setSprintGoals([...sprintGoals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const handleRemoveGoal = (goal: string) => {
    setSprintGoals(sprintGoals.filter((g) => g !== goal));
  };

  const getWorkloadColor = () => {
    if (workloadPercentage <= 80) return 'bg-green-600';
    if (workloadPercentage <= 100) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getItemsByStatus = (status: SprintPlanningItem['status']) => {
    return items.filter((item) => item.status === status).sort((a, b) => a.order - b.order);
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
              <span className="text-3xl">📋</span>
              <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
            </div>
            {room.description && <p className="text-gray-600 mt-1">{room.description}</p>}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Sprint Plan'}
        </button>
      </div>

      {/* Sprint Capacity and Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Capacity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sprint Capacity</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Capacity (Story Points)
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                placeholder="e.g., 40"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Workload Bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Current Workload</span>
                <span className="font-bold text-gray-900">
                  {actualWorkload} / {capacity} points ({workloadPercentage.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getWorkloadColor()}`}
                  style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {workloadPercentage <= 80 && 'Healthy capacity utilization'}
                {workloadPercentage > 80 && workloadPercentage <= 100 && 'Approaching capacity limit'}
                {workloadPercentage > 100 && 'Over capacity! Consider removing items'}
              </p>
            </div>
          </div>
        </div>

        {/* Sprint Goals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sprint Goals</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()}
              placeholder="Add sprint goal..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleAddGoal}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {sprintGoals.map((goal, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-3 bg-primary-50 border border-primary-200 rounded-lg"
              >
                <svg
                  className="h-5 w-5 text-primary-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="flex-1 text-sm text-gray-900">{goal}</span>
                <button
                  onClick={() => handleRemoveGoal(goal)}
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
            {sprintGoals.length === 0 && (
              <p className="text-sm text-gray-500">No sprint goals defined yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Backlog Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ready Column */}
        <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Ready ({getItemsByStatus('ready').length})</h3>
            <p className="text-xs text-gray-600 mt-1">Items available for sprint</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[400px]">
            {getItemsByStatus('ready').map((item) => (
              <ItemCard
                key={item.itemId}
                item={item}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
                onMove={handleMoveItem}
                color="gray"
              />
            ))}
            {getItemsByStatus('ready').length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No ready items</p>
            )}
          </div>
        </div>

        {/* In Sprint Column */}
        <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-secondary-50">
            <h3 className="font-semibold text-gray-900">
              In Sprint ({getItemsByStatus('in_scope').length})
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {getItemsByStatus('in_scope').reduce((sum, item) => sum + item.estimate, 0)} points
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[400px]">
            {getItemsByStatus('in_scope').map((item) => (
              <ItemCard
                key={item.itemId}
                item={item}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
                onMove={handleMoveItem}
                color="teal"
              />
            ))}
            {getItemsByStatus('in_scope').length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">Drag items here</p>
            )}
          </div>
        </div>

        {/* Out of Scope Column */}
        <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-red-50">
            <h3 className="font-semibold text-gray-900">
              Out of Scope ({getItemsByStatus('out_of_scope').length})
            </h3>
            <p className="text-xs text-gray-600 mt-1">Items for future sprints</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[400px]">
            {getItemsByStatus('out_of_scope').map((item) => (
              <ItemCard
                key={item.itemId}
                item={item}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
                onMove={handleMoveItem}
                color="red"
              />
            ))}
            {getItemsByStatus('out_of_scope').length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No deferred items</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Item Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleAddItem}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Backlog Item
        </button>
      </div>
    </div>
  );
};

// Item Card Component
interface ItemCardProps {
  item: SprintPlanningItem;
  onUpdate: (itemId: string, field: keyof SprintPlanningItem, value: string | number) => void;
  onDelete: (itemId: string) => void;
  onMove: (itemId: string, direction: 'up' | 'down') => void;
  color: 'gray' | 'teal' | 'red';
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onUpdate, onDelete, onMove, color }) => {
  const colorClasses = {
    gray: 'bg-gray-50 border-gray-200',
    teal: 'bg-primary-50 border-primary-200',
    red: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${colorClasses[color]}`}>
      <input
        type="text"
        value={item.title}
        onChange={(e) => onUpdate(item.itemId, 'title', e.target.value)}
        placeholder="Item title..."
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />

      <div className="flex items-center gap-2">
        <input
          type="number"
          value={item.estimate}
          onChange={(e) => onUpdate(item.itemId, 'estimate', Number(e.target.value))}
          placeholder="Points"
          min="0"
          className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={item.status}
          onChange={(e) =>
            onUpdate(item.itemId, 'status', e.target.value as SprintPlanningItem['status'])
          }
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="ready">Ready</option>
          <option value="in_scope">In Sprint</option>
          <option value="out_of_scope">Out of Scope</option>
        </select>
        <button
          onClick={() => onDelete(item.itemId)}
          className="text-red-600 hover:text-red-800"
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
  );
};
