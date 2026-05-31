import { useState, useEffect } from 'react';
import { workflowApi } from '../../services/api/workflow';
import { WorkflowTemplate, WorkflowLane, LaneType, TransitionMode } from '../../types/card';

interface WorkflowSettingsProps {
  projectId: string;
  canEdit: boolean;
}

const LANE_TYPE_OPTIONS = [
  { value: LaneType.TODO, label: 'To Do', description: 'Not yet started', color: 'text-gray-600 bg-gray-100' },
  { value: LaneType.ACTIVE, label: 'Active', description: 'Work in progress', color: 'text-blue-600 bg-blue-100' },
  { value: LaneType.DONE, label: 'Done', description: 'Completed work', color: 'text-green-600 bg-green-100' },
];

const PRESET_COLORS = [
  '#6B7280', '#3B82F6', '#8B5CF6', '#10B981',
  '#F59E0B', '#EF4444', '#EC4899', '#06B6D4',
  '#84CC16', '#F97316', '#6366F1', '#14B8A6',
];

const TRANSITION_MODE_OPTIONS = [
  {
    value: TransitionMode.FREE,
    label: 'Free',
    description: 'Cards can jump to any lane regardless of order',
    color: '#8b5cf6',
    activeClass: 'border-violet-500 bg-violet-50',
    dotClass: 'bg-violet-500',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    value: TransitionMode.SEQUENTIAL,
    label: 'Sequential',
    description: 'One step at a time — forward or back',
    color: '#3b82f6',
    activeClass: 'border-blue-500 bg-blue-50',
    dotClass: 'bg-blue-500',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12m-12 0l4-4m-4 4l4 4" />
      </svg>
    ),
  },
  {
    value: TransitionMode.FORWARD,
    label: 'Forward Only',
    description: 'Cards can only advance, never go back',
    color: '#10b981',
    activeClass: 'border-emerald-500 bg-emerald-50',
    dotClass: 'bg-emerald-500',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    ),
  },
];

interface LaneFormState {
  name: string;
  color: string;
  laneType: LaneType;
  isFinalLane: boolean;
}

const DEFAULT_FORM: LaneFormState = {
  name: '',
  color: '#6B7280',
  laneType: LaneType.TODO,
  isFinalLane: false,
};

// ─── Flowchart ───────────────────────────────────────────────────────────────

const BOX_W = 110;
const BOX_H = 52;
const GAP = 40;
const EXTRA_TOP = 30;
const SVG_H = EXTRA_TOP + BOX_H + 8;
const AH = 6; // arrowhead half-width

const MODE_COLOR: Record<TransitionMode, string> = {
  [TransitionMode.FREE]: '#8b5cf6',
  [TransitionMode.SEQUENTIAL]: '#3b82f6',
  [TransitionMode.FORWARD]: '#10b981',
};

function WorkflowFlowChart({ lanes, mode }: { lanes: WorkflowLane[]; mode: TransitionMode }) {
  if (lanes.length === 0) return null;

  const svgW = lanes.length * (BOX_W + GAP) - GAP;
  const color = MODE_COLOR[mode];
  const bx = (i: number) => i * (BOX_W + GAP);
  const arrowY = EXTRA_TOP + BOX_H / 2;

  const renderArrow = (i: number) => {
    const x1 = bx(i) + BOX_W + 4;
    const x2 = bx(i + 1) - 4;
    const y = arrowY;

    if (mode === TransitionMode.FORWARD) {
      return (
        <g key={`a${i}`}>
          <line x1={x1} y1={y} x2={x2 - AH * 1.4} y2={y} stroke={color} strokeWidth={1.5} />
          <polygon points={`${x2},${y} ${x2 - AH * 1.4},${y - AH * 0.75} ${x2 - AH * 1.4},${y + AH * 0.75}`} fill={color} />
        </g>
      );
    }
    // SEQUENTIAL and FREE: bidirectional
    return (
      <g key={`a${i}`}>
        <line x1={x1 + AH * 1.4} y1={y} x2={x2 - AH * 1.4} y2={y} stroke={color} strokeWidth={1.5} />
        <polygon points={`${x2},${y} ${x2 - AH * 1.4},${y - AH * 0.75} ${x2 - AH * 1.4},${y + AH * 0.75}`} fill={color} />
        <polygon points={`${x1},${y} ${x1 + AH * 1.4},${y - AH * 0.75} ${x1 + AH * 1.4},${y + AH * 0.75}`} fill={color} />
      </g>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl bg-gray-50/70 border border-gray-100 p-4">
      <svg width={svgW} height={SVG_H} viewBox={`0 0 ${svgW} ${SVG_H}`} style={{ minWidth: svgW }}>
        {/* FREE mode: dashed skip arc above all lanes */}
        {mode === TransitionMode.FREE && lanes.length > 2 && (() => {
          const startX = bx(0) + BOX_W / 2;
          const endX = bx(lanes.length - 1) + BOX_W / 2;
          const midX = (startX + endX) / 2;
          return (
            <path
              d={`M ${startX},${EXTRA_TOP} Q ${midX},5 ${endX},${EXTRA_TOP}`}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="5,3"
              fill="none"
              opacity={0.45}
            />
          );
        })()}

        {/* Lane boxes */}
        {lanes.map((lane, i) => {
          const x = bx(i);
          const headerH = 18;
          // Rounded-top-corners path for the color header
          const headerPath = `M 8,0 L ${BOX_W - 8},0 Q ${BOX_W},0 ${BOX_W},8 L ${BOX_W},${headerH} L 0,${headerH} L 0,8 Q 0,0 8,0 Z`;
          const nameText = lane.name.length > 13 ? lane.name.slice(0, 12) + '…' : lane.name;

          return (
            <g key={lane.id} transform={`translate(${x}, ${EXTRA_TOP})`}>
              {/* Box outline */}
              <rect width={BOX_W} height={BOX_H} rx={8} fill="white" stroke={lane.color} strokeWidth={1.5} />
              {/* Color header */}
              <path d={headerPath} fill={lane.color} />
              {/* Lane name */}
              <text x={BOX_W / 2} y={headerH + 20} textAnchor="middle" fontSize={11} fontWeight="600" fill="#1f2937" fontFamily="system-ui, sans-serif">
                {nameText}
              </text>
              {/* Final badge */}
              {lane.isFinalLane && (
                <text x={BOX_W / 2} y={BOX_H - 5} textAnchor="middle" fontSize={9} fill="#6b7280" fontFamily="system-ui, sans-serif">
                  ✓ final
                </text>
              )}
            </g>
          );
        })}

        {/* Arrows between adjacent lanes */}
        {lanes.slice(0, -1).map((_, i) => renderArrow(i))}
      </svg>

      {/* Mode legend */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs text-gray-500">
          {mode === TransitionMode.FREE && 'Any lane is reachable — cards can skip steps freely'}
          {mode === TransitionMode.SEQUENTIAL && 'Cards move one step forward or back — no skipping'}
          {mode === TransitionMode.FORWARD && 'Cards can only advance to the next lane — no going back'}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkflowSettings({ projectId, canEdit }: WorkflowSettingsProps) {
  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingLaneId, setEditingLaneId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LaneFormState>(DEFAULT_FORM);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<LaneFormState>(DEFAULT_FORM);

  // Live preview mode — updates the chart instantly without saving
  const [previewMode, setPreviewMode] = useState<TransitionMode>(TransitionMode.FREE);

  useEffect(() => { loadWorkflow(); }, [projectId]);

  // Sync preview mode when workflow loads (only on new workflow id, not on lane edits)
  useEffect(() => {
    if (workflow) setPreviewMode(workflow.transitionMode ?? TransitionMode.FREE);
  }, [workflow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);
      const wf = await workflowApi.getDefaultWorkflow(projectId);
      setWorkflow(wf);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const sortedLanes = workflow
    ? [...workflow.lanes].sort((a, b) => a.order - b.order)
    : [];

  const modeChanged = workflow != null && previewMode !== (workflow.transitionMode ?? TransitionMode.FREE);

  const handleSaveTransitionMode = async () => {
    if (!workflow) return;
    setSavingMode(true);
    try {
      await workflowApi.updateWorkflow(workflow.id, { transitionMode: previewMode });
      setWorkflow((w) => w ? { ...w, transitionMode: previewMode } : w);
    } catch (err: any) {
      setError(err.message || 'Failed to save transition mode');
    } finally {
      setSavingMode(false);
    }
  };

  const startEdit = (lane: WorkflowLane) => {
    setEditingLaneId(lane.id);
    setEditForm({ name: lane.name, color: lane.color, laneType: lane.laneType, isFinalLane: lane.isFinalLane });
  };

  const cancelEdit = () => { setEditingLaneId(null); setEditForm(DEFAULT_FORM); };

  const handleSaveEdit = async (laneId: string) => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      await workflowApi.updateLane(laneId, {
        name: editForm.name.trim(), color: editForm.color,
        laneType: editForm.laneType, isFinalLane: editForm.isFinalLane,
      });
      await loadWorkflow();
      setEditingLaneId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update lane');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (laneId: string, laneName: string) => {
    if (!window.confirm(`Delete lane "${laneName}"?\n\nCards in this lane will be moved to the first To Do lane.`)) return;
    setSaving(true);
    try {
      await workflowApi.deleteLane(laneId);
      await loadWorkflow();
      if (editingLaneId === laneId) setEditingLaneId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete lane');
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (laneId: string, direction: 'up' | 'down') => {
    if (!workflow) return;
    const lanes = [...sortedLanes];
    const idx = lanes.findIndex((l) => l.id === laneId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === lanes.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [lanes[idx], lanes[swapIdx]] = [lanes[swapIdx], lanes[idx]];
    const laneOrders = lanes.map((l, i) => ({ laneId: l.id, order: i + 1 }));
    setSaving(true);
    try {
      await workflowApi.reorderLanes(workflow.id, laneOrders);
      await loadWorkflow();
    } catch (err: any) {
      setError(err.message || 'Failed to reorder lanes');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLane = async () => {
    if (!workflow || !addForm.name.trim()) return;
    setSaving(true);
    try {
      await workflowApi.addLane(workflow.id, {
        name: addForm.name.trim(), color: addForm.color,
        laneType: addForm.laneType, order: sortedLanes.length + 1,
      });
      await loadWorkflow();
      setAddForm(DEFAULT_FORM);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add lane');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error && !workflow) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={loadWorkflow} className="text-red-600 underline ml-4">Retry</button>
      </div>
    );
  }

  if (!workflow) return null;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
        </div>
      )}

      {/* ── Transition Rules ───────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Transition Rules</span>
          </div>
          {modeChanged && (
            <button
              onClick={handleSaveTransitionMode}
              disabled={savingMode || !canEdit}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {savingMode ? (
                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Rule
                </>
              )}
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Mode selector cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TRANSITION_MODE_OPTIONS.map((opt) => {
              const isActive = previewMode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => canEdit && setPreviewMode(opt.value)}
                  disabled={!canEdit}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    isActive ? opt.activeClass : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${!canEdit ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ color: isActive ? opt.color : '#9ca3af' }}>{opt.icon}</span>
                    <span className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                      {opt.label}
                    </span>
                    {isActive && (
                      <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
                </button>
              );
            })}
          </div>

          {/* Live flowchart */}
          <WorkflowFlowChart lanes={sortedLanes} mode={previewMode} />

          {modeChanged && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Unsaved change — click <strong>Save Rule</strong> to apply
            </p>
          )}
        </div>
      </div>

      {/* ── Lanes ──────────────────────────────────────────── */}
      <div className="space-y-2">
        {sortedLanes.map((lane, idx) => {
          const isEditing = editingLaneId === lane.id;
          const typeConfig = LANE_TYPE_OPTIONS.find((o) => o.value === lane.laneType);

          return (
            <div
              key={lane.id}
              className={`rounded-xl border transition-all ${
                isEditing ? 'border-primary-300 shadow-md' : 'border-gray-200 bg-white'
              }`}
            >
              {isEditing ? (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Lane Name</label>
                      <input
                        autoFocus
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., Code Review"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Lane Type</label>
                      <select
                        value={editForm.laneType}
                        onChange={(e) => setEditForm((p) => ({ ...p, laneType: e.target.value as LaneType }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                      >
                        {LANE_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label} — {o.description}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Color</label>
                    <div className="flex items-center gap-3 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditForm((p) => ({ ...p, color: c }))}
                          className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${editForm.color === c ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500">
                        <input type="color" value={editForm.color} onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border border-gray-200" />
                        Custom
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={editForm.isFinalLane} onChange={(e) => setEditForm((p) => ({ ...p, isFinalLane: e.target.checked }))} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                    </label>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Final Lane</p>
                      <p className="text-xs text-gray-400">Cards moved here are marked as completed</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Preview:</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium shadow-sm" style={{ backgroundColor: editForm.color }}>
                      {editForm.name || 'Lane name'}
                      {editForm.isFinalLane && (
                        <svg className="w-3.5 h-3.5 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    <button onClick={() => handleSaveEdit(lane.id)} disabled={saving || !editForm.name.trim()} className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={cancelEdit} className="px-4 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 font-medium">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  {canEdit && (
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleMove(lane.id, 'up')} disabled={idx === 0 || saving} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:cursor-not-allowed">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button onClick={() => handleMove(lane.id, 'down')} disabled={idx === sortedLanes.length - 1 || saving} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:cursor-not-allowed">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                  )}

                  <span className="text-xs text-gray-300 font-mono w-4 text-center flex-shrink-0">{idx + 1}</span>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: lane.color }} />
                  <span className="font-medium text-gray-800 flex-1">{lane.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${typeConfig?.color}`}>{typeConfig?.label}</span>

                  {lane.isFinalLane && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex-shrink-0 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Final
                    </span>
                  )}

                  {canEdit && (
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => startEdit(lane)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit lane">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(lane.id, lane.name)} disabled={sortedLanes.length <= 2} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={sortedLanes.length <= 2 ? 'Need at least 2 lanes' : 'Delete lane'}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Lane */}
      {canEdit && (
        <div>
          {!showAddForm ? (
            <button
              onClick={() => { setAddForm(DEFAULT_FORM); setShowAddForm(true); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Lane
            </button>
          ) : (
            <div className="rounded-xl border-2 border-primary-300 bg-primary-50/30 p-4 space-y-4">
              <p className="text-sm font-semibold text-primary-700">New Lane</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Code Review"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddLane(); if (e.key === 'Escape') setShowAddForm(false); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Lane Type</label>
                  <select value={addForm.laneType} onChange={(e) => setAddForm((p) => ({ ...p, laneType: e.target.value as LaneType }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500">
                    {LANE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.description}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Color</label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setAddForm((p) => ({ ...p, color: c }))} className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${addForm.color === c ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : ''}`} style={{ backgroundColor: c }} />
                  ))}
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500">
                    <input type="color" value={addForm.color} onChange={(e) => setAddForm((p) => ({ ...p, color: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border border-gray-200" />
                    Custom
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Preview:</span>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium shadow-sm" style={{ backgroundColor: addForm.color }}>
                  {addForm.name || 'Lane name'}
                </div>
              </div>

              <div className="flex gap-2 pt-1 border-t border-primary-200">
                <button onClick={handleAddLane} disabled={saving || !addForm.name.trim()} className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium">
                  {saving ? 'Adding…' : 'Add Lane'}
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-4 py-1.5 bg-white text-gray-600 text-sm rounded-lg hover:bg-gray-100 font-medium border border-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info footer */}
      <div className="text-xs text-gray-400 flex items-start gap-1.5 pt-1">
        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Lane type controls card status: <strong>To Do</strong> → Not Started, <strong>Active</strong> → In Progress, <strong>Done</strong> → Completed.
          The <strong>Final</strong> lane marks cards as completed when moved there. Minimum 2 lanes required.
        </span>
      </div>
    </div>
  );
}
