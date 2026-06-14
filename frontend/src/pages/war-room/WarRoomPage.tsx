import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import ResolveIncidentModal from './components/ResolveIncidentModal';
import CreateCardFromIncidentModal from './components/CreateCardFromIncidentModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');

type Severity = 'P1' | 'P2' | 'P3' | 'P4';
type Status = 'ACTIVE' | 'MONITORING' | 'RESOLVED';
type EntryType = 'UPDATE' | 'HYPOTHESIS' | 'FIX_ATTEMPT' | 'ESCALATION' | 'STATUS_CHANGE' | 'RESOLUTION' | 'SYSTEM';
type RoleType = 'COMMANDER' | 'TECH_LEAD' | 'COMMS_LEAD' | 'RESPONDER';
type Phase = 'TRIAGE' | 'DIAGNOSIS' | 'FIX' | 'VERIFY' | 'COMMUNICATE';

interface TimelineEntry { id: string; entryType: EntryType; content: string; authorName?: string; createdAt: string; }
interface RunbookStep { id: string; phase: Phase; title: string; description?: string; isCompleted: boolean; completedByName?: string; order: number; }
interface IncidentRole { id: string; role: RoleType; userId: string; userName: string; }
interface Incident {
  id: string; title: string; severity: Severity; status: Status;
  projectId: string | null; externalId: string | null;
  declaredByName: string; declaredAt: string; resolvedAt?: string;
  postMortem?: string; raidPushed: boolean;
  roles: IncidentRole[]; timeline: TimelineEntry[]; runbook: RunbookStep[];
}

const SEV_COLORS: Record<Severity, string> = {
  P1: 'bg-red-100 text-red-800 border border-red-200',
  P2: 'bg-orange-100 text-orange-800 border border-orange-200',
  P3: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  P4: 'bg-blue-100 text-blue-800 border border-blue-200',
};

const ENTRY_COLORS: Record<EntryType, string> = {
  UPDATE: 'border-l-gray-300 bg-white',
  HYPOTHESIS: 'border-l-purple-400 bg-purple-50',
  FIX_ATTEMPT: 'border-l-blue-400 bg-blue-50',
  ESCALATION: 'border-l-red-400 bg-red-50',
  STATUS_CHANGE: 'border-l-yellow-400 bg-yellow-50',
  RESOLUTION: 'border-l-green-400 bg-green-50',
  SYSTEM: 'border-l-gray-200 bg-gray-50',
};

const PHASES: Phase[] = ['TRIAGE', 'DIAGNOSIS', 'FIX', 'VERIFY', 'COMMUNICATE'];
const PHASE_LABELS: Record<Phase, string> = { TRIAGE: 'Triage', DIAGNOSIS: 'Diagnosis', FIX: 'Fix', VERIFY: 'Verify', COMMUNICATE: 'Communicate' };

function elapsed(from: string) {
  const ms = Date.now() - new Date(from).getTime();
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function WarRoomPage() {
  const { id } = useParams<{ id: string }>();
  useAuth();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryType, setEntryType] = useState<EntryType>('UPDATE');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [createdCardId, setCreatedCardId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState('');
  const timelineEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  });

  useEffect(() => {
    if (!id) return;
    fetchIncident();

    // WebSocket
    const socket = io(`${WS_URL}/incidents`, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join:incident', id);

    socket.on('timeline:new', (entry: TimelineEntry) => {
      setIncident(prev => prev ? { ...prev, timeline: [...prev.timeline, entry] } : prev);
    });
    socket.on('runbook:updated', (step: RunbookStep) => {
      setIncident(prev => prev ? {
        ...prev,
        runbook: prev.runbook.map(s => s.id === step.id ? step : s),
      } : prev);
    });
    socket.on('role:assigned', (role: IncidentRole) => {
      setIncident(prev => prev ? {
        ...prev,
        roles: [...prev.roles.filter(r => r.userId !== role.userId), role],
      } : prev);
    });
    socket.on('status:changed', ({ status, severity }: { status: Status; severity: Severity }) => {
      setIncident(prev => prev ? { ...prev, status, severity } : prev);
    });
    socket.on('postmortem:ready', () => {
      navigate(`/war-room/${id}/post-mortem`);
    });

    return () => { socket.disconnect(); };
  }, [id]);

  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [incident?.timeline.length]);

  useEffect(() => {
    if (!incident?.declaredAt || incident.status === 'RESOLVED') return;
    const t = setInterval(() => setElapsedTime(elapsed(incident.declaredAt)), 10000);
    setElapsedTime(elapsed(incident.declaredAt));
    return () => clearInterval(t);
  }, [incident?.declaredAt, incident?.status]);

  const fetchIncident = async () => {
    try {
      const res = await fetch(`${API_URL}/incidents/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      setIncident(await res.json());
    } catch {
      navigate('/war-room');
    } finally {
      setLoading(false);
    }
  };

  const postEntry = async () => {
    if (!content.trim() || !id) return;
    setPosting(true);
    try {
      await fetch(`${API_URL}/incidents/${id}/timeline`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ entryType, content: content.trim() }),
      });
      setContent('');
    } finally {
      setPosting(false);
    }
  };

  const toggleStep = async (step: RunbookStep) => {
    if (!id) return;
    await fetch(`${API_URL}/incidents/${id}/runbook/${step.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ isCompleted: !step.isCompleted }),
    });
  };

  const changeSeverity = async (severity: Severity) => {
    if (!id) return;
    const res = await fetch(`${API_URL}/incidents/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ severity }),
    });
    if (res.ok) setIncident(prev => prev ? { ...prev, severity } : prev);
  };

  if (loading) return (
    <AppLayout>
      <div className="flex justify-center items-center h-64">
        <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    </AppLayout>
  );

  if (!incident) return null;
  const isResolved = incident.status === 'RESOLVED';

  return (
    <AppLayout>
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/war-room')} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0 ${SEV_COLORS[incident.severity]}`}>{incident.severity}</span>
            {incident.externalId && (
              <span className="text-xs font-mono font-bold text-gray-400 flex-shrink-0">{incident.externalId}</span>
            )}
            <h1 className="text-lg font-bold text-gray-900 truncate">{incident.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${incident.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {incident.status}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {!isResolved && (
              <>
                <span className="text-sm text-gray-400 font-mono">{elapsedTime}</span>
                <select
                  value={incident.severity}
                  onChange={e => changeSeverity(e.target.value as Severity)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {(['P1','P2','P3','P4'] as Severity[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={() => setShowCreateCard(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Card
                </button>
                <button
                  onClick={() => setShowResolve(true)}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Resolve Incident
                </button>
              </>
            )}
            {isResolved && incident.postMortem && (
              <button
                onClick={() => navigate(`/war-room/${id}/post-mortem`)}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                View Post-Mortem
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="max-w-7xl mx-auto flex gap-0 h-[calc(100vh-8rem)]">

        {/* LEFT — Runbook */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Runbook</h2>
          {PHASES.map(phase => {
            const steps = incident.runbook.filter(s => s.phase === phase);
            const completed = steps.filter(s => s.isCompleted).length;
            const allDone = steps.length > 0 && completed === steps.length;
            return (
              <div key={phase} className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${allDone ? 'bg-green-500' : completed > 0 ? 'bg-yellow-400' : 'bg-gray-200'}`}>
                    {allDone && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{PHASE_LABELS[phase]}</span>
                  <span className="text-xs text-gray-400 ml-auto">{completed}/{steps.length}</span>
                </div>
                <div className="space-y-1.5 pl-6">
                  {steps.map(step => (
                    <button
                      key={step.id}
                      onClick={() => !isResolved && toggleStep(step)}
                      disabled={isResolved}
                      className={`w-full text-left flex items-start gap-2 p-2 rounded-lg text-xs transition-colors ${step.isCompleted ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-600'} ${isResolved ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${step.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {step.isCompleted && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={step.isCompleted ? 'line-through' : ''}>{step.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTER — Timeline */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {incident.timeline.map(entry => (
              <div key={entry.id} className={`border-l-4 pl-3 py-2 pr-3 rounded-r-lg text-sm ${ENTRY_COLORS[entry.entryType]}`}>
                <div className="flex items-center gap-2 mb-0.5">
                  {entry.entryType !== 'SYSTEM' && (
                    <span className="font-semibold text-gray-800">{entry.authorName || 'Unknown'}</span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${entry.entryType === 'SYSTEM' ? 'text-gray-400' : 'bg-white/60 text-gray-500'}`}>
                    {entry.entryType.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className={`text-sm ${entry.entryType === 'SYSTEM' ? 'text-gray-400 italic' : 'text-gray-700'}`}>{entry.content}</p>
              </div>
            ))}
            <div ref={timelineEndRef} />
          </div>
          {!isResolved && (
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex gap-2">
                <select
                  value={entryType}
                  onChange={e => setEntryType(e.target.value as EntryType)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 flex-shrink-0"
                >
                  {(['UPDATE','HYPOTHESIS','FIX_ATTEMPT','ESCALATION'] as EntryType[]).map(t => (
                    <option key={t} value={t}>{t.replace('_',' ')}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postEntry()}
                  placeholder="Add to timeline… (Enter to post)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={postEntry}
                  disabled={!content.trim() || posting}
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Roles */}
        <div className="w-56 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Roles</h2>
          {(['COMMANDER','TECH_LEAD','COMMS_LEAD'] as RoleType[]).map(role => {
            const assigned = incident.roles.find(r => r.role === role);
            return (
              <div key={role} className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1">{role.replace('_',' ')}</p>
                {assigned ? (
                  <div className="flex items-center gap-2 p-2 bg-primary-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {assigned.userName[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-primary-800 truncate">{assigned.userName}</span>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 text-center">Unassigned</div>
                )}
              </div>
            );
          })}
          {incident.roles.filter(r => r.role === 'RESPONDER').length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">RESPONDERS</p>
              <div className="space-y-1">
                {incident.roles.filter(r => r.role === 'RESPONDER').map(r => (
                  <div key={r.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-gray-50">
                    <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {r.userName[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-600 truncate">{r.userName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showResolve && (
        <ResolveIncidentModal
          incidentId={id!}
          onClose={() => setShowResolve(false)}
          onResolved={() => { setShowResolve(false); navigate(`/war-room/${id}/post-mortem`); }}
        />
      )}

      {showCreateCard && incident && (
        <CreateCardFromIncidentModal
          incident={incident}
          onClose={() => setShowCreateCard(false)}
          onCreated={(externalId) => {
            setShowCreateCard(false);
            setCreatedCardId(externalId);
            setTimeout(() => setCreatedCardId(null), 5000);
          }}
        />
      )}

      {createdCardId && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Card <span className="font-mono font-bold text-green-400">{createdCardId}</span> created from this incident
          <button onClick={() => setCreatedCardId(null)} className="ml-1 text-gray-400 hover:text-white">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </AppLayout>
  );
}
