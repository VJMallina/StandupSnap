import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Severity = 'P1' | 'P2' | 'P3' | 'P4';
type Status = 'ACTIVE' | 'MONITORING' | 'RESOLVED';

interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: Status;
  projectId: string;
  declaredByName: string;
  declaredAt: string;
  resolvedAt?: string;
  raidPushed: boolean;
}

const SEVERITY_STYLES: Record<Severity, string> = {
  P1: 'bg-red-100 text-red-800 border border-red-200',
  P2: 'bg-orange-100 text-orange-800 border border-orange-200',
  P3: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  P4: 'bg-blue-100 text-blue-800 border border-blue-200',
};

const STATUS_STYLES: Record<Status, string> = {
  ACTIVE: 'bg-red-100 text-red-700',
  MONITORING: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
};

function duration(from: string, to?: string) {
  const ms = new Date(to || Date.now()).getTime() - new Date(from).getTime();
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function WarRoomListPage() {
  useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | ''>('');

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  });

  useEffect(() => { fetchIncidents(); }, [statusFilter]);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(`${API_URL}/incidents${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      setIncidents(await res.json());
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const active = incidents.filter(i => i.status === 'ACTIVE' || i.status === 'MONITORING');
  const resolved = incidents.filter(i => i.status === 'RESOLVED');

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {active.length > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              )}
              War Room
            </h1>
            <p className="text-sm text-gray-500 mt-1">Incident management for your organization</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as Status | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All incidents</option>
              <option value="ACTIVE">Active</option>
              <option value="MONITORING">Monitoring</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active Incidents</h2>
                <div className="space-y-3">
                  {active.map(inc => (
                    <IncidentRow key={inc.id} incident={inc} onClick={() => navigate(`/war-room/${inc.id}`)} />
                  ))}
                </div>
              </div>
            )}
            {resolved.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Resolved</h2>
                <div className="space-y-3">
                  {resolved.map(inc => (
                    <IncidentRow key={inc.id} incident={inc} onClick={() => navigate(`/war-room/${inc.id}/post-mortem`)} />
                  ))}
                </div>
              </div>
            )}
            {incidents.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-sm font-medium">No incidents — great news!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function IncidentRow({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0 ${SEVERITY_STYLES[incident.severity]}`}>
            {incident.severity}
          </span>
          <span className="font-semibold text-gray-900 truncate">{incident.title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {incident.raidPushed && (
            <span className="text-xs text-green-600 font-medium">RAID ✓</span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[incident.status]}`}>
            {incident.status}
          </span>
          <span className="text-xs text-gray-400">
            {incident.status === 'RESOLVED'
              ? duration(incident.declaredAt, incident.resolvedAt)
              : duration(incident.declaredAt)}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
        <span>Declared by {incident.declaredByName}</span>
        <span>·</span>
        <span>{new Date(incident.declaredAt).toLocaleString()}</span>
      </div>
    </button>
  );
}
