# P0-007: Standardize Chainable Query Mock

## Metadata

| Field | Value |
|-------|-------|
| **ID** | P0-007 |
| **Epic** | [EPIC-P0-02](../EPIC-P0-02-mock-infrastructure.md) |
| **Priority** | P0 - Critical |
| **Estimate** | 3 hours |
| **Status** | In Progress |
| **Depends On** | P0-006 |
| **Blocks** | All Phase 1 service tickets |

---

## Description

Create and document a standardized `createChainableQueryMock()` helper that properly mocks all Supabase query builder methods with correct types.

---

## Current State

Partial implementation exists in `supabase-mock.ts` but:
- Not all methods return `this` for chaining
- Type definitions incomplete
- Some tests work around issues with custom mocks

---

## Acceptance Criteria

- [ ] `createChainableQueryMock<T>(data, error)` helper complete
- [ ] All query methods supported (see list below)
- [ ] Proper TypeScript types
- [ ] Works with `.single()`, `.maybeSingle()`, and array returns
- [ ] Exported from central location
- [ ] Example usage documented

---

## Implementation

```typescript
// web/tests/services/__mocks__/query-mock.ts

import { vi } from 'vitest';

export interface ChainableQueryMock {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
  containedBy: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
  match: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
}

export function createChainableQueryMock<T>(
  data: T | T[] | null,
  error: { message: string; code?: string } | null = null
): ChainableQueryMock {
  const chain: ChainableQueryMock = {} as ChainableQueryMock;
  
  // Terminal methods - return the result
  chain.single = vi.fn().mockResolvedValue({ 
    data: Array.isArray(data) ? data[0] : data, 
    error 
  });
  
  chain.maybeSingle = vi.fn().mockResolvedValue({ 
    data: Array.isArray(data) ? data[0] : data, 
    error 
  });
  
  chain.then = vi.fn((resolve) => resolve({ 
    data: Array.isArray(data) ? data : data ? [data] : [], 
    error 
  }));

  // Chainable methods - return self
  const chainableMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in',
    'contains', 'containedBy', 'or', 'not', 'filter', 'match',
    'order', 'limit', 'offset', 'range'
  ];
  
  chainableMethods.forEach(method => {
    (chain as any)[method] = vi.fn().mockReturnValue(chain);
  });

  return chain;
}

// Convenience wrappers
export function createSuccessQueryMock<T>(data: T | T[]) {
  return createChainableQueryMock(data, null);
}

export function createErrorQueryMock(message: string, code?: string) {
  return createChainableQueryMock(null, { message, code });
}

export function createEmptyQueryMock() {
  return createChainableQueryMock([], null);
}
```

---

## Usage Example

```typescript
import { createChainableQueryMock } from '../__mocks__/query-mock';

describe('PetService', () => {
  it('returns pets for owner', async () => {
    const mockPets = [{ id: '1', name: 'Max' }];
    
    mockSupabase.from.mockReturnValue(
      createChainableQueryMock(mockPets)
    );
    
    const result = await service.list(ownerId, tenantId);
    
    expect(result.data).toEqual(mockPets);
  });

  it('handles database error', async () => {
    mockSupabase.from.mockReturnValue(
      createChainableQueryMock(null, { message: 'Connection failed' })
    );
    
    const result = await service.list(ownerId, tenantId);
    
    expect(result.error).toBe('Connection failed');
  });
});
```

---

## Related Files

- `web/tests/services/__mocks__/supabase-mock.ts`
- All service test files

---

*Created: 2026-02-03*
