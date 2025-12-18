import { useState, useEffect } from 'react';
import { resourcesApi, Resource, ResourceRole } from '../../services/api/resources';

interface ResourceFormModalProps {
  projectId: string;
  resource: Resource | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResourceFormModal({ projectId, resource, onClose, onSuccess }: ResourceFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: ResourceRole.DEVELOPER,
    customRoleName: '',
    skills: [] as string[],
    weeklyAvailability: 40,
    weeklyWorkload: 0,
    notes: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resource) {
      setFormData({
        name: resource.name,
        role: resource.role,
        customRoleName: resource.customRoleName || '',
        skills: resource.skills || [],
        weeklyAvailability: resource.weeklyAvailability,
        weeklyWorkload: resource.weeklyWorkload,
        notes: resource.notes || '',
      });
    }
  }, [resource]);

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!formData.skills.includes(skillInput.trim())) {
        setFormData({
          ...formData,
          skills: [...formData.skills, skillInput.trim()],
        });
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate
      if (formData.role === ResourceRole.OTHER && !formData.customRoleName.trim()) {
        setError('Custom role name is required when role is "Other"');
        setLoading(false);
        return;
      }

      if (formData.weeklyAvailability <= 0) {
        setError('Weekly availability must be greater than 0');
        setLoading(false);
        return;
      }

      if (formData.weeklyWorkload < 0) {
        setError('Weekly workload cannot be negative');
        setLoading(false);
        return;
      }

      const payload: any = {
        name: formData.name,
        role: formData.role,
        skills: formData.skills,
        weeklyAvailability: formData.weeklyAvailability,
        weeklyWorkload: formData.weeklyWorkload,
        notes: formData.notes,
      };

      if (formData.role === ResourceRole.OTHER) {
        payload.customRoleName = formData.customRoleName;
      }

      if (resource) {
        // Update existing resource
        await resourcesApi.update(resource.id, payload);
      } else {
        // Create new resource
        payload.projectId = projectId;
        await resourcesApi.create(payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {resource ? 'Edit Resource' : 'Add New Resource'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 rounded-lg p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Resource Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., John Doe"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as ResourceRole })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {Object.values(ResourceRole).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Role Name (shown when role is "Other") */}
          {formData.role === ResourceRole.OTHER && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specify Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.customRoleName}
                onChange={(e) => setFormData({ ...formData, customRoleName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g., DevOps Engineer"
              />
            </div>
          )}

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skills (Press Enter to add)
            </label>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., React, TypeScript, Node.js"
            />
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:bg-teal-200 rounded-full p-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Availability & Workload */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weekly Availability (hours) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.5"
                value={formData.weeklyAvailability}
                onChange={(e) => setFormData({ ...formData, weeklyAvailability: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weekly Workload (hours) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.5"
                value={formData.weeklyWorkload}
                onChange={(e) => setFormData({ ...formData, weeklyWorkload: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Load Preview */}
          {formData.weeklyAvailability > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Load Preview:</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900">
                  {((formData.weeklyWorkload / formData.weeklyAvailability) * 100).toFixed(0)}%
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    ((formData.weeklyWorkload / formData.weeklyAvailability) * 100) < 80
                      ? 'bg-green-100 text-green-700'
                      : ((formData.weeklyWorkload / formData.weeklyAvailability) * 100) <= 100
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {((formData.weeklyWorkload / formData.weeklyAvailability) * 100) < 80
                    ? 'GREEN'
                    : ((formData.weeklyWorkload / formData.weeklyAvailability) * 100) <= 100
                    ? 'AMBER'
                    : 'RED'}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes / Constraints
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder="e.g., Part-time, Available afternoons only, etc."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? 'Saving...' : resource ? 'Update Resource' : 'Create Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
