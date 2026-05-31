import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Plan = 'free' | 'pro' | 'enterprise';

interface OrgDetails {
  id: string;
  name: string;
  plan: Plan;
  maxUsers: number | null;
  createdAt: string;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  };
}

const PLAN_DETAILS: Record<Plan, {
  label: string;
  color: string;
  badge: string;
  price: string;
  features: string[];
}> = {
  free: {
    label: 'Free',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    badge: 'bg-gray-100 text-gray-700',
    price: '$0 / month',
    features: [
      'Up to 10 users',
      '3 active projects',
      'Core standup & snap features',
      'Basic RAG tracking',
      'Community support',
    ],
  },
  pro: {
    label: 'Pro',
    color: 'bg-primary-50 text-primary-800 border-primary-200',
    badge: 'bg-primary-100 text-primary-800',
    price: '$49 / month',
    features: [
      'Up to 50 users',
      'Unlimited projects',
      'Full artifact suite (RAID, RACI, Stakeholders)',
      'AI-powered MOM generation',
      'Schedule builder & resource tracker',
      'Scrum ceremony rooms',
      'Priority email support',
      'Audit log (30-day retention)',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    badge: 'bg-purple-100 text-purple-800',
    price: 'Custom pricing',
    features: [
      'Unlimited users',
      'Unlimited projects',
      'All Pro features',
      'Custom role builder',
      'Domain verification & auto-join',
      'Confidential project controls',
      'Full audit log (unlimited retention)',
      'Dedicated Slack / Teams support',
      'SLA guarantee',
      'Custom onboarding & training',
    ],
  },
};

const ALL_PLANS: Plan[] = ['free', 'pro', 'enterprise'];

export default function OrgBillingPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    fetch(`${API_URL}/organizations/${orgId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.organization) setOrg(data.organization);
        else setError('Failed to load organization details.');
      })
      .catch(() => setError('Network error loading org details.'))
      .finally(() => setLoading(false));
  }, [orgId]);

  const currentPlan: Plan = (org?.plan as Plan) || 'free';
  const current = PLAN_DETAILS[currentPlan];

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 text-red-600">{error}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your organization's subscription plan.</p>
        </div>

        {/* Current Plan Card */}
        <div className={`rounded-2xl border-2 p-6 ${current.color}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${current.badge}`}>
                  Current Plan
                </span>
                <h2 className="text-xl font-bold">{current.label}</h2>
              </div>
              <p className="text-2xl font-black mt-2">{current.price}</p>
              <p className="text-sm mt-1 opacity-70">
                Organization: <span className="font-semibold">{org?.name}</span>
              </p>
              {org?.maxUsers && (
                <p className="text-sm mt-0.5 opacity-70">
                  User limit: <span className="font-semibold">{org.maxUsers}</span>
                </p>
              )}
            </div>
            <div className="hidden sm:block">
              <svg className="w-16 h-16 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
              </svg>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-2">What's included</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {current.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Plan Comparison */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">All Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ALL_PLANS.map((plan) => {
              const details = PLAN_DETAILS[plan];
              const isCurrent = plan === currentPlan;
              return (
                <div
                  key={plan}
                  className={`rounded-2xl border-2 p-5 flex flex-col transition-shadow ${
                    isCurrent
                      ? 'border-primary-400 shadow-md bg-white'
                      : 'border-gray-100 bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-gray-900">{details.label}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-black text-gray-800 mb-3">{details.price}</p>
                  <ul className="space-y-1.5 flex-1">
                    {details.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-sm text-gray-600">
                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={isCurrent}
                    className={`mt-5 w-full py-2 rounded-xl text-sm font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : plan === 'enterprise'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                    onClick={() => {
                      if (!isCurrent) {
                        window.alert('To change your plan, contact support at support@standupsnap.com');
                      }
                    }}
                  >
                    {isCurrent ? 'Current Plan' : plan === 'enterprise' ? 'Contact Sales' : `Upgrade to ${details.label}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info banner */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3 items-start">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Billing management coming soon</p>
            <p className="mt-0.5">
              Self-service billing is under development. To upgrade your plan or manage payment methods, contact{' '}
              <a href="mailto:support@standupsnap.com" className="underline font-medium">
                support@standupsnap.com
              </a>.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
