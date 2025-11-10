import { ButtonHTMLAttributes, ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../constants/roles';

interface ProtectedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A button component that only renders if the user has the required permission.
 * Optionally shows a fallback component if permission is missing.
 */
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
