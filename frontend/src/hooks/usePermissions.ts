import { useAuth } from '../context/AuthContext';

export const usePermissions = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isOrgAdmin, user } = useAuth();

  const hasRole = (role: string): boolean => {
    if (!user?.roles) return false;
    return user.roles.includes(role);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user?.roles) return false;
    return roles.some((role) => user.roles.includes(role));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isOrgAdmin,
    userRoles: user?.roles ?? [],
  };
};
