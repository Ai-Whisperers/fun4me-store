# EPIC-P0-02: Mock Infrastructure

> **Epic Owner:** AI Agent
> **Duration:** 1-2 days
> **Priority:** P0 - Critical
> **Status:** In Progress

---

## 📋 Summary

Standardize and document mock patterns used across tests. Many test failures stem from inconsistent or incomplete mocks.

---

## 🎯 Goals

1. **Audit** existing mock implementations
2. **Standardize** mock patterns (especially Supabase)
3. **Fix** common mock issues
4. **Document** patterns for future use

---

## 📊 Current State

### Mock Files

| File | Purpose | Issues |
|------|---------|--------|
| `__mocks__/supabase-mock.ts` | Supabase client mock | Chainable query incomplete |
| `__mocks__/@supabase/ssr.ts` | SSR client mock | Missing methods |
| Various inline mocks | Per-test mocks | Inconsistent patterns |

### Known Issues

1. **Chainable query mock** - `from().select().eq()` chain breaks
2. **RPC mock** - Not all RPC functions mocked
3. **Auth mock** - Session/user mocking inconsistent
4. **Storage mock** - Upload/download not fully mocked

---

## 📝 Tickets

| ID | Title | Priority | Est. | Status |
|----|-------|----------|------|--------|
| P0-006 | Audit Supabase Mock Patterns | P0 | 3h | Not Started |
| P0-007 | Standardize Chainable Mock | P0 | 3h | In Progress |
| P0-008 | Fix Mock Return Types | P0 | 3h | Not Started |
| P0-009 | Document Mock Patterns | P1 | 2h | Not Started |

**Total: 11 hours**

---

## 🔧 Solution: Chainable Query Mock

```typescript
// Standardized chainable mock helper
export function createChainableQueryMock<T>(data: T | null, error: Error | null = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((resolve) => resolve({ data: Array.isArray(data) ? data : [data], error })),
  };
  
  // Make all methods return the chain for chaining
  Object.keys(chain).forEach(key => {
    if (key !== 'single' && key !== 'maybeSingle' && key !== 'then') {
      (chain as any)[key].mockReturnValue(chain);
    }
  });
  
  return chain;
}
```

---

## ✅ Acceptance Criteria

- [ ] All Supabase mock patterns documented
- [ ] `createChainableQueryMock()` helper works for all query patterns
- [ ] RPC mock helper created
- [ ] Auth mock helper created
- [ ] Storage mock helper created
- [ ] `MOCK_PATTERNS.md` guide complete
- [ ] No mock-related TypeScript errors

---

## 📎 Outputs

1. **Updated `supabase-mock.ts`** - Standardized implementation
2. **`MOCK_PATTERNS.md`** - Usage guide with examples
3. **Mock helpers** - Reusable functions for common patterns

---

*Last Updated: 2026-02-03*
