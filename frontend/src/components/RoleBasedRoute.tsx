import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { Permission, RoleName } from '../constants/roles';

interface RoleBasedRouteProps {
  children: ReactNode;
  requiredPermission?: Permission;
  requiredRole?: RoleName;
  redirectTo?: string;
}

/**
 * A route wrapper component that protects routes based on permissions or roles.
 * Redirects to specified path (default: /unauthorized) if requirements are not met.
 */
export const RoleBasedRoute = ({
  children,
  requiredPermission,
  requiredRole,
  redirectTo = '/unauthorized',
}: RoleBasedRouteProps) => {
  const { hasPermission, hasRole } = usePermissions();

  // Check permission if provided
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role if provided
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
