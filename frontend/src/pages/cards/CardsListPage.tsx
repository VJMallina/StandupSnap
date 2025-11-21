import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cardsApi } from '../../services/api/cards';
import { sprintsApi } from '../../services/api/sprints';
import { teamMembersApi } from '../../services/api/teamMembers';
import { projectsApi } from '../../services/api/projects';
import { Card, CardStatus, CardRAG, CardPriority } from '../../types/card';
import { Sprint } from '../../types/sprint';
import { TeamMember } from '../../types/teamMember';
import { Project } from '../../types/project';
import AppLayout from '../../components/AppLayout';
import CreateCardModal from '../../components/cards/CreateCardModal';

export default function CardsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cards, setCards] = useState<Card[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(searchParams.get('projectId') || '');
  const [selectedSprintId, setSelectedSprintId] = useState<string>(searchParams.get('sprintId') || '');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [selectedRAG, setSelectedRAG] = useState<CardRAG | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<CardStatus | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<CardPriority | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadSprints(selectedProjectId);
      loadTeamMembers(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadCards();
  }, [selectedProjectId, selectedSprintId, selectedAssigneeId, selectedRAG, selectedStatus, selectedPriority, searchQuery]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data.filter((p: Project) => !p.isArchived));

      // If project ID in URL, validate it exists
      if (selectedProjectId) {
        const projectExists = data.some((p: Project) => p.id === selectedProjectId);
        if (!projectExists) {
          setSelectedProjectId('');
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadSprints = async (projectId: string) => {
    try {
      const data = await sprintsApi.getAll({ projectId });
      setSprints(data);
    } catch (err: any) {
      console.error('Failed to load sprints:', err);
    }
  };

  const loadTeamMembers = async (projectId: string) => {
    try {
      const data = await teamMembersApi.getProjectTeam(projectId);
      setTeamMembers(data);
    } catch (err: any) {
      console.error('Failed to load team members:', err);
    }
  };

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await cardsApi.getAll({
        projectId: selectedProjectId || undefined,
        sprintId: selectedSprintId || undefined,
        assigneeId: selectedAssigneeId || undefined,
        ragStatus: selectedRAG || undefined,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
        search: searchQuery || undefined,
      });
      setCards(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (card: Card) => {
    if (!window.confirm(`Are you sure you want to delete "${card.title}"?\n\nThis will permanently remove the card and all associated snaps.`)) {
      return;
    }

    try {
      await cardsApi.delete(card.id);
      loadCards();
    } catch (err: any) {
      alert('Failed to delete card: ' + err.message);
    }
  };

  const clearFilters = () => {
    setSelectedProjectId('');
    setSelectedSprintId('');
    setSelectedAssigneeId('');
    setSelectedRAG('');
    setSelectedStatus('');
    setSelectedPriority('');
    setSearchQuery('');
  };

  const getStatusBadge = (status: CardStatus) => {
    const colors = {
      [CardStatus.NOT_STARTED]: 'bg-gray-100 text-gray-800',
      [CardStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [CardStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [CardStatus.CLOSED]: 'bg-gray-100 text-gray-600',
    };

    const labels = {
      [CardStatus.NOT_STARTED]: 'Not Started',
      [CardStatus.IN_PROGRESS]: 'In Progress',
      [CardStatus.COMPLETED]: 'Completed',
      [CardStatus.CLOSED]: 'Closed',
    };

    return { color: colors[status], label: labels[status] };
  };

  const getRAGBadge = (rag?: CardRAG) => {
    if (!rag) return { color: 'bg-gray-100 text-gray-500', label: 'N/A' };

    const colors = {
      [CardRAG.RED]: 'bg-red-100 text-red-800',
      [CardRAG.AMBER]: 'bg-yellow-100 text-yellow-800',
      [CardRAG.GREEN]: 'bg-green-100 text-green-800',
    };

    const labels = {
      [CardRAG.RED]: 'Red',
      [CardRAG.AMBER]: 'Amber',
      [CardRAG.GREEN]: 'Green',
    };

    return { color: colors[rag], label: labels[rag] };
  };

  const getPriorityBadge = (priority: CardPriority) => {
    const colors = {
      [CardPriority.LOW]: 'bg-gray-100 text-gray-600',
      [CardPriority.MEDIUM]: 'bg-blue-100 text-blue-700',
      [CardPriority.HIGH]: 'bg-orange-100 text-orange-700',
      [CardPriority.CRITICAL]: 'bg-red-100 text-red-700',
    };

    const labels = {
      [CardPriority.LOW]: 'Low',
      [CardPriority.MEDIUM]: 'Medium',
      [CardPriority.HIGH]: 'High',
      [CardPriority.CRITICAL]: 'Critical',
    };

    return { color: colors[priority], label: labels[priority] };
  };

  const hasActiveFilters = selectedProjectId || selectedSprintId || selectedAssigneeId ||
                           selectedRAG || selectedStatus || selectedPriority || searchQuery;

  const canCreateCard = selectedProjectId && !projects.find(p => p.id === selectedProjectId)?.isArchived;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Cards</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!canCreateCard}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Create Card
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filters Section - M7-UC05 */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedSprintId('');
                  setSelectedAssigneeId('');
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sprint Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Sprint</label>
              <select
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                disabled={!selectedProjectId}
              >
                <option value="">All Sprints</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Assignee</label>
              <select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                disabled={!selectedProjectId}
              >
                <option value="">All Assignees</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* RAG Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">RAG Status</label>
              <select
                value={selectedRAG}
                onChange={(e) => setSelectedRAG(e.target.value as CardRAG | '')}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All RAG</option>
                <option value={CardRAG.GREEN}>Green</option>
                <option value={CardRAG.AMBER}>Amber</option>
                <option value={CardRAG.RED}>Red</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Card Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as CardStatus | '')}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Statuses</option>
                <option value={CardStatus.NOT_STARTED}>Not Started</option>
                <option value={CardStatus.IN_PROGRESS}>In Progress</option>
                <option value={CardStatus.COMPLETED}>Completed</option>
                <option value={CardStatus.CLOSED}>Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as CardPriority | '')}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Priorities</option>
                <option value={CardPriority.LOW}>Low</option>
                <option value={CardPriority.MEDIUM}>Medium</option>
                <option value={CardPriority.HIGH}>High</option>
                <option value={CardPriority.CRITICAL}>Critical</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or external ID..."
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Cards Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading && cards.length === 0 ? (
            <div className="p-6 text-center">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sprint</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ET (hrs)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RAG</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cards.map((card) => {
                  const statusBadge = getStatusBadge(card.status);
                  const ragBadge = getRAGBadge(card.ragStatus);
                  const priorityBadge = getPriorityBadge(card.priority);
                  const isLocked = card.sprint.isClosed || card.status === CardStatus.CLOSED;

                  return (
                    <tr key={card.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {isLocked && (
                            <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{card.title}</div>
                            {card.externalId && (
                              <div className="text-sm text-gray-500">{card.externalId}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{card.sprint.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{card.assignee.fullName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{card.estimatedTime}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityBadge.color}`}>
                          {priorityBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${ragBadge.color}`}>
                          {ragBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => navigate(`/cards/${card.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </button>
                        {!isLocked && (
                          <button
                            onClick={() => handleDelete(card)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {cards.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No cards found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query.'
                  : selectedProjectId
                  ? 'Get started by creating a new card.'
                  : 'Select a project to view or create cards.'}
              </p>
              {canCreateCard && !hasActiveFilters && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Card
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Card Modal */}
      {showCreateModal && selectedProjectId && (
        <CreateCardModal
          projectId={selectedProjectId}
          preSelectedSprintId={selectedSprintId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadCards}
        />
      )}
    </AppLayout>
  );
}
