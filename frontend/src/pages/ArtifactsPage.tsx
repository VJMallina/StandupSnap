import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

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
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string } | null;
  updatedBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  approvers: { id: string; name: string; role: string }[];
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

const TASK_NAME_LIMIT = 50;
const TASK_DESC_LIMIT = 100;

const RACI_COLORS = {
  R: 'bg-blue-200 text-blue-900 hover:bg-blue-300',
  A: 'bg-green-200 text-green-900 hover:bg-green-300',
  C: 'bg-yellow-200 text-yellow-900 hover:bg-yellow-300',
  I: 'bg-purple-200 text-purple-900 hover:bg-purple-300',
};

const RACI_CELL_BG = {
  R: 'bg-blue-100',
  A: 'bg-green-100',
  C: 'bg-yellow-100',
  I: 'bg-purple-100',
};

const MEMBER_COLOR_BANDS = [
  'from-primary-50/90 via-primary-100/80 to-primary-100',
  'from-secondary-50/90 via-secondary-100/80 to-secondary-100',
  'from-amber-50/90 via-orange-50/80 to-orange-100',
  'from-rose-50/90 via-pink-50/80 to-pink-100',
];

const roleLabel: Record<string, string> = {
  R: 'Responsible',
  A: 'Accountable',
  C: 'Consulted',
  I: 'Informed',
};

const formatDate = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

const initials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

export default function ArtifactsPage() {
  const navigate = useNavigate();
  const { matrixId: routeMatrixId } = useParams();
  const { selectedProjectId } = useProjectSelection();
  const [matrices, setMatrices] = useState<RaciMatrix[]>([]);
  const [selectedMatrix, setSelectedMatrix] = useState<string>(routeMatrixId || '');
  const [matrixData, setMatrixData] = useState<RaciMatrixData | null>(null);
  const [projectTeamMembers, setProjectTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMatrixName, setNewMatrixName] = useState('');
  const [newMatrixDescription, setNewMatrixDescription] = useState('');

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingRowOrder, setEditingRowOrder] = useState<number | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedApproverId, setSelectedApproverId] = useState('');
  const [addingExternal, setAddingExternal] = useState(false);
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [columnWidths, setColumnWidths] = useState({
    deliverable: 192, // 48 * 4px
    description: 256, // 64 * 4px
  });
  const resizeState = useRef<{
    col: 'deliverable' | 'description' | null;
    startX: number;
    startWidth: number;
  }>({ col: null, startX: 0, startWidth: 0 });

  const beginResize = (col: 'deliverable' | 'description', clientX: number) => {
    resizeState.current = { col, startX: clientX, startWidth: columnWidths[col] };
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const { col, startX, startWidth } = resizeState.current;
      if (!col) return;
      const deltaX = e.clientX - startX;
      const nextWidth = Math.min(420, Math.max(140, startWidth + deltaX));
      setColumnWidths(prev => ({ ...prev, [col]: nextWidth }));
    };
    const onMouseUp = () => {
      resizeState.current = { col: null, startX: 0, startWidth: 0 };
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [columnWidths]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchMatrices();
      fetchProjectTeamMembers();
    } else {
      setMatrices([]);
      setSelectedMatrix('');
      setMatrixData(null);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (routeMatrixId) {
      setSelectedMatrix(routeMatrixId);
    } else {
      setSelectedMatrix('');
      setMatrixData(null);
    }
  }, [routeMatrixId]);

  useEffect(() => {
    if (selectedMatrix) {
      fetchMatrixData();
    } else {
      setMatrixData(null);
    }
  }, [selectedMatrix]);

  useEffect(() => {
    if (matrixData?.approvedBy?.id) {
      setSelectedApproverId(matrixData.approvedBy.id);
    } else {
      setSelectedApproverId('');
    }
  }, [matrixData?.approvedBy?.id]);

  const fetchMatrices = async () => {
    if (!selectedProjectId) return;
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/project/${selectedProjectId}`,
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
    if (!selectedMatrix) return;
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
    if (!selectedProjectId) return;
    try {
      const response = await fetch(
        `${API_URL}/projects/${selectedProjectId}/team`,
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
    if (!selectedProjectId) {
      setError('Select a project in the Artifacts hub first');
      return;
    }
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
            projectId: selectedProjectId,
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
    const trimmedName = newTaskName.trim();
    const trimmedDesc = newTaskDescription.trim();

    if (!trimmedName) {
      setError('Task name is required');
      return;
    }

    if (trimmedName.length > TASK_NAME_LIMIT) {
      setError(`Task name must be ${TASK_NAME_LIMIT} characters or fewer`);
      return;
    }

    if (trimmedDesc.length > TASK_DESC_LIMIT) {
      setError(`Task description must be ${TASK_DESC_LIMIT} characters or fewer`);
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
            taskName: trimmedName,
            taskDescription: trimmedDesc,
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

  const openEditTask = (task: Task) => {
    setEditingRowOrder(task.rowOrder);
    setEditTaskName(task.taskName);
    setEditTaskDescription(task.taskDescription || '');
    setShowEditTaskModal(true);
  };

  const updateTask = async () => {
    if (editingRowOrder === null) {
      setError('No task selected for edit');
      return;
    }
    const trimmedName = editTaskName.trim();
    const trimmedDesc = editTaskDescription.trim();

    if (!trimmedName) {
      setError('Task name is required');
      return;
    }

    if (trimmedName.length > TASK_NAME_LIMIT) {
      setError(`Task name must be ${TASK_NAME_LIMIT} characters or fewer`);
      return;
    }

    if (trimmedDesc.length > TASK_DESC_LIMIT) {
      setError(`Task description must be ${TASK_DESC_LIMIT} characters or fewer`);
      return;
    }

    let succeeded = false;
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${selectedMatrix}/task/${editingRowOrder}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            taskName: trimmedName,
            taskDescription: trimmedDesc,
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to update task');
      await fetchMatrixData();
      succeeded = true;
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
      console.error(err);
    } finally {
      setLoading(false);
      if (succeeded) {
        setShowEditTaskModal(false);
        setEditingRowOrder(null);
        setEditTaskName('');
        setEditTaskDescription('');
      }
    }
  };

  const addTeamMemberColumn = async () => {
    if (addingExternal) {
      if (!externalName.trim()) {
        setError('Please enter a name for the external stakeholder');
        return;
      }
    } else {
      if (!selectedMemberId) {
        setError('Please select a team member');
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${selectedMatrix}/team-member`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(
            addingExternal
              ? { teamMemberId: '', externalName: externalName.trim(), externalEmail: externalEmail.trim() || undefined }
              : { teamMemberId: selectedMemberId }
          ),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add team member column');
      }
      setShowAddMemberModal(false);
      setSelectedMemberId('');
      setExternalName('');
      setExternalEmail('');
      setAddingExternal(false);
      await fetchMatrixData();
    } catch (err: any) {
      setError(err.message || 'Failed to add team member column');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setRaci = async (rowOrder: number, teamMemberId: string, currentRole: string) => {
    const roleSequence = ['', 'R', 'A', 'C', 'I'];
    const currentIndex = roleSequence.indexOf(currentRole);
    const nextRole = roleSequence[(currentIndex + 1) % roleSequence.length];

    const payload: Record<string, any> = {
      rowOrder,
      teamMemberId,
    };
    if (nextRole) {
      payload.raciRole = nextRole;
    }

    try {
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${selectedMatrix}/raci`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error('Failed to update RACI assignment');

      // Always refresh; keep selection
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

  const saveApprover = async (approverId: string) => {
    setSelectedApproverId(approverId);
    if (!approverId) {
      setError('Select an approver');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${selectedMatrix}/approved-by`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ approverId }),
        }
      );
      if (!response.ok) throw new Error('Failed to set approver');
      await fetchMatrixData();
    } catch (err: any) {
      setError(err.message || 'Failed to set approver');
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

  const deleteMatrix = async (matrixId: string) => {
    if (!confirm('Are you sure you want to delete this matrix? This cannot be undone.')) return;
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/artifacts/raci-matrix/${matrixId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error('Failed to delete matrix');
      setMatrices(prev => prev.filter(m => m.id !== matrixId));
      if (routeMatrixId === matrixId) {
        navigate('/artifacts/raci');
        setMatrixData(null);
        setSelectedMatrix('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete matrix');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const availableTeamMembers = selectedProjectId
    ? projectTeamMembers.filter(
        (member) => !matrixData?.teamMembers.some((tm) => tm.id === member.id)
      )
    : [];

  return (
    <AppLayout>
      <ArtifactsNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-700 rounded-xl p-4 md:p-5 shadow-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">RACI Matrix</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/artifacts')}
                className="px-4 py-2 bg-white/10 border border-white/30 rounded-xl text-white hover:bg-white/20 transition font-semibold"
              >
                Back to Artifacts
              </button>
              {selectedProjectId && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-white text-primary-700 font-semibold rounded-xl shadow-md hover:shadow-lg transition"
                >
                  + New Matrix
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-sm">
            <div>{error}</div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800 font-semibold">Dismiss</button>
          </div>
        )}

        <div className="space-y-6">
            {!routeMatrixId && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Matrices for this project</h2>
                  <p className="text-sm text-gray-500">Pick a matrix to open, or create a new one.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
                    disabled={!selectedProjectId}
                  >
                    + New Matrix
                  </button>
                </div>
              </div>

              {!selectedProjectId && (
                <p className="text-sm text-gray-500">Select a project in the Artifacts hub to see its matrices.</p>
              )}

              {selectedProjectId && matrices.length === 0 && !loading && (
                <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4">
                  No matrices yet. Create one to start mapping responsibilities.
                </div>
              )}

              {selectedProjectId && matrices.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                  {matrices.map((matrix) => {
                    const isSelected = selectedMatrix === matrix.id;
                  const creator = (matrix as any).createdBy?.name || (matrix as any).createdBy?.username || '';
                  const updater = (matrix as any).updatedBy?.name || (matrix as any).updatedBy?.username || '';
                  const createdAt = (matrix as any).createdAt ? formatDate((matrix as any).createdAt) : '';
                  const updatedAt = (matrix as any).updatedAt ? formatDate((matrix as any).updatedAt) : '';
                  return (
                    <button
                      key={matrix.id}
                      onClick={() => navigate(`/artifacts/raci/${matrix.id}`)}
                      className={`text-left rounded-xl border p-4 transition shadow-sm hover:shadow-md ${
                        isSelected
                          ? 'border-primary-500 ring-2 ring-primary-100 bg-primary-50'
                          : 'border-gray-200 bg-white hover:border-primary-200'
                      } group`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-gray-900">{matrix.name}</p>
                          {matrix.description && (
                            <p className="text-sm text-gray-500 line-clamp-3">{matrix.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{createdAt}</span>
                      </div>
                      <div className="mt-2 text-[11px] text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-700">By:</span>
                          <span>{creator || '—'}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-700">{createdAt || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-700">Updated:</span>
                          <span>{updater || '—'}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-700">{updatedAt || '—'}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {isSelected ? 'Open' : 'Select'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="uppercase tracking-wide font-semibold text-[11px] text-gray-500">RACI</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMatrix(matrix.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition text-red-600 hover:text-red-800"
                            aria-label="Delete matrix"
                            title="Delete matrix"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm1 3V4h4v2h-4Zm-1 4a1 1 0 1 1 2 0v7a1 1 0 1 1-2 0v-7Zm6-1a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-7a1 1 0 0 0-1-1Z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              )}
            </div>
            )}

          {routeMatrixId && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/artifacts/raci')}
                className="text-sm text-primary-700 font-semibold hover:text-primary-900"
              >
                ← Back to matrices
              </button>
            </div>
          )}

          <div className="space-y-4">
            {loading && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <p className="text-gray-600">Loading artifacts...</p>
              </div>
            )}

            {!loading && !selectedProjectId && (
              <div className="bg-white rounded-2xl border border-dashed border-primary-200 p-8 shadow-sm text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose a project to get started</h3>
                <p className="text-gray-600 mb-4">Select a project in the Artifacts hub to view and manage its RACI matrices.</p>
                <button
                  onClick={() => navigate('/artifacts')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                >
                  Go to Artifacts hub
                </button>
          </div>
        )}

        {!loading && !routeMatrixId && selectedProjectId && matrices.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matrices yet</h3>
            <p className="text-gray-600 mb-4">Create your first RACI matrix to outline responsibilities.</p>
            <button
              onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                >
                  Create matrix
                </button>
              </div>
            )}

            {routeMatrixId && matrixData && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-sm text-primary-700 font-semibold">RACI Matrix</p>
                        <h2 className="text-2xl font-bold text-gray-900">{matrixData.name}</h2>
                        {matrixData.description && (
                          <p className="text-gray-600 mt-1">{matrixData.description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{matrixData.tasks.length} tasks</span>
                        <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">{matrixData.teamMembers.length} people</span>
                        <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-100">{formatDate(matrices.find((m) => m.id === matrixData.id)?.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2 items-center bg-gray-50 rounded-xl p-2 border border-gray-100 text-xs">
                        {(['R', 'A', 'C', 'I'] as const).map((role) => (
                          <div key={role} className="flex items-center space-x-1.5">
                            <span className={`px-1.5 py-0.5 rounded font-semibold ${RACI_COLORS[role]}`}>{role}</span>
                            <span className="text-gray-600">{roleLabel[role]}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          onClick={() => setShowAddTaskModal(true)}
                          className="px-3.5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold shadow-sm"
                        >
                          Add deliverable
                        </button>
                        <button
                          onClick={() => setShowAddMemberModal(true)}
                          className="px-3.5 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold shadow-sm disabled:opacity-50"
                          disabled={availableTeamMembers.length === 0}
                        >
                          Add member
                        </button>
                        {routeMatrixId && (
                          <button
                            onClick={() => deleteMatrix(routeMatrixId)}
                            className="px-3.5 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold shadow-sm"
                            disabled={loading}
                          >
                            Delete matrix
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2 bg-white/70 border border-gray-100 rounded-lg px-3 py-2">
                      <span className="font-semibold text-gray-800">Created:</span>
                      <span className="text-gray-700">{formatDateTime(matrixData.createdAt) || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/70 border border-gray-100 rounded-lg px-3 py-2">
                      <span className="font-semibold text-gray-800">Last updated:</span>
                      <span className="text-gray-700">{formatDateTime(matrixData.updatedAt) || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/70 border border-gray-100 rounded-lg px-3 py-2">
                      <span className="font-semibold text-gray-800">Created by:</span>
                      <span className="text-gray-700">{matrixData.createdBy?.name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/70 border border-gray-100 rounded-lg px-3 py-2">
                      <span className="font-semibold text-gray-800">Updated by:</span>
                      <span className="text-gray-700">{matrixData.updatedBy?.name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/70 border border-gray-100 rounded-lg px-3 py-2 sm:col-span-2 lg:col-span-4">
                      <span className="font-semibold text-gray-800">Approved by:</span>
                      <span className="text-gray-700">{matrixData.approvedBy?.name || 'Not set'}</span>
                      {matrixData.approvers?.length > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                          <select
                            value={selectedApproverId || matrixData.approvedBy?.id || ''}
                            onChange={(e) => saveApprover(e.target.value)}
                            className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:ring-primary-500 focus:border-primary-500"
                            disabled={loading}
                          >
                            <option value="">Select approver</option>
                            {matrixData.approvers.map((ap) => (
                              <option key={ap.id} value={ap.id}>
                                {ap.name} ({ap.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl shadow-sm border border-gray-100 bg-white p-4">
                  <div className="overflow-x-auto overflow-y-auto max-h-[480px] rounded-xl border border-gray-200 raci-scroll">
                    <table className="min-w-full text-sm table-fixed border-collapse">
                      <thead className="text-xs uppercase tracking-wide sticky top-0 z-10">
                        <tr className="bg-gradient-to-r from-primary-50 via-primary-100 to-secondary-50 text-primary-900 border-b border-gray-200">
                          <th
                            className="relative px-3 py-3 border border-gray-200 text-left font-semibold bg-white/40 backdrop-blur-sm"
                            style={{ width: `${columnWidths.deliverable}px` }}
                          >
                            Deliverable
                            <span
                              className="absolute top-0 right-0 h-full w-3 -mr-1 cursor-col-resize z-10 bg-transparent"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                beginResize('deliverable', e.clientX);
                              }}
                            />
                          </th>
                          <th
                            className="relative px-3 py-3 border border-gray-200 text-left font-semibold bg-white/40 backdrop-blur-sm"
                            style={{ width: `${columnWidths.description}px` }}
                          >
                            Description
                            <span
                              className="absolute top-0 right-0 h-full w-3 -mr-1 cursor-col-resize z-10 bg-transparent"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                beginResize('description', e.clientX);
                              }}
                            />
                          </th>
                          {matrixData.teamMembers.map((member, idx) => {
                          const palette = MEMBER_COLOR_BANDS[idx % MEMBER_COLOR_BANDS.length];
                          return (
                            <th
                              key={member.id}
                              className="px-3 py-2 border border-gray-200 text-center font-semibold align-top w-40"
                            >
                              <div className={`group relative flex flex-col items-center gap-2 rounded-xl bg-gradient-to-br ${palette} border border-gray-100/60 shadow-xs px-3 py-2`}>
                                <button
                                  onClick={() => removeTeamMemberColumn(member.id)}
                                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white/80 text-red-700 border border-red-100 hover:bg-red-50 shadow-sm flex items-center justify-center text-sm font-bold transition opacity-0 group-hover:opacity-100"
                                  aria-label="Remove member column"
                                  title="Remove member column"
                                >
                                  ×
                                </button>
                                <div className="w-10 h-10 rounded-full bg-white border border-white/70 flex items-center justify-center text-primary-700 font-bold shadow-sm">
                                  {initials(member.displayName || member.fullName)}
                                </div>
                                <div className="text-xs text-gray-700 text-center leading-tight break-words break-all whitespace-normal">
                                  <div className="font-semibold text-gray-900 break-words break-all whitespace-normal">{member.displayName || member.fullName}</div>
                                  <div className="text-[11px] uppercase tracking-wide text-gray-600 break-words break-all whitespace-normal">{member.designationRole}</div>
                                </div>
                              </div>
                            </th>
                          );
                        })}
                        <th className="px-3 py-3 border border-gray-200 text-center font-semibold bg-white/40 backdrop-blur-sm w-28">Actions</th>
                      </tr>
                      </thead>
                      <tbody>
                        {matrixData.tasks.length === 0 && (
                          <tr>
                            <td
                              colSpan={4 + matrixData.teamMembers.length}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No tasks yet. Add a task to start assigning RACI roles.
                            </td>
                          </tr>
                        )}

                        {matrixData.tasks.map((task) => (
                          <tr
                            key={task.rowOrder}
                            className="odd:bg-white even:bg-gray-50/60"
                          >
                            <td
                              className="px-3 py-3 border border-gray-200 text-gray-900 font-semibold align-top whitespace-normal break-words break-all"
                              style={{ width: `${columnWidths.deliverable}px` }}
                            >
                              {task.taskName}
                            </td>
                            <td
                              className="px-3 py-3 border border-gray-200 text-gray-600 align-top whitespace-normal break-words break-all"
                              style={{ width: `${columnWidths.description}px` }}
                            >
                              {task.taskDescription || '-'}
                            </td>
                            {matrixData.teamMembers.map((member) => {
                              const role = matrixData.raciGrid[task.rowOrder]?.[member.id] || '';
                              return (
                                <td
                                  key={member.id}
                                  className={`px-3 py-3 border border-gray-200 text-center w-40 align-top transition-colors ${
                                    role ? RACI_CELL_BG[role as keyof typeof RACI_CELL_BG] : ''
                                  }`}
                                >
                                  <button
                                    onClick={() => setRaci(task.rowOrder, member.id, role)}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow ${
                                      role
                                        ? RACI_COLORS[role as keyof typeof RACI_COLORS]
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                  >
                                    {role || 'Set'}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-3 py-3 border border-gray-200 text-center w-28 align-top">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openEditTask(task)}
                                  className="text-sm text-primary-700 hover:text-primary-900 font-semibold"
                                >
                                  Edit
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => deleteTask(task.rowOrder)}
                                  className="text-sm text-red-600 hover:text-red-800 font-semibold"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full border border-gray-100">
              <h3 className="text-xl font-bold mb-4">Create New RACI Matrix</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matrix Name *</label>
                  <input
                    type="text"
                    value={newMatrixName}
                    onChange={(e) => setNewMatrixName(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Project Launch RACI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newMatrixDescription}
                    onChange={(e) => setNewMatrixDescription(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewMatrixName('');
                    setNewMatrixDescription('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={createMatrix}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  disabled={loading}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddTaskModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full border border-gray-100">
              <h3 className="text-xl font-bold mb-4">Add New Deliverable</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deliverable *</label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    maxLength={TASK_NAME_LIMIT}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Design wireframes"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    maxLength={TASK_DESC_LIMIT}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddTaskModal(false);
                    setNewTaskName('');
                    setNewTaskDescription('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={addTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={loading}
                >
                  Add Deliverable
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditTaskModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full border border-gray-100">
              <h3 className="text-xl font-bold mb-4">Edit Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
                  <input
                    type="text"
                    value={editTaskName}
                    onChange={(e) => setEditTaskName(e.target.value)}
                    maxLength={TASK_NAME_LIMIT}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Task name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editTaskDescription}
                    onChange={(e) => setEditTaskDescription(e.target.value)}
                    maxLength={TASK_DESC_LIMIT}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditTaskModal(false);
                    setEditingRowOrder(null);
                    setEditTaskName('');
                    setEditTaskDescription('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={updateTask}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  disabled={loading}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full border border-gray-100">
              <h3 className="text-xl font-bold mb-4">Add Member</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    id="add-external"
                    type="checkbox"
                    checked={addingExternal}
                    onChange={(e) => {
                      setAddingExternal(e.target.checked);
                      setSelectedMemberId('');
                    }}
                  />
                  <label htmlFor="add-external" className="text-sm text-gray-700">Add external stakeholder</label>
                </div>

                {!addingExternal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select member</label>
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">-- Select a team member --</option>
                      {availableTeamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.fullName} ({member.designationRole})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {addingExternal && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={externalName}
                        onChange={(e) => setExternalName(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        placeholder="External stakeholder name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                      <input
                        type="email"
                        value={externalEmail}
                        onChange={(e) => setExternalEmail(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSelectedMemberId('');
                    setExternalName('');
                    setExternalEmail('');
                    setAddingExternal(false);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={addTeamMemberColumn}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  disabled={loading}
                >
                  Add member
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}








