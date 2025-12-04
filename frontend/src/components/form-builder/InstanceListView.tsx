import React, { useState } from 'react';
import { FormInstance, FormTemplate, InstanceStatus } from '../../types/formBuilder';
import { InstanceFormModal } from './InstanceFormModal';
import { DocumentViewer } from './DocumentViewer';
import { formBuilderInstanceApi } from '../../services/api/formBuilder';

interface InstanceListViewProps {
  instances: FormInstance[];
  templates: FormTemplate[];
  projectId: string;
  onRefresh: () => void;
  statusFilter: InstanceStatus | 'ALL';
  onStatusFilterChange: (status: InstanceStatus | 'ALL') => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export const InstanceListView: React.FC<InstanceListViewProps> = ({
  instances,
  templates,
  projectId,
  onRefresh,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<FormInstance | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const getStatusColor = (status: InstanceStatus) => {
    switch (status) {
      case InstanceStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case InstanceStatus.SUBMITTED:
        return 'bg-blue-100 text-blue-800';
      case InstanceStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case InstanceStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case InstanceStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleView = (instance: FormInstance) => {
    setSelectedInstance(instance);
    setIsViewerOpen(true);
  };

  const handleArchive = async (id: string) => {
    try {
      await formBuilderInstanceApi.archive(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to archive document');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await formBuilderInstanceApi.delete(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleExport = async (id: string, format: 'json' | 'pdf' | 'word') => {
    try {
      const blob = await formBuilderInstanceApi.export(id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to export document');
    }
  };

  return (
    <div>
      {/* Filters and Search */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as InstanceStatus | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="ALL">All Status</option>
          <option value={InstanceStatus.DRAFT}>Draft</option>
          <option value={InstanceStatus.SUBMITTED}>Submitted</option>
          <option value={InstanceStatus.APPROVED}>Approved</option>
          <option value={InstanceStatus.REJECTED}>Rejected</option>
        </select>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Document
        </button>
      </div>

      {/* Documents Table */}
      {instances.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first document from a template.</p>
          <div className="mt-6">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Document
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {instances.map((instance) => (
                <tr key={instance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{instance.name || 'Untitled'}</div>
                    <div className="text-xs text-gray-500">v{instance.version}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{instance.template.name}</div>
                    <div className="text-xs text-gray-500">{instance.template.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(instance.status)}`}>
                      {instance.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(instance.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(instance.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(instance)}
                        className="text-teal-600 hover:text-teal-900"
                        title="View"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleArchive(instance.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Archive"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(instance.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Instance Modal */}
      {isCreateModalOpen && (
        <InstanceFormModal
          isOpen={isCreateModalOpen}
          templates={templates}
          projectId={projectId}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={onRefresh}
        />
      )}

      {/* Document Viewer */}
      {isViewerOpen && selectedInstance && (
        <DocumentViewer
          isOpen={isViewerOpen}
          instance={selectedInstance}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedInstance(null);
          }}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};
