# Database Mock Verification

Analyze the CleanupManager and mockState to verify database mocking is complete.

## Steps

1. **List all database tables**
   - Scan `web/db/*.sql` for CREATE TABLE statements
   - Extract table names and dependencies (REFERENCES)

2. **Compare with CleanupManager**
   - Read `tests/__helpers__/cleanup-manager.ts`
   - Identify tables missing from CLEANUP_TABLES
   - Verify dependency order is correct (children before parents)

3. **Check mockState usage**
   - Grep for `mockState.setTableResult` across all tests
   - Identify commonly mocked tables
   - Ensure fixtures exist for frequently used tables

## Add Missing Tables

For each missing table:
```typescript
// In cleanup-manager.ts, add in correct dependency order
'child_table',      // Must come before parent
'parent_table',
```

## Add Missing Fixtures

For commonly used tables without fixtures, add to `lib/test-utils/fixtures/`:
```typescript
export const TABLE_NAME = {
  EXAMPLE_1: {
    id: 'fixture-id-1',
    tenant_id: TENANTS.ADRIS.id,
    // ... other fields
  },
}
```

## Verify Cleanup

Run integration tests and check for orphaned records:
```bash
cd web && npx vitest run tests/integration/ --reporter=verbose
```
