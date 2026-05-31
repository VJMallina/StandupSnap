import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type DomainPolicy = 'invite_only' | 'auto_join';

interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  plan: string;
  isActive: boolean;
  maxUsers: number | null;
  createdAt: string;
  domainPolicy: DomainPolicy;
  description: string | null;
}

export default function OrgSettingsPage() {
  const { user, logout } = useAuth();
  const orgId = user?.organizationId;

  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);
  const [dangerConfirmText, setDangerConfirmText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [domainPolicy, setDomainPolicy] = useState<DomainPolicy>('invite_only');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  });

  useEffect(() => {
    if (!orgId) return;
    fetchOrg();
  }, [orgId]);

  const fetchOrg = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/organizations/${orgId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load org settings');
      const data = await res.json();
      const o: OrgDetails = data.organization || data;
      setOrg(o);
      setName(o.name || '');
      setDomain(o.domain || '');
      setLogoUrl(o.logoUrl || '');
      setDomainPolicy(o.domainPolicy || 'invite_only');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/organizations/${orgId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          domain: domain || null,
          logoUrl: logoUrl || null,
          domainPolicy,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save');
      }
      setSuccess('Settings saved successfully.');
      fetchOrg();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!orgId || dangerConfirmText !== org?.name) return;
    setDeactivating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/organizations/${orgId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to deactivate');
      }
      await logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to deactivate');
      setDeactivating(false);
    }
  };

  const planColors: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700',
    PRO: 'bg-blue-100 text-blue-700',
    ENTERPRISE: 'bg-purple-100 text-purple-700',
    free: 'bg-gray-100 text-gray-700',
    pro: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700',
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your organization profile and configuration.</p>
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
            {/* Plan badge */}
            {org && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Current Plan</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${planColors[org.plan] || 'bg-gray-100 text-gray-700'}`}>
                      {org.plan.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Organization ID</p>
                    <p className="text-xs font-mono text-gray-700 mt-0.5">{org.id}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Editable profile */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="text-base font-semibold text-gray-900">Organization Profile</h2>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Your organization name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={org?.slug || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Slug cannot be changed after creation.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input
                  type="text"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. yourcompany.com"
                />
                <p className="text-xs text-gray-400 mt-1">Used for domain-based auto-join and verification.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://example.com/logo.png"
                />
                {logoUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="h-10 w-10 rounded-lg object-contain border border-gray-200 bg-gray-50"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-xs text-gray-500">Logo preview</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Domain Policy */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Membership Policy</h2>
              <p className="text-sm text-gray-500 mb-4">Control how users can join this organization.</p>

              <div className="space-y-3">
                <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${domainPolicy === 'invite_only' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="domainPolicy"
                    value="invite_only"
                    checked={domainPolicy === 'invite_only'}
                    onChange={() => setDomainPolicy('invite_only')}
                    className="mt-1 accent-primary-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Invite Only</p>
                    <p className="text-xs text-gray-500 mt-0.5">Users can only join via an invitation link sent by an admin. Recommended for most teams.</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${domainPolicy === 'auto_join' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="domainPolicy"
                    value="auto_join"
                    checked={domainPolicy === 'auto_join'}
                    onChange={() => setDomainPolicy('auto_join')}
                    className="mt-1 accent-primary-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Auto Join</p>
                    <p className="text-xs text-gray-500 mt-0.5">Anyone with a verified email matching your domain can join automatically. Requires a domain to be set above.</p>
                  </div>
                </label>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </div>

            {/* Read-only stats */}
            {org && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Organization Info</h2>
                <dl className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Status</dt>
                    <dd>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${org.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {org.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                  {org.maxUsers && (
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Max Users</dt>
                      <dd className="font-medium text-gray-900">{org.maxUsers}</dd>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Created</dt>
                    <dd className="text-gray-700">{new Date(org.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border-2 border-red-200 p-6">
              <h2 className="text-base font-semibold text-red-700 mb-1">Danger Zone</h2>
              <p className="text-sm text-gray-500 mb-4">Irreversible actions. Proceed with caution.</p>

              {!showDangerConfirm ? (
                <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-200">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Deactivate Organization</p>
                    <p className="text-xs text-gray-500 mt-0.5">This will deactivate the organization and log out all members. This action cannot be undone.</p>
                  </div>
                  <button
                    onClick={() => setShowDangerConfirm(true)}
                    className="ml-4 flex-shrink-0 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Deactivate
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                  <p className="text-sm font-semibold text-red-800">Are you absolutely sure?</p>
                  <p className="text-xs text-gray-600">
                    Type <span className="font-mono font-bold text-gray-900">{org?.name}</span> to confirm deactivation.
                  </p>
                  <input
                    type="text"
                    value={dangerConfirmText}
                    onChange={e => setDangerConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder={org?.name}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowDangerConfirm(false); setDangerConfirmText(''); }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeactivate}
                      disabled={dangerConfirmText !== org?.name || deactivating}
                      className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {deactivating ? 'Deactivating...' : 'Confirm Deactivate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
