import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { PrimaryButton } from '../../ui/PrimaryButton';
import { SecondaryButton } from '../../ui/SecondaryButton';

interface AddCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (criteria: string) => void;
}

export const AddCriteriaModal: React.FC<AddCriteriaModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [criteria, setCriteria] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!criteria.trim()) {
      setError('Acceptance criteria cannot be empty');
      return;
    }

    onAdd(criteria.trim());
    setCriteria('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setCriteria('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Acceptance Criteria"
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <SecondaryButton onClick={handleClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={handleSubmit}>
            Add Criteria
          </PrimaryButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Acceptance Criteria <span className="text-red-500">*</span>
          </label>
          <textarea
            value={criteria}
            onChange={(e) => {
              setCriteria(e.target.value);
              if (error) setError('');
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="e.g., Given... When... Then..."
            rows={4}
            autoFocus
          />
          {error && (
            <p className="mt-1 text-xs text-red-600">{error}</p>
          )}
        </div>
      </form>
    </Modal>
  );
};
