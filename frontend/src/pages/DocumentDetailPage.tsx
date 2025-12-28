import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { artifactsApi } from '../services/api/artifacts';
import {
  ArtifactInstance,
  ArtifactVersion,
  ArtifactStatus,
  getStatusInfo,
} from '../types/artifact';
import { FormPreview } from '../components/form-builder/FormPreview';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instance, setInstance] = useState<ArtifactInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [documentStatus, setDocumentStatus] = useState<ArtifactStatus>(ArtifactStatus.DRAFT);
  const [documentName, setDocumentName] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      loadInstance();
    }
  }, [id]);

  const loadInstance = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await artifactsApi.getInstanceById(id);
      setInstance(data);
      setDocumentStatus(data.status);
      setDocumentName(data.name);
      setDocumentDescription(data.description || '');
      if (data.currentVersion) {
        setFormData(data.currentVersion.data || {});
      }
    } catch (err) {
      console.error('Failed to load document', err);
      alert('Failed to load document');
      navigate('/artifacts/documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!id) return;

    try {
      setSaving(true);

      // Update document metadata
      await artifactsApi.updateInstance(id, {
        name: documentName,
        description: documentDescription,
        status: documentStatus,
      });

      await loadInstance();
      setIsEditing(false);
      alert('Document saved successfully');
    } catch (err) {
      console.error('Failed to save document', err);
      alert('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContent = async () => {
    if (!id) return;

    try {
      setSaving(true);
      // Update the current version data without creating a new version
      await artifactsApi.updateInstanceData(id, formData);
      await loadInstance();
      alert('Content saved successfully');
    } catch (err) {
      console.error('Failed to save content', err);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <ArtifactsNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">Loading document...</div>
        </div>
      </AppLayout>
    );
  }

  if (!instance) {
    return (
      <AppLayout>
        <ArtifactsNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">Document not found</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ArtifactsNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-700 rounded-xl p-6 shadow-xl text-white mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{instance.name}</h1>
              {instance.template && (
                <p className="text-white/90 text-sm">Template: {instance.template.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium bg-${getStatusInfo(instance.status).color}-100 text-${getStatusInfo(instance.status).color}-700`}
              >
                {getStatusInfo(instance.status).label}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">{/* Main Content */}
            {/* Document Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Document Information</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Edit Info
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setDocumentName(instance.name);
                        setDocumentDescription(instance.description || '');
                        setDocumentStatus(instance.status);
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDocument}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{instance.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  {isEditing ? (
                    <textarea
                      value={documentDescription}
                      onChange={(e) => setDocumentDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-700">{instance.description || 'No description'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  {isEditing ? (
                    <select
                      value={documentStatus}
                      onChange={(e) => setDocumentStatus(e.target.value as ArtifactStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={ArtifactStatus.DRAFT}>Draft</option>
                      <option value={ArtifactStatus.IN_PROGRESS}>In Progress</option>
                      <option value={ArtifactStatus.COMPLETED}>Completed</option>
                      <option value={ArtifactStatus.ARCHIVED}>Archived</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{getStatusInfo(instance.status).label}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Document Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Document Content</h2>
                <button
                  onClick={handleSaveContent}
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
              {instance.template && (
                <FormPreview
                  fields={instance.template.templateStructure?.fields || []}
                  data={formData}
                  onChange={(newData) => {
                    setFormData(newData);
                  }}
                  readOnly={false}
                />
              )}
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
