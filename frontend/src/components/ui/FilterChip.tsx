import React from 'react';

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, value, onRemove }) => {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-full text-sm animate-scaleIn">
      <span className="font-semibold text-primary-700">{label}:</span>
      <span className="text-primary-600">{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 hover:bg-primary-200 rounded-full transition-all active:scale-95"
        aria-label={`Remove ${label} filter`}
      >
        <svg className="h-3.5 w-3.5 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
