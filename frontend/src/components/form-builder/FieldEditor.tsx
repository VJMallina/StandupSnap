import React, { useState, useEffect } from 'react';
import { FormField, FieldType, FieldOption } from '../../types/formBuilder';

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({ field, onUpdate }) => {
  const [localField, setLocalField] = useState<FormField>(field);
  const [options, setOptions] = useState<string>(
    field.properties?.options?.map((o) => o.label).join('\n') || ''
  );

  useEffect(() => {
    setLocalField(field);
    setOptions(field.properties?.options?.map((o) => o.label).join('\n') || '');
  }, [field]);

  const handleUpdate = (updates: Partial<FormField>) => {
    const updated = { ...localField, ...updates };
    setLocalField(updated);
    onUpdate(updated);
  };

  const handlePropertiesUpdate = (updates: any) => {
    const updated = {
      ...localField,
      properties: { ...localField.properties, ...updates },
    };
    setLocalField(updated);
    onUpdate(updated);
  };

  const handleOptionsUpdate = (optionsText: string) => {
    setOptions(optionsText);
    const optionsList: FieldOption[] = optionsText
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => ({ label: line.trim(), value: line.trim() }));

    handlePropertiesUpdate({ options: optionsList });
  };

  const needsOptions = [
    FieldType.DROPDOWN,
    FieldType.RADIO,
    FieldType.CHECKBOX,
    FieldType.MULTI_SELECT,
  ].includes(localField.type);

  const isLayoutField = [
    FieldType.SECTION_HEADER,
    FieldType.DESCRIPTION,
    FieldType.DIVIDER,
  ].includes(localField.type);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Field Properties</h3>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{localField.type}</p>
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isLayoutField ? 'Title' : 'Label'} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={localField.label}
          onChange={(e) => handleUpdate({ label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          placeholder={isLayoutField ? 'Section title' : 'Field label'}
        />
      </div>

      {!isLayoutField && (
        <>
          {/* Placeholder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Placeholder</label>
            <input
              type="text"
              value={localField.placeholder || ''}
              onChange={(e) => handleUpdate({ placeholder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              placeholder="Placeholder text"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={2}
              value={localField.description || ''}
              onChange={(e) => handleUpdate({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              placeholder="Help text for this field"
            />
          </div>

          {/* Help Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Help Text</label>
            <input
              type="text"
              value={localField.helpText || ''}
              onChange={(e) => handleUpdate({ helpText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              placeholder="Additional help text"
            />
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Required Field</label>
            <button
              onClick={() => handleUpdate({ required: !localField.required })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localField.required ? 'bg-teal-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localField.required ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Options for dropdown, radio, checkbox */}
          {needsOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options <span className="text-xs text-gray-500">(one per line)</span>
              </label>
              <textarea
                rows={5}
                value={options}
                onChange={(e) => handleOptionsUpdate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-mono"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
          )}

          {/* Number field properties */}
          {localField.type === FieldType.NUMBER && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Value</label>
                <input
                  type="number"
                  value={localField.properties?.min || ''}
                  onChange={(e) => handlePropertiesUpdate({ min: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Value</label>
                <input
                  type="number"
                  value={localField.properties?.max || ''}
                  onChange={(e) => handlePropertiesUpdate({ max: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </>
          )}

          {/* Text/Textarea length properties */}
          {(localField.type === FieldType.TEXT || localField.type === FieldType.TEXTAREA) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Length</label>
                <input
                  type="number"
                  value={localField.properties?.minLength || ''}
                  onChange={(e) => handlePropertiesUpdate({ minLength: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Length</label>
                <input
                  type="number"
                  value={localField.properties?.maxLength || ''}
                  onChange={(e) => handlePropertiesUpdate({ maxLength: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            </>
          )}

          {/* Textarea rows */}
          {localField.type === FieldType.TEXTAREA && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Rows</label>
              <input
                type="number"
                min="2"
                max="20"
                value={localField.properties?.rows || 4}
                onChange={(e) => handlePropertiesUpdate({ rows: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          )}

          {/* Rating properties */}
          {localField.type === FieldType.RATING && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Rating</label>
              <input
                type="number"
                min="3"
                max="10"
                value={localField.properties?.maxRating || 5}
                onChange={(e) => handlePropertiesUpdate({ maxRating: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          )}

          {/* File Upload properties */}
          {localField.type === FieldType.FILE_UPLOAD && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Accepted File Types</label>
                <input
                  type="text"
                  value={localField.properties?.acceptedFileTypes?.join(', ') || ''}
                  onChange={(e) =>
                    handlePropertiesUpdate({ acceptedFileTypes: e.target.value.split(',').map((t) => t.trim()) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder=".pdf, .doc, .docx, image/*"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max File Size (MB)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={localField.properties?.maxFileSize || 10}
                  onChange={(e) => handlePropertiesUpdate({ maxFileSize: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Allow Multiple Files</label>
                <button
                  onClick={() => handlePropertiesUpdate({ allowMultiple: !localField.properties?.allowMultiple })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    localField.properties?.allowMultiple ? 'bg-teal-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localField.properties?.allowMultiple ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </>
          )}

          {/* AI Assist properties */}
          {localField.type === FieldType.AI_ASSIST && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Prompt</label>
              <textarea
                rows={3}
                value={localField.properties?.aiPrompt || ''}
                onChange={(e) => handlePropertiesUpdate({ aiPrompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="Instructions for AI processing"
              />
            </div>
          )}
        </>
      )}

      {/* Default Value */}
      {!isLayoutField && localField.type !== FieldType.FILE_UPLOAD && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Value</label>
          <input
            type="text"
            value={(localField.defaultValue as string) || ''}
            onChange={(e) => handleUpdate({ defaultValue: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            placeholder="Default value"
          />
        </div>
      )}
    </div>
  );
};
