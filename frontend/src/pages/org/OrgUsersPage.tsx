import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface OrgRole {
  id: string;
  name: string;
  isSystem: boolean;
}

interface Member {
  id: string;
  userId: string;
  user: { id: string; username: string; email: string; name: string } | null;
  role: OrgRole | null;
  isActive: boolean;
  joinedAt: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: OrgRole | null;
  projectName: string | null;
  invitedBy: { name: string } | null;
  expiresAt: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN: 'Org Admin',
  PMO: 'PMO',
  SCRUM_MASTER: 'Scrum Master',
  PRODUCT_OWNER: 'Product Owner',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const ROLE_COLORS: Record<string, string> = {
  ORG_ADMIN: 'bg-purple-100 text-purple-800',
  PMO: 'bg-blue-100 text-blue-800',
  SCRUM_MASTER: 'bg-primary-100 text-primary-800',
  PRODUCT_OWNER: 'bg-green-100 text-green-800',
  MEMBER: 'bg-gray-100 text-gray-700',
  VIEWER: 'bg-slate-100 text-slate-600',
};

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  };
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

export default function OrgUsersPage() {
  const { user, isOrgAdmin } = useAuth();
  const orgId = user?.organizationId;

  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Role change state
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<{
    memberId: string;
    memberName: string;
    currentRole: OrgRole | null;
    newRoleId: string;
    newRole: OrgRole;
  } | null>(null);

  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');

    try {
      const [membersRes, invitationsRes, rolesRes] = await Promise.all([
        fetch(`${API_URL}/organizations/${orgId}/members`, { headers: authHeaders() }),
        isOrgAdmin ? fetch(`${API_URL}/organizations/${orgId}/invitations`, { headers: authHeaders() }) : Promise.resolve(null),
        fetch(`${API_URL}/organizations/${orgId}/roles`, { headers: authHeaders() }),
      ]);

      if (!membersRes.ok) throw new Error('Failed to load members');
      const membersData = await membersRes.json();
      setMembers(membersData.members || []);

      if (invitationsRes?.ok) {
        const invData = await invitationsRes.json();
        setInvitations(invData.invitations || []);
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.roles || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [orgId, isOrgAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'invitations' && orgId && isOrgAdmin) {
      fetch(`${API_URL}/organizations/${orgId}/invitations`, { headers: authHeaders() })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setInvitations(data.invitations || []); })
        .catch(() => {});
    }
  }, [activeTab]);

  // Pre-select first non-admin role for invite
  useEffect(() => {
    if (roles.length > 0 && !inviteRoleId) {
      const member = roles.find((r) => r.name === 'MEMBER') || roles[0];
      setInviteRoleId(member.id);
    }
  }, [roles]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const res = await fetch(`${API_URL}/organizations/${orgId}/members/invite`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: inviteEmail, orgRoleId: inviteRoleId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || 'Failed to send invite');
      }

      const sentRole = roles.find((r) => r.id === inviteRoleId);
      setInviteSuccess(`Invitation sent to ${inviteEmail} as ${ROLE_LABELS[sentRole?.name || ''] || sentRole?.name || 'Unknown'}`);
      setInviteEmail('');
      fetchData();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeInvitation = async (invId: string) => {
    if (!orgId || !confirm('Revoke this invitation?')) return;
    try {
      const res = await fetch(`${API_URL}/organizations/${orgId}/invitations/${invId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to revoke');
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  const handleChangeRole = async (memberId: string, newRoleId: string) => {
    if (!orgId) return;
    setChangingRoleFor(memberId);
    try {
      const res = await fetch(`${API_URL}/organizations/${orgId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ orgRoleId: newRoleId }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setChangingRoleFor(null);
    }
  };

  if (!orgId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500 text-sm">No organization context. Please contact support.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your organization's members and invitations</p>
          </div>
          {isOrgAdmin && (
            <button
              onClick={() => { setShowInviteModal(true); setInviteSuccess(''); setInviteError(''); }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Invite User
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Members</p>
            <p className="text-2xl font-bold text-gray-900">{members.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pending Invites</p>
            <p className="text-2xl font-bold text-amber-600">{invitations.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Active Members</p>
            <p className="text-2xl font-bold text-green-600">{members.filter((m) => m.isActive).length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Members ({members.length})
            </button>
            {isOrgAdmin && (
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'invitations'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Invitations
                {invitations.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    {invitations.length}
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <>
            {/* Members Table */}
            {activeTab === 'members' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {members.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="mt-3 text-sm text-gray-500">No members yet. Invite your team!</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        {isOrgAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <Avatar name={member.user?.name || member.user?.username || '?'} />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {member.user?.name || member.user?.username}
                                  {member.userId === user?.id && (
                                    <span className="ml-2 text-xs text-gray-400">(you)</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500">{member.user?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isOrgAdmin && member.userId !== user?.id ? (
                              <select
                                value={member.role?.id || ''}
                                disabled={changingRoleFor === member.userId}
                                onChange={(e) => {
                                  const selectedId = e.target.value;
                                  const newRole = roles.find((r) => r.id === selectedId);
                                  if (newRole) {
                                    setRoleModal({
                                      memberId: member.userId,
                                      memberName: member.user?.name || member.user?.username || 'this user',
                                      currentRole: member.role,
                                      newRoleId: selectedId,
                                      newRole,
                                    });
                                  }
                                }}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              >
                                {roles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {ROLE_LABELS[r.name] || r.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role?.name || ''] || 'bg-gray-100 text-gray-700'}`}>
                                {ROLE_LABELS[member.role?.name || ''] || member.role?.name || '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                              {member.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          {isOrgAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {member.userId !== user?.id && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${member.user?.name || member.user?.username} from the organization?`)) {
                                      fetch(`${API_URL}/organizations/${orgId}/members/${member.userId}`, {
                                        method: 'DELETE',
                                        headers: authHeaders(),
                                      }).then(() => fetchData()).catch(() => alert('Failed to remove member'));
                                    }
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Pending Invitations Table */}
            {activeTab === 'invitations' && isOrgAdmin && (
              <div>
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => fetchData()}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {invitations.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-3 text-sm text-gray-500">No pending invitations</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invited By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invitations.map((inv) => {
                        const isExpired = new Date(inv.expiresAt) < new Date();
                        return (
                          <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${isExpired ? 'opacity-60' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                                  {inv.projectName && <p className="text-xs text-gray-500">Project: {inv.projectName}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[inv.role?.name || ''] || 'bg-gray-100 text-gray-700'}`}>
                                {ROLE_LABELS[inv.role?.name || ''] || inv.role?.name || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {inv.invitedBy?.name || '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                {isExpired ? 'Expired' : new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <button
                                onClick={() => handleRevokeInvitation(inv.id)}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Role Change Confirmation Modal */}
      {roleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => !changingRoleFor && setRoleModal(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
              {/* Icon */}
              <div className="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Change Role</h3>
              <p className="text-sm text-gray-500 text-center mb-5">
                Update role for <span className="font-semibold text-gray-800">{roleModal.memberName}</span>
              </p>

              {/* Role transition */}
              <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-xl p-4 mb-6">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[roleModal.currentRole?.name || ''] || 'bg-gray-100 text-gray-700'}`}>
                    {ROLE_LABELS[roleModal.currentRole?.name || ''] || roleModal.currentRole?.name || '—'}
                  </span>
                </div>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[roleModal.newRole.name] || 'bg-gray-100 text-gray-700'}`}>
                    {ROLE_LABELS[roleModal.newRole.name] || roleModal.newRole.name}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setRoleModal(null)}
                  disabled={!!changingRoleFor}
                  className="flex-1 py-2.5 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleChangeRole(roleModal.memberId, roleModal.newRoleId);
                    setRoleModal(null);
                  }}
                  disabled={!!changingRoleFor}
                  className="flex-1 flex justify-center items-center py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {changingRoleFor ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Confirm Change'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">Invite a team member</h3>
                <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {inviteSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{inviteSuccess}</p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => { setInviteSuccess(''); setInviteEmail(''); }}
                      className="flex-1 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Invite another
                    </button>
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-4">
                  {inviteError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-800">{inviteError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                    <input
                      type="email"
                      required
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Org Role</label>
                    <select
                      required
                      value={inviteRoleId}
                      onChange={(e) => setInviteRoleId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {ROLE_LABELS[r.name] || r.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">This is their organization-wide role. Project roles are set separately.</p>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 py-2.5 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="flex-1 flex justify-center items-center py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {inviteLoading ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        'Send Invitation'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
