import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface CanProps {
  /** Single permission to check */
  permission?: string;
  /** Multiple permissions - user needs ANY of these (OR logic) */
  anyOf?: string[];
  /** Multiple permissions - user needs ALL of these (AND logic) */
  allOf?: string[];
  /** Content to render if user has permission */
  children: ReactNode;
  /** Optional fallback content if user lacks permission */
  fallback?: ReactNode;
}

/**
 * Permission-based rendering component
 *
 * Usage:
 * ```tsx
 * // Single permission
 * <Can permission="project:create">
 *   <CreateProjectButton />
 * </Can>
 *
 * // Any of multiple permissions (OR)
 * <Can anyOf={['project:edit', 'project:delete']}>
 *   <ProjectActions />
 * </Can>
 *
 * // All of multiple permissions (AND)
 * <Can allOf={['snap:view_all', 'snap:generate_summary']}>
 *   <GenerateSummaryButton />
 * </Can>
 *
 * // With fallback
 * <Can permission="report:view" fallback={<p>No access to reports</p>}>
 *   <ReportsDashboard />
 * </Can>
 * ```
 */
export function Can({ permission, anyOf, allOf, children, fallback = null }: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyOf && anyOf.length > 0) {
    hasAccess = hasAnyPermission(anyOf);
  } else if (allOf && allOf.length > 0) {
    hasAccess = hasAllPermissions(allOf);
  }

  return <>{hasAccess ? children : fallback}</>;
}

/**
 * Hook version for programmatic permission checks
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const canCreateProject = useCan('project:create');
 *   const canEditOrDelete = useCanAny(['project:edit', 'project:delete']);
 *
 *   if (!canCreateProject) {
 *     return <p>No access</p>;
 *   }
 *   // ...
 * }
 * ```
 */
export function useCan(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

export function useCanAny(permissions: string[]): boolean {
  const { hasAnyPermission } = useAuth();
  return hasAnyPermission(permissions);
}

export function useCanAll(permissions: string[]): boolean {
  const { hasAllPermissions } = useAuth();
  return hasAllPermissions(permissions);
}

export default Can;
