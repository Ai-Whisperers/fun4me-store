# EPIC-P1-03: Database Test Synchronization

> **Epic Owner:** AI Agent
> **Duration:** 2-3 days
> **Priority:** P0 - Critical
> **Status:** Not Started
> **Depends On:** Phase 0 Complete

---

## 📋 Summary

Fix all failing database tests including RLS policy tests, tenant isolation tests, and permission tests. These are critical for security verification.

---

## 🎯 Goals

1. **Fix** all ~75 failing database/security tests
2. **Verify** RLS policies work correctly
3. **Confirm** tenant isolation is enforced
4. **Validate** permission boundaries

---

## 📊 Database Test Files

| Test File | Purpose | Est. Failures | Priority |
|-----------|---------|---------------|----------|
| `terrapet-rls.test.ts` | RLS policy verification | ~20 | P0 |
| `terrapet-isolation.test.ts` | Tenant isolation | ~15 | P0 |
| `permission-tests.test.ts` | Role permissions | ~25 | P0 |
| Integration tests | Real DB operations | ~15 | P1 |

---

## 📝 Tickets

| ID | Test Area | Priority | Est. |
|----|-----------|----------|------|
| P1-050 | RLS Policy Tests | P0 | 4h |
| P1-051 | Tenant Isolation Tests | P0 | 3h |
| P1-052 | Permission Tests | P0 | 4h |
| P1-053 | Integration DB Tests | P1 | 3h |

**Total Estimated: 14 hours**

---

## 🔧 Common Database Test Issues

### Issue 1: Schema Drift (microchip_id)

From test output:
```
Error: column pets.microchip_id does not exist
```

**Fix:** Either:
- Add column via migration, or
- Remove from test queries/select statements

### Issue 2: Test Database Not Migrated

```typescript
// Ensure migrations run before tests
beforeAll(async () => {
  await runMigrations(testDb);
});
```

### Issue 3: RLS Context Not Set

```typescript
// BEFORE (fails - no context)
const { data } = await supabase.from('pets').select();

// AFTER (works - RLS context set)
const { data } = await supabase
  .rpc('set_tenant_context', { tenant_id: 'test-tenant' })
  .then(() => supabase.from('pets').select());
```

---

## 🔒 RLS Test Patterns

```typescript
describe('pets RLS', () => {
  describe('tenant isolation', () => {
    it('user from tenant A cannot read tenant B pets', async () => {
      const clientA = createClientForTenant('tenant-a');
      
      const { data } = await clientA
        .from('pets')
        .select()
        .eq('tenant_id', 'tenant-b');
      
      // RLS should filter to empty
      expect(data).toEqual([]);
    });

    it('user from tenant A cannot insert into tenant B', async () => {
      const clientA = createClientForTenant('tenant-a');
      
      const { error } = await clientA
        .from('pets')
        .insert({ tenant_id: 'tenant-b', name: 'Hacked Pet' });
      
      expect(error?.code).toBe('42501'); // RLS violation
    });
  });

  describe('owner access', () => {
    it('owner can only read their own pets', async () => {
      const ownerClient = createClientForOwner('owner-1');
      
      const { data } = await ownerClient.from('pets').select();
      
      data?.forEach(pet => {
        expect(pet.owner_id).toBe('owner-1');
      });
    });
  });
});
```

---

## ✅ Acceptance Criteria

- [ ] All RLS tests pass
- [ ] All isolation tests pass
- [ ] All permission tests pass
- [ ] No security regressions
- [ ] Test database schema matches production

---

## 📈 Progress

```
RLS Tests:        ░░░░░░░░░░ 0%
Isolation Tests:  ░░░░░░░░░░ 0%
Permission Tests: ░░░░░░░░░░ 0%
Integration:      ░░░░░░░░░░ 0%
```

---

## 📎 Related Files

- `web/tests/database/terrapet-rls.test.ts`
- `web/tests/database/terrapet-isolation.test.ts`
- `web/tests/generated/permission-tests.test.ts`
- `web/supabase/migrations/` - All migrations

---

*Last Updated: 2026-02-03*
