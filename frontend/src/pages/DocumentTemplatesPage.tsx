import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { artifactsApi } from '../services/api/artifacts';
import {
  ArtifactTemplate,
  ArtifactInstance,
  ArtifactCategory,
  getCategoryLabel,
  getStatusInfo,
} from '../types/artifact';
import { TemplateBuilderModal } from '../components/form-builder/TemplateBuilderModal';
import { FormTemplate, FieldType } from '../types/formBuilder';

export default function DocumentTemplatesPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();
  const [activeTab, setActiveTab] = useState<'documents' | 'browse' | 'manage'>('documents');
  const [systemTemplates, setSystemTemplates] = useState<ArtifactTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<ArtifactTemplate[]>([]);
  const [publishedCustomTemplates, setPublishedCustomTemplates] = useState<ArtifactTemplate[]>([]);
  const [instances, setInstances] = useState<ArtifactInstance[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ArtifactCategory | 'ALL'>('ALL');
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ArtifactTemplate | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Template creation/editing
  const [showTemplateFormModal, setShowTemplateFormModal] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ArtifactTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({ name: '', description: '', category: ArtifactCategory.CUSTOM });

  useEffect(() => {
    if (selectedProjectId) {
      loadTemplates();
      loadInstances();
    }
  }, [selectedProjectId]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      // Load system templates
      const systemData = await artifactsApi.getSystemTemplates();
      setSystemTemplates(systemData);

      // Load custom templates (project-specific)
      if (selectedProjectId) {
        const allData = await artifactsApi.getAllTemplates(selectedProjectId);
        const customData = allData.filter(t => !t.isSystemTemplate);
        setCustomTemplates(customData);

        // Filter published custom templates for Browse tab
        const publishedData = customData.filter(t => t.isPublished);
        setPublishedCustomTemplates(publishedData);
      }
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadInstances = async () => {
    if (!selectedProjectId) return;
    try {
      setLoadingInstances(true);
      const data = await artifactsApi.getInstancesByProject(selectedProjectId);
      setInstances(data);
    } catch (err) {
      console.error('Failed to load document instances', err);
    } finally {
      setLoadingInstances(false);
    }
  };

  // Browse Templates: System + Published Custom
  const browseTemplates = [...systemTemplates, ...publishedCustomTemplates];
  const filteredBrowseTemplates = browseTemplates.filter(
    (t) => selectedCategory === 'ALL' || t.category === selectedCategory
  );

  // My Templates: All custom (draft + published)
  const filteredMyTemplates = customTemplates.filter(
    (t) => selectedCategory === 'ALL' || t.category === selectedCategory
  );

  const handleActivateTemplate = async () => {
    if (!selectedTemplate || !selectedProjectId || !documentName.trim() || isCreating) return;

    try {
      setIsCreating(true);
      const instance = await artifactsApi.createInstance({
        templateId: selectedTemplate.id,
        projectId: selectedProjectId,
        name: documentName,
      });

      // Close modal and reset state immediately
      setShowActivateModal(false);
      setSelectedTemplate(null);
      setDocumentName('');

      // Navigate without reloading instances (will load on detail page)
      navigate(`/artifacts/documents/${instance.id}`);
    } catch (err) {
      console.error('Failed to activate template', err);
      alert('Failed to create document. Please try again.');
      setIsCreating(false);
    }
  };

  const openActivateModal = (template: ArtifactTemplate) => {
    setSelectedTemplate(template);
    setDocumentName(template.name);
    setIsCreating(false); // Reset creating state
    setShowActivateModal(true);
  };

  const closeActivateModal = () => {
    setShowActivateModal(false);
    setSelectedTemplate(null);
    setDocumentName('');
    setIsCreating(false); // Reset creating state
  };

  const handleDeleteDocument = async (instanceId: string, documentName: string) => {
    if (!confirm(`Are you sure you want to delete "${documentName}"?`)) {
      return;
    }

    try {
      await artifactsApi.deleteInstance(instanceId);
      await loadInstances();
      alert('Document deleted successfully');
    } catch (err) {
      console.error('Failed to delete document', err);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleTogglePublish = async (templateId: string, currentStatus: boolean) => {
    try {
      console.log('Publishing template:', templateId, 'New status:', !currentStatus);
      const updatedTemplate = await artifactsApi.updateTemplate(templateId, {
        isPublished: !currentStatus,
      });
      console.log('Template updated:', updatedTemplate);
      await loadTemplates();
      const message = currentStatus
        ? 'Template unpublished. It will no longer appear in Browse Templates.'
        : 'Template published! It will now appear in Browse Templates for everyone.';
      alert(message);
    } catch (err: any) {
      console.error('Failed to toggle publish status', err);
      alert('Failed to update template: ' + (err.message || 'Please try again.'));
    }
  };

  const handleCreateTemplate = () => {
    setTemplateFormData({ name: '', description: '', category: ArtifactCategory.CUSTOM });
    setEditingTemplate(null);
    setShowTemplateFormModal(true);
  };

  const handleEditTemplate = (template: ArtifactTemplate) => {
    setEditingTemplate(template);
    setShowTemplateBuilder(true);
  };

  const handleTemplateFormSubmit = async () => {
    if (!templateFormData.name.trim() || !selectedProjectId) return;

    try {
      // Create new template
      const newTemplate = await artifactsApi.createTemplate({
        name: templateFormData.name,
        description: templateFormData.description,
        category: templateFormData.category,
        templateStructure: { fields: [] }, // Empty fields initially
        projectId: selectedProjectId,
      });

      setShowTemplateFormModal(false);
      setEditingTemplate(newTemplate);
      setShowTemplateBuilder(true);
    } catch (err) {
      console.error('Failed to create template', err);
      alert('Failed to create template. Please try again.');
    }
  };

  const categories = [
    { value: 'ALL', label: 'All Templates' },
    { value: ArtifactCategory.PROJECT_GOVERNANCE, label: getCategoryLabel(ArtifactCategory.PROJECT_GOVERNANCE) },
    { value: ArtifactCategory.PLANNING_BUDGETING, label: getCategoryLabel(ArtifactCategory.PLANNING_BUDGETING) },
    { value: ArtifactCategory.EXECUTION_MONITORING, label: getCategoryLabel(ArtifactCategory.EXECUTION_MONITORING) },
    { value: ArtifactCategory.RISK_QUALITY, label: getCategoryLabel(ArtifactCategory.RISK_QUALITY) },
    { value: ArtifactCategory.CLOSURE_REPORTING, label: getCategoryLabel(ArtifactCategory.CLOSURE_REPORTING) },
    { value: ArtifactCategory.CUSTOM, label: getCategoryLabel(ArtifactCategory.CUSTOM) },
  ];

  return (
    <AppLayout>
      <ArtifactsNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-700 rounded-xl p-6 shadow-xl text-white mb-6">
          <h1 className="text-2xl font-bold">Document Templates</h1>
          <p className="text-white/90 mt-1">
            Create project documents from standard templates
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'documents'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 My Documents ({instances.length})
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'browse'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🗂️ Browse Templates ({browseTemplates.length})
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'manage'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ My Templates ({customTemplates.length})
            </button>
          </div>
        </div>

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div>
            {loadingInstances ? (
              <div className="text-center py-12 text-gray-500">Loading documents...</div>
            ) : instances.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-500 mb-4">Get started by creating a document from a template</p>
                <button
                  onClick={() => setActiveTab('templates')}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Browse Templates
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-primary-300 transition relative group"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(instance.id, instance.name);
                      }}
                      className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                      title="Delete document"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigate(`/artifacts/documents/${instance.id}`)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between mb-2 pr-8">
                        <h3 className="font-semibold text-gray-900 text-sm">{instance.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${getStatusInfo(instance.status).color}-100 text-${getStatusInfo(instance.status).color}-700`}
                        >
                          {getStatusInfo(instance.status).label}
                        </span>
                      </div>
                      {instance.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{instance.description}</p>
                      )}
                      {instance.template && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span>{instance.template.name}</span>
                        </div>
                      )}
                      {instance.currentVersion && (
                        <div className="text-xs text-gray-500 mt-2">
                          Version {instance.currentVersion.versionNumber}
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Browse Templates Tab */}
        {activeTab === 'browse' && (
          <div>
            {/* Category Filter */}
            <div className="mb-6 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value as ArtifactCategory | 'ALL')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedCategory === cat.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {loadingTemplates ? (
              <div className="text-center py-12 text-gray-500">Loading templates...</div>
            ) : filteredBrowseTemplates.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-500">No templates found in this category</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredBrowseTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3>
                      {template.isSystemTemplate ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                          System
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          Custom
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mb-4">
                      {getCategoryLabel(template.category)}
                    </div>
                    <button
                      onClick={() => openActivateModal(template)}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Templates Tab */}
        {activeTab === 'manage' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Your Custom Templates</h3>
              <button
                onClick={handleCreateTemplate}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Template
              </button>
            </div>

            {loadingTemplates ? (
              <div className="text-center py-12 text-gray-500">Loading your templates...</div>
            ) : filteredMyTemplates.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No custom templates yet</h3>
                <p className="text-gray-500 mb-4">Create your own document templates to standardize your workflow</p>
                <button
                  onClick={handleCreateTemplate}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Create Your First Template
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMyTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3>
                      {template.isPublished ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Draft
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mb-4">
                      {getCategoryLabel(template.category)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openActivateModal(template)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                          title="Test this template"
                        >
                          Test
                        </button>
                      </div>
                      <button
                        onClick={() => handleTogglePublish(template.id, template.isPublished)}
                        className={`w-full px-4 py-2 rounded-lg transition text-sm font-medium ${
                          template.isPublished
                            ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {template.isPublished ? '📤 Unpublish' : '📢 Publish'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activate Template Modal */}
      {showActivateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Document</h2>
            <p className="text-sm text-gray-600 mb-4">
              Create a new document from template: <strong>{selectedTemplate.name}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Name
              </label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && documentName.trim() && !isCreating) {
                    e.preventDefault();
                    handleActivateTemplate();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter document name"
                autoFocus
                disabled={isCreating}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeActivateModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateTemplate}
                disabled={!documentName.trim() || isCreating}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Form Modal */}
      {showTemplateFormModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Custom Template</h2>
            <p className="text-sm text-gray-600 mb-4">
              First, provide basic information about your template
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Weekly Status Update"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={templateFormData.description}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="What is this template for?"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={templateFormData.category}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value as ArtifactCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={ArtifactCategory.PROJECT_GOVERNANCE}>{getCategoryLabel(ArtifactCategory.PROJECT_GOVERNANCE)}</option>
                  <option value={ArtifactCategory.PLANNING_BUDGETING}>{getCategoryLabel(ArtifactCategory.PLANNING_BUDGETING)}</option>
                  <option value={ArtifactCategory.EXECUTION_MONITORING}>{getCategoryLabel(ArtifactCategory.EXECUTION_MONITORING)}</option>
                  <option value={ArtifactCategory.RISK_QUALITY}>{getCategoryLabel(ArtifactCategory.RISK_QUALITY)}</option>
                  <option value={ArtifactCategory.CLOSURE_REPORTING}>{getCategoryLabel(ArtifactCategory.CLOSURE_REPORTING)}</option>
                  <option value={ArtifactCategory.CUSTOM}>{getCategoryLabel(ArtifactCategory.CUSTOM)}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTemplateFormModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTemplateFormSubmit}
                disabled={!templateFormData.name.trim()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Build Fields
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Builder Modal */}
      {showTemplateBuilder && editingTemplate && (
        <TemplateBuilderModal
          isOpen={showTemplateBuilder}
          template={{
            ...editingTemplate,
            fields: editingTemplate.templateStructure?.fields || [],
            status: 'DRAFT' as any,
            visibility: 'PRIVATE' as any,
            version: 1,
            settings: {},
            isArchived: false,
          } as FormTemplate}
          onClose={() => {
            setShowTemplateBuilder(false);
            setEditingTemplate(null);
            loadTemplates();
          }}
          onSave={async () => {
            loadTemplates();
          }}
          artifactTemplateId={editingTemplate.id}
        />
      )}
    </AppLayout>
  );
}
