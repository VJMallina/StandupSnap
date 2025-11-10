import { useAuth } from '../context/AuthContext';
import { Permission, RoleName, ROLE_PERMISSIONS } from '../constants/roles';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!user || !user.roles) return false;

    // Check if any of the user's roles includes the permission
    return user.roles.some((roleName) => {
      const permissions = ROLE_PERMISSIONS[roleName as RoleName];
      return permissions?.includes(permission);
    });
  };

  const hasRole = (role: RoleName): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  const hasAnyRole = (roles: RoleName[]): boolean => {
    if (!user || !user.roles) return false;
    return roles.some((role) => user.roles.includes(role));
  };

  const hasAllRoles = (roles: RoleName[]): boolean => {
    if (!user || !user.roles) return false;
    return roles.every((role) => user.roles.includes(role));
  };

  const getRoleLabels = (): string[] => {
    if (!user || !user.roles) return [];
    return user.roles;
  };

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    userRoles: user?.roles ?? [],
    getRoleLabels,
  };
};
