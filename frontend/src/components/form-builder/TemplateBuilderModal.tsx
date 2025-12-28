import React, { useState, useEffect } from 'react';
import { FormTemplate, FormField, FieldType } from '../../types/formBuilder';
import { artifactsApi } from '../../services/api/artifacts';
import { FieldEditor } from './FieldEditor';
import { FieldPalette } from './FieldPalette';
import { FormPreview } from './FormPreview';

interface TemplateBuilderModalProps {
  isOpen: boolean;
  template: FormTemplate;
  onClose: () => void;
  onSave?: () => void; // Optional callback after successful save
  artifactTemplateId: string; // Artifact template ID for saving
}

export const TemplateBuilderModal: React.FC<TemplateBuilderModalProps> = ({
  isOpen,
  template: initialTemplate,
  onClose,
  onSave,
  artifactTemplateId,
}) => {
  const [template, setTemplate] = useState<FormTemplate>(initialTemplate);
  const [fields, setFields] = useState<FormField[]>(initialTemplate.fields || []);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [mode, setMode] = useState<'design' | 'preview'>('design');
  const [isSaving, setIsSaving] = useState(false);
  const [savedFields, setSavedFields] = useState<FormField[]>(initialTemplate.fields || []); // Track saved state

  useEffect(() => {
    setTemplate(initialTemplate);
    setFields(initialTemplate.fields || []);
    setSavedFields(initialTemplate.fields || []); // Reset saved state when template changes
  }, [initialTemplate]);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        if (selectedField) {
          setSelectedField(null);
        } else {
          handleClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSaving, selectedField]);

  const handleClose = () => {
    if (isSaving) return;
    if (hasUnsavedChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const hasUnsavedChanges = () => {
    return JSON.stringify(fields) !== JSON.stringify(savedFields);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Save to artifacts API
      await artifactsApi.updateTemplate(artifactTemplateId, {
        templateStructure: { fields },
      });
      setSavedFields(fields);

      alert('Template saved successfully!');

      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }

      // Close the modal after successful save
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddField = (fieldType: FieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: fieldType,
      label: getDefaultLabel(fieldType),
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
    setSelectedField(newField);
  };

  const handleUpdateField = (updatedField: FormField) => {
    setFields(fields.map((f) => (f.id === updatedField.id ? updatedField : f)));
    setSelectedField(updatedField);
  };

  const handleDeleteField = (fieldId: string) => {
    if (confirm('Are you sure you want to delete this field?')) {
      setFields(fields.filter((f) => f.id !== fieldId));
      if (selectedField?.id === fieldId) {
        setSelectedField(null);
      }
    }
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = fields.findIndex((f) => f.id === fieldId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];

    // Update order
    newFields.forEach((f, i) => (f.order = i));
    setFields(newFields);
  };

  const getDefaultLabel = (fieldType: FieldType): string => {
    const labels: Record<FieldType, string> = {
      [FieldType.TEXT]: 'Text Field',
      [FieldType.TEXTAREA]: 'Text Area',
      [FieldType.DROPDOWN]: 'Dropdown',
      [FieldType.YES_NO]: 'Yes/No',
      [FieldType.DATE]: 'Date',
      [FieldType.NUMBER]: 'Number',
      [FieldType.TAG]: 'Tags',
      [FieldType.TABLE]: 'Table',
      [FieldType.AI_ASSIST]: 'AI Assist',
      [FieldType.FILE_UPLOAD]: 'File Upload',
      [FieldType.SECTION_HEADER]: 'Section Header',
      [FieldType.DESCRIPTION]: 'Description',
      [FieldType.DIVIDER]: 'Divider',
      [FieldType.COLLAPSIBLE]: 'Collapsible Section',
      [FieldType.EMAIL]: 'Email',
      [FieldType.PHONE]: 'Phone',
      [FieldType.URL]: 'URL',
      [FieldType.RATING]: 'Rating',
      [FieldType.CHECKBOX]: 'Checkbox',
      [FieldType.RADIO]: 'Radio Buttons',
      [FieldType.MULTI_SELECT]: 'Multi-Select',
      [FieldType.DATE_RANGE]: 'Date Range',
      [FieldType.SLIDER]: 'Slider',
    };
    return labels[fieldType] || 'New Field';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900 bg-opacity-75" onClick={handleClose} />

      {/* Full Screen Modal */}
      <div className="absolute inset-4 bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{template.name}</h2>
            <p className="text-sm text-gray-600">Design your form template</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('design')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'design'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Design
              </button>
              <button
                onClick={() => setMode('preview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'preview'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Preview
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {mode === 'design' ? (
            <>
              {/* Left Panel - Field Palette */}
              <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
                <FieldPalette onAddField={handleAddField} />
              </div>

              {/* Center - Canvas */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                <div className="max-w-3xl mx-auto">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
                    <span className="text-sm text-gray-500">{fields.length} fields</span>
                  </div>

                  {fields.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No fields yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Add fields from the left panel to start designing your form.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          onClick={() => setSelectedField(field)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedField?.id === field.id
                              ? 'border-primary-500 bg-primary-50 shadow-md'
                              : 'border-gray-200 hover:border-primary-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveField(field.id, 'up');
                                  }}
                                  disabled={index === 0}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveField(field.id, 'down');
                                  }}
                                  disabled={index === fields.length - 1}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{field.label}</div>
                                <div className="text-xs text-gray-500">
                                  {field.type}
                                  {field.required && <span className="ml-2 text-red-500">Required</span>}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteField(field.id);
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Field Editor */}
              <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
                {selectedField ? (
                  <FieldEditor field={selectedField} onUpdate={handleUpdateField} />
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 mb-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <p className="text-sm">Select a field to edit its properties</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <FormPreview fields={fields} templateName={template.name} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
