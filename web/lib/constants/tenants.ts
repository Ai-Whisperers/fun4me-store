/**
 * Centralized Tenant Constants
 * 
 * Single source of truth for all tenant IDs across the application.
 * Use these constants instead of hardcoding tenant strings.
 * 
 * Usage:
 *   import { TENANT_IDS } from '@/lib/constants/tenants';
 *   const result = await supabase.from('pets').eq('tenant_id', TENANT_IDS.TERRAPET);
 */

/**
 * All tenant IDs in the system
 */
export const TENANT_IDS = {
  TERRAPET: 'terrapet',
  PETLIFE: 'petlife',
  // Legacy alias for backwards compatibility during migration
  ADRIS: 'terrapet',
} as const;

/**
 * Type-safe tenant ID
 */
export type TenantId = typeof TENANT_IDS[keyof typeof TENANT_IDS];

/**
 * List of all valid tenant IDs
 */
export const ALL_TENANT_IDS = Object.values(TENANT_IDS).filter(
  (value, index, self) => self.indexOf(value) === index // Remove duplicates
) as string[];

/**
 * Default tenant for tests and development
 */
export const DEFAULT_TEST_TENANT: TenantId = TENANT_IDS.TERRAPET;

/**
 * Get tenant ID from environment or use default
 * Useful for tests that need to run against a specific tenant
 */
export function getTestTenant(): TenantId {
  const envTenant = process.env.TEST_TENANT;
  if (envTenant && ALL_TENANT_IDS.includes(envTenant)) {
    return envTenant as TenantId;
  }
  return DEFAULT_TEST_TENANT;
}

/**
 * Validate that a string is a valid tenant ID
 */
export function isValidTenantId(tenantId: string): tenantId is TenantId {
  return ALL_TENANT_IDS.includes(tenantId);
}

/**
 * Assert that a tenant ID is valid (throws if not)
 */
export function assertValidTenantId(tenantId: string): asserts tenantId is TenantId {
  if (!isValidTenantId(tenantId)) {
    throw new Error(`Invalid tenant ID: ${tenantId}. Valid IDs: ${ALL_TENANT_IDS.join(', ')}`);
  }
}

/**
 * Get human-readable name for a tenant
 */
export function getTenantDisplayName(tenantId: TenantId): string {
  const names: Record<string, string> = {
    [TENANT_IDS.TERRAPET]: 'TerraPet',
    [TENANT_IDS.PETLIFE]: 'PetLife Center',
  };
  return names[tenantId] || tenantId;
}

/**
 * Configuration per tenant (if needed)
 */
export const TENANT_CONFIG: Record<TenantId, { name: string; slug: string; demo: boolean }> = {
  [TENANT_IDS.TERRAPET]: {
    name: 'TerraPet',
    slug: 'terrapet',
    demo: true,
  },
  [TENANT_IDS.PETLIFE]: {
    name: 'PetLife Center',
    slug: 'petlife',
    demo: true,
  },
};
