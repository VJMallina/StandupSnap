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
      <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Create New Project</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name *</label>
          <div className="relative">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter project name"
            />
            {checkingName && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
              if (errors.description) setErrors({ ...errors, description: '' });
            }}
            className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={4}
            placeholder="Describe your project (optional)"
          />
          <div className="mt-1 flex justify-between text-sm text-gray-500">
            <span>{errors.description && <span className="text-red-600">{errors.description}</span>}</span>
            <span>{formData.description.length}/500</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => {
                setFormData({ ...formData, startDate: e.target.value });
                if (errors.startDate) setErrors({ ...errors, startDate: '' });
              }}
              className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date *</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => {
                setFormData({ ...formData, endDate: e.target.value });
                if (errors.endDate) setErrors({ ...errors, endDate: '' });
              }}
              className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.endDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">Product Owner</label>
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
                className={`text-xs px-2 py-1 rounded ${
                  invitePO
                    ? 'bg-blue-100 text-blue-700'
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
                  className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.poEmail ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email to invite"
                />
                {errors.poEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.poEmail}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">An invitation will be sent to this email</p>
              </div>
            ) : (
              <div>
                <select
                  value={formData.productOwnerId}
                  onChange={(e) => setFormData({ ...formData, productOwnerId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Not assigned</option>
                  {productOwners.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Optional - Assign a Product Owner to this project</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">PMO</label>
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
                className={`text-xs px-2 py-1 rounded ${
                  invitePMO
                    ? 'bg-blue-100 text-blue-700'
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
                  className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.pmoEmail ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email to invite"
                />
                {errors.pmoEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.pmoEmail}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">An invitation will be sent to this email</p>
              </div>
            ) : (
              <div>
                <select
                  value={formData.pmoId}
                  onChange={(e) => setFormData({ ...formData, pmoId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Not assigned</option>
                  {pmos.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Optional - Assign a PMO to this project</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Mark project as active</label>
        </div>

        <div className="flex gap-4 pt-6 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
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
              'Create Project'
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
      </div>
    </AppLayout>
  );
}
