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
}

export default function CreateCardModal({ projectId, onClose, onSuccess, preSelectedSprintId }: CreateCardModalProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [lanes, setLanes] = useState<WorkflowLane[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    externalId: '',
    cardType: CardType.CARD,
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
      // Backlog cards don't belong to a lane
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
        estimatedTime: formData.estimatedTime,
        storyPoints: formData.storyPoints !== '' ? Number(formData.storyPoints) : undefined,
        sprintId: formData.sprintId || undefined,
        assigneeId: formData.assigneeId || undefined,
        laneId: formData.laneId || undefined,
        acceptanceCriteria: formData.acceptanceCriteria || undefined,
        labels,
        dueDate: formData.dueDate || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-10 mx-auto w-full max-w-2xl shadow-2xl rounded-xl bg-white mb-10 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Create Card</h3>
          <button onClick={onClose} className="text-primary-100 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => set('title', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Implement user authentication"
              />
            </div>

            {/* Type + Priority row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Type</label>
                <select
                  value={formData.cardType}
                  onChange={(e) => set('cardType', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value={CardType.CARD}>Card</option>
                  <option value={CardType.EPIC}>Epic</option>
                  <option value={CardType.SUB_CARD}>Sub-card</option>
                </select>
              </div>
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
            </div>

            {/* Sprint + Lane row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sprint <span className="text-gray-400 font-normal">(optional)</span></label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Starting Lane
                  {isBacklog && (
                    <span className="ml-2 text-[10px] font-normal text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      backlog only
                    </span>
                  )}
                </label>
                <select
                  value={formData.laneId}
                  onChange={(e) => set('laneId', e.target.value)}
                  disabled={isBacklog}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {isBacklog ? (
                    <option value="">Not in a lane (backlog)</option>
                  ) : (
                    <>
                      <option value="">Default (first lane)</option>
                      {lanes.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </>
                  )}
                </select>
                {isBacklog && (
                  <p className="text-xs text-gray-400 mt-1">Assign to a sprint to place in a lane.</p>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignee <span className="text-gray-400 font-normal">(optional)</span></label>
              <select
                value={formData.assigneeId}
                onChange={(e) => set('assigneeId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName} — {m.designationRole}</option>
                ))}
              </select>
            </div>

            {/* Estimated Time + Story Points row */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Story Points <span className="text-gray-400 font-normal">(optional)</span></label>
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

            {/* Due Date + External ID row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => set('dueDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference ID <span className="text-gray-400 font-normal">(optional)</span></label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Labels <span className="text-gray-400 font-normal">(comma-separated, optional)</span></label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Acceptance Criteria <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={formData.acceptanceCriteria}
                onChange={(e) => set('acceptanceCriteria', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 font-mono"
                rows={3}
                placeholder="- Given... When... Then..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t">
              <button
                type="submit"
                disabled={loading || !formData.title || formData.estimatedTime <= 0}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
              >
                {loading ? 'Creating…' : 'Create Card'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium"
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
