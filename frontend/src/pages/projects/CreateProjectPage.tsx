import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../../services/api/projects';
import { usersApi, User } from '../../services/api/users';
import { invitationsApi } from '../../services/api/invitations';
import AppLayout from '../../components/AppLayout';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true,
    productOwnerId: '',
    pmoId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [productOwners, setProductOwners] = useState<User[]>([]);
  const [pmos, setPmos] = useState<User[]>([]);
  const [checkingName, setCheckingName] = useState(false);

  // Invite mode state
  const [invitePO, setInvitePO] = useState(false);
  const [invitePMO, setInvitePMO] = useState(false);
  const [poEmail, setPoEmail] = useState('');
  const [pmoEmail, setPmoEmail] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  // Debounced name uniqueness check
  useEffect(() => {
    const checkNameUniqueness = async () => {
      if (!formData.name.trim() || formData.name.length < 3) {
        return;
      }

      setCheckingName(true);
      try {
        const result = await projectsApi.checkNameUniqueness(formData.name.trim());
        if (!result.isUnique) {
          setErrors(prev => ({ ...prev, name: 'A project with this name already exists' }));
        } else {
          setErrors(prev => {
            const { name, ...rest } = prev;
            return rest;
          });
        }
      } catch (err) {
        // If API fails, don't block the user - backend will handle it on submit
        console.error('Failed to check name uniqueness:', err);
      } finally {
        setCheckingName(false);
      }
    };

    const timer = setTimeout(() => {
      checkNameUniqueness();
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [formData.name]);

  const loadUsers = async () => {
    try {
      // For now, get all users until role filtering is properly implemented
      const allUsers = await usersApi.getAll();
      setProductOwners(allUsers);
      setPmos(allUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Project name must not exceed 100 characters';
    }

    // Start date validation
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    // End date validation (mandatory)
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    // Description validation (optional but with limit)
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must not exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    // Validate invite emails
    if (invitePO && !poEmail.trim()) {
      setErrors(prev => ({ ...prev, poEmail: 'Email is required for invitation' }));
      return;
    }
    if (invitePMO && !pmoEmail.trim()) {
      setErrors(prev => ({ ...prev, pmoEmail: 'Email is required for invitation' }));
      return;
    }

    setLoading(true);

    try {
      // Create project first
      const project = await projectsApi.create({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        productOwnerId: invitePO ? undefined : (formData.productOwnerId || undefined),
        pmoId: invitePMO ? undefined : (formData.pmoId || undefined),
        isActive: formData.isActive,
      });

      // Send invitations if needed
      const invitationPromises: Promise<any>[] = [];

      if (invitePO && poEmail.trim()) {
        invitationPromises.push(
          invitationsApi.create({
            email: poEmail.trim(),
            assignedRole: 'product_owner',
            projectId: project.id,
          })
        );
      }

      if (invitePMO && pmoEmail.trim()) {
        invitationPromises.push(
          invitationsApi.create({
            email: pmoEmail.trim(),
            assignedRole: 'pmo',
            projectId: project.id,
          })
        );
      }

      if (invitationPromises.length > 0) {
        await Promise.all(invitationPromises);
      }

      navigate('/projects');
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center text-gray-600 hover:text-primary-600 transition-colors mb-4 group"
            >
              <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Projects
            </button>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-xl">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
                <p className="text-gray-500 mt-1">Set up your project details and team</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Basic Information
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: '' });
                      }}
                      className={`w-full border-2 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                        errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="Enter a unique project name"
                    />
                    {checkingName && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      if (errors.description) setErrors({ ...errors, description: '' });
                    }}
                    className={`w-full border-2 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none ${
                      errors.description ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    rows={4}
                    placeholder="Describe your project goals and scope (optional)"
                  />
                  <div className="mt-2 flex justify-between text-sm">
                    <span>{errors.description && <span className="text-red-600">{errors.description}</span>}</span>
                    <span className={`${formData.description.length > 450 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {formData.description.length}/500
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Project Timeline
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData({ ...formData, startDate: e.target.value });
                      if (errors.startDate) setErrors({ ...errors, startDate: '' });
                    }}
                    className={`w-full border-2 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                      errors.startDate ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  />
                  {errors.startDate && (
                    <p className="mt-2 text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => {
                      setFormData({ ...formData, endDate: e.target.value });
                      if (errors.endDate) setErrors({ ...errors, endDate: '' });
                    }}
                    className={`w-full border-2 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                      errors.endDate ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  />
                  {errors.endDate && (
                    <p className="mt-2 text-sm text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Team Assignment Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Team Assignment
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Product Owner</label>
                    <button
                      type="button"
                      onClick={() => {
                        setInvitePO(!invitePO);
                        if (!invitePO) {
                          setFormData({ ...formData, productOwnerId: '' });
                        } else {
                          setPoEmail('');
                        }
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        invitePO
                          ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {invitePO ? 'Select Existing' : 'Invite New'}
                    </button>
                  </div>
                  {invitePO ? (
                    <div>
                      <input
                        type="email"
                        value={poEmail}
                        onChange={(e) => {
                          setPoEmail(e.target.value);
                          if (errors.poEmail) setErrors({ ...errors, poEmail: '' });
                        }}
                        className={`w-full border-2 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                          errors.poEmail ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="email@example.com"
                      />
                      {errors.poEmail && (
                        <p className="mt-2 text-sm text-red-600">{errors.poEmail}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Invitation will be sent
                      </p>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={formData.productOwnerId}
                        onChange={(e) => setFormData({ ...formData, productOwnerId: e.target.value })}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-gray-300 bg-white"
                      >
                        <option value="">Not assigned</option>
                        {productOwners.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">Optional</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">PMO</label>
                    <button
                      type="button"
                      onClick={() => {
                        setInvitePMO(!invitePMO);
                        if (!invitePMO) {
                          setFormData({ ...formData, pmoId: '' });
                        } else {
                          setPmoEmail('');
                        }
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        invitePMO
                          ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {invitePMO ? 'Select Existing' : 'Invite New'}
                    </button>
                  </div>
                  {invitePMO ? (
                    <div>
                      <input
                        type="email"
                        value={pmoEmail}
                        onChange={(e) => {
                          setPmoEmail(e.target.value);
                          if (errors.pmoEmail) setErrors({ ...errors, pmoEmail: '' });
                        }}
                        className={`w-full border-2 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                          errors.pmoEmail ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="email@example.com"
                      />
                      {errors.pmoEmail && (
                        <p className="mt-2 text-sm text-red-600">{errors.pmoEmail}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Invitation will be sent
                      </p>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={formData.pmoId}
                        onChange={(e) => setFormData({ ...formData, pmoId: e.target.value })}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-gray-300 bg-white"
                      >
                        <option value="">Not assigned</option>
                        {pmos.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">Optional</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Settings Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formData.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <svg className={`w-5 h-5 ${formData.isActive ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Active Project
                    </label>
                    <p className="text-xs text-gray-500">Project will be visible and accessible to team members</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Project...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Project
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
