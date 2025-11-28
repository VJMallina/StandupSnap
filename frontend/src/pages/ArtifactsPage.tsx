import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { projectsApi } from '../services/api/projects';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

interface Project {
  id: string;
  name: string;
  description: string;
}

interface RaciMatrix {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface TeamMember {
  id: string;
  fullName: string;
  displayName: string;
  designationRole: string;
}

interface Task {
  rowOrder: number;
  taskName: string;
  taskDescription: string;
}

interface RaciMatrixData {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  teamMembers: TeamMember[];
  raciGrid: Record<number, Record<string, string>>;
}

enum RaciRole {
  RESPONSIBLE = 'R',
  ACCOUNTABLE = 'A',
  CONSULTED = 'C',
  INFORMED = 'I',
}

const RACI_COLORS = {
  R: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  A: 'bg-green-100 text-green-800 hover:bg-green-200',
  C: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  I: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
};

export default function ArtifactsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [matrices, setMatrices] = useState<RaciMatrix[]>([]);
  const [selectedMatrix, setSelectedMatrix] = useState<string>('');
  const [matrixData, setMatrixData] = useState<RaciMatrixData | null>(null);
  const [projectTeamMembers, setProjectTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create new matrix modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMatrixName, setNewMatrixName] = useState('');
  const [newMatrixDescription, setNewMatrixDescription] = useState('');

  // Add task modal state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  // Add team member modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch matrices when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchMatrices();
      fetchProjectTeamMembers();
    } else {
      setMatrices([]);
      setSelectedMatrix('');
      setMatrixData(null);
    }
  }, [selectedProject]);

  // Fetch matrix data when selected matrix changes
  useEffect(() => {
    if (selectedMatrix) {
      fetchMatrixData();
    } else {
      setMatrixData(null);
    }
  }, [selectedMatrix]);

  const fetchProjects = async () => {
    try {
      const data = await projectsApi.getAll(false);
      setProjects(data);
    } catch (err: any) {
      setError('Failed to fetch projects');
      console.error(err);
    }
  };

  const fetchMatrices = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/project/${selectedProject}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch RACI matrices');
      const data = await response.json();
      setMatrices(data);
    } catch (err: any) {
      setError('Failed to fetch RACI matrices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${selectedMatrix}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch matrix data');
      const data = await response.json();
      setMatrixData(data);
    } catch (err: any) {
      setError('Failed to fetch matrix data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTeamMembers = async () => {
    try {
      const response = await fetch(
        `${API_URL}/projects/${selectedProject}/team`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch team members');
      const data = await response.json();
      setProjectTeamMembers(data);
    } catch (err: any) {
      console.error('Failed to fetch team members', err);
    }
  };

  const createMatrix = async () => {
    if (!newMatrixName.trim()) {
      setError('Matrix name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            projectId: selectedProject,
            name: newMatrixName,
            description: newMatrixDescription,
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to create matrix');
      setShowCreateModal(false);
      setNewMatrixName('');
      setNewMatrixDescription('');
      await fetchMatrices();
    } catch (err: any) {
      setError('Failed to create matrix');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTaskName.trim()) {
      setError('Task name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${selectedMatrix}/task`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            taskName: newTaskName,
            taskDescription: newTaskDescription,
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to add task');
      setShowAddTaskModal(false);
      setNewTaskName('');
      setNewTaskDescription('');
      await fetchMatrixData();
    } catch (err: any) {
      setError('Failed to add task');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addTeamMemberColumn = async () => {
    if (!selectedMemberId) {
      setError('Please select a team member');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${selectedMatrix}/team-member`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ teamMemberId: selectedMemberId }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add team member column');
      }
      setShowAddMemberModal(false);
      setSelectedMemberId('');
      await fetchMatrixData();
    } catch (err: any) {
      setError(err.message || 'Failed to add team member column');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setRaci = async (rowOrder: number, teamMemberId: string, currentRole: string) => {
    // Cycle through roles: empty -> R -> A -> C -> I -> empty
    const roleSequence = ['', 'R', 'A', 'C', 'I'];
    const currentIndex = roleSequence.indexOf(currentRole);
    const nextRole = roleSequence[(currentIndex + 1) % roleSequence.length];

    try {
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${selectedMatrix}/raci`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            rowOrder,
            teamMemberId,
            raciRole: nextRole || null,
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to update RACI assignment');
      await fetchMatrixData();
    } catch (err: any) {
      setError('Failed to update RACI assignment');
      console.error(err);
    }
  };

  const deleteTask = async (rowOrder: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${selectedMatrix}/task/${rowOrder}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to delete task');
      await fetchMatrixData();
    } catch (err: any) {
      setError('Failed to delete task');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeTeamMemberColumn = async (teamMemberId: string) => {
    if (!confirm('Are you sure you want to remove this team member column?')) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${selectedMatrix}/team-member/${teamMemberId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to remove team member column');
      await fetchMatrixData();
    } catch (err: any) {
      setError('Failed to remove team member column');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get available team members (not already added as columns)
  const availableTeamMembers = projectTeamMembers.filter(
    (member) => !matrixData?.teamMembers.some((tm) => tm.id === member.id)
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Project Artifacts</h1>
          <p className="mt-2 text-gray-600">
            Manage project documentation and RACI matrices
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <button onClick={() => setError('')} className="float-right font-bold">
              ×
            </button>
          </div>
        )}

        {/* Project Selection */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">-- Select a project --</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                RACI Matrix
              </label>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                + New Matrix
              </button>
            </div>
            <select
              value={selectedMatrix}
              onChange={(e) => setSelectedMatrix(e.target.value)}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">-- Select a RACI matrix --</option>
              {matrices.map((matrix) => (
                <option key={matrix.id} value={matrix.id}>
                  {matrix.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* RACI Matrix Display */}
        {matrixData && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{matrixData.name}</h2>
              {matrixData.description && (
                <p className="mt-1 text-gray-600">{matrixData.description}</p>
              )}
            </div>

            {/* Legend */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">RACI Legend:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold">R</span>
                  <span>Responsible</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">A</span>
                  <span>Accountable</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-semibold">C</span>
                  <span>Consulted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 font-semibold">I</span>
                  <span>Informed</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-4 flex space-x-3">
              <button
                onClick={() => setShowAddTaskModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Task
              </button>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                disabled={availableTeamMembers.length === 0}
              >
                + Add Team Member Column
              </button>
            </div>

            {/* Excel-like Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">#</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Task Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Description</th>
                    {matrixData.teamMembers.map((member) => (
                      <th
                        key={member.id}
                        className="border border-gray-300 px-4 py-2 text-center font-semibold relative group"
                      >
                        <div className="flex flex-col items-center">
                          <span>{member.displayName || member.fullName}</span>
                          <span className="text-xs text-gray-500">{member.designationRole}</span>
                          <button
                            onClick={() => removeTeamMemberColumn(member.id)}
                            className="absolute top-1 right-1 text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove column"
                          >
                            ×
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.tasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4 + matrixData.teamMembers.length}
                        className="border border-gray-300 px-4 py-8 text-center text-gray-500"
                      >
                        No tasks added yet. Click "Add Task" to get started.
                      </td>
                    </tr>
                  ) : (
                    matrixData.tasks.map((task, index) => (
                      <tr key={task.rowOrder} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {index + 1}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-medium">
                          {task.taskName}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-gray-600">
                          {task.taskDescription || '-'}
                        </td>
                        {matrixData.teamMembers.map((member) => {
                          const role = matrixData.raciGrid[task.rowOrder]?.[member.id] || '';
                          return (
                            <td
                              key={member.id}
                              className="border border-gray-300 px-4 py-2 text-center"
                            >
                              <button
                                onClick={() => setRaci(task.rowOrder, member.id, role)}
                                className={`px-3 py-1 rounded font-semibold transition-colors ${
                                  role
                                    ? RACI_COLORS[role as keyof typeof RACI_COLORS]
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                {role || '-'}
                              </button>
                            </td>
                          );
                        })}
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <button
                            onClick={() => deleteTask(task.rowOrder)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Matrix Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Create New RACI Matrix</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Matrix Name *
                  </label>
                  <input
                    type="text"
                    value={newMatrixName}
                    onChange={(e) => setNewMatrixName(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., Project Launch RACI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newMatrixDescription}
                    onChange={(e) => setNewMatrixDescription(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewMatrixName('');
                    setNewMatrixDescription('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={createMatrix}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  disabled={loading}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Task Modal */}
        {showAddTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Add New Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Name *
                  </label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., Design wireframes"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddTaskModal(false);
                    setNewTaskName('');
                    setNewTaskDescription('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={addTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={loading}
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Team Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Add Team Member Column</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Team Member
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">-- Select a team member --</option>
                  {availableTeamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName} ({member.designationRole})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSelectedMemberId('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={addTeamMemberColumn}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  disabled={loading}
                >
                  Add Column
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
