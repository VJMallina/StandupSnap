import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Card {
  id: string;
  title: string;
  status: string;
  ragStatus: string | null;
  estimatedTime: number | null;
  sprint?: { id: string; name: string; project?: { id: string; name: string } };
}

interface Snap {
  id: string;
  done: string | null;
  toDo: string | null;
  blockers: string | null;
  finalRAG: string | null;
  snapDate: string;
  card?: { id: string; title: string };
}

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-gray-200 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
  CLOSED: 'Closed',
};

const RAG_COLORS: Record<string, string> = {
  GREEN: 'bg-green-100 text-green-700 border-green-200',
  AMBER: 'bg-amber-100 text-amber-700 border-amber-200',
  RED: 'bg-red-100 text-red-700 border-red-200',
};

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN: 'Org Admin',
  PMO: 'PMO',
  SCRUM_MASTER: 'Scrum Master',
  PRODUCT_OWNER: 'Product Owner',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

export default function MyWorkPage() {
  const { user } = useAuth();
  const orgRoleLabel = user?.orgRole ? (ROLE_LABELS[user.orgRole] || user.orgRole) : null;

  const [cards, setCards] = useState<Card[]>([]);
  const [recentSnaps, setRecentSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  });

  useEffect(() => {
    fetchMyWork();
  }, []);

  const fetchMyWork = async () => {
    setLoading(true);
    try {
      const [cardsRes, snapsRes] = await Promise.all([
        fetch(`${API_URL}/cards?assigneeId=me`, { headers: authHeaders() }),
        fetch(`${API_URL}/snaps?createdById=me&limit=10`, { headers: authHeaders() }),
      ]);

      if (cardsRes.ok) {
        const data = await cardsRes.json();
        setCards(Array.isArray(data) ? data : data.cards || []);
      }
      if (snapsRes.ok) {
        const data = await snapsRes.json();
        setRecentSnaps(Array.isArray(data) ? data : data.snaps || []);
      }
    } catch {
      // Silent fail — my work is a convenience page
    } finally {
      setLoading(false);
    }
  };

  const activeCards = cards.filter(c => !['COMPLETED', 'CLOSED'].includes(c.status));
  const completedCards = cards.filter(c => ['COMPLETED', 'CLOSED'].includes(c.status));
  const blockedCards = cards.filter(c => c.ragStatus === 'RED' || c.status === 'BLOCKED');

  const groupedByProject = activeCards.reduce<Record<string, { projectName: string; projectId: string; cards: Card[] }>>((acc, card) => {
    const projectId = card.sprint?.project?.id || 'unknown';
    const projectName = card.sprint?.project?.name || 'Unknown Project';
    if (!acc[projectId]) acc[projectId] = { projectId, projectName, cards: [] };
    acc[projectId].cards.push(card);
    return acc;
  }, {});

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Work</h1>
          <p className="text-sm text-gray-500 mt-1">Cards assigned to you across all your projects.</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{activeCards.length}</p>
            <p className="text-xs text-gray-500 mt-1">Active Cards</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{blockedCards.length}</p>
            <p className="text-xs text-gray-500 mt-1">Blocked / Red</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{completedCards.length}</p>
            <p className="text-xs text-gray-500 mt-1">Completed</p>
          </div>
        </div>

        {/* Active cards grouped by project */}
        {activeCards.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center mb-8">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No active cards assigned to you.</p>
          </div>
        ) : (
          <div className="space-y-6 mb-8">
            {Object.values(groupedByProject).map(({ projectId, projectName, cards: projectCards }) => (
              <div key={projectId}>
                <div className="flex items-center gap-2 mb-2">
                  <Link to={`/projects/${projectId}`} className="text-sm font-semibold text-primary-700 hover:text-primary-900">
                    {projectName}
                  </Link>
                  {orgRoleLabel && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-medium">
                      {orgRoleLabel}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">{projectCards.length} card{projectCards.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {projectCards.map(card => (
                    <Link
                      key={card.id}
                      to={`/cards/${card.id}`}
                      className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-700">{card.title}</p>
                        {card.sprint && (
                          <p className="text-xs text-gray-400 mt-0.5">{card.sprint.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {card.ragStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RAG_COLORS[card.ragStatus] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {card.ragStatus}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[card.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[card.status] || card.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent snaps */}
        {recentSnaps.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Snaps</h2>
            <div className="space-y-2">
              {recentSnaps.map(snap => (
                <div key={snap.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {snap.card && (
                        <Link to={`/cards/${snap.card.id}`} className="text-xs font-medium text-primary-600 hover:text-primary-800 truncate block mb-1">
                          {snap.card.title}
                        </Link>
                      )}
                      {snap.done && <p className="text-xs text-gray-700"><span className="font-medium text-gray-500">Done: </span>{snap.done}</p>}
                      {snap.toDo && <p className="text-xs text-gray-700"><span className="font-medium text-gray-500">To Do: </span>{snap.toDo}</p>}
                      {snap.blockers && <p className="text-xs text-red-600"><span className="font-medium">Blockers: </span>{snap.blockers}</p>}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {snap.finalRAG && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RAG_COLORS[snap.finalRAG] || ''}`}>
                          {snap.finalRAG}
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{new Date(snap.snapDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
