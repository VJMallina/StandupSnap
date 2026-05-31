import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface OrgRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isEditable: boolean;
  permissions: string[];
  organizationId: string | null;
}

const PERMISSION_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Project', keys: ['project:create','project:view','project:view_all','project:edit','project:delete','project:archive','project:assign_members','project:set_member_role'] },
  { label: 'Sprint', keys: ['sprint:create','sprint:view','sprint:edit','sprint:delete','sprint:close'] },
  { label: 'Card', keys: ['card:create','card:view','card:view_all','card:edit','card:edit_any','card:delete','card:assign','card:change_status'] },
  { label: 'Snap', keys: ['snap:create','snap:view_own','snap:view_all','snap:edit_own','snap:edit_any','snap:delete_own','snap:delete_any','snap:lock_daily','snap:override_rag','snap:generate_summary'] },
  { label: 'Standup Book', keys: ['standup_book:view','standup_book:export'] },
  { label: 'RACI', keys: ['artifact:raci:view','artifact:raci:create','artifact:raci:edit','artifact:raci:delete'] },
  { label: 'Risks', keys: ['artifact:risk:view','artifact:risk:create','artifact:risk:edit','artifact:risk:delete','artifact:risk:archive','artifact:risk:export'] },
  { label: 'RAID', keys: ['artifact:raid:view','artifact:assumption:create','artifact:assumption:edit','artifact:assumption:delete','artifact:issue:create','artifact:issue:edit','artifact:issue:delete','artifact:decision:create','artifact:decision:edit','artifact:decision:delete'] },
  { label: 'Stakeholders', keys: ['artifact:stakeholder:view','artifact:stakeholder:create','artifact:stakeholder:edit','artifact:stakeholder:delete','artifact:stakeholder:archive'] },
  { label: 'Changes', keys: ['artifact:change:view','artifact:change:create','artifact:change:edit','artifact:change:delete','artifact:change:approve','artifact:change:archive','artifact:change:export'] },
  { label: 'MOM', keys: ['mom:view','mom:create','mom:edit','mom:delete','mom:export'] },
  { label: 'Reports', keys: ['report:view','report:view_all','dashboard:view_team','dashboard:view_org'] },
  { label: 'Org Admin', keys: ['user:invite','user:deactivate','user:view_all','role:view','role:create','role:edit','role:delete','role:assign','org:settings:view','org:settings:edit','audit:view'] },
];

const SYSTEM_ROLE_DESCRIPTIONS: Record<string, string> = {
  ORG_ADMIN: 'Full access to everything. Cannot be modified.',
  PMO: 'Cross-project visibility, artifact management, reporting.',
  SCRUM_MASTER: 'Manages sprints, cards, snaps, and team artifacts.',
  PRODUCT_OWNER: 'Manages product backlog, stakeholders, and changes.',
  MEMBER: 'Submits own snaps, views assigned cards.',
  VIEWER: 'Read-only access to project data.',
};

export default function OrgRolesPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderMode, setBuilderMode] = useState<'create' | 'edit'>('create');
  const [editingRole, setEditingRole] = useState<OrgRole | null>(null);

  // Builder state
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [builderError, setBuilderError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  });

  useEffect(() => {
    if (orgId) fetchRoles();
  }, [orgId]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/organizations/${orgId}/roles`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load roles');
      const data = await res.json();
      setRoles(data.roles || data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = (cloneFrom?: OrgRole) => {
    setBuilderMode('create');
    setEditingRole(null);
    setRoleName(cloneFrom ? `${cloneFrom.name} (copy)` : '');
    setRoleDescription('');
    setSelectedPerms(new Set(cloneFrom?.permissions || []));
    setBuilderError('');
    setShowBuilder(true);
  };

  const openEdit = (role: OrgRole) => {
    setBuilderMode('edit');
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setSelectedPerms(new Set(role.permissions));
    setBuilderError('');
    setShowBuilder(true);
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm); else next.add(perm);
      return next;
    });
  };

  const handleSave = async () => {
    if (!roleName.trim()) { setBuilderError('Role name is required.'); return; }
    if (selectedPerms.size === 0) { setBuilderError('Select at least one permission.'); return; }

    setSaving(true);
    setBuilderError('');
    try {
      const body = { name: roleName.trim(), description: roleDescription || null, permissions: Array.from(selectedPerms) };
      const url = builderMode === 'edit' && editingRole
        ? `${API_URL}/organizations/${orgId}/roles/${editingRole.id}`
        : `${API_URL}/organizations/${orgId}/roles`;
      const method = builderMode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save role');
      }
      setShowBuilder(false);
      fetchRoles();
    } catch (e) {
      setBuilderError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    try {
      const res = await fetch(`${API_URL}/organizations/${orgId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete role');
      setDeleteConfirm(null);
      fetchRoles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const systemRoles = roles.filter(r => r.isSystem);
  const customRoles = roles.filter(r => !r.isSystem);

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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
            <p className="text-sm text-gray-500 mt-1">System roles are read-only. Create custom roles for your org.</p>
          </div>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Role
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* System Roles */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">System Roles</h2>
          <div className="space-y-2">
            {systemRoles.map(role => (
              <div key={role.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                      {role.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                      <p className="text-xs text-gray-500">{SYSTEM_ROLE_DESCRIPTIONS[role.name] || `${role.permissions?.length || 0} permissions`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{role.permissions?.length || 0} perms</span>
                    <button
                      onClick={e => { e.stopPropagation(); openCreate(role); }}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 rounded hover:bg-primary-50"
                    >
                      Clone
                    </button>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRole === role.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedRole === role.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <div className="flex flex-wrap gap-1.5">
                      {(role.permissions || []).sort().map(p => (
                        <span key={p} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono">{p}</span>
                      ))}
                      {(!role.permissions || role.permissions.length === 0) && (
                        <span className="text-xs text-gray-400 italic">All permissions (ORG_ADMIN bypass)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Roles */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Custom Roles</h2>
          {customRoles.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">No custom roles yet.</p>
              <button onClick={() => openCreate()} className="mt-3 text-sm text-primary-600 font-medium hover:text-primary-800">
                Create your first custom role
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {customRoles.map(role => (
                <div key={role.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">
                        {role.name.charAt(0)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                        <p className="text-xs text-gray-500">{role.description || `${role.permissions?.length || 0} permissions`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{role.permissions?.length || 0} perms</span>
                      <button onClick={() => openEdit(role)} className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 rounded hover:bg-primary-50">Edit</button>
                      <button onClick={() => setDeleteConfirm(role.id)} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Role</h3>
              <p className="text-sm text-gray-600 mb-4">This will permanently delete the role. Users assigned this role will need to be reassigned.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Role Builder Modal */}
        {showBuilder && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
            <div className="bg-white rounded-xl max-w-2xl w-full mx-4 shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {builderMode === 'edit' ? 'Edit Role' : 'Create Custom Role'}
                </h2>
                <button onClick={() => setShowBuilder(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-5">
                {builderError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-800">{builderError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Delivery Lead"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={e => setRoleDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Permissions <span className="text-red-500">*</span></label>
                    <span className="text-xs text-gray-500">{selectedPerms.size} selected</span>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {PERMISSION_GROUPS.map(group => (
                      <div key={group.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.label}</p>
                          <button
                            type="button"
                            className="text-xs text-primary-600 hover:text-primary-800"
                            onClick={() => {
                              setSelectedPerms(prev => {
                                const next = new Set(prev);
                                const allSelected = group.keys.every(k => next.has(k));
                                if (allSelected) group.keys.forEach(k => next.delete(k));
                                else group.keys.forEach(k => next.add(k));
                                return next;
                              });
                            }}
                          >
                            {group.keys.every(k => selectedPerms.has(k)) ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.keys.map(perm => (
                            <button
                              key={perm}
                              type="button"
                              onClick={() => togglePerm(perm)}
                              className={`text-xs px-2 py-0.5 rounded font-mono transition-colors ${selectedPerms.has(perm) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {perm.split(':')[1] || perm}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button onClick={() => setShowBuilder(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : builderMode === 'edit' ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
