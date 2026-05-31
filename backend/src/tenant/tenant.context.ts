import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  orgSlug: string;
  orgId: string;
}

/**
 * AsyncLocalStorage keeps per-request tenant context across the entire
 * async call chain without NestJS REQUEST scope (which forces every
 * downstream service to become request-scoped too).
 */
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getCurrentTenant(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}
