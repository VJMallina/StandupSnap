import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorRole: string;
  actorName: string | null;
  actorEmail: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  };
}

const ACTION_GROUPS: Record<string, string> = {
  auth: 'Auth',
  project: 'Project',
  sprint: 'Sprint',
  card: 'Card',
  snap: 'Snap',
  risk: 'Risk',
  change: 'Change',
  mom: 'MOM',
  org: 'Org',
  project_member: 'Membership',
  assumption: 'Assumption',
  issue: 'Issue',
  decision: 'Decision',
  stakeholder: 'Stakeholder',
  raci: 'RACI',
};

function actionPrefix(action: string) {
  return action.split('.')[0] || action;
}

const ACTION_COLOR: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  edit: 'bg-blue-100 text-blue-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  archive: 'bg-yellow-100 text-yellow-800',
  approve: 'bg-emerald-100 text-emerald-800',
  reject: 'bg-red-100 text-red-800',
  login: 'bg-gray-100 text-gray-700',
  logout: 'bg-gray-100 text-gray-700',
  lock: 'bg-purple-100 text-purple-800',
  invite: 'bg-indigo-100 text-indigo-800',
  deactivate: 'bg-orange-100 text-orange-800',
  reactivate: 'bg-teal-100 text-teal-800',
};

function actionVerb(action: string) {
  const verb = action.split('.').slice(1).join('_') || action;
  return verb.replace(/_/g, ' ');
}

function actionBadgeColor(action: string) {
  const verb = action.split('.')[1] || '';
  return ACTION_COLOR[verb] || 'bg-gray-100 text-gray-700';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function DiffViewer({ before, after }: { before: Record<string, any> | null; after: Record<string, any> | null }) {
  if (!before && !after) return null;

  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  const changed = [...keys].filter(
    (k) => JSON.stringify((before || {})[k]) !== JSON.stringify((after || {})[k]),
  );

  if (changed.length === 0) return <p className="text-xs text-gray-400 italic">No field-level diff available.</p>;

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-left text-gray-500 border-b">
          <th className="pb-1 pr-4 font-semibold">Field</th>
          <th className="pb-1 pr-4 font-semibold text-red-600">Before</th>
          <th className="pb-1 font-semibold text-green-600">After</th>
        </tr>
      </thead>
      <tbody>
        {changed.map((k) => (
          <tr key={k} className="border-b border-gray-50">
            <td className="py-1 pr-4 font-mono text-gray-600">{k}</td>
            <td className="py-1 pr-4 text-red-700 font-mono break-all">
              {(before || {})[k] !== undefined ? JSON.stringify((before || {})[k]) : '—'}
            </td>
            <td className="py-1 text-green-700 font-mono break-all">
              {(after || {})[k] !== undefined ? JSON.stringify((after || {})[k]) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function OrgAuditPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');

    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (actionFilter) params.set('action', actionFilter);
    if (entityFilter) params.set('entityType', entityFilter);
    if (fromFilter) params.set('from', fromFilter);
    if (toFilter) params.set('to', toFilter);

    try {
      const res = await fetch(`${API_URL}/organizations/${orgId}/audit-logs?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [orgId, page, actionFilter, entityFilter, fromFilter, toFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-500 mt-1">
              A complete record of all actions taken within your organization.
            </p>
          </div>
          {data && (
            <p className="text-sm text-gray-500">
              {data.total.toLocaleString()} total {data.total === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>

        {/* Filters */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Action module</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All modules</option>
              {Object.entries(ACTION_GROUPS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Entity type</label>
            <input
              type="text"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              placeholder="e.g. Risk, Sprint, Card"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">From date</label>
            <input
              type="date"
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">To date</label>
            <input
              type="date"
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setActionFilter('');
                setEntityFilter('');
                setFromFilter('');
                setToFilter('');
                setPage(1);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Table */}
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 font-medium">No audit log entries found</p>
            <p className="text-gray-400 text-sm mt-1">Actions taken in your org will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-xs">{log.actorName || '—'}</div>
                        <div className="text-gray-400 text-xs">{log.actorEmail || log.actorId.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${actionBadgeColor(log.action)}`}>
                          {ACTION_GROUPS[actionPrefix(log.action)] || actionPrefix(log.action)}
                          {' · '}
                          {actionVerb(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div>{log.entityType}</div>
                        <div className="text-gray-400 font-mono">{log.entityId.slice(0, 8)}…</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {log.projectName || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </td>
                    </tr>

                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`} className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="space-y-3">
                            {log.description && (
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">Description: </span>{log.description}
                              </p>
                            )}
                            <div className="text-xs text-gray-500 font-mono">
                              Role at time: <span className="font-semibold text-gray-700">{log.actorRole}</span>
                              {' · '}
                              ID: <span className="font-semibold text-gray-700">{log.id}</span>
                            </div>
                            {(log.before || log.after) && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Change diff</p>
                                <DiffViewer before={log.before} after={log.after} />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Page {data.page} of {data.totalPages} ({data.total} entries)
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
