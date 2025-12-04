import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { formBuilderTemplateApi, formBuilderInstanceApi } from '../services/api/formBuilder';
import {
  FormTemplate,
  FormInstance,
  TemplateStatus,
  TemplateCategory,
  InstanceStatus,
} from '../types/formBuilder';
import { TemplateListView } from '../components/form-builder/TemplateListView';
import { InstanceListView } from '../components/form-builder/InstanceListView';
import { TemplateFormModal } from '../components/form-builder/TemplateFormModal';
import { TemplateBuilderModal } from '../components/form-builder/TemplateBuilderModal';

type ViewMode = 'templates' | 'documents';

const FormBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('templates');
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [archivedTemplates, setArchivedTemplates] = useState<FormTemplate[]>([]);
  const [allTemplates, setAllTemplates] = useState<FormTemplate[]>([]); // For documents dropdown
  const [instances, setInstances] = useState<FormInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [templateStatus, setTemplateStatus] = useState<TemplateStatus | 'ALL'>('ALL');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory | 'ALL'>('ALL');
  const [instanceStatus, setInstanceStatus] = useState<InstanceStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isTemplateFormModalOpen, setIsTemplateFormModalOpen] = useState(false);
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      navigate('/projects');
      return;
    }

    fetchData();
  }, [selectedProjectId, viewMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewMode === 'templates') {
        // Fetch active templates
        const activeData = await formBuilderTemplateApi.getByProject(selectedProjectId!, {
          status: templateStatus === 'ALL' ? undefined : templateStatus,
          category: templateCategory === 'ALL' ? undefined : templateCategory,
          search: searchQuery || undefined,
          includeArchived: false,
        });
        setTemplates(activeData);

        // Fetch archived templates separately
        const archivedData = await formBuilderTemplateApi.getByProject(selectedProjectId!, {
          includeArchived: true,
        });
        setArchivedTemplates(archivedData.filter((t) => t.isArchived));

        // Fetch all templates for documents dropdown
        const allData = await formBuilderTemplateApi.getByProject(selectedProjectId!, {
          includeArchived: false,
        });
        setAllTemplates(allData);
      } else {
        const data = await formBuilderInstanceApi.getByProject(selectedProjectId!, {
          status: instanceStatus === 'ALL' ? undefined : instanceStatus,
          search: searchQuery || undefined,
        });
        setInstances(data);

        // Also fetch templates for documents tab
        if (allTemplates.length === 0) {
          const allData = await formBuilderTemplateApi.getByProject(selectedProjectId!, {
            includeArchived: false,
          });
          setAllTemplates(allData);
        }
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsTemplateFormModalOpen(true);
  };

  const handleEditTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setIsTemplateBuilderOpen(true);
  };

  const handleTemplateFormSubmit = async (data: any) => {
    try {
      if (selectedTemplate) {
        await formBuilderTemplateApi.update(selectedTemplate.id, data);
      } else {
        const newTemplate = await formBuilderTemplateApi.create({
          ...data,
          projectId: selectedProjectId,
        });
        // Open builder immediately after creating template
        setSelectedTemplate(newTemplate);
        setIsTemplateBuilderOpen(true);
      }
      setIsTemplateFormModalOpen(false);
      fetchData();
    } catch (err: any) {
      throw err;
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await formBuilderTemplateApi.delete(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete template');
    }
  };

  const handleArchiveTemplate = async (id: string) => {
    try {
      await formBuilderTemplateApi.archive(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to archive template');
    }
  };

  const handlePublishTemplate = async (id: string) => {
    try {
      await formBuilderTemplateApi.publish(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to publish template');
    }
  };

  const handleDuplicateTemplate = async (id: string, newName: string) => {
    try {
      await formBuilderTemplateApi.duplicate(id, newName);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate template');
    }
  };

  const handleRestoreTemplate = async (id: string) => {
    try {
      await formBuilderTemplateApi.restore(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to restore template');
    }
  };

  if (!selectedProjectId) {
    return null;
  }

  return (
    <AppLayout>
      <ArtifactsNavigation />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
          <p className="text-gray-600 mt-1">
            Create and manage custom form templates and document instances
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setViewMode('templates')}
              className={`
                px-4 py-2 font-medium text-sm transition-colors border-b-2
                ${
                  viewMode === 'templates'
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Templates
            </button>
            <button
              onClick={() => setViewMode('documents')}
              className={`
                px-4 py-2 font-medium text-sm transition-colors border-b-2
                ${
                  viewMode === 'documents'
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Documents
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : viewMode === 'templates' ? (
          <TemplateListView
            templates={templates}
            archivedTemplates={archivedTemplates}
            onCreateTemplate={handleCreateTemplate}
            onEditTemplate={handleEditTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onArchiveTemplate={handleArchiveTemplate}
            onRestoreTemplate={handleRestoreTemplate}
            onPublishTemplate={handlePublishTemplate}
            onDuplicateTemplate={handleDuplicateTemplate}
            statusFilter={templateStatus}
            onStatusFilterChange={setTemplateStatus}
            categoryFilter={templateCategory}
            onCategoryFilterChange={setTemplateCategory}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        ) : (
          <InstanceListView
            instances={instances}
            templates={allTemplates}
            projectId={selectedProjectId}
            onRefresh={fetchData}
            statusFilter={instanceStatus}
            onStatusFilterChange={setInstanceStatus}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        )}
      </div>

      {/* Template Form Modal */}
      {isTemplateFormModalOpen && (
        <TemplateFormModal
          isOpen={isTemplateFormModalOpen}
          template={selectedTemplate}
          onClose={() => setIsTemplateFormModalOpen(false)}
          onSubmit={handleTemplateFormSubmit}
        />
      )}

      {/* Template Builder Modal */}
      {isTemplateBuilderOpen && selectedTemplate && (
        <TemplateBuilderModal
          isOpen={isTemplateBuilderOpen}
          template={selectedTemplate}
          onClose={() => {
            setIsTemplateBuilderOpen(false);
            setSelectedTemplate(null);
            fetchData();
          }}
        />
      )}
    </AppLayout>
  );
};

export default FormBuilderPage;
