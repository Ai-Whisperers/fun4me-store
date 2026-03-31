# Migrate High-Boilerplate Tests

Find all integration test files with >300 lines and analyze their mock boilerplate.

## Analysis

For each file, identify:
1. Lines of inline mock definitions (vi.mock with inline objects)
2. Manual auth test patterns (should use testStaffOnlyEndpoint)
3. Inline `let mockUser/mockProfile` variables (should use mockState)
4. Hardcoded test data (should use TENANTS/USERS/PETS fixtures)

## Migration Steps

1. Find candidates: `wc -l web/tests/integration/**/*.test.ts | sort -rn | head -20`
2. For top 3 files, create refactored versions using:
   - `mockState` for auth scenarios
   - `testStaffOnlyEndpoint`/`testAdminOnlyEndpoint` for auth tests
   - `TENANTS`/`USERS`/`PETS` fixtures instead of hardcoded data
3. Run tests to verify refactored versions pass
4. Compare line counts (target: 30-50% reduction)

## Reference

See existing refactored examples:
- `tests/integration/admin/role-authorization-refactored.test.ts`
- `tests/integration/hospitalization/discharge-workflow-refactored.test.ts`
- `tests/integration/payments/duplicate-prevention-refactored.test.ts`

## QA Infrastructure

```typescript
import {
  mockState,
  testStaffOnlyEndpoint,
  TENANTS, USERS, PETS,
} from '@/lib/test-utils'
```
