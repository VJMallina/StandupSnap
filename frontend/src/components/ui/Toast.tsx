import React, { useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  variant: ToastVariant;
  onDismiss: (id: string) => void;
  duration?: number;
}

const variantStyles = {
  success: {
    container: 'bg-green-50 border-green-200',
    icon: 'text-green-600',
    text: 'text-green-800',
    IconComponent: CheckCircleIcon,
  },
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    text: 'text-red-800',
    IconComponent: ExclamationCircleIcon,
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    text: 'text-blue-800',
    IconComponent: InformationCircleIcon,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-600',
    text: 'text-yellow-800',
    IconComponent: ExclamationTriangleIcon,
  },
};

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  variant,
  onDismiss,
  duration = 5000,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  const styles = variantStyles[variant];
  const IconComponent = styles.IconComponent;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${styles.container} animate-slide-in-right`}
      role="alert"
    >
      <IconComponent className={`h-5 w-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
      <p className={`flex-1 text-sm font-medium ${styles.text}`}>{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className={`${styles.icon} hover:opacity-70 transition-opacity flex-shrink-0`}
        aria-label="Dismiss"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};
