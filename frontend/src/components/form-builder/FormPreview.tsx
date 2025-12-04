import React, { useState } from 'react';
import { FormField, FieldType } from '../../types/formBuilder';

interface FormPreviewProps {
  fields: FormField[];
  templateName: string;
}

export const FormPreview: React.FC<FormPreviewProps> = ({ fields, templateName }) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const renderField = (field: FormField) => {
    const value = formValues[field.id] || field.defaultValue || '';

    switch (field.type) {
      case FieldType.SECTION_HEADER:
        return (
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{field.label}</h3>
            {field.description && <p className="text-sm text-gray-600">{field.description}</p>}
          </div>
        );

      case FieldType.DESCRIPTION:
        return (
          <div className="col-span-2">
            <p className="text-sm text-gray-700">{field.label}</p>
          </div>
        );

      case FieldType.DIVIDER:
        return <div className="col-span-2 border-t border-gray-300 my-2" />;

      case FieldType.TEXT:
      case FieldType.EMAIL:
      case FieldType.PHONE:
      case FieldType.URL:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
            <input
              type={field.type === FieldType.EMAIL ? 'email' : field.type === FieldType.URL ? 'url' : 'tel'}
              value={value}
              onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required={field.required}
            />
            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
          </div>
        );

      case FieldType.TEXTAREA:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
            <textarea
              rows={field.properties?.rows || 4}
              value={value}
              onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required={field.required}
            />
            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
          </div>
        );

      case FieldType.NUMBER:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
            <input
              type="number"
              value={value}
              min={field.properties?.min}
              max={field.properties?.max}
              onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required={field.required}
            />
            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
          </div>
        );

      case FieldType.DATE:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
            <input
              type="date"
              value={value}
              onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required={field.required}
            />
            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
          </div>
        );

      case FieldType.DROPDOWN:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
            <select
              value={value}
              onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required={field.required}
            >
              <option value="">{field.placeholder || 'Select an option'}</option>
              {field.properties?.options?.map((option, idx) => (
                <option key={idx} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
          </div>
        );

      case FieldType.RADIO:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
            <div className="space-y-2">
              {field.properties?.options?.map((option, idx) => (
                <label key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                    required={field.required}
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {field.helpText && <p className="text-xs text-gray-500 mt-2">{field.helpText}</p>}
          </div>
        );

      case FieldType.CHECKBOX:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
            <div className="space-y-2">
              {field.properties?.options?.map((option, idx) => (
                <label key={idx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={(value || []).includes(option.value)}
                    onChange={(e) => {
                      const currentValues = value || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v: string) => v !== option.value);
                      setFormValues({ ...formValues, [field.id]: newValues });
                    }}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {field.helpText && <p className="text-xs text-gray-500 mt-2">{field.helpText}</p>}
          </div>
        );

      case FieldType.YES_NO:
        return (
          <div className="col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <button
                onClick={() => setFormValues({ ...formValues, [field.id]: !value })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-teal-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
          </div>
        );

      case FieldType.RATING:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
            <div className="flex gap-1">
              {Array.from({ length: field.properties?.maxRating || 5 }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setFormValues({ ...formValues, [field.id]: idx + 1 })}
                  className={`text-2xl ${value > idx ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        );

      case FieldType.FILE_UPLOAD:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-1 text-sm text-gray-600">Click to upload or drag and drop</p>
              {field.properties?.acceptedFileTypes && (
                <p className="text-xs text-gray-500 mt-1">
                  {field.properties.acceptedFileTypes.join(', ')}
                </p>
              )}
            </div>
          </div>
        );

      case FieldType.AI_ASSIST:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
            <div className="border border-teal-200 bg-teal-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-sm font-medium text-teal-700">AI-Powered Field</span>
              </div>
              <textarea
                rows={4}
                value={value}
                onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                placeholder="AI will help process your input"
                className="w-full px-3 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
              />
              <button className="mt-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700">
                Generate with AI
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              {field.type} field (preview not available)
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{templateName}</h2>
          <p className="text-sm text-gray-500 mt-1">Form Preview</p>
        </div>

        {fields.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No fields to preview. Add fields to see the form preview.</p>
          </div>
        ) : (
          <form className="grid grid-cols-2 gap-6">
            {fields.map((field) => (
              <React.Fragment key={field.id}>{renderField(field)}</React.Fragment>
            ))}

            <div className="col-span-2 pt-6 border-t border-gray-200">
              <button
                type="submit"
                onClick={(e) => e.preventDefault()}
                className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                Submit Form
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
