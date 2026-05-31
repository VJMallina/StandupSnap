import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { formatOrgRole } from '../constants/roles';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Step = 1 | 2 | 3;

interface PersonalInfo {
  name: string;
  email: string;
  username: string;
  password: string;
}

interface OrgInfo {
  orgName: string;
  orgSlug: string;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center justify-center space-x-2 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
              step < current
                ? 'bg-primary-600 text-white'
                : step === current
                ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step < current ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              step
            )}
          </div>
          {step < total && (
            <div
              className={`w-10 h-0.5 mx-1 transition-all duration-200 ${
                step < current ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface InvitePreview {
  orgName: string;
  roleName: string;
  inviterName: string | null;
}


export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const orgInviteToken = searchParams.get('token');

  const [step, setStep] = useState<Step>(1);
  const [personal, setPersonal] = useState<PersonalInfo>({ name: '', email: '', username: '', password: '' });
  const [org, setOrg] = useState<OrgInfo>({ orgName: '', orgSlug: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);

  const { refreshSession } = useAuth();
  const navigate = useNavigate();

  // If invitation token is present, we skip the org step
  const hasInviteToken = !!orgInviteToken;

  useEffect(() => {
    setOrg((prev) => ({ ...prev, orgSlug: slugify(org.orgName) }));
  }, [org.orgName]);

  // Fetch invite preview so we can show org/role context on the register form
  useEffect(() => {
    if (!orgInviteToken) return;
    fetch(`${API_URL}/organizations/invitations/${orgInviteToken}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.invitation) {
          setInvitePreview({
            orgName: data.invitation.orgName,
            roleName: data.invitation.roleName,
            inviterName: data.invitation.inviterName,
          });
        }
      })
      .catch(() => {});
  }, [orgInviteToken]);

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (personal.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (hasInviteToken) {
      // Invitation flow: register and redirect to accept page
      await submitRegistration();
    } else {
      setStep(2);
    }
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    await submitRegistration();
  };

  const submitRegistration = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 1: Register user
      const registerRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personal.name,
          email: personal.email,
          username: personal.username,
          password: personal.password,
          roleName: 'scrum_master',
        }),
      });

      if (!registerRes.ok) {
        const err = await registerRes.json();
        throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || 'Registration failed');
      }

      const registerData = await registerRes.json();
      localStorage.setItem('accessToken', registerData.accessToken);
      localStorage.setItem('refreshToken', registerData.refreshToken);

      if (hasInviteToken) {
        // Populate AuthContext user state so InviteAcceptPage sees the user as authenticated
        await refreshSession();
        navigate(`/invite/accept?token=${orgInviteToken}`);
        return;
      }

      // Step 2: Create organization
      const orgRes = await fetch(`${API_URL}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${registerData.accessToken}`,
        },
        body: JSON.stringify({
          name: org.orgName,
          slug: org.orgSlug,
        }),
      });

      if (!orgRes.ok) {
        const err = await orgRes.json();
        throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || 'Failed to create organization');
      }

      // Step 3: Refresh token to include org context in JWT
      await refreshSession();

      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-150 sm:text-sm';

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <AuthLayout showTagline={true}>
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          {!hasInviteToken && step < 3 && <StepIndicator current={step} total={2} />}
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {step === 1 && (hasInviteToken ? 'Create your account' : 'Personal details')}
            {step === 2 && 'Set up your organization'}
            {step === 3 && "You're all set!"}
          </h2>
          <p className="text-sm text-gray-600">
            {step === 1 && hasInviteToken && invitePreview ? (
              <>
                Join <span className="font-semibold">{invitePreview.orgName}</span> as{' '}
                <span className="font-semibold">{formatOrgRole(invitePreview.roleName)}</span>
                {invitePreview.inviterName && (
                  <> · Invited by <span className="font-semibold">{invitePreview.inviterName}</span></>
                )}
              </>
            ) : (
              <>
                {step === 1 && 'Start by entering your personal information'}
                {step === 2 && 'Your org is where your team lives'}
                {step === 3 && 'Your account and organization are ready'}
              </>
            )}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1 — Personal Info */}
        {step === 1 && (
          <form className="space-y-3" onSubmit={handlePersonalSubmit}>
            <div>
              <label className={labelClass}>Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input type="text" required placeholder="Your full name" className={inputClass} value={personal.name} onChange={(e) => setPersonal((p) => ({ ...p, name: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Work Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input type="email" required placeholder="you@company.com" className={inputClass} value={personal.email} onChange={(e) => setPersonal((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <input type="text" required minLength={4} maxLength={50} pattern="[A-Za-z0-9_]+" placeholder="Choose a username" className={inputClass} value={personal.username} onChange={(e) => setPersonal((p) => ({ ...p, username: e.target.value }))} />
              </div>
              <p className="mt-1 text-xs text-gray-500">4–50 chars, letters, numbers, underscore</p>
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition duration-150 sm:text-sm"
                  value={personal.password}
                  onChange={(e) => setPersonal((p) => ({ ...p, password: e.target.value }))}
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword((s) => !s)}>
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </>
              ) : hasInviteToken ? (
                'Create account & accept invite'
              ) : (
                'Continue'
              )}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* Step 2 — Organization */}
        {step === 2 && (
          <form className="space-y-4" onSubmit={handleOrgSubmit}>
            <div>
              <label className={labelClass}>Organization Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  className={inputClass}
                  value={org.orgName}
                  onChange={(e) => setOrg((o) => ({ ...o, orgName: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Organization Slug</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <input
                  type="text"
                  required
                  pattern="[a-z0-9-]+"
                  minLength={2}
                  maxLength={50}
                  placeholder="acme-corp"
                  className={inputClass}
                  value={org.orgSlug}
                  onChange={(e) => setOrg((o) => ({ ...o, orgSlug: slugify(e.target.value) }))}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Lowercase letters, numbers, hyphens only. Used as your org URL identifier.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 px-4 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-all duration-150"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !org.orgName || !org.orgSlug}
                className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 3 — Success */}
        {step === 3 && (
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Account created!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Welcome to <span className="font-semibold">{org.orgName}</span>. You're the admin.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-150 shadow-lg"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
