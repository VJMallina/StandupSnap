import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { assigneesApi, AssigneeListItem } from '../../services/api/assignees';
import { sprintsApi } from '../../services/api/sprints';
import { Sprint } from '../../types/sprint';

export default function AssigneeListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [assignees, setAssignees] = useState<AssigneeListItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>(
    searchParams.get('sprintId') || '',
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSprints();
  }, []);

  useEffect(() => {
    // Load assignees even without sprint selection (will show all)
    loadAssignees();
  }, [selectedSprintId]);

  const loadSprints = async () => {
    try {
      const data = await sprintsApi.getAll();
      // Filter active sprints
      const activeSprints = data.filter((s) => s.status === 'active');
      setSprints(activeSprints);

      // Auto-select first active sprint if none selected
      if (!selectedSprintId && activeSprints.length > 0) {
        setSelectedSprintId(activeSprints[0].id);
      } else if (!selectedSprintId) {
        // No active sprints, but still load assignees
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadAssignees = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await assigneesApi.getAll({
        sprintId: selectedSprintId || undefined,
      });

      setAssignees(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading assignees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSprintChange = (sprintId: string) => {
    setSelectedSprintId(sprintId);
    setSearchParams({ sprintId });
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

  if (loading && assignees.length === 0) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center py-12">
          <svg
            className="animate-spin h-10 w-10 text-blue-600"
            viewBox="0 0 24 24"
          >
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

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <svg
                className="h-10 w-10 text-blue-600 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <div>
                <h1 className="text-3xl font-bold">Team Members</h1>
                <p className="text-gray-600">
                  View all assignees and their work status
                </p>
              </div>
            </div>
          </div>

          {/* Sprint Selector */}
          {sprints.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Sprint:
              </label>
              <select
                value={selectedSprintId}
                onChange={(e) => handleSprintChange(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a sprint...</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Assignees List */}
        {assignees.length === 0 && !loading ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-gray-600 mb-4">No team members found</p>
            <p className="text-sm text-gray-500">
              Add team members to the project from Team Management
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignees.map((assignee) => {
              const ragBadge = getRAGBadge(assignee.assigneeRAG);

              return (
                <div
                  key={assignee.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden cursor-pointer"
                  onClick={() =>
                    navigate(
                      `/assignees/${assignee.id}?sprintId=${selectedSprintId}`,
                    )
                  }
                >
                  <div className="p-6">
                    {/* Avatar/Initials */}
                    <div className="flex items-center mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg mr-3">
                        {assignee.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {assignee.fullName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {assignee.designationRole}
                        </p>
                      </div>
                    </div>

                    {/* Display Name */}
                    {assignee.displayName && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">@{assignee.displayName}</p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {assignee.assignedCardsCount}
                        </p>
                        <p className="text-xs text-gray-500">
                          Assigned {assignee.assignedCardsCount === 1 ? 'Card' : 'Cards'}
                        </p>
                      </div>

                      <div className="text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${ragBadge.color}`}
                        >
                          {ragBadge.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">RAG Status</p>
                      </div>
                    </div>
                  </div>

                  {/* View Details Link */}
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      View Details →
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
}
