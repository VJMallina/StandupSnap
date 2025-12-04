import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrumRoomsApi } from '../../services/api/scrumRooms';
import { ScrumRoom, MOMData, MOMActionItem } from '../../types/scrumRooms';

interface MOMRoomProps {
  room: ScrumRoom;
  onUpdate: () => void;
}

export const MOMRoom: React.FC<MOMRoomProps> = ({ room, onUpdate }) => {
  const navigate = useNavigate();
  const data = room.data as MOMData;

  const [rawInput, setRawInput] = useState(data?.rawInput || '');
  const [summary, setSummary] = useState(data?.summary || '');
  const [decisions, setDecisions] = useState<string[]>(data?.decisions || []);
  const [actionItems, setActionItems] = useState<MOMActionItem[]>(data?.actionItems || []);
  const [attendees, setAttendees] = useState<string[]>(data?.attendees || []);
  const [newAttendee, setNewAttendee] = useState('');
  const [newDecision, setNewDecision] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');

  const handleGenerateAI = async () => {
    if (!rawInput.trim()) {
      alert('Please enter meeting notes first');
      return;
    }

    try {
      setGenerating(true);
      const result = await scrumRoomsApi.generateMOMSummary(rawInput);

      setSummary(result.summary);
      setDecisions(result.decisions);
      setActionItems(result.actionItems);
      setActiveTab('output');
    } catch (err: any) {
      console.error('Error generating summary:', err);
      alert(err.message || 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const updatedData: MOMData = {
        rawInput,
        summary,
        decisions,
        actionItems,
        attendees,
        aiGenerated: data?.aiGenerated || false,
      };

      await scrumRoomsApi.updateData(room.id, { data: updatedData });
      onUpdate();
      alert('Meeting minutes saved successfully');
    } catch (err: any) {
      console.error('Error saving:', err);
      alert(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttendee = () => {
    if (newAttendee.trim() && !attendees.includes(newAttendee.trim())) {
      setAttendees([...attendees, newAttendee.trim()]);
      setNewAttendee('');
    }
  };

  const handleRemoveAttendee = (attendee: string) => {
    setAttendees(attendees.filter((a) => a !== attendee));
  };

  const handleAddDecision = () => {
    if (newDecision.trim()) {
      setDecisions([...decisions, newDecision.trim()]);
      setNewDecision('');
    }
  };

  const handleRemoveDecision = (index: number) => {
    setDecisions(decisions.filter((_, i) => i !== index));
  };

  const handleAddActionItem = () => {
    setActionItems([
      ...actionItems,
      { id: `action-${Date.now()}`, description: '', assignee: '', dueDate: '' },
    ]);
  };

  const handleUpdateActionItem = (id: string, field: keyof MOMActionItem, value: string) => {
    setActionItems(
      actionItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveActionItem = (id: string) => {
    setActionItems(actionItems.filter((item) => item.id !== id));
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
              <span className="text-3xl">📝</span>
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
          {loading ? 'Saving...' : 'Save Minutes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('input')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'input'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Meeting Notes
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'output'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Minutes Summary
          </button>
        </div>
      </div>

      {/* Input Tab */}
      {activeTab === 'input' && (
        <div className="space-y-6">
          {/* Raw Input */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Meeting Notes</h3>
              <button
                onClick={handleGenerateAI}
                disabled={generating || !rawInput.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Generate AI Summary
                  </>
                )}
              </button>
            </div>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste or type your meeting notes here. The AI will help extract key points, decisions, and action items..."
              rows={15}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Tip: Include participant names, decisions made, and tasks assigned for better AI extraction
            </p>
          </div>

          {/* Attendees */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendees</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAttendee()}
                placeholder="Add attendee name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <button
                onClick={handleAddAttendee}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {attendees.map((attendee, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-lg"
                >
                  <span className="text-sm font-medium text-teal-700">{attendee}</span>
                  <button
                    onClick={() => handleRemoveAttendee(attendee)}
                    className="text-teal-600 hover:text-teal-800"
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
              {attendees.length === 0 && (
                <p className="text-sm text-gray-500">No attendees added yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Output Tab */}
      {activeTab === 'output' && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Summary</h3>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summary of the meeting discussion..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Decisions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Decisions Made</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newDecision}
                onChange={(e) => setNewDecision(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddDecision()}
                placeholder="Add a decision..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <button
                onClick={handleAddDecision}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {decisions.map((decision, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <svg
                    className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="flex-1 text-sm text-gray-900">{decision}</span>
                  <button
                    onClick={() => handleRemoveDecision(idx)}
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
              {decisions.length === 0 && (
                <p className="text-sm text-gray-500">No decisions recorded</p>
              )}
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Action Items</h3>
              <button
                onClick={handleAddActionItem}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleUpdateActionItem(item.id, 'description', e.target.value)
                      }
                      placeholder="Action item description..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={() => handleRemoveActionItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={item.assignee || ''}
                      onChange={(e) => handleUpdateActionItem(item.id, 'assignee', e.target.value)}
                      placeholder="Assignee"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                    <input
                      type="date"
                      value={item.dueDate || ''}
                      onChange={(e) => handleUpdateActionItem(item.id, 'dueDate', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              ))}
              {actionItems.length === 0 && (
                <p className="text-sm text-gray-500">No action items yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
