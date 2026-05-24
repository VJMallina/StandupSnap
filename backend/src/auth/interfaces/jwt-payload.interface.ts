/**
 * JWT Payload for access tokens
 *
 * Contains user identity and organization context.
 * Project-level permissions are NOT cached in the JWT because a user
 * has different roles on different projects. Project permissions are
 * resolved at request time from DB/Redis.
 *
 * NOTE: During migration, org fields are optional. After migration is complete,
 * they should be made required and the legacy 'roles' field removed.
 */
export interface JwtPayload {
  /** User ID (subject) */
  sub: string;

  /** Username */
  username: string;

  /**
   * Organization ID - tenant context
   * @optional During migration phase
   */
  organizationId?: string;

  /**
   * Organization slug (e.g., "infosys", "tcs")
   * @optional During migration phase
   */
  orgSlug?: string;

  /**
   * Org-level role name (e.g., "ORG_ADMIN", "PMO", "SCRUM_MASTER")
   * @optional During migration phase
   */
  orgRole?: string;

  /**
   * Org-level permissions - cached in JWT for fast org-scoped checks
   * @optional During migration phase
   */
  orgPermissions?: string[];

  /**
   * Permission version counter - incremented when role changes.
   * Used to detect stale tokens:
   * - On API call, compare JWT version vs DB version
   * - If mismatch, return 401 TOKEN_STALE
   * - Frontend silently refreshes token
   * @optional During migration phase
   */
  permissionsVersion?: number;

  /**
   * @deprecated Legacy field - keeping for backwards compatibility during migration
   * Will be removed after migration is complete
   */
  roles?: string[];
}

/**
 * Extended JWT payload with token metadata
 */
export interface JwtPayloadWithMeta extends JwtPayload {
  /** Token issued at (Unix timestamp) */
  iat: number;

  /** Token expiration (Unix timestamp) */
  exp: number;
}

/**
 * User context extracted from JWT and enriched with org data
 * This is what gets attached to request.user
 */
export interface AuthenticatedUser {
  id: string;
  username: string;
  organizationId: string;
  orgSlug: string;
  orgRole: string;
  orgPermissions: string[];
  permissionsVersion: number;

  /** Whether user is ORG_ADMIN (convenience flag) */
  isOrgAdmin: boolean;
}

/**
 * Response for stale token errors
 */
export interface TokenStaleResponse {
  statusCode: 401;
  error: 'Unauthorized';
  message: 'Token permissions are stale';
  code: 'TOKEN_STALE';
}
