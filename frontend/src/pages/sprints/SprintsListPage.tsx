import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sprintsApi } from '../../services/api/sprints';
import { projectsApi } from '../../services/api/projects';
import { Sprint } from '../../types/sprint';
import { Project } from '../../types/project';
import AppLayout from '../../components/AppLayout';

export default function SprintsListPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadSprints();
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadSprints = async () => {
    try {
      setLoading(true);
      const data = await sprintsApi.getAll(selectedProjectId || undefined);
      setSprints(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this sprint?')) return;

    try {
      await sprintsApi.delete(id);
      loadSprints();
    } catch (err: any) {
      alert('Failed to delete sprint: ' + err.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.round(days / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  };

  if (loading) return <AppLayout><div className="p-6">Loading...</div></AppLayout>;
  if (error) return <AppLayout><div className="p-6 text-red-600">Error: {error}</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Sprints</h1>
          <button
            onClick={() => navigate('/sprints/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Sprint
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Filter by Project</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="border rounded px-3 py-2 w-64"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white shadow rounded">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sprints.map((sprint) => (
                <tr key={sprint.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{sprint.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{sprint.project.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(sprint.startDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(sprint.endDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getDuration(sprint.startDate, sprint.endDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${
                      sprint.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : sprint.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {sprint.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/sprints/${sprint.id}`)}
                      className="text-blue-600 hover:underline mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(sprint.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sprints.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No sprints found. Create one to get started!
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
