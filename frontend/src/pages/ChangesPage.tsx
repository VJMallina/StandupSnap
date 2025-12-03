import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { changesApi } from '../services/api/changes';
import { teamMembersApi } from '../services/api/teamMembers';
import { Change, CreateChangeInput, UpdateChangeInput, ChangeType, ChangePriority, ChangeStatus } from '../types/change';
import { TeamMember } from '../types/teamMember';

export default function ChangesPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();
  const [changes, setChanges] = useState<Change[]>([]);
  const [archivedChanges, setArchivedChanges] = useState<Change[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ChangeStatus | ''>('');
  const [filterType, setFilterType] = useState<ChangeType | ''>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }
    fetchData();
  }, [selectedProjectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [active, archived, members] = await Promise.all([
        changesApi.getByProject(selectedProjectId!, false),
        changesApi.getByProject(selectedProjectId!, true),
        teamMembersApi.getProjectTeam(selectedProjectId!),
      ]);
      setChanges(active);
      setArchivedChanges(archived.filter((c) => c.isArchived));
      setTeamMembers(members.filter(m => !m.id.startsWith('user-')));
    } catch (err: any) {
      setError(err.message || 'Failed to load changes');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormMode('create');
    setSelectedChange(null);
    setIsFormOpen(true);
  };

  const handleEdit = (change: Change) => {
    setFormMode('edit');
    setSelectedChange(change);
    setIsFormOpen(true);
    setIsDetailOpen(false);
  };

  const handleView = (change: Change) => {
    setSelectedChange(change);
    setIsDetailOpen(true);
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('Archive this change?')) return;
    try {
      await changesApi.archive(id);
      await fetchData();
      setIsDetailOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to archive');
    }
  };

  const filteredChanges = changes.filter(c => {
    const matchSearch = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filterStatus || c.status === filterStatus;
    const matchType = !filterType || c.changeType === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const getStatusColor = (status: ChangeStatus) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
      PENDING_APPROVAL: 'bg-amber-100 text-amber-700 border-amber-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
      IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
      IMPLEMENTED: 'bg-teal-100 text-teal-700 border-teal-200',
      CLOSED: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[status] || colors.DRAFT;
  };

  const getPriorityColor = (priority: ChangePriority) => {
    const colors = {
      LOW: 'bg-blue-50 text-blue-600',
      MEDIUM: 'bg-yellow-50 text-yellow-600',
      HIGH: 'bg-orange-50 text-orange-600',
      CRITICAL: 'bg-red-50 text-red-600',
    };
    return colors[priority] || colors.MEDIUM;
  };

  if (!selectedProjectId) {
    return (
      <AppLayout>
        <ArtifactsNavigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl inline-block">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">No Project Selected</h2>
            <p className="text-gray-600">Please select a project from the Artifacts Hub to view and manage changes.</p>
            <button onClick={() => navigate('/artifacts')} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold">
              Go to Artifacts Hub
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ArtifactsNavigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
        <div className="max-w-7xl mx-auto p-8 space-y-8">
          <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">Change Management</span>
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Change Log</h1>
              <p className="text-gray-600 text-base">Track and manage project changes with approval workflows</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => changesApi.exportCsv(selectedProjectId)} className="px-5 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-all flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <button onClick={handleAdd} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 font-bold">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                New Change
              </button>
            </div>
          </header>

          <section className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="col-span-2 relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="Search changes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-3 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400 transition-all" />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ChangeStatus | '')} className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                <option value="">All Statuses</option>
                <option value={ChangeStatus.DRAFT}>Draft</option>
                <option value={ChangeStatus.PENDING_APPROVAL}>Pending Approval</option>
                <option value={ChangeStatus.APPROVED}>Approved</option>
                <option value={ChangeStatus.REJECTED}>Rejected</option>
                <option value={ChangeStatus.IN_PROGRESS}>In Progress</option>
                <option value={ChangeStatus.IMPLEMENTED}>Implemented</option>
                <option value={ChangeStatus.CLOSED}>Closed</option>
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as ChangeType | '')} className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                <option value="">All Types</option>
                <option value={ChangeType.STANDARD}>Standard</option>
                <option value={ChangeType.MINOR}>Minor</option>
                <option value={ChangeType.MAJOR}>Major</option>
                <option value={ChangeType.EMERGENCY}>Emergency</option>
              </select>
            </div>
          </section>

          {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-xl p-4 shadow-lg font-medium">{error}</div>}

          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div></div>
          ) : filteredChanges.length === 0 ? (
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No changes found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredChanges.map((change) => (
                <article key={change.id} className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl border-2 border-gray-100 hover:border-purple-300 transition-all duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-900">{change.title}</h3>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(change.status)}`}>{change.status.replace(/_/g, ' ')}</span>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getPriorityColor(change.priority)}`}>{change.priority}</span>
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200">{change.changeType}</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{change.description}</p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        {change.requestor && (
                          <div className="flex items-center gap-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium">{change.requestor.fullName || change.requestor.displayName}</span>
                          </div>
                        )}
                        {change.implementationDate && (
                          <div className="flex items-center gap-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(change.implementationDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleView(change)} className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all opacity-0 group-hover:opacity-100">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {showArchived && archivedChanges.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-700">Archived Changes</h2>
              <div className="grid grid-cols-1 gap-4 opacity-60">
                {archivedChanges.map((change) => (
                  <article key={change.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-700">{change.title}</h3>
                        <p className="text-sm text-gray-500">{change.status}</p>
                      </div>
                      <button onClick={() => handleView(change)} className="text-gray-500 hover:text-gray-700">View</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isFormOpen && <ChangeFormModal mode={formMode} change={selectedChange} teamMembers={teamMembers} projectId={selectedProjectId!} onClose={() => setIsFormOpen(false)} onSuccess={fetchData} />}
      {isDetailOpen && selectedChange && <ChangeDetailPanel change={selectedChange} onClose={() => setIsDetailOpen(false)} onEdit={handleEdit} onArchive={handleArchive} />}
    </AppLayout>
  );
}

function ChangeFormModal({ mode, change, teamMembers, projectId, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState<any>({
    title: change?.title || '',
    description: change?.description || '',
    changeType: change?.changeType || ChangeType.STANDARD,
    priority: change?.priority || ChangePriority.MEDIUM,
    status: change?.status || ChangeStatus.DRAFT,
    impactAssessment: change?.impactAssessment || '',
    rollbackPlan: change?.rollbackPlan || '',
    testingRequirements: change?.testingRequirements || '',
    affectedSystems: change?.affectedSystems?.join(', ') || '',
    implementationDate: change?.implementationDate || '',
    implementationWindow: change?.implementationWindow || '',
    requestorId: change?.requestorId || '',
    approverId: change?.approverId || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title.trim()) return alert('Title is required');
    if (!formData.description.trim()) return alert('Description is required');
    setSaving(true);
    try {
      const payload: any = {
        ...formData,
        projectId,
        // Parse affected systems - only include if not empty
        affectedSystems: formData.affectedSystems
          ? formData.affectedSystems.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          : undefined,
      };
      if (mode === 'create') {
        await changesApi.create(payload);
      } else {
        await changesApi.update(change.id, payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900">{mode === 'create' ? 'New Change' : 'Edit Change'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Title *</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
              <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
              <select value={formData.changeType} onChange={(e) => setFormData({ ...formData, changeType: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500">
                <option value={ChangeType.STANDARD}>Standard</option>
                <option value={ChangeType.MINOR}>Minor</option>
                <option value={ChangeType.MAJOR}>Major</option>
                <option value={ChangeType.EMERGENCY}>Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500">
                <option value={ChangePriority.LOW}>Low</option>
                <option value={ChangePriority.MEDIUM}>Medium</option>
                <option value={ChangePriority.HIGH}>High</option>
                <option value={ChangePriority.CRITICAL}>Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500">
                <option value={ChangeStatus.DRAFT}>Draft</option>
                <option value={ChangeStatus.PENDING_APPROVAL}>Pending Approval</option>
                <option value={ChangeStatus.APPROVED}>Approved</option>
                <option value={ChangeStatus.REJECTED}>Rejected</option>
                <option value={ChangeStatus.IN_PROGRESS}>In Progress</option>
                <option value={ChangeStatus.IMPLEMENTED}>Implemented</option>
                <option value={ChangeStatus.CLOSED}>Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Requestor</label>
              <select value={formData.requestorId} onChange={(e) => setFormData({ ...formData, requestorId: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500">
                <option value="">Select requestor</option>
                {teamMembers.map((m: TeamMember) => <option key={m.id} value={m.id}>{m.fullName || m.displayName}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onClose} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Change'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangeDetailPanel({ change, onClose, onEdit, onArchive }: any) {
  return (
    <>
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Change Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Title</p>
            <p className="text-lg font-semibold text-gray-900">{change.title}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{change.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Type</p>
              <p className="text-sm font-semibold text-gray-900">{change.changeType}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Priority</p>
              <p className="text-sm font-semibold text-gray-900">{change.priority}</p>
            </div>
          </div>
          {!change.isArchived && (
            <div className="flex gap-3 pt-4 border-t">
              <button onClick={() => onEdit(change)} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">Edit</button>
              <button onClick={() => onArchive(change.id)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Archive</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
