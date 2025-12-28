import { useState } from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'DELETE'
}: DeleteConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (inputValue === confirmText) {
      onConfirm();
      setInputValue('');
      setError('');
    } else {
      setError(`Please type ${confirmText} to confirm`);
    }
  };

  const handleClose = () => {
    setInputValue('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-10 mx-auto w-full max-w-md shadow-2xl rounded-xl bg-white mb-10 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <button
              onClick={handleClose}
              className="text-primary-100 hover:text-white hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">

        <p className="text-gray-700 mb-4">{message}</p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800 font-medium mb-2">
            Type <span className="font-bold">{confirmText}</span> to confirm deletion:
          </p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError('');
            }}
            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`Type ${confirmText} here`}
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 active:scale-95 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={inputValue !== confirmText}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            Delete
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
