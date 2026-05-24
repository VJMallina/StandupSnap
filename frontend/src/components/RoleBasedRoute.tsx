import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

interface RoleBasedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  redirectTo?: string;
}

export const RoleBasedRoute = ({
  children,
  requiredPermission,
  requiredRole,
  redirectTo = '/unauthorized',
}: RoleBasedRouteProps) => {
  const { hasPermission, hasRole } = usePermissions();

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
