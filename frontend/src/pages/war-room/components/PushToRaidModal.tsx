import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Severity = 'P1' | 'P2' | 'P3' | 'P4';
interface Incident { id: string; title: string; severity: Severity; projectId: string; declaredAt: string; }
interface PostMortem {
  executiveSummary: string; rootCause: string;
  contributingFactors: string[]; preventiveActions: string[]; resolutionSteps: string;
}
interface TeamMember { id: string; fullName: string; designationRole: string; }

interface Props {
  incident: Incident;
  postMortem: PostMortem;
  onClose: () => void;
  onPushed: () => void;
}

const SEV_TO_ISSUE: Record<Severity, string> = { P1: 'CRITICAL', P2: 'HIGH', P3: 'MEDIUM', P4: 'LOW' };
const SEV_TO_PROB: Record<Severity, string> = { P1: 'HIGH', P2: 'MEDIUM', P3: 'LOW', P4: 'LOW' };

export default function PushToRaidModal({ incident, postMortem, onClose, onPushed }: Props) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState('');

  // Issue fields
  const [issueTitle, setIssueTitle] = useState(`Incident: ${incident.title}`);
  const [issueSeverity, setIssueSeverity] = useState(SEV_TO_ISSUE[incident.severity]);
  const [issueOwnerId, setIssueOwnerId] = useState('');
  const [issueDescription, setIssueDescription] = useState(postMortem.executiveSummary);
  const [issueImpactSummary, setIssueImpactSummary] = useState(postMortem.rootCause);
  const [issueResolutionPlan, setIssueResolutionPlan] = useState(postMortem.resolutionSteps);

  // Risk fields
  const [riskTitle, setRiskTitle] = useState(`Systemic risk exposed by: ${incident.title}`);
  const [riskCategory, setRiskCategory] = useState('Infrastructure');
  const [riskStatement, setRiskStatement] = useState(postMortem.rootCause);
  const [riskProbability, setRiskProbability] = useState(SEV_TO_PROB[incident.severity]);
  const [riskStrategy, setRiskStrategy] = useState('MITIGATE');
  const [riskOwnerId, setRiskOwnerId] = useState('');
  const [riskMitigation, setRiskMitigation] = useState(postMortem.preventiveActions.join('\n'));

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  });

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch(`${API_URL}/team-members`, { headers: authHeaders() });
      if (res.ok) setTeamMembers(await res.json());
    } catch {}
  };

  const handlePush = async () => {
    if (!issueOwnerId) { setError('Please select an owner for the Issue.'); return; }
    if (!riskOwnerId) { setError('Please select an owner for the Risk.'); return; }
    setPushing(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/incidents/${incident.id}/push-to-raid`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          issue: {
            title: issueTitle,
            severity: issueSeverity,
            ownerId: issueOwnerId,
            description: issueDescription,
            impactSummary: issueImpactSummary,
            resolutionPlan: issueResolutionPlan,
          },
          risk: {
            title: riskTitle,
            category: riskCategory,
            riskStatement,
            probability: riskProbability,
            strategy: riskStrategy,
            ownerId: riskOwnerId,
            mitigationPlan: riskMitigation,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to push');
      onPushed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to push to RAID');
      setPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Push to RAID Register</h2>
          <p className="text-sm text-gray-500 mt-0.5">Review and edit the AI-pre-filled fields before creating records.</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
          )}

          {/* ISSUE */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">ISSUE</span>
              <span className="text-xs text-gray-400">Will be created as CLOSED (already resolved)</span>
            </div>
            <Field label="Title" required><input value={issueTitle} onChange={e => setIssueTitle(e.target.value)} className={INPUT} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Severity" required>
                <select value={issueSeverity} onChange={e => setIssueSeverity(e.target.value)} className={INPUT}>
                  {['CRITICAL','HIGH','MEDIUM','LOW'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Owner" required>
                <select value={issueOwnerId} onChange={e => setIssueOwnerId(e.target.value)} className={INPUT}>
                  <option value="">Select team member…</option>
                  {teamMembers.map(m => <option key={m.id} value={m.id}>{m.fullName} — {m.designationRole}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description"><textarea value={issueDescription} onChange={e => setIssueDescription(e.target.value)} rows={2} className={TEXTAREA} /></Field>
            <Field label="Impact Summary"><textarea value={issueImpactSummary} onChange={e => setIssueImpactSummary(e.target.value)} rows={2} className={TEXTAREA} /></Field>
            <Field label="Resolution Plan"><textarea value={issueResolutionPlan} onChange={e => setIssueResolutionPlan(e.target.value)} rows={2} className={TEXTAREA} /></Field>
          </div>

          {/* RISK */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">RISK</span>
              <span className="text-xs text-gray-400">Type: THREAT · Status: OPEN</span>
            </div>
            <Field label="Title" required><input value={riskTitle} onChange={e => setRiskTitle(e.target.value)} className={INPUT} /></Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Category" required><input value={riskCategory} onChange={e => setRiskCategory(e.target.value)} className={INPUT} /></Field>
              <Field label="Probability" required>
                <select value={riskProbability} onChange={e => setRiskProbability(e.target.value)} className={INPUT}>
                  {['LOW','MEDIUM','HIGH','VERY_HIGH'].map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Strategy" required>
                <select value={riskStrategy} onChange={e => setRiskStrategy(e.target.value)} className={INPUT}>
                  {['AVOID','MITIGATE','ACCEPT','TRANSFER','EXPLOIT'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Owner" required>
              <select value={riskOwnerId} onChange={e => setRiskOwnerId(e.target.value)} className={INPUT}>
                <option value="">Select team member…</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.fullName} — {m.designationRole}</option>)}
              </select>
            </Field>
            <Field label="Risk Statement"><textarea value={riskStatement} onChange={e => setRiskStatement(e.target.value)} rows={2} className={TEXTAREA} /></Field>
            <Field label="Mitigation Plan"><textarea value={riskMitigation} onChange={e => setRiskMitigation(e.target.value)} rows={3} className={TEXTAREA} /></Field>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handlePush}
            disabled={pushing}
            className="flex-1 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {pushing ? 'Creating records...' : 'Confirm Push to RAID'}
          </button>
        </div>
      </div>
    </div>
  );
}

const INPUT = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const TEXTAREA = `${INPUT} resize-none`;

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
