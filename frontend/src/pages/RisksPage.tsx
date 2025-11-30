import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { risksApi } from '../services/api/risks';

type RiskImpact = 'LOW' | 'MEDIUM' | 'HIGH';
type RiskLikelihood = 'LOW' | 'MEDIUM' | 'HIGH';
type RiskStatus = 'OPEN' | 'MONITORING' | 'MITIGATED' | 'CLOSED';

interface Risk {
  id: string;
  title: string;
  description?: string;
  rationale?: string;
  impact: RiskImpact;
  likelihood: RiskLikelihood;
  status: RiskStatus;
  owner?: {
    id: string;
    fullName: string;
    designationRole: string;
  };
  dueDate?: string;
  category?: string;
  mitigationPlan?: string;
  contingencyPlan?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
  updatedBy?: { id: string; name: string };
}

const IMPACT_COLORS: Record<RiskImpact, string> = {
  LOW: 'bg-teal-50 text-teal-800 border border-teal-100',
  MEDIUM: 'bg-amber-50 text-amber-800 border border-amber-100',
  HIGH: 'bg-rose-50 text-rose-800 border border-rose-100',
};

const STATUS_COLORS: Record<RiskStatus, string> = {
  OPEN: 'bg-teal-50 text-teal-800 border border-teal-100',
  MONITORING: 'bg-cyan-50 text-cyan-800 border border-cyan-100',
  MITIGATED: 'bg-emerald-50 text-emerald-800 border border-emerald-100',
  CLOSED: 'bg-gray-50 text-gray-800 border border-gray-100',
};

const impactWeight: Record<RiskImpact, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
const likelihoodWeight: Record<RiskLikelihood, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

const scoreColor = (score: number) => {
  if (score >= 7) return 'bg-rose-500 text-white';
  if (score >= 4) return 'bg-amber-400 text-gray-900';
  return 'bg-emerald-500 text-white';
};

const strategyLabel: Record<RiskStatus, string> = {
  OPEN: 'Mitigate',
  MONITORING: 'Monitor',
  MITIGATED: 'Reduce',
  CLOSED: 'Accept',
};

const formatDate = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function RisksPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Risk>>({
    impact: 'MEDIUM',
    likelihood: 'MEDIUM',
    status: 'OPEN',
  });
  const [inlineRow, setInlineRow] = useState<Partial<Risk>>({
    title: '',
    description: '',
    contingencyPlan: '',
    mitigationPlan: '',
    impact: 'MEDIUM',
    likelihood: 'MEDIUM',
    status: 'OPEN',
    tags: [],
    category: '',
  });

  useEffect(() => {
    if (selectedProjectId) {
      fetchRisks();
    } else {
      setRisks([]);
    }
  }, [selectedProjectId]);

  const fetchRisks = async () => {
    if (!selectedProjectId) return;
    try {
      setLoading(true);
      const data = await risksApi.getByProject(selectedProjectId);
      setRisks(data);
    } catch (err: any) {
      setError('Failed to fetch risks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      impact: 'MEDIUM',
      likelihood: 'MEDIUM',
      status: 'OPEN',
    });
    setEditMode(false);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (risk: Risk) => {
    setForm({
      ...risk,
      owner: risk.owner,
    });
    setEditMode(true);
    setShowCreateModal(true);
  };

  const saveRisk = async () => {
    if (!selectedProjectId) {
      setError('Select a project first');
      return;
    }
    if (!form.title?.trim()) {
      setError('Title is required');
      return;
    }
    const payload: any = {
      projectId: selectedProjectId,
      title: form.title,
      description: form.description,
      impact: form.impact,
      likelihood: form.likelihood,
      status: form.status,
      ownerId: form.owner?.id || undefined,
      dueDate: form.dueDate,
      category: form.category,
      mitigationPlan: form.mitigationPlan,
      contingencyPlan: form.contingencyPlan,
      tags: form.tags,
    };
    try {
      setLoading(true);
      if (editMode && form.id) {
        await risksApi.update(form.id, payload);
      } else {
        await risksApi.create(payload);
      }
      await fetchRisks();
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save risk');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteRisk = async (id: string) => {
    if (!confirm('Delete this risk?')) return;
    try {
      setLoading(true);
      await risksApi.delete(id);
      await fetchRisks();
    } catch (err: any) {
      setError(err.message || 'Failed to delete risk');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveInlineRow = async () => {
    if (!selectedProjectId) {
      setError('Select a project first');
      return;
    }
    if (!inlineRow.title?.trim()) {
      setError('Title is required');
      return;
    }
    const payload: any = {
      projectId: selectedProjectId,
      title: inlineRow.title,
      description: inlineRow.description,
      impact: inlineRow.impact || 'MEDIUM',
      likelihood: inlineRow.likelihood || 'MEDIUM',
      status: inlineRow.status || 'OPEN',
      category: inlineRow.category,
      mitigationPlan: inlineRow.mitigationPlan,
      contingencyPlan: inlineRow.contingencyPlan,
      tags: inlineRow.tags && inlineRow.tags.length > 0 ? inlineRow.tags : inlineRow.tags?.length === 0 ? [] : [],
      ownerId: inlineRow.owner?.id,
    };
    try {
      setLoading(true);
      await risksApi.create(payload);
      await fetchRisks();
      setInlineRow({
        title: '',
        description: '',
        contingencyPlan: '',
        mitigationPlan: '',
        impact: 'MEDIUM',
        likelihood: 'MEDIUM',
        status: 'OPEN',
        tags: [],
        category: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save risk');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-xl border border-teal-200 bg-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 bg-teal-600 text-white">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/80">Risk Register</p>
              <h1 className="text-2xl font-semibold">Project risk log</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/artifacts')}
                className="px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/30 hover:bg-white/20 transition"
              >
                Back to Artifacts
              </button>
              {selectedProjectId && (
                <button
                  onClick={openCreate}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-teal-800 hover:bg-emerald-50 border border-white/70"
                >
                  Add risk
                </button>
              )}
            </div>
          </div>
          <div className="px-4 py-3 text-sm text-gray-700 bg-teal-50 border-t border-teal-100">
            Capture risks in a single table. Headers stay pinned and the section scrolls internally to keep the layout steady.
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-sm">
            <div>{error}</div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800 font-semibold">Dismiss</button>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-4">
            {loading && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <p className="text-gray-600">Loading risks...</p>
              </div>
            )}

            {!loading && !selectedProjectId && (
              <div className="bg-white rounded-2xl border border-dashed border-teal-200 p-8 shadow-sm text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose a project to get started</h3>
                <p className="text-gray-600 mb-4">Select a project in the Artifacts hub to view and manage its risks.</p>
                <button
                  onClick={() => navigate('/artifacts')}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700"
                >
                  Go to Artifacts hub
                </button>
              </div>
            )}

            {!loading && selectedProjectId && risks.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No risks yet</h3>
                <p className="text-gray-600 mb-4">Add your first risk to start tracking.</p>
                <button
                  onClick={openCreate}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700"
                >
                  Add risk
                </button>
              </div>
            )}

            {selectedProjectId && risks.length > 0 && (
              <div className="bg-white rounded-2xl border border-teal-100 shadow-sm">
                <div className="overflow-x-auto">
                  <div className="max-h-[70vh] overflow-auto">
                    <table className="min-w-[1200px] table-fixed text-xs text-gray-800">
                      <thead className="sticky top-0 z-20">
                        <tr className="bg-teal-700 text-white">
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-24 bg-teal-700">Status</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-12 bg-teal-700">ID</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-28 bg-teal-700">Type</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-32 bg-teal-700">Category</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-44 bg-teal-700">Title</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-72 bg-teal-700">Risk Statement</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-64 bg-teal-700">Current status/assumptions</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-24 bg-teal-700">Probability</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-24 bg-teal-700">Cost Impact</th>
                          <th className="sticky top-0 px-3 py-3 text-center font-semibold border-b border-teal-800 w-20 bg-teal-700">Cost Score</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-24 bg-teal-700">Time Impact</th>
                          <th className="sticky top-0 px-3 py-3 text-center font-semibold border-b border-teal-800 w-20 bg-teal-700">Time Score</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-64 bg-teal-700">Rationale</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-28 bg-teal-700">Strategy</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-64 bg-teal-700">Response Actions</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-40 bg-teal-700">Risk Owner</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-28 bg-teal-700">Updated</th>
                          <th className="sticky top-0 px-3 py-3 text-left font-semibold border-b border-teal-800 w-20 bg-teal-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {risks.map((risk, index) => {
                          const score = (impactWeight[risk.impact] || 1) * (likelihoodWeight[risk.likelihood] || 1);
                          return (
                            <tr key={risk.id} className="odd:bg-white even:bg-teal-50/40 align-top">
                              <td className="px-3 py-3 border-b border-teal-50">
                                <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${STATUS_COLORS[risk.status]}`}>
                                  {risk.status}
                                </span>
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 text-gray-700 font-semibold">{index + 1}</td>
                              <td className="px-3 py-3 border-b border-teal-50 break-words">{risk.tags?.[0] || '—'}</td>
                              <td className="px-3 py-3 border-b border-teal-50 break-words">{risk.category || '—'}</td>
                              <td className="px-3 py-3 border-b border-teal-50 break-words font-semibold text-gray-900">{risk.title}</td>
                              <td className="px-3 py-3 border-b border-teal-50 whitespace-pre-wrap break-words">
                                {risk.description || '—'}
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 whitespace-pre-wrap break-words">
                                {risk.contingencyPlan || '—'}
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 text-gray-800">
                                <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-1 font-semibold border border-teal-100">
                                  {risk.likelihood}
                                </span>
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 text-gray-800">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 font-semibold ${IMPACT_COLORS[risk.impact]}`}>
                                  {risk.impact}
                                </span>
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 text-center">
                                <span className={`inline-flex h-7 w-7 items-center justify-center rounded ${scoreColor(score)}`}>
                                  {score}
                                </span>
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 text-gray-800">
                                <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-1 font-semibold border border-teal-100">
                                  {risk.likelihood}
                                </span>
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 text-center">
                                <span className={`inline-flex h-7 w-7 items-center justify-center rounded ${scoreColor(score)}`}>
                                  {score}
                                </span>
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 whitespace-pre-wrap break-words">
                                {risk.mitigationPlan || '—'}
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 whitespace-pre-wrap break-words font-semibold text-gray-900">
                                {strategyLabel[risk.status]}
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 whitespace-pre-wrap break-words">
                                {risk.mitigationPlan || '—'}
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 whitespace-pre-wrap break-words">
                                {risk.owner?.fullName || '—'}
                              </td>
                              <td className="px-3 py-3 border-b border-teal-50 text-gray-700">{formatDate(risk.updatedAt) || '—'}</td>
                              <td className="px-3 py-3 border-b border-teal-50">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEdit(risk);
                                    }}
                                    className="text-xs text-teal-700 hover:text-teal-900 font-semibold"
                                  >
                                    Edit
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteRisk(risk.id);
                                    }}
                                    className="text-xs text-red-600 hover:text-red-800 font-semibold"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-teal-50/60 border-t border-teal-100">
                          <td className="px-3 py-3">
                            <select
                              value={inlineRow.status}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, status: e.target.value as RiskStatus }))}
                              className="w-full rounded border border-teal-200 text-xs text-gray-800"
                            >
                              <option value="OPEN">Open</option>
                              <option value="MONITORING">Monitoring</option>
                              <option value="MITIGATED">Mitigated</option>
                              <option value="CLOSED">Closed</option>
                            </select>
                          </td>
                          <td className="px-3 py-3 text-gray-500 font-semibold">New</td>
                          <td className="px-3 py-3">
                            <input
                              value={inlineRow.tags?.[0] || ''}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, tags: [e.target.value] }))}
                              className="w-full rounded border border-teal-200 text-xs"
                              placeholder="Type"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              value={inlineRow.category || ''}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, category: e.target.value }))}
                              className="w-full rounded border border-teal-200 text-xs"
                              placeholder="Category"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              value={inlineRow.title || ''}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full rounded border border-teal-200 text-xs"
                              placeholder="Title"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <textarea
                              value={inlineRow.description || ''}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full rounded border border-teal-200 text-xs"
                              rows={2}
                              placeholder="Risk statement"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <textarea
                              value={inlineRow.contingencyPlan || ''}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, contingencyPlan: e.target.value }))}
                              className="w-full rounded border border-teal-200 text-xs"
                              rows={2}
                              placeholder="Current status / assumptions"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={inlineRow.likelihood}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, likelihood: e.target.value as RiskLikelihood }))}
                              className="w-full rounded border border-teal-200 text-xs"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Moderate</option>
                              <option value="HIGH">High</option>
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={inlineRow.impact}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, impact: e.target.value as RiskImpact }))}
                              className="w-full rounded border border-teal-200 text-xs"
                            >
                              <option value="LOW">Very Low</option>
                              <option value="MEDIUM">Moderate</option>
                              <option value="HIGH">High</option>
                            </select>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-600 font-semibold">—</td>
                          <td className="px-3 py-3">
                            <select
                              value={inlineRow.likelihood}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, likelihood: e.target.value as RiskLikelihood }))}
                              className="w-full rounded border border-teal-200 text-xs"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Moderate</option>
                              <option value="HIGH">High</option>
                            </select>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-600 font-semibold">—</td>
                          <td className="px-3 py-3">
                            <textarea
                              value={inlineRow.mitigationPlan || ''}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, mitigationPlan: e.target.value }))}
                              className="w-full rounded border border-teal-200 text-xs"
                              rows={2}
                              placeholder="Rationale"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={inlineRow.status}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, status: e.target.value as RiskStatus }))}
                              className="w-full rounded border border-teal-200 text-xs"
                            >
                              <option value="OPEN">Mitigate</option>
                              <option value="MONITORING">Monitor</option>
                              <option value="MITIGATED">Reduce</option>
                              <option value="CLOSED">Accept</option>
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <textarea
                              value={inlineRow.mitigationPlan || ''}
                              onChange={(e) => setInlineRow(prev => ({ ...prev, mitigationPlan: e.target.value }))}
                              className="w-full rounded border border-teal-200 text-xs"
                              rows={2}
                              placeholder="Response actions"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              value={inlineRow.owner?.fullName || ''}
                              onChange={(e) =>
                                setInlineRow(prev => ({
                                  ...prev,
                                  owner: e.target.value ? { id: prev.owner?.id || '', fullName: e.target.value } as any : undefined,
                                }))
                              }
                              className="w-full rounded border border-teal-200 text-xs"
                              placeholder="Risk owner name"
                            />
                          </td>
                          <td className="px-3 py-3 text-gray-600">—</td>
                          <td className="px-3 py-3">
                            <button
                              onClick={saveInlineRow}
                              className="px-3 py-2 bg-teal-600 text-white rounded-md text-xs font-semibold hover:bg-teal-700"
                              disabled={loading}
                            >
                              Add
                            </button>
                          </td>
                        </tr>
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
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-xl w-full border border-gray-100">
              <h3 className="text-xl font-bold mb-4">{editMode ? 'Edit Risk' : 'Create Risk'}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={form.title || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
                  <select
                    value={form.impact || 'MEDIUM'}
                    onChange={(e) => setForm(prev => ({ ...prev, impact: e.target.value as RiskImpact }))}
                    className="w-full border-gray-300 rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Likelihood</label>
                  <select
                    value={form.likelihood || 'MEDIUM'}
                    onChange={(e) => setForm(prev => ({ ...prev, likelihood: e.target.value as RiskLikelihood }))}
                    className="w-full border-gray-300 rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status || 'OPEN'}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as RiskStatus }))}
                    className="w-full border-gray-300 rounded-lg"
                  >
                    <option value="OPEN">Open</option>
                    <option value="MONITORING">Monitoring</option>
                    <option value="MITIGATED">Mitigated</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner (optional)</label>
                  <input
                    type="text"
                    placeholder="Owner ID (UUID)"
                    value={form.owner?.id || ''}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      owner: e.target.value ? { id: e.target.value } as any : undefined,
                    }))}
                    className="w-full border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                  <input
                    type="date"
                    value={form.dueDate?.slice(0, 10) || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={form.category || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border-gray-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mitigation plan</label>
                  <textarea
                    value={form.mitigationPlan || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, mitigationPlan: e.target.value }))}
                    className="w-full border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contingency plan</label>
                  <textarea
                    value={form.contingencyPlan || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, contingencyPlan: e.target.value }))}
                    className="w-full border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRisk}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  disabled={loading}
                >
                  {editMode ? 'Save changes' : 'Create risk'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
