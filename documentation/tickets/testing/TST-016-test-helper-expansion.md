# TST-016: Test Helper Functions Expansion

## Summary

**Priority**: P2 - Medium
**Effort**: 6-8 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Infrastructure
**Dependencies**: None

## Problem Statement

Current test helpers in `tests/__helpers__/` are limited. Missing helpers for:
- Role-specific endpoint testing
- Data validation assertions
- Response structure verification
- Tenant isolation testing
- Performance benchmarking

## Current State

```
tests/__helpers__/
├── auth.ts           # mockState.setAuthScenario(), mockCurrentUser()
├── supabase.ts       # createMockSupabaseClient()
└── index.ts          # Re-exports
```

## Proposed Helpers

### 1. Role-Based Endpoint Testers

```typescript
// tests/__helpers__/endpoint-testers.ts

/**
 * Test that an endpoint requires admin role
 */
export async function testAdminOnlyEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: object
): Promise<void> {
  const scenarios = [
    { role: 'UNAUTHENTICATED', expectedStatus: 401 },
    { role: 'OWNER', expectedStatus: 403 },
    { role: 'VET', expectedStatus: 403 },
    { role: 'ADMIN', expectedStatus: [200, 201] },
  ] as const;

  for (const { role, expectedStatus } of scenarios) {
    mockState.setAuthScenario(role);
    const res = await makeRequest(method, url, body);

    const expected = Array.isArray(expectedStatus)
      ? expectedStatus
      : [expectedStatus];

    expect(expected).toContain(res.status);
  }
}

/**
 * Test that an endpoint requires staff role (vet or admin)
 */
export async function testStaffOnlyEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: object
): Promise<void> {
  const scenarios = [
    { role: 'UNAUTHENTICATED', expectedStatus: 401 },
    { role: 'OWNER', expectedStatus: 403 },
    { role: 'VET', expectedStatus: [200, 201] },
    { role: 'ADMIN', expectedStatus: [200, 201] },
  ] as const;

  for (const { role, expectedStatus } of scenarios) {
    mockState.setAuthScenario(role);
    const res = await makeRequest(method, url, body);

    const expected = Array.isArray(expectedStatus)
      ? expectedStatus
      : [expectedStatus];

    expect(expected).toContain(res.status);
  }
}

/**
 * Test that an endpoint requires owner role and owns the resource
 */
export async function testOwnerOnlyEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: object,
  options?: { allowStaff?: boolean }
): Promise<void> {
  const scenarios = [
    { role: 'UNAUTHENTICATED', expectedStatus: 401 },
    { role: 'OWNER', expectedStatus: [200, 201] },
    { role: 'VET', expectedStatus: options?.allowStaff ? [200, 201] : 403 },
    { role: 'ADMIN', expectedStatus: options?.allowStaff ? [200, 201] : 403 },
  ] as const;

  for (const { role, expectedStatus } of scenarios) {
    mockState.setAuthScenario(role);
    const res = await makeRequest(method, url, body);

    const expected = Array.isArray(expectedStatus)
      ? expectedStatus
      : [expectedStatus];

    expect(expected).toContain(res.status);
  }
}
```

### 2. Cross-Owner Isolation Tester

```typescript
// tests/__helpers__/isolation-testers.ts

/**
 * Test that owner A cannot access owner B's resource
 */
export async function testCrossOwnerIsolation(
  method: 'GET' | 'PUT' | 'DELETE',
  urlBuilder: (resourceId: string) => string,
  resourceOwnerId: string,
  otherOwnerId: string
): Promise<void> {
  // Owner A accessing their own resource - should succeed
  mockState.setAuthScenario('OWNER', { userId: resourceOwnerId });
  const ownRes = await makeRequest(method, urlBuilder(resourceOwnerId));
  expect([200, 204]).toContain(ownRes.status);

  // Owner B accessing Owner A's resource - should fail
  mockState.setAuthScenario('OWNER', { userId: otherOwnerId });
  const otherRes = await makeRequest(method, urlBuilder(resourceOwnerId));
  expect([403, 404]).toContain(otherRes.status);
}

/**
 * Test that resources are filtered by tenant
 */
export async function testTenantIsolation(
  url: string,
  tenantAId: string,
  tenantBId: string
): Promise<void> {
  // Create resource in tenant A
  mockState.setTenant(tenantAId);
  const createRes = await makeRequest('POST', url, { name: 'Test' });
  const resourceId = createRes.data.id;

  // Try to access from tenant B
  mockState.setTenant(tenantBId);
  const getRes = await makeRequest('GET', `${url}/${resourceId}`);
  expect(getRes.status).toBe(404);
}
```

### 3. Response Validators

```typescript
// tests/__helpers__/response-validators.ts

/**
 * Validate pagination response structure
 */
export function validatePaginatedResponse<T>(
  response: any,
  itemValidator?: (item: T) => void
): void {
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('meta');
  expect(response.meta).toHaveProperty('total');
  expect(response.meta).toHaveProperty('page');
  expect(response.meta).toHaveProperty('pageSize');
  expect(response.meta).toHaveProperty('totalPages');
  expect(Array.isArray(response.data)).toBe(true);

  if (itemValidator) {
    response.data.forEach(itemValidator);
  }
}

/**
 * Validate error response structure
 */
export function validateErrorResponse(
  response: any,
  expectedStatus: number,
  expectedMessagePattern?: RegExp
): void {
  expect(response.status).toBe(expectedStatus);
  expect(response.data).toHaveProperty('error');

  if (expectedMessagePattern) {
    expect(response.data.error).toMatch(expectedMessagePattern);
  }
}

/**
 * Validate timestamp fields
 */
export function validateTimestamps(
  data: any,
  fields: string[] = ['created_at', 'updated_at']
): void {
  for (const field of fields) {
    if (data[field]) {
      expect(new Date(data[field]).toString()).not.toBe('Invalid Date');
    }
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(value: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  expect(value).toMatch(uuidRegex);
}
```

### 4. Database Helpers

```typescript
// tests/__helpers__/database.ts

/**
 * Clean up test data after test
 */
export async function cleanupTestData(
  table: string,
  conditions: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .match(conditions);

  if (error) {
    console.warn(`Cleanup failed for ${table}:`, error);
  }
}

/**
 * Wrap test in transaction for automatic rollback
 */
export async function withTransaction<T>(
  fn: () => Promise<T>
): Promise<T> {
  await supabase.rpc('begin_transaction');
  try {
    const result = await fn();
    await supabase.rpc('rollback_transaction');
    return result;
  } catch (error) {
    await supabase.rpc('rollback_transaction');
    throw error;
  }
}

/**
 * Count records matching conditions
 */
export async function countRecords(
  table: string,
  conditions?: Record<string, any>
): Promise<number> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });

  if (conditions) {
    query = query.match(conditions);
  }

  const { count } = await query;
  return count ?? 0;
}
```

### 5. Performance Helpers

```typescript
// tests/__helpers__/performance.ts

/**
 * Measure endpoint response time
 */
export async function measureResponseTime(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: object
): Promise<{ duration: number; status: number }> {
  const start = performance.now();
  const res = await makeRequest(method, url, body);
  const duration = performance.now() - start;

  return { duration, status: res.status };
}

/**
 * Assert endpoint meets performance threshold
 */
export async function assertPerformance(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  maxDurationMs: number,
  body?: object
): Promise<void> {
  const { duration, status } = await measureResponseTime(method, url, body);
  expect(status).toBeLessThan(400);
  expect(duration).toBeLessThan(maxDurationMs);
}

/**
 * Benchmark endpoint with multiple iterations
 */
export async function benchmarkEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  iterations: number = 10,
  body?: object
): Promise<{
  avg: number;
  min: number;
  max: number;
  p95: number;
}> {
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureResponseTime(method, url, body);
    durations.push(duration);
  }

  durations.sort((a, b) => a - b);

  return {
    avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    min: durations[0],
    max: durations[durations.length - 1],
    p95: durations[Math.floor(durations.length * 0.95)],
  };
}
```

### 6. Mock Data Generators

```typescript
// tests/__helpers__/generators.ts

import { faker } from '@faker-js/faker';

faker.locale = 'es';

export const generate = {
  email: () => faker.internet.email(),
  phone: () => `+595${faker.string.numeric(9)}`,
  name: () => faker.person.fullName(),
  petName: () => faker.animal.dog(),
  address: () => ({
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    country: 'Paraguay',
  }),
  price: (min = 10000, max = 1000000) =>
    faker.number.int({ min, max }),
  date: {
    past: (years = 1) => faker.date.past({ years }),
    future: (years = 1) => faker.date.future({ years }),
    recent: (days = 7) => faker.date.recent({ days }),
  },
  uuid: () => faker.string.uuid(),
  cedula: () => faker.string.numeric(7),
  ruc: () => `${faker.string.numeric(7)}-${faker.string.numeric(1)}`,
};
```

## File Structure

```
tests/__helpers__/
├── auth.ts                # Existing
├── supabase.ts            # Existing
├── endpoint-testers.ts    # NEW: Role-based testing
├── isolation-testers.ts   # NEW: Cross-owner/tenant isolation
├── response-validators.ts # NEW: Response structure validation
├── database.ts            # NEW: DB helpers (cleanup, transactions)
├── performance.ts         # NEW: Performance benchmarking
├── generators.ts          # NEW: Fake data generation
└── index.ts               # Re-export all
```

## Usage Examples

```typescript
import {
  testAdminOnlyEndpoint,
  testCrossOwnerIsolation,
  validatePaginatedResponse,
  assertPerformance,
  generate,
} from '@/tests/__helpers__';

describe('Analytics API', () => {
  it('should require admin role', async () => {
    await testAdminOnlyEndpoint('GET', '/api/analytics');
  });

  it('should respond within 500ms', async () => {
    await assertPerformance('GET', '/api/analytics', 500);
  });
});

describe('Pet API', () => {
  it('should isolate between owners', async () => {
    await testCrossOwnerIsolation(
      'GET',
      (id) => `/api/pets/${id}`,
      ownerAId,
      ownerBId
    );
  });
});
```

## Acceptance Criteria

- [ ] 6 helper modules created
- [ ] testAdminOnlyEndpoint() implemented
- [ ] testStaffOnlyEndpoint() implemented
- [ ] testOwnerOnlyEndpoint() implemented
- [ ] testCrossOwnerIsolation() implemented
- [ ] validatePaginatedResponse() implemented
- [ ] Performance helpers implemented
- [ ] All helpers exported from index.ts
- [ ] Documentation in JSDoc format
- [ ] Example tests using new helpers

---

**Created**: 2026-01-12
**Status**: Not Started
