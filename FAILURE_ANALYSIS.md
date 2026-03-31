# Test Failure Analysis

> Generated: 2026-02-03
> **Updated: 2026-02-03 16:00 UTC**
> 
> ## ✅ UNIT TESTS FIXED - 100% PASSING
> 
> **Original Status:** 509 failures
> **Current Unit Test Status:** 0 failures (1524 passing)
> 
> The remaining failures are in **integration tests** which require database setup.

---

## Current Status

| Test Suite | Status | Details |
|------------|--------|---------|
| Unit Tests | ✅ **100% PASSING** | 1524 tests, 49 files |
| Integration Tests | ❌ 509 failing | Database/infrastructure issue |

---

> Original analysis preserved below for reference:

---

# Original Analysis (Pre-Fix)

> Total Failures: 509
> Failing Files: 42

---

## Failure Categories

| Category | Count | % | Root Cause |
|----------|-------|---|------------|
| **Next.js cookies() scope** | ~200 | 39% | API routes call `cookies()` outside request |
| **Mock chainable issues** | ~150 | 30% | Query builder not fully chainable |
| **Schema drift** | ~50 | 10% | `microchip_id` column missing |
| **Auth mock issues** | ~50 | 10% | Session/user not mocked properly |
| **Assertion updates** | ~40 | 8% | Expected values changed |
| **Other** | ~19 | 3% | Various |

---

## Category 1: Next.js cookies() Scope (200 failures)

### Error Message
```
Error: `cookies` was called outside a request scope.
Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context
```

### Affected Files
- `tests/integration/store/store-cart.test.ts` (~50 tests)
- `tests/api/store/cart/route.test.ts` (~30 tests)
- `tests/api/appointments/*.test.ts` (~40 tests)
- `tests/api/billing/*.test.ts` (~30 tests)
- `tests/api/inventory/*.test.ts` (~30 tests)
- Other API route tests (~20 tests)

### Root Cause
API routes use `cookies()` from `next/headers` which requires Next.js request context.
In Vitest, this context doesn't exist.

### Fix Strategy
```typescript
// Add to test setup or individual test files
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => {
      if (name.startsWith('sb-')) {
        return { value: 'mock-auth-token' };
      }
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}));
```

### Priority: P0 (Highest Impact)

---

## Category 2: Mock Chainable Issues (150 failures)

### Error Patterns
```
TypeError: mockSupabase.from(...).select(...).eq is not a function
TypeError: Cannot read properties of undefined (reading 'then')
```

### Affected Files
- All service tests (~100 tests)
- Integration tests that use services (~50 tests)

### Root Cause
Current `createQueryBuilder` doesn't properly return `this` for all methods,
or the mock doesn't implement all required Supabase methods.

### Fix Strategy
Already have improved mock in `supabase-mock.ts` but need to ensure all methods
return the builder AND can be awaited.

```typescript
// Ensure each method returns both chainable AND awaitable
const builder = {
  select: vi.fn().mockImplementation(() => {
    const promise = Promise.resolve(response) as any;
    Object.assign(promise, builder);
    return promise;
  }),
  // ... same for all methods
};
```

### Priority: P0 (Blocks most service tests)

---

## Category 3: Schema Drift - microchip_id (50 failures)

### Error Message
```
Error: column pets.microchip_id does not exist
```

### Affected Files
- `tests/integration/services/pet-service.integration.test.ts` (~20 tests)
- `tests/database/terrapet-*.test.ts` (~30 tests)

### Root Cause
Integration tests query real database, but `microchip_id` column doesn't exist.
Either:
1. Migration wasn't run, or
2. Tests expect a column that was never added

### Fix Strategy
**Option A:** Add migration for `microchip_id`
```sql
ALTER TABLE pets ADD COLUMN microchip_id TEXT;
```

**Option B:** Remove `microchip_id` from test queries
```typescript
// Change select to not include microchip_id
const { data } = await supabase.from('pets').select('id, name, species, breed');
```

### Priority: P1 (Affects integration tests)

---

## Category 4: Auth Mock Issues (50 failures)

### Error Patterns
```
expected 401 to be 201
expected 401 to be 200
Error: User not found
Error: Token expired
```

### Affected Files
- `tests/api/*/route.test.ts` (various)
- `tests/generated/permission-tests.test.ts` (~25 tests)

### Root Cause
Auth mocking is inconsistent. Some tests expect authenticated requests
but mock isn't set up properly.

### Fix Strategy
```typescript
// Standardized auth mock helper
export function mockAuthenticatedUser(user = defaultTestUser) {
  vi.mocked(getUser).mockResolvedValue({ 
    data: { user }, 
    error: null 
  });
  vi.mocked(getSession).mockResolvedValue({
    data: { session: { user, access_token: 'test-token' } },
    error: null
  });
}
```

### Priority: P1

---

## Category 5: Assertion Updates (40 failures)

### Error Patterns
```
expected 'Error' to be 'Specific error message'
expected false to be true
AssertionError: expected { ... } to deeply equal { ... }
```

### Affected Files
- Service tests with specific error expectations
- Tests checking exact response formats

### Root Cause
Service implementations were updated to return specific Spanish error messages,
but tests still expect old generic messages.

### Fix Strategy
Update test assertions to match new error messages:
```typescript
// Old
expect(result.error).toBe('Error');

// New  
expect(result.error).toBe('Mascota no encontrada');
```

### Priority: P2 (After mock fixes)

---

## Fix Order Recommendation

### Phase 1: Infrastructure (Unblocks ~350 tests)
1. **Fix cookies() mock** - Create global test setup
2. **Fix chainable mock** - Update supabase-mock.ts
3. **Add auth mock helpers** - Standardize authentication

### Phase 2: Schema (Unblocks ~50 tests)
4. **Fix microchip_id** - Either add migration or update tests

### Phase 3: Assertions (Fixes ~100 tests)
5. **Update error expectations** - Match Spanish messages
6. **Update response format expectations** - Match current implementation

---

## Implementation Files

| Fix | File to Create/Modify |
|-----|----------------------|
| cookies() mock | `tests/setup/next-headers-mock.ts` |
| Chainable mock | `tests/services/__mocks__/supabase-mock.ts` |
| Auth helpers | `tests/helpers/auth-mock.ts` |
| Schema fix | `supabase/migrations/XXX_add_microchip_id.sql` |

---

## Estimated Impact

| Fix | Tests Unblocked | Effort |
|-----|-----------------|--------|
| cookies() mock | ~200 | 1h |
| Chainable mock | ~150 | 2h |
| Auth helpers | ~50 | 1h |
| Schema fix | ~50 | 0.5h |
| Assertion updates | ~59 | 3h |
| **Total** | **509** | **7.5h** |

---

*This analysis will guide the Phase 1 test synchronization work.*
