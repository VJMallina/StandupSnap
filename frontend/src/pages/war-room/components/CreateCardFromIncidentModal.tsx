import { useState, useEffect } from 'react';
import { projectsApi } from '../../../services/api/projects';
import { sprintsApi } from '../../../services/api/sprints';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Severity = 'P1' | 'P2' | 'P3' | 'P4';
const SEV_TO_PRIORITY: Record<Severity, string> = {
  P1: 'critical',
  P2: 'high',
  P3: 'medium',
  P4: 'low',
};

interface Project { id: string; name: string; key?: string; }
interface Sprint { id: string; name: string; }

interface Incident {
  id: string;
  title: string;
  severity: Severity;
  description?: string;
  projectId: string | null;
  externalId: string | null;
}

interface Props {
  incident: Incident;
  onClose: () => void;
  onCreated: (externalId: string) => void;
}

export default function CreateCardFromIncidentModal({ incident, onClose, onCreated }: Props) {
  const [title, setTitle] = useState(incident.title);
  const [description, setDescription] = useState(
    `Raised from incident ${incident.externalId || incident.id}: ${incident.title}`
  );
  const [selectedProjectId, setSelectedProjectId] = useState(incident.projectId || '');
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  });

  useEffect(() => {
    projectsApi.getAll()
      .then((data: any[]) => setProjects(data.filter(p => !p.isArchived)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProjectId) { setSprints([]); return; }
    sprintsApi.getAll({ projectId: selectedProjectId })
      .then((data: Sprint[]) => setSprints(data.filter((s: any) => !s.isClosed)))
      .catch(() => setSprints([]));
  }, [selectedProjectId]);

  const handleCreate = async () => {
    if (!title.trim() || !selectedProjectId) {
      setError('Title and project are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/cards`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority: SEV_TO_PRIORITY[incident.severity],
          estimatedTime: 8,
          sprintId: selectedSprintId || undefined,
          sourceIncidentId: incident.id,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create card');
      const card = await res.json();
      onCreated(card.externalId || card.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create card');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create Card from Incident</h2>
              <p className="text-sm text-gray-500">
                {incident.externalId && (
                  <span className="font-mono font-semibold text-gray-400">{incident.externalId} · </span>
                )}
                Pre-filled from incident details
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project <span className="text-red-500">*</span></label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select project…</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.key ? `[${p.key}] ` : ''}{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sprint <span className="text-gray-400 font-normal">(optional — leave blank for backlog)</span>
            </label>
            <select
              value={selectedSprintId}
              onChange={e => setSelectedSprintId(e.target.value)}
              disabled={!selectedProjectId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">Backlog</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Priority will be set to <strong className="text-gray-700 ml-1">{SEV_TO_PRIORITY[incident.severity]}</strong> based on incident severity {incident.severity}
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || !selectedProjectId || submitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating…' : 'Create Card'}
          </button>
        </div>
      </div>
    </div>
  );
}
