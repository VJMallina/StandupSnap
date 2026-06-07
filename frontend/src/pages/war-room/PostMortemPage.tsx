import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import PushToRaidModal from './components/PushToRaidModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Severity = 'P1' | 'P2' | 'P3' | 'P4';
interface PostMortem {
  executiveSummary: string;
  timelineOfEvents: string;
  rootCause: string;
  contributingFactors: string[];
  resolutionSteps: string;
  preventiveActions: string[];
  lessonsLearned: string;
}
interface Incident {
  id: string; title: string; severity: Severity; status: string;
  projectId: string; declaredAt: string; resolvedAt?: string;
  resolutionSummary?: string; postMortem?: string; raidPushed: boolean;
}

function duration(from: string, to?: string) {
  const ms = new Date(to || Date.now()).getTime() - new Date(from).getTime();
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function PostMortemPage() {
  const { id } = useParams<{ id: string }>();
  useAuth();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [postMortem, setPostMortem] = useState<PostMortem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaid, setShowRaid] = useState(false);
  const [polling, setPolling] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  });

  useEffect(() => {
    if (!id) return;
    fetchIncident();
  }, [id]);

  const fetchIncident = async () => {
    try {
      const res = await fetch(`${API_URL}/incidents/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIncident(data);
      if (data.postMortem) {
        try { setPostMortem(JSON.parse(data.postMortem)); } catch {}
      } else {
        startPolling();
      }
    } catch {
      navigate('/war-room');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    setPolling(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const res = await fetch(`${API_URL}/incidents/${id}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.postMortem) {
          try { setPostMortem(JSON.parse(data.postMortem)); } catch {}
          setIncident(data);
          setPolling(false);
          clearInterval(interval);
        }
      }
      if (attempts > 12) { setPolling(false); clearInterval(interval); }
    }, 5000);
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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/war-room/${id}`)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Post-Mortem</h1>
            <p className="text-sm text-gray-500 mt-0.5">{incident.title}</p>
          </div>
          <div className="flex items-center gap-3">
            {incident.raidPushed ? (
              <span className="px-3 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-200">
                ✓ Pushed to RAID
              </span>
            ) : (
              <button
                onClick={() => setShowRaid(true)}
                disabled={!postMortem}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors"
              >
                Push to RAID Register
              </button>
            )}
          </div>
        </div>

        {/* Incident summary strip */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-gray-400 mb-0.5">Severity</p><p className="font-semibold text-gray-900">{incident.severity}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Duration</p><p className="font-semibold text-gray-900">{duration(incident.declaredAt, incident.resolvedAt)}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Declared</p><p className="font-semibold text-gray-900">{new Date(incident.declaredAt).toLocaleString()}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Resolved</p><p className="font-semibold text-gray-900">{incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : '—'}</p></div>
        </div>

        {polling && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-yellow-800">Generating AI post-mortem… this usually takes 10–15 seconds.</p>
          </div>
        )}

        {postMortem ? (
          <div className="space-y-5">
            <Section title="Executive Summary" content={postMortem.executiveSummary} />
            <Section title="Timeline of Events" content={postMortem.timelineOfEvents} />
            <Section title="Root Cause" content={postMortem.rootCause} highlight />
            <ListSection title="Contributing Factors" items={postMortem.contributingFactors} />
            <Section title="How We Fixed It" content={postMortem.resolutionSteps} />
            <ListSection title="Preventive Actions" items={postMortem.preventiveActions} accent />
            <Section title="Lessons Learned" content={postMortem.lessonsLearned} />
          </div>
        ) : !polling && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">Post-mortem generation failed or timed out. You can still use the timeline above.</p>
          </div>
        )}
      </div>

      {showRaid && incident && postMortem && (
        <PushToRaidModal
          incident={incident}
          postMortem={postMortem}
          onClose={() => setShowRaid(false)}
          onPushed={() => { setShowRaid(false); setIncident(prev => prev ? { ...prev, raidPushed: true } : prev); }}
        />
      )}
    </AppLayout>
  );
}

function Section({ title, content, highlight, accent }: { title: string; content: string; highlight?: boolean; accent?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${highlight ? 'border-red-200' : accent ? 'border-primary-200' : 'border-gray-200'}`}>
      <h3 className={`text-sm font-semibold mb-2 ${highlight ? 'text-red-700' : accent ? 'text-primary-700' : 'text-gray-700'}`}>{title}</h3>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  );
}

function ListSection({ title, items, accent }: { title: string; items: string[]; accent?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${accent ? 'border-primary-200' : 'border-gray-200'}`}>
      <h3 className={`text-sm font-semibold mb-3 ${accent ? 'text-primary-700' : 'text-gray-700'}`}>{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${accent ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
