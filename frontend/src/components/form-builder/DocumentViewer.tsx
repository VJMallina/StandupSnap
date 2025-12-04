import React from 'react';
import { FormInstance } from '../../types/formBuilder';

interface DocumentViewerProps {
  isOpen: boolean;
  instance: FormInstance;
  onClose: () => void;
  onRefresh: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ isOpen, instance, onClose, onRefresh }) => {
  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-75" onClick={onClose} />

      <div className="absolute inset-4 bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{instance.name || 'Untitled Document'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-600">{instance.template.name}</p>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(instance.status)}`}>
                {instance.status}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Document Information</h3>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Created:</span>
                  <span className="ml-2 text-gray-600">{new Date(instance.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Updated:</span>
                  <span className="ml-2 text-gray-600">{new Date(instance.updatedAt).toLocaleString()}</span>
                </div>
                {instance.submittedAt && (
                  <div>
                    <span className="font-medium text-gray-700">Submitted:</span>
                    <span className="ml-2 text-gray-600">{new Date(instance.submittedAt).toLocaleString()}</span>
                  </div>
                )}
                {instance.approvedAt && (
                  <div>
                    <span className="font-medium text-gray-700">Approved:</span>
                    <span className="ml-2 text-gray-600">{new Date(instance.approvedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Form Data</h3>
              {instance.template.fields.map((field) => {
                const value = instance.values[field.id];
                if (!value && value !== 0 && value !== false) return null;

                return (
                  <div key={field.id} className="pb-4 border-b border-gray-200 last:border-0">
                    <div className="font-medium text-gray-900 mb-1">{field.label}</div>
                    <div className="text-gray-700">
                      {Array.isArray(value) ? (
                        <ul className="list-disc list-inside">
                          {value.map((v, idx) => (
                            <li key={idx}>{v}</li>
                          ))}
                        </ul>
                      ) : typeof value === 'boolean' ? (
                        value ? 'Yes' : 'No'
                      ) : (
                        <span className="whitespace-pre-wrap">{value}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {Object.keys(instance.values).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No data has been entered for this document yet.</p>
                </div>
              )}
            </div>

            {instance.approvalNotes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Approval Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{instance.approvalNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
