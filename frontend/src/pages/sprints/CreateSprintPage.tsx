import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sprintsApi } from '../../services/api/sprints';
import { projectsApi } from '../../services/api/projects';
import { Project } from '../../types/project';
import { Sprint } from '../../types/sprint';
import AppLayout from '../../components/AppLayout';

type Mode = 'manual' | 'auto';

export default function CreateSprintPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('manual');
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedSprints, setGeneratedSprints] = useState<Sprint[]>([]);

  // Manual mode form data
  const [manualFormData, setManualFormData] = useState({
    projectId: '',
    name: '',
    description: '',
    startDate: '',
    durationWeeks: 2,
    status: 'planned',
  });

  // Auto-generate mode form data
  const [autoFormData, setAutoFormData] = useState({
    projectId: '',
    sprintDurationWeeks: 2,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await sprintsApi.create({
        projectId: manualFormData.projectId,
        name: manualFormData.name,
        description: manualFormData.description || undefined,
        startDate: manualFormData.startDate,
        durationWeeks: manualFormData.durationWeeks,
        status: manualFormData.status,
      });
      navigate('/sprints');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const sprints = await sprintsApi.generate({
        projectId: autoFormData.projectId,
        sprintDurationWeeks: autoFormData.sprintDurationWeeks,
      });
      setGeneratedSprints(sprints);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setGeneratedSprints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmGeneration = () => {
    navigate('/sprints');
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

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Create Sprint</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setMode('manual')}
            className={`px-6 py-2 rounded ${
              mode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Create Single Sprint
          </button>
          <button
            onClick={() => setMode('auto')}
            className={`px-6 py-2 rounded ${
              mode === 'auto'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Auto-Generate Sprints
          </button>
        </div>

        {mode === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="bg-white shadow rounded p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project *</label>
              <select
                required
                value={manualFormData.projectId}
                onChange={(e) => setManualFormData({ ...manualFormData, projectId: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sprint Name *</label>
              <input
                type="text"
                required
                value={manualFormData.name}
                onChange={(e) => setManualFormData({ ...manualFormData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Sprint 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={manualFormData.description}
                onChange={(e) => setManualFormData({ ...manualFormData, description: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="Optional sprint description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={manualFormData.startDate}
                onChange={(e) => setManualFormData({ ...manualFormData, startDate: e.target.value })}
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
                value={manualFormData.durationWeeks}
                onChange={(e) => setManualFormData({ ...manualFormData, durationWeeks: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={manualFormData.status}
                onChange={(e) => setManualFormData({ ...manualFormData, status: e.target.value })}
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
                {loading ? 'Creating...' : 'Create Sprint'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/sprints')}
                className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleAutoGenerate} className="bg-white shadow rounded p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded mb-4">
                <p className="text-sm text-blue-800">
                  Auto-generate will create multiple sprints for your project based on the project timeline
                  and your specified sprint duration. Existing sprints for this project will be deleted.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Project *</label>
                <select
                  required
                  value={autoFormData.projectId}
                  onChange={(e) => setAutoFormData({ ...autoFormData, projectId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.startDate} - {project.endDate || 'Ongoing'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sprint Duration (weeks) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="8"
                  value={autoFormData.sprintDurationWeeks}
                  onChange={(e) => setAutoFormData({ ...autoFormData, sprintDurationWeeks: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 2 weeks for typical agile sprints
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? 'Generating...' : 'Generate Sprints'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/sprints')}
                  className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>

            {generatedSprints.length > 0 && (
              <div className="bg-white shadow rounded p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Generated Sprints Preview ({generatedSprints.length} sprints)
                </h2>
                <div className="bg-green-50 p-4 rounded mb-4">
                  <p className="text-sm text-green-800">
                    Successfully created {generatedSprints.length} sprint{generatedSprints.length !== 1 ? 's' : ''}!
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {generatedSprints.map((sprint, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{sprint.name}</td>
                          <td className="px-4 py-2">{formatDate(sprint.startDate)}</td>
                          <td className="px-4 py-2">{formatDate(sprint.endDate)}</td>
                          <td className="px-4 py-2">{getDuration(sprint.startDate, sprint.endDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6">
                  <button
                    onClick={handleConfirmGeneration}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  >
                    Go to Sprints List
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
