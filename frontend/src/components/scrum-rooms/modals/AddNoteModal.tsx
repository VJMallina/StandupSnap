import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { PrimaryButton } from '../../ui/PrimaryButton';
import { SecondaryButton } from '../../ui/SecondaryButton';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (note: string) => void;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!note.trim()) {
      setError('Note cannot be empty');
      return;
    }

    onAdd(note.trim());
    setNote('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setNote('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Note"
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <SecondaryButton onClick={handleClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={handleSubmit}>
            Add Note
          </PrimaryButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Note <span className="text-red-500">*</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError('');
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Enter your note..."
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
