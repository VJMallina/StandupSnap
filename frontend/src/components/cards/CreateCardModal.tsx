import { useState, useEffect } from 'react';
import { cardsApi } from '../../services/api/cards';
import { sprintsApi } from '../../services/api/sprints';
import { teamMembersApi } from '../../services/api/teamMembers';
import { workflowApi } from '../../services/api/workflow';
import { CardPriority, CardType, WorkflowLane } from '../../types/card';
import { Sprint } from '../../types/sprint';
import { TeamMember } from '../../types/teamMember';

interface CreateCardModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedSprintId?: string;
  parentId?: string;
  preSelectedCardType?: CardType;
}

const PRIORITY_OPTIONS = [
  { value: CardPriority.LOW,      label: 'Low',      color: 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200',            active: 'bg-gray-600 text-white border-gray-600' },
  { value: CardPriority.MEDIUM,   label: 'Medium',   color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',             active: 'bg-blue-600 text-white border-blue-600' },
  { value: CardPriority.HIGH,     label: 'High',     color: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',         active: 'bg-amber-500 text-white border-amber-500' },
  { value: CardPriority.CRITICAL, label: 'Critical', color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',                 active: 'bg-red-600 text-white border-red-600' },
];

const TYPE_OPTIONS = [
  {
    value: CardType.EPIC,
    label: 'Epic',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    value: CardType.CARD,
    label: 'Story',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 8h10M7 12h10M7 16h6" />
      </svg>
    ),
  },
  {
    value: CardType.SUB_CARD,
    label: 'Sub-task',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
];

export default function CreateCardModal({ projectId, onClose, onSuccess, preSelectedSprintId, parentId, preSelectedCardType }: CreateCardModalProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [lanes, setLanes] = useState<WorkflowLane[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    externalId: '',
    cardType: preSelectedCardType ?? CardType.CARD,
    priority: CardPriority.MEDIUM,
    estimatedTime: 8,
    storyPoints: '' as string | number,
    sprintId: preSelectedSprintId || '',
    assigneeId: '',
    laneId: '',
    acceptanceCriteria: '',
    labels: '',
    dueDate: '',
  });

  const isEpic = formData.cardType === CardType.EPIC;

  useEffect(() => {
    Promise.all([
      sprintsApi.getAll({ projectId }).then((d) => setSprints(d.filter((s: Sprint) => !s.isClosed))).catch(() => {}),
      teamMembersApi.getProjectTeam(projectId).then(setTeamMembers).catch(() => {}),
      workflowApi.getDefaultWorkflow(projectId)
        .then((wf) => {
          const sorted = [...(wf.lanes || [])].sort((a, b) => a.order - b.order);
          setLanes(sorted);
          if (sorted.length > 0) setFormData((p) => ({ ...p, laneId: sorted[0].id }));
        })
        .catch(() => {}),
    ]);
  }, [projectId]);

  const isBacklog = !formData.sprintId;

  const set = (field: string, value: any) =>
    setFormData((p) => {
      const next = { ...p, [field]: value };
      if (field === 'sprintId' && !value) next.laneId = '';
      return next;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    setLoading(true);
    setError(null);

    try {
      const labels = formData.labels
        ? formData.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined;

      await cardsApi.create({
        projectId,
        title: formData.title,
        description: formData.description || undefined,
        externalId: formData.externalId || undefined,
        cardType: formData.cardType,
        priority: formData.priority,
        estimatedTime: isEpic ? undefined : formData.estimatedTime,
        storyPoints: !isEpic && formData.storyPoints !== '' ? Number(formData.storyPoints) : undefined,
        sprintId: isEpic ? undefined : (formData.sprintId || undefined),
        assigneeId: formData.assigneeId || undefined,
        laneId: isEpic ? undefined : (formData.laneId || undefined),
        acceptanceCriteria: formData.acceptanceCriteria || undefined,
        labels,
        dueDate: formData.dueDate || undefined,
        parentId: parentId || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!formData.title && (isEpic || formData.estimatedTime > 0);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-10 mx-auto w-full max-w-2xl shadow-2xl rounded-xl bg-white mb-10 overflow-hidden">

        {/* Header — purple for epics, brand gradient for stories */}
        <div className={`px-6 py-4 flex justify-between items-center ${isEpic ? 'bg-gradient-to-r from-purple-600 to-violet-600' : 'bg-gradient-to-r from-primary-600 to-secondary-600'}`}>
          <div className="flex items-center gap-2.5">
            {isEpic && (
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-white">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
            )}
            <h3 className="text-xl font-semibold text-white">
              {isEpic ? 'Create Epic' : formData.cardType === CardType.SUB_CARD ? 'Create Sub-task' : 'Create Story'}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Type switcher chips — hidden when type is pre-selected (e.g. creating sub-task from card detail) */}
            {!preSelectedCardType && <div className="flex gap-2">
              {TYPE_OPTIONS.map((t) => {
                const active = formData.cardType === t.value;
                const epicActive = active && t.value === CardType.EPIC;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('cardType', t.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      active
                        ? epicActive
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {isEpic ? 'Epic Name' : 'Title'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={formData.title}
                onChange={(e) => set('title', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={isEpic ? 'e.g., User Authentication & Authorization' : 'e.g., Implement login form'}
              />
            </div>

            {/* ── EPIC-SPECIFIC FIELDS ─────────────────────────────── */}
            {isEpic && (
              <>
                {/* Description — more prominent for epics */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => set('description', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={4}
                    placeholder="What business value does this epic deliver? What problem does it solve?"
                  />
                </div>

                {/* Priority pills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => set('priority', p.value)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                          formData.priority === p.value ? p.active : p.color
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignee + Target Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Epic Owner <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <select
                      value={formData.assigneeId}
                      onChange={(e) => set('assigneeId', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.userId || m.id}>{m.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Target Date <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => set('dueDate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Labels + Reference ID */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Labels <span className="text-gray-400 font-normal">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.labels}
                      onChange={(e) => set('labels', e.target.value)}
                      placeholder="e.g., auth, backend"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reference ID <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.externalId}
                      onChange={(e) => set('externalId', e.target.value)}
                      placeholder="e.g., EPIC-001"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Acceptance Criteria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Acceptance Criteria <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={formData.acceptanceCriteria}
                    onChange={(e) => set('acceptanceCriteria', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                    rows={3}
                    placeholder="- Given... When... Then..."
                  />
                </div>
              </>
            )}

            {/* ── STORY / SUB-TASK FIELDS ──────────────────────────── */}
            {!isEpic && (
              <>
                {/* Priority + Sprint row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => set('priority', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={CardPriority.LOW}>Low</option>
                      <option value={CardPriority.MEDIUM}>Medium</option>
                      <option value={CardPriority.HIGH}>High</option>
                      <option value={CardPriority.CRITICAL}>Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Sprint <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <select
                      value={formData.sprintId}
                      onChange={(e) => set('sprintId', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Backlog (no sprint)</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Starting Lane */}
                {!isBacklog && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Starting Lane</label>
                    <select
                      value={formData.laneId}
                      onChange={(e) => set('laneId', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Default (first lane)</option>
                      {lanes.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Assignee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Assignee <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={formData.assigneeId}
                    onChange={(e) => set('assigneeId', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.userId || m.id}>{m.fullName} — {m.designationRole}</option>
                    ))}
                  </select>
                </div>

                {/* Estimated Hours + Story Points */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Estimated Hours <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0.5"
                      step="0.5"
                      value={formData.estimatedTime}
                      onChange={(e) => set('estimatedTime', parseFloat(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Drives RAG calculations</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Story Points <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.storyPoints}
                      onChange={(e) => set('storyPoints', e.target.value)}
                      placeholder="e.g., 3"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Due Date + Reference ID */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Due Date <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => set('dueDate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reference ID <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.externalId}
                      onChange={(e) => set('externalId', e.target.value)}
                      placeholder="e.g., JIRA-1234"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Labels <span className="text-gray-400 font-normal">(comma-separated, optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.labels}
                    onChange={(e) => set('labels', e.target.value)}
                    placeholder="e.g., frontend, auth, bug"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => set('description', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Brief summary of the work…"
                  />
                </div>

                {/* Acceptance Criteria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Acceptance Criteria <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={formData.acceptanceCriteria}
                    onChange={(e) => set('acceptanceCriteria', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 font-mono"
                    rows={3}
                    placeholder="- Given... When... Then..."
                  />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t">
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  isEpic ? 'bg-purple-600 hover:bg-purple-700' : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {loading ? 'Creating…' : isEpic ? 'Create Epic' : formData.cardType === CardType.SUB_CARD ? 'Create Sub-task' : 'Create Story'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
