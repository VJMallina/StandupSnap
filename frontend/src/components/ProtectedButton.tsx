import { ButtonHTMLAttributes, ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface ProtectedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedButton = ({
  permission,
  children,
  fallback = null,
  className = '',
  ...props
}: ProtectedButtonProps) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return (
    <button
      className={`px-4 py-2 rounded-md font-medium transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
