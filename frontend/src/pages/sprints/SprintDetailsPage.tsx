import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sprintsApi } from '../../services/api/sprints';
import { Sprint } from '../../types/sprint';
import AppLayout from '../../components/AppLayout';

export default function SprintDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    durationWeeks: 2,
    status: 'planned',
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

      // Calculate duration in weeks
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const weeks = Math.round(days / 7);

      setFormData({
        name: data.name,
        description: data.description || '',
        startDate: data.startDate.split('T')[0],
        durationWeeks: weeks,
        status: data.status,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setLoading(true);
      await sprintsApi.update(id, {
        name: formData.name,
        description: formData.description || undefined,
        startDate: formData.startDate,
        durationWeeks: formData.durationWeeks,
        status: formData.status,
      });
      setEditMode(false);
      await loadSprint();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this sprint?')) return;

    try {
      await sprintsApi.delete(id);
      navigate('/sprints');
    } catch (err: any) {
      alert('Failed to delete sprint: ' + err.message);
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
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.round(days / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} (${days} days)`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <AppLayout><div className="p-6">Loading...</div></AppLayout>;
  if (error) return <AppLayout><div className="p-6 text-red-600">Error: {error}</div></AppLayout>;
  if (!sprint) return <AppLayout><div className="p-6">Sprint not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Sprint Details</h1>
          <div className="flex gap-3">
            {!editMode && (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Edit Sprint
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Delete Sprint
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/sprints')}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Back to List
            </button>
          </div>
        </div>

        {editMode ? (
          <form onSubmit={handleUpdate} className="bg-white shadow rounded p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Edit Sprint</h2>

            <div>
              <label className="block text-sm font-medium mb-1">Sprint Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Duration (weeks) *</label>
              <input
                type="number"
                required
                min="1"
                max="8"
                value={formData.durationWeeks}
                onChange={(e) => setFormData({ ...formData, durationWeeks: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  loadSprint();
                }}
                className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white shadow rounded p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{sprint.name}</h2>
              <div className="inline-flex">
                <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(sprint.status)}`}>
                  {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                </span>
              </div>
            </div>

            {sprint.description && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-gray-900">{sprint.description}</p>
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
                  View Project
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Duration</h3>
                <p className="text-gray-900">{getDuration(sprint.startDate, sprint.endDate)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Start Date</h3>
                <p className="text-gray-900">{formatDate(sprint.startDate)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">End Date</h3>
                <p className="text-gray-900">{formatDate(sprint.endDate)}</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Timeline Visualization</h3>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{formatDate(sprint.startDate)}</span>
                  <span className="text-sm text-gray-600">{formatDate(sprint.endDate)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${
                      sprint.status === 'completed'
                        ? 'bg-blue-600'
                        : sprint.status === 'active'
                        ? 'bg-green-600'
                        : 'bg-yellow-600'
                    }`}
                    style={{ width: sprint.status === 'completed' ? '100%' : '50%' }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {sprint.status === 'completed'
                    ? 'Sprint completed'
                    : sprint.status === 'active'
                    ? 'Sprint in progress'
                    : 'Sprint not started'}
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Created At</h3>
              <p className="text-gray-900 text-sm">{formatDate(sprint.createdAt)}</p>

              <h3 className="text-sm font-medium text-gray-500 mb-1 mt-3">Last Updated</h3>
              <p className="text-gray-900 text-sm">{formatDate(sprint.updatedAt)}</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
