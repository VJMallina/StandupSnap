import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sprintsApi } from '../../services/api/sprints';
import { Sprint, SprintStatus } from '../../types/sprint';
import AppLayout from '../../components/AppLayout';

export default function SprintDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (id) {
      loadSprint();
    }
  }, [id]);

  const loadSprint = async () => {
    try {
      setLoading(true);
      const data = await sprintsApi.getById(id!);
      setSprint(data);

      setEditFormData({
        name: data.name,
        goal: data.goal || '',
        startDate: data.startDate.split('T')[0],
        endDate: data.endDate.split('T')[0],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // M6-UC03: Update Sprint
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      await sprintsApi.update(id, {
        name: editFormData.name,
        goal: editFormData.goal || undefined,
        startDate: editFormData.startDate,
        endDate: editFormData.endDate,
      });
      setShowEditModal(false);
      await loadSprint();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // M6-UC04: Delete Sprint
  const handleDelete = async () => {
    if (!id || !sprint) return;
    if (!window.confirm(`Are you sure you want to delete "${sprint.name}"?\n\nThis action cannot be undone.`)) return;

    try {
      await sprintsApi.delete(id);
      navigate('/sprints');
    } catch (err: any) {
      alert('Failed to delete sprint: ' + err.message);
    }
  };

  // M6-UC06: Close Sprint
  const handleCloseSprint = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      await sprintsApi.closeSprint(id);
      setShowCloseModal(false);
      await loadSprint();
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

  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;

    if (weeks > 0 && remainingDays > 0) {
      return `${weeks} week${weeks !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''} (${days} days total)`;
    } else if (weeks > 0) {
      return `${weeks} week${weeks !== 1 ? 's' : ''} (${days} days)`;
    } else {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusBadgeColor = (status: SprintStatus) => {
    switch (status) {
      case SprintStatus.ACTIVE:
        return 'bg-green-100 text-green-800 border-green-200';
      case SprintStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case SprintStatus.CLOSED:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case SprintStatus.UPCOMING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: SprintStatus) => {
    switch (status) {
      case SprintStatus.ACTIVE:
        return 'Active';
      case SprintStatus.COMPLETED:
        return 'Completed';
      case SprintStatus.CLOSED:
        return 'Closed';
      case SprintStatus.UPCOMING:
        return 'Upcoming';
      default:
        return status;
    }
  };

  if (loading && !sprint) {
    return (
      <AppLayout>
        <div className="p-6">Loading...</div>
      </AppLayout>
    );
  }

  if (error && !sprint) {
    return (
      <AppLayout>
        <div className="p-6 text-red-600">Error: {error}</div>
      </AppLayout>
    );
  }

  if (!sprint) {
    return (
      <AppLayout>
        <div className="p-6">Sprint not found</div>
      </AppLayout>
    );
  }

  const daysRemaining = sprint.status === SprintStatus.ACTIVE ? getDaysRemaining(sprint.endDate) : null;
  const canEdit = !sprint.isClosed && sprint.project && !sprint.project.isArchived;
  const canClose = !sprint.isClosed && sprint.status !== SprintStatus.UPCOMING && !sprint.project.isArchived;
  const canDelete = !sprint.isClosed && sprint.status !== SprintStatus.ACTIVE && !sprint.project.isArchived;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{sprint.name}</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadgeColor(sprint.status)}`}>
                {getStatusLabel(sprint.status)}
              </span>
            </div>
            <div className="flex gap-3">
              {canEdit && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Edit Sprint
                </button>
              )}
              {canClose && (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                >
                  Close Sprint
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
                onClick={() => navigate('/sprints')}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Back to List
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Sprint Details Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Sprint Information</h2>

            {sprint.goal && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Sprint Goal</h3>
                <p className="text-gray-900">{sprint.goal}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Project</h3>
                <p className="text-gray-900 font-medium">{sprint.project.name}</p>
                <button
                  onClick={() => navigate(`/projects/${sprint.project.id}`)}
                  className="text-blue-600 hover:underline text-sm mt-1"
                >
                  View Project →
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Creation Type</h3>
                <p className="text-gray-900">
                  {sprint.creationType === 'manual' ? 'Manual' : 'Auto-Generated'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Start Date</h3>
                <p className="text-gray-900">{formatDate(sprint.startDate)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">End Date</h3>
                <p className="text-gray-900">{formatDate(sprint.endDate)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Duration</h3>
                <p className="text-gray-900">{getDuration(sprint.startDate, sprint.endDate)}</p>
              </div>

              {sprint.status === SprintStatus.ACTIVE && daysRemaining !== null && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Days Remaining</h3>
                  <p className={`text-gray-900 font-semibold ${daysRemaining <= 3 ? 'text-red-600' : ''}`}>
                    {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}` : 'Last day!'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Status Overview</h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Sprint Progress</span>
                  <span className="font-medium">
                    {sprint.status === SprintStatus.COMPLETED || sprint.status === SprintStatus.CLOSED ? '100%' :
                     sprint.status === SprintStatus.ACTIVE ? '50%' : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      sprint.status === SprintStatus.COMPLETED || sprint.status === SprintStatus.CLOSED
                        ? 'bg-blue-600'
                        : sprint.status === SprintStatus.ACTIVE
                        ? 'bg-green-600'
                        : 'bg-yellow-600'
                    }`}
                    style={{
                      width: sprint.status === SprintStatus.COMPLETED || sprint.status === SprintStatus.CLOSED ? '100%' :
                             sprint.status === SprintStatus.ACTIVE ? '50%' : '0%'
                    }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Current Status</p>
                <p className="text-lg font-semibold text-gray-900">{getStatusLabel(sprint.status)}</p>
              </div>

              {sprint.isClosed && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">
                    This sprint is closed. No further snap creation is allowed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Metadata</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Created At</p>
              <p className="text-gray-900">{formatDate(sprint.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Last Updated</p>
              <p className="text-gray-900">{formatDate(sprint.updatedAt)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Sprint ID</p>
              <p className="text-gray-900 font-mono text-xs">{sprint.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal - M6-UC03 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Edit Sprint</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sprint Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sprint Goal
                </label>
                <textarea
                  value={editFormData.goal}
                  onChange={(e) => setEditFormData({ ...editFormData, goal: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.endDate}
                    onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setError(null);
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Sprint Modal - M6-UC06 */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Close Sprint</h3>
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Warning:</strong> Closing the sprint will prevent new snap creation. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Are you sure you want to close <strong>"{sprint.name}"</strong>?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseSprint}
                disabled={loading}
                className="flex-1 bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Closing...' : 'Yes, Close Sprint'}
              </button>
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setError(null);
                }}
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
