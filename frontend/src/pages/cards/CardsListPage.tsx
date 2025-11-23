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
import Select from '../../components/ui/Select';
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
      [CardStatus.IN_PROGRESS]: 'bg-teal-100 text-teal-800',
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
      [CardPriority.MEDIUM]: 'bg-teal-100 text-teal-700',
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
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 md:p-8 shadow-lg mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-teal-100 text-sm font-medium mb-1">Work Items</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Cards</h1>
              <p className="text-teal-100 mt-2 text-sm">Manage task cards and track progress</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!canCreateCard}
              className="flex items-center px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Card
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filters Section - M7-UC05 */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          {/* Project Filter */}
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Project"
              value={selectedProjectId}
              onChange={(value) => {
                setSelectedProjectId(value);
                setSelectedSprintId('');
                setSelectedAssigneeId('');
              }}
              placeholder="All Projects"
              options={[
                { value: '', label: 'All Projects' },
                ...projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                })),
              ]}
            />
          </div>

          {/* Sprint Filter */}
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Sprint"
              value={selectedSprintId}
              onChange={setSelectedSprintId}
              disabled={!selectedProjectId}
              placeholder="All Sprints"
              options={[
                { value: '', label: 'All Sprints' },
                ...sprints.map((sprint) => ({
                  value: sprint.id,
                  label: sprint.name,
                })),
              ]}
            />
          </div>

          {/* Assignee Filter */}
          <div className="flex-1 min-w-[150px]">
            <Select
              label="Assignee"
              value={selectedAssigneeId}
              onChange={setSelectedAssigneeId}
              disabled={!selectedProjectId}
              placeholder="All Assignees"
              options={[
                { value: '', label: 'All Assignees' },
                ...teamMembers.map((member) => ({
                  value: member.id,
                  label: member.fullName,
                })),
              ]}
            />
          </div>

          {/* RAG Filter */}
          <div className="flex-1 min-w-[120px]">
            <Select
              label="RAG"
              value={selectedRAG}
              onChange={(value) => setSelectedRAG(value as CardRAG | '')}
              placeholder="All RAG"
              options={[
                { value: '', label: 'All RAG' },
                { value: CardRAG.GREEN, label: 'Green' },
                { value: CardRAG.AMBER, label: 'Amber' },
                { value: CardRAG.RED, label: 'Red' },
              ]}
            />
          </div>

          {/* Status Filter */}
          <div className="flex-1 min-w-[130px]">
            <Select
              label="Status"
              value={selectedStatus}
              onChange={(value) => setSelectedStatus(value as CardStatus | '')}
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: CardStatus.NOT_STARTED, label: 'Not Started' },
                { value: CardStatus.IN_PROGRESS, label: 'In Progress' },
                { value: CardStatus.COMPLETED, label: 'Completed' },
                { value: CardStatus.CLOSED, label: 'Closed' },
              ]}
            />
          </div>

          {/* Priority Filter */}
          <div className="flex-1 min-w-[120px]">
            <Select
              label="Priority"
              value={selectedPriority}
              onChange={(value) => setSelectedPriority(value as CardPriority | '')}
              placeholder="All Priorities"
              options={[
                { value: '', label: 'All Priorities' },
                { value: CardPriority.LOW, label: 'Low' },
                { value: CardPriority.MEDIUM, label: 'Medium' },
                { value: CardPriority.HIGH, label: 'High' },
                { value: CardPriority.CRITICAL, label: 'Critical' },
              ]}
            />
          </div>

          {/* Search */}
          <div className="flex-[2] min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or external ID..."
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm hover:border-gray-300 transition-colors"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mb-6">
            <button
              onClick={clearFilters}
              className="text-sm text-teal-600 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Cards Grid */}
        {loading && cards.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
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
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
                >
                  Create Card
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card, index) => {
              const statusBadge = getStatusBadge(card.status);
              const ragBadge = getRAGBadge(card.ragStatus);
              const priorityBadge = getPriorityBadge(card.priority);
              const isLocked = card.sprint.isClosed || card.status === CardStatus.CLOSED;

              // RAG color for card accent
              const ragAccent = {
                [CardRAG.RED]: 'from-red-500 to-red-600',
                [CardRAG.AMBER]: 'from-amber-500 to-amber-600',
                [CardRAG.GREEN]: 'from-emerald-500 to-emerald-600',
              };

              return (
                <div
                  key={card.id}
                  onClick={() => navigate(`/cards/${card.id}`)}
                  className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer
                    transform transition-all duration-300 ease-out
                    hover:shadow-xl hover:-translate-y-2 hover:border-teal-200
                    animate-[fadeInUp_0.4s_ease-out_forwards]"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    opacity: 0,
                  }}
                >
                  {/* RAG Status Bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${card.ragStatus ? ragAccent[card.ragStatus] : 'from-gray-300 to-gray-400'}`} />

                  {/* Card Content */}
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isLocked && (
                            <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                          <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-teal-600 transition-colors">
                            {card.title}
                          </h3>
                        </div>
                        {card.externalId && (
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">{card.externalId}</p>
                        )}
                      </div>
                      <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${priorityBadge.color}`}>
                        {priorityBadge.label}
                      </span>
                    </div>

                    {/* Meta Info with Snaps Count */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-xs text-gray-600">
                          <svg className="w-3.5 h-3.5 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {card.sprint.name}
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <svg className="w-3.5 h-3.5 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {card.assignee.fullName}
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <svg className="w-3.5 h-3.5 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {card.estimatedTime} hrs
                        </div>
                      </div>
                      {/* Snaps Count - Middle Right */}
                      <div className="relative flex items-center justify-center">
                        <svg className="w-12 h-12 text-teal-100" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
                        </svg>
                        <span className="absolute text-3xl font-bold text-teal-600">{card.snapsCount || 0}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ragBadge.color}`}>
                          {ragBadge.label}
                        </span>
                        {!isLocked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(card);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-teal-500/5 to-cyan-500/5" />
                </div>
              );
            })}
          </div>
        )}
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
