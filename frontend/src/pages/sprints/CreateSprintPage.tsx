import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sprintsApi } from '../../services/api/sprints';
import { projectsApi } from '../../services/api/projects';
import { Project } from '../../types/project';
import { SprintPreview } from '../../types/sprint';
import AppLayout from '../../components/AppLayout';

type Mode = 'manual' | 'auto';

export default function CreateSprintPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('manual');
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sprintPreviews, setSprintPreviews] = useState<SprintPreview[]>([]);

  // Manual mode form data - M6-UC01 Manual
  const [manualFormData, setManualFormData] = useState({
    projectId: '',
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    dailyStandupCount: 1,
    slotTimes: {} as Record<string, string>,
  });

  // Auto-generate mode form data - M6-UC01 Auto
  const [autoFormData, setAutoFormData] = useState({
    projectId: '',
    sprintDurationWeeks: 2,
    namePrefix: 'Sprint',
    dailyStandupCount: 1,
    slotTimes: {} as Record<string, string>,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data.filter((p: Project) => !p.isArchived)); // Only show non-archived projects
    } catch (err: any) {
      setError(err.message);
    }
  };

  // M6-UC01: Manual Sprint Creation
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await sprintsApi.create({
        projectId: manualFormData.projectId,
        name: manualFormData.name,
        goal: manualFormData.goal || undefined,
        startDate: manualFormData.startDate,
        endDate: manualFormData.endDate,
        dailyStandupCount: manualFormData.dailyStandupCount,
        slotTimes: Object.keys(manualFormData.slotTimes).length > 0 ? manualFormData.slotTimes : undefined,
      });
      navigate('/sprints');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // M6-UC01: Preview Auto-Generated Sprints
  const handlePreviewSprints = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const previews = await sprintsApi.preview({
        projectId: autoFormData.projectId,
        sprintDurationWeeks: autoFormData.sprintDurationWeeks,
        namePrefix: autoFormData.namePrefix || 'Sprint',
        dailyStandupCount: autoFormData.dailyStandupCount,
        slotTimes: Object.keys(autoFormData.slotTimes).length > 0 ? autoFormData.slotTimes : undefined,
      });
      setSprintPreviews(previews);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setSprintPreviews([]);
    } finally {
      setLoading(false);
    }
  };

  // M6-UC01: Create All Auto-Generated Sprints
  const handleGenerateAll = async () => {
    setLoading(true);
    setError(null);

    try {
      await sprintsApi.generate({
        projectId: autoFormData.projectId,
        sprintDurationWeeks: autoFormData.sprintDurationWeeks,
        namePrefix: autoFormData.namePrefix || 'Sprint',
        dailyStandupCount: autoFormData.dailyStandupCount,
        slotTimes: Object.keys(autoFormData.slotTimes).length > 0 ? autoFormData.slotTimes : undefined,
      });
      navigate('/sprints');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSelectedProject = (projectId: string) => {
    return projects.find(p => p.id === projectId);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create Sprint</h1>
          <p className="text-gray-600 mt-2">
            Create sprints manually or auto-generate multiple sprints for your project
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setMode('manual');
                setError(null);
                setSprintPreviews([]);
              }}
              className={`${
                mode === 'manual'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Manual Sprints
            </button>
            <button
              onClick={() => {
                setMode('auto');
                setError(null);
              }}
              className={`${
                mode === 'auto'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Auto-Generated Sprints
            </button>
          </nav>
        </div>

        {/* Manual Sprint Creation */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <div className="bg-primary-50 border-l-4 border-primary-400 p-4 mb-4">
              <p className="text-sm text-primary-700">
                Create a single sprint by specifying the sprint name, dates, and optional goal.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={manualFormData.projectId}
                onChange={(e) => setManualFormData({ ...manualFormData, projectId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sprint Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={manualFormData.name}
                onChange={(e) => setManualFormData({ ...manualFormData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Sprint 1, Q1 Sprint, Feature Development Sprint"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sprint Goal <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                value={manualFormData.goal}
                onChange={(e) => setManualFormData({ ...manualFormData, goal: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="What is the goal or objective for this sprint?"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={manualFormData.startDate}
                  onChange={(e) => setManualFormData({ ...manualFormData, startDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={manualFormData.endDate}
                  onChange={(e) => setManualFormData({ ...manualFormData, endDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Standups Per Day <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={manualFormData.dailyStandupCount}
                onChange={(e) => {
                  const count = parseInt(e.target.value);
                  setManualFormData({
                    ...manualFormData,
                    dailyStandupCount: count,
                    slotTimes: {} // Reset slot times when count changes
                  });
                }}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={1}>1 Standup Per Day (Default)</option>
                <option value={2}>2 Standups Per Day</option>
                <option value={3}>3 Standups Per Day</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Configure how many standup slots should be available each day during this sprint
              </p>
            </div>

            {/* Dynamic Slot Time Inputs */}
            {manualFormData.dailyStandupCount >= 1 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Slot Times (Optional)</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Specify the time for each standup slot. This helps team members know when each slot occurs.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array.from({ length: manualFormData.dailyStandupCount }, (_, i) => i + 1).map((slotNum) => (
                    <div key={slotNum}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Slot {slotNum} Time
                      </label>
                      <input
                        type="time"
                        value={manualFormData.slotTimes[slotNum.toString()] || ''}
                        onChange={(e) => {
                          const newSlotTimes = { ...manualFormData.slotTimes };
                          if (e.target.value) {
                            newSlotTimes[slotNum.toString()] = e.target.value;
                          } else {
                            delete newSlotTimes[slotNum.toString()];
                          }
                          setManualFormData({ ...manualFormData, slotTimes: newSlotTimes });
                        }}
                        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="HH:MM"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Sprint...' : 'Create Sprint'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/sprints')}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Auto-Generate Sprints */}
        {mode === 'auto' && (
          <div className="space-y-6">
            <form onSubmit={handlePreviewSprints} className="bg-white shadow rounded-lg p-6 space-y-6">
              <div className="bg-primary-50 border-l-4 border-primary-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-primary-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-primary-700">
                      Auto-generate will create multiple sprints for the selected project based on the project timeline and your specified sprint duration.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={autoFormData.projectId}
                  onChange={(e) => setAutoFormData({ ...autoFormData, projectId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({new Date(project.startDate).toLocaleDateString()} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'})
                    </option>
                  ))}
                </select>
                {autoFormData.projectId && !getSelectedProject(autoFormData.projectId)?.endDate && (
                  <p className="mt-1 text-sm text-red-600">
                    Selected project must have an end date for auto-generation.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sprint Duration <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={autoFormData.sprintDurationWeeks}
                    onChange={(e) => setAutoFormData({ ...autoFormData, sprintDurationWeeks: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={1}>1 Week</option>
                    <option value={2}>2 Weeks (Recommended)</option>
                    <option value={3}>3 Weeks</option>
                    <option value={4}>4 Weeks</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Typical agile sprints are 2 weeks long
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sprint Name Prefix <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={autoFormData.namePrefix}
                    onChange={(e) => setAutoFormData({ ...autoFormData, namePrefix: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Sprint, Iteration"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Will be followed by a number (e.g., Sprint 1, Sprint 2)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Standups Per Day <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={autoFormData.dailyStandupCount}
                  onChange={(e) => {
                    const count = parseInt(e.target.value);
                    setAutoFormData({
                      ...autoFormData,
                      dailyStandupCount: count,
                      slotTimes: {} // Reset slot times when count changes
                    });
                  }}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={1}>1 Standup Per Day (Default)</option>
                  <option value={2}>2 Standups Per Day</option>
                  <option value={3}>3 Standups Per Day</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Configure how many standup slots should be available each day for all generated sprints
                </p>
              </div>

              {/* Dynamic Slot Time Inputs */}
              {autoFormData.dailyStandupCount >= 1 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Slot Times (Optional)</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Specify the time for each standup slot. These times will apply to all generated sprints.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Array.from({ length: autoFormData.dailyStandupCount }, (_, i) => i + 1).map((slotNum) => (
                      <div key={slotNum}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Slot {slotNum} Time
                        </label>
                        <input
                          type="time"
                          value={autoFormData.slotTimes[slotNum.toString()] || ''}
                          onChange={(e) => {
                            const newSlotTimes = { ...autoFormData.slotTimes };
                            if (e.target.value) {
                              newSlotTimes[slotNum.toString()] = e.target.value;
                            } else {
                              delete newSlotTimes[slotNum.toString()];
                            }
                            setAutoFormData({ ...autoFormData, slotTimes: newSlotTimes });
                          }}
                          className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="HH:MM"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading || !!(autoFormData.projectId && !getSelectedProject(autoFormData.projectId)?.endDate)}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating Preview...' : 'Generate Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/sprints')}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Sprint Preview */}
            {sprintPreviews.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    Sprint Preview ({sprintPreviews.length} sprint{sprintPreviews.length !== 1 ? 's' : ''})
                  </h2>
                </div>

                <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                  <p className="text-sm text-green-700">
                    Review the generated sprints below. Click "Create All" to create all {sprintPreviews.length} sprint{sprintPreviews.length !== 1 ? 's' : ''}.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sprint Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Daily Standups
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sprintPreviews.map((preview, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {preview.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(preview.startDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(preview.endDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {preview.durationDays} day{preview.durationDays !== 1 ? 's' : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {preview.dailyStandupCount} per day
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex gap-3 pt-4 border-t">
                  <button
                    onClick={handleGenerateAll}
                    disabled={loading}
                    className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating Sprints...' : 'Create All'}
                  </button>
                  <button
                    onClick={() => setSprintPreviews([])}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
                  >
                    Cancel
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
