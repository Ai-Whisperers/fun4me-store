# Integration Tests - TODO

> **Status:** 509 integration tests failing
> **Blocker:** Database schema and test data setup required

---

## Problem

Integration tests in `tests/integration/` use a **real Supabase database** connection 
and run in Node.js environment without mocks. They fail because:

1. **Missing Database Columns** - Tests expect columns that don't exist
2. **Missing Test Data** - No seed data for test scenarios
3. **Auth Context** - Need proper authentication setup for RLS

---

## Required Fixes

### 1. Schema Alignment

The integration tests query columns that may not exist:

| Column | Table | Status |
|--------|-------|--------|
| `microchip_id` | pets | ❌ Should be `microchip_number` |

**Fix:** Either:
- Update tests to use correct column names, OR
- Add migration to add missing columns

### 2. Test Database Setup

Integration tests need:

```bash
# 1. Create a test database
# 2. Run all migrations
# 3. Seed with test data
```

**Recommended approach:**
- Use separate Supabase project for tests
- Or use local Supabase with `supabase start`
- Seed data via `db/seeds/` scripts

### 3. Environment Configuration

Ensure `.env.test` has proper values:

```env
NEXT_PUBLIC_SUPABASE_URL=<test-db-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<test-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<test-service-key>
```

### 4. Test Isolation

Each integration test should:
- Create its own test data
- Clean up after itself
- Not depend on other tests

---

## Recommended Approach

### Option A: Skip Integration Tests Temporarily

```json
// package.json
"test": "npm run test:unit"  // Remove integration from default
"test:all": "npm run test:unit && npm run test:integration"
```

**Pros:** Unblocks CI immediately
**Cons:** Reduces test coverage

### Option B: Fix Integration Test Infrastructure

1. Set up local Supabase for tests
2. Create test data factories
3. Add proper cleanup in afterAll hooks
4. Configure CI with test database

**Estimated effort:** 8-16 hours

---

## Quick Win: Separate Unit from Integration in CI

Update CI to run only unit tests for PRs, integration tests nightly:

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit  # Always run
  
  integration-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'  # Only nightly
    steps:
      - run: npm run test:integration
```

---

## Files to Update

| File | Change |
|------|--------|
| `vitest.integration.config.ts` | Add setup file for test DB |
| `tests/integration/setup.ts` | Create test data factories |
| `.env.test` | Add test database credentials |
| `package.json` | Separate test commands |
| `.github/workflows/` | Split test jobs |

---

*Created: 2026-02-03*
