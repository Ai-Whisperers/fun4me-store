/**
 * Tenant Test Utilities
 * 
 * Helpers for creating tenant-scoped test data and contexts.
 * 
 * Usage:
 *   import { createTenantContext } from '@/lib/test-utils/tenant';
 *   const { tenantId, profile } = createTenantContext(TENANT_IDS.ADRIS);
 */

import { TENANT_IDS, type TenantId, getTestTenant } from '@/lib/constants/tenants';

/**
 * Tenant context for tests
 */
export interface TenantContext {
  tenantId: TenantId;
  profile: {
    id: string;
    tenant_id: TenantId;
    role: 'owner' | 'vet' | 'admin';
    full_name: string;
    email: string;
  };
}

/**
 * Create a tenant context for testing
 * 
 * @example
 * const { tenantId, profile } = createTenantContext(TENANT_IDS.ADRIS, 'vet');
 */
export function createTenantContext(
  tenantId: TenantId = getTestTenant(),
  role: 'owner' | 'vet' | 'admin' = 'vet'
): TenantContext {
  return {
    tenantId,
    profile: {
      id: `test-user-${role}-${Date.now()}`,
      tenant_id: tenantId,
      role,
      full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      email: `test-${role}@${tenantId}.test`,
    },
  };
}

/**
 * Create multiple tenant contexts (for cross-tenant isolation tests)
 * 
 * @example
 * const [terrapetVet, petlifeVet] = createMultiTenantContexts([
 *   [TENANT_IDS.ADRIS, 'vet'],
 *   [TENANT_IDS.PETLIFE, 'vet'],
 * ]);
 */
export function createMultiTenantContexts(
  configs: Array<[TenantId, 'owner' | 'vet' | 'admin']>
): TenantContext[] {
  return configs.map(([tenantId, role]) => createTenantContext(tenantId, role));
}

/**
 * Get data scoped to a tenant for testing
 * 
 * @example
 * const petData = createTenantScopedData(TENANT_IDS.ADRIS, { name: 'Buddy' });
 * // Returns: { name: 'Buddy', tenant_id: TENANT_IDS.ADRIS }
 */
export function createTenantScopedData<T extends Record<string, unknown>>(
  tenantId: TenantId,
  data: T
): T & { tenant_id: TenantId } {
  return {
    ...data,
    tenant_id: tenantId,
  };
}

/**
 * Assert that data belongs to expected tenant (for test assertions)
 * 
 * @example
 * const pet = await getPet(id);
 * assertTenantOwnership(pet, TENANT_IDS.ADRIS);
 */
export function assertTenantOwnership(
  data: { tenant_id?: string } | null | undefined,
  expectedTenantId: TenantId,
  message?: string
): asserts data is { tenant_id: TenantId } {
  if (!data) {
    throw new Error(message || `Expected data to exist for tenant ${expectedTenantId}`);
  }
  if (data.tenant_id !== expectedTenantId) {
    throw new Error(
      message ||
        `Expected tenant_id to be ${expectedTenantId}, got ${data.tenant_id}`
    );
  }
}

/**
 * Create test data for all tenants (for multi-tenant tests)
 * 
 * @example
 * const petsPerTenant = createDataForAllTenants(tenantId => ({
 *   name: `Test Pet ${tenantId}`,
 *   species: 'dog',
 * }));
 */
export function createDataForAllTenants<T extends Record<string, unknown>>(
  dataFactory: (tenantId: TenantId) => T
): Array<T & { tenant_id: TenantId }> {
  return [TENANT_IDS.ADRIS, TENANT_IDS.PETLIFE].map(tenantId =>
    createTenantScopedData(tenantId, dataFactory(tenantId))
  );
}
