import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { formatOrgRole } from '../constants/roles';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface InvitationDetails {
  id: string;
  email: string;
  orgName: string;
  orgId: string;
  roleName: string;
  projectName: string | null;
  inviterName: string | null;
  expiresAt: string;
  status: string;
}


export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);

  const { isAuthenticated, user, refreshSession } = useAuth();

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.');
      setFetchLoading(false);
      return;
    }

    // Fetch on mount (unauthenticated preview) and again when auth state changes
    // (so the Accept button appears once logged in).
    fetchInvitationDetails();
  }, [token, isAuthenticated]);

  const fetchInvitationDetails = async () => {
    setFetchLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      const res = await fetch(`${API_URL}/organizations/invitations/${token}`, {
        headers,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Invitation not found or already used');
      }

      const data = await res.json();
      setInvitation(data.invitation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    setAcceptLoading(true);
    setError('');

    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/organizations/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to accept invitation');
      }

      // Refresh JWT to include new org context
      await refreshSession();
      setAccepted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAcceptLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <div className="text-center space-y-4 py-8">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Invalid invitation link</h2>
          <p className="text-sm text-gray-600">This link is missing the invitation token.</p>
          <Link to="/login" className="inline-block text-primary-600 font-semibold hover:underline text-sm">
            Go to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // Not authenticated — prompt to login or register
  if (!isAuthenticated) {
    return (
      <AuthLayout showTagline={true}>
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            {fetchLoading ? (
              <div className="flex justify-center py-2">
                <svg className="animate-spin h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : invitation ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  You've been invited to <span className="text-primary-600">{invitation.orgName}</span>
                </h2>
                <p className="text-sm text-gray-600">
                  Join as{' '}
                  <span className="font-semibold">{formatOrgRole(invitation.roleName)}</span>
                  {invitation.inviterName && (
                    <> · Invited by <span className="font-semibold">{invitation.inviterName}</span></>
                  )}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">You've been invited</h2>
                <p className="text-sm text-gray-600">
                  Sign in or create an account to accept the invitation.
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to={`/login?redirect=/invite/accept?token=${token}`}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-150 shadow-lg"
            >
              Sign in to accept
            </Link>
            <Link
              to={`/register?token=${token}`}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-150"
            >
              Create a new account
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Accepted successfully
  if (accepted && invitation) {
    return (
      <AuthLayout>
        <div className="text-center space-y-6 py-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">You've joined {invitation.orgName}!</h2>
            <p className="text-sm text-gray-600 mt-1">
              You're now a{' '}
              <span className="font-semibold">{formatOrgRole(invitation.roleName)}</span>
              {invitation.projectName && (
                <> in <span className="font-semibold">{invitation.projectName}</span></>
              )}
              .
            </p>
          </div>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="w-full py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 focus:outline-none transition-all duration-150 shadow-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout showTagline={true}>
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Accept Invitation</h2>
          <p className="text-sm text-gray-600">
            You're signed in as <span className="font-semibold">{user?.email}</span>
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {fetchLoading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : invitation ? (
          <>
            {/* Invitation details card */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Organization</span>
                <span className="text-sm font-semibold text-gray-900">{invitation.orgName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your role</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {formatOrgRole(invitation.roleName)}
                </span>
              </div>
              {invitation.projectName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Project</span>
                  <span className="text-sm font-semibold text-gray-900">{invitation.projectName}</span>
                </div>
              )}
              {invitation.inviterName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invited by</span>
                  <span className="text-sm text-gray-700">{invitation.inviterName}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expires</span>
                <span className="text-sm text-gray-700">
                  {new Date(invitation.expiresAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Email mismatch warning */}
            {invitation.email !== user?.email && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <div className="flex">
                  <svg className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-amber-800">
                    This invitation was sent to <strong>{invitation.email}</strong>. You're signed in as <strong>{user?.email}</strong>. The accept will fail unless the emails match.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={acceptLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-lg"
            >
              {acceptLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Accepting...
                </>
              ) : (
                `Join ${invitation.orgName}`
              )}
            </button>
          </>
        ) : null}
      </div>
    </AuthLayout>
  );
}
