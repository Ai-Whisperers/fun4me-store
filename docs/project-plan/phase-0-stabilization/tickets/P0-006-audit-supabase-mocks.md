# P0-006: Audit Supabase Mock Patterns

## Metadata

| Field | Value |
|-------|-------|
| **ID** | P0-006 |
| **Epic** | [EPIC-P0-02](../EPIC-P0-02-mock-infrastructure.md) |
| **Priority** | P0 - Critical |
| **Estimate** | 3 hours |
| **Status** | Not Started |
| **Depends On** | None |
| **Blocks** | P0-007, P0-008 |

---

## Description

Analyze all existing Supabase mock patterns across the test suite. Identify inconsistencies, gaps, and best patterns to standardize on.

---

## Current State

Multiple mock approaches exist:
- `__mocks__/supabase-mock.ts` - Shared mock file
- Inline mocks in individual tests
- Partial mocks that don't cover all methods
- Inconsistent return value formats

---

## Acceptance Criteria

- [ ] All mock files/patterns documented
- [ ] Each pattern evaluated for completeness
- [ ] Gaps identified (missing methods, wrong types)
- [ ] Best pattern selected for standardization
- [ ] Migration plan for non-standard patterns

---

## Implementation Steps

1. **Find all mock files**
   ```bash
   find tests -name "*mock*" -o -name "*Mock*"
   ```

2. **Find inline Supabase mocks**
   ```bash
   grep -rn "mockSupabase\|vi\.fn.*from\|createClient" tests/
   ```

3. **Document each pattern**
   - What methods are mocked?
   - What's the return format?
   - Is it chainable?
   - Are types correct?

4. **Create comparison matrix**
   | Pattern | Location | Chainable | Types | Auth | Storage | RPC |
   |---------|----------|-----------|-------|------|---------|-----|

5. **Recommend standard pattern**

---

## Mock Methods to Check

```typescript
// Query methods
from().select()
from().insert()
from().update()
from().delete()
from().upsert()

// Chainable filters
.eq() .neq() .gt() .gte() .lt() .lte()
.like() .ilike() .is() .in()
.contains() .containedBy()
.order() .limit() .offset() .range()
.single() .maybeSingle()

// Auth methods
auth.getUser()
auth.getSession()
auth.signIn*()
auth.signOut()

// Storage methods
storage.from().upload()
storage.from().download()
storage.from().getPublicUrl()

// RPC
rpc()
```

---

## Related Files

- `web/tests/services/__mocks__/supabase-mock.ts`
- `web/tests/services/__mocks__/@supabase/ssr.ts`
- Individual test files with inline mocks

---

*Created: 2026-02-03*
