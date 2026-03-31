import { createTestId, cleanupTenantData } from './db';

/**
 * Wraps a test execution with an isolated tenant context.
 * Creates a unique tenant ID for the test and cleans up all data associated 
 * with that tenant afterwards.
 * 
 * @example
 * await withTenantIsolation(async (tenantId) => {
 *   await service.create(ownerId, tenantId, data);
 *   // assertions...
 * });
 */
export async function withTenantIsolation(
  testFn: (tenantId: string) => Promise<void>
): Promise<void> {
  const tenantId = createTestId('test-tenant');
  
  try {
    // Run the test with the unique tenant ID
    await testFn(tenantId);
  } finally {
    // Always cleanup data for this tenant, even if test fails
    await cleanupTenantData(tenantId);
  }
}
