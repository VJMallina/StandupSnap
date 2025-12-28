import { useState, useEffect } from 'react';
import { cardsApi } from '../../services/api/cards';
import { sprintsApi } from '../../services/api/sprints';
import { teamMembersApi } from '../../services/api/teamMembers';
import { CardPriority } from '../../types/card';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    sprintId: preSelectedSprintId || '',
    assigneeId: '',
    title: '',
    description: '',
    externalId: '',
    priority: CardPriority.MEDIUM,
    estimatedTime: 8, // Default 8 hours (1 day)
  });

  useEffect(() => {
    loadSprints();
    loadTeamMembers();
  }, []);

  const loadSprints = async () => {
    try {
      const data = await sprintsApi.getAll({ projectId });
      // Filter out closed sprints
      const openSprints = data.filter(s => !s.isClosed);
      setSprints(openSprints);

      // If no sprints available, show error
      if (openSprints.length === 0) {
        setError('No open sprints available. Please create a sprint first.');
      }
    } catch (err: any) {
      setError('Failed to load sprints: ' + err.message);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const data = await teamMembersApi.getProjectTeam(projectId);
      setTeamMembers(data);

      if (data.length === 0) {
        setError('No team members available. Please add team members to the project first.');
      }
    } catch (err: any) {
      setError('Failed to load team members: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await cardsApi.create({
        projectId,
        sprintId: formData.sprintId,
        assigneeId: formData.assigneeId,
        title: formData.title,
        description: formData.description || undefined,
        externalId: formData.externalId || undefined,
        priority: formData.priority,
        estimatedTime: formData.estimatedTime,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = formData.sprintId && formData.assigneeId && formData.title && formData.estimatedTime > 0;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-10 mx-auto w-full max-w-2xl shadow-2xl rounded-xl bg-white mb-10 overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Create Card</h3>
            <button
              onClick={onClose}
              className="text-primary-100 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Implement user authentication"
            />
          </div>

          {/* Sprint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Sprint <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.sprintId}
              onChange={(e) => setFormData({ ...formData, sprintId: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select a sprint</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name} ({new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Team Member <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.assigneeId}
              onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select a team member</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName} - {member.designationRole}
                </option>
              ))}
            </select>
          </div>

          {/* Estimated Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Time (hours) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.5"
              value={formData.estimatedTime}
              onChange={(e) => setFormData({ ...formData, estimatedTime: parseFloat(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              ET (Estimated Time) is mandatory and drives RAG calculations
            </p>
          </div>

          {/* External ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card ID / Reference <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.externalId}
              onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., JIRA-1234, TASK-567"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority <span className="text-gray-500">(optional)</span>
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as CardPriority })}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value={CardPriority.LOW}>Low</option>
              <option value={CardPriority.MEDIUM}>Medium</option>
              <option value={CardPriority.HIGH}>High</option>
              <option value={CardPriority.CRITICAL}>Critical</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={4}
              placeholder="Card details, acceptance criteria, notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Card'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
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
