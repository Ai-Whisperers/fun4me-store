# TST-006: API Route Coverage Audit & Gap Analysis

## Summary

**Priority**: P1 - High
**Effort**: 4-6 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Audit/Analysis
**Dependencies**: None

## Problem Statement

With **309 API route files** in the codebase and only **~140 tested**, there's a 55% gap in API test coverage. We need a systematic audit to identify which routes lack tests and prioritize coverage.

### Current State

| Category | Routes | Tests | Coverage |
|----------|--------|-------|----------|
| Core (pets, appointments) | ~40 | ~30 | ~75% |
| Store/E-commerce | ~35 | ~25 | ~71% |
| Clinical | ~25 | ~15 | ~60% |
| Hospitalization | ~20 | ~12 | ~60% |
| Invoicing/Payments | ~25 | ~15 | ~60% |
| Lab | ~15 | ~10 | ~67% |
| Messaging | ~15 | ~8 | ~53% |
| Portal/Owner | ~20 | ~5 | ~25% |
| Analytics/Reports | ~15 | ~5 | ~33% |
| Cron/Background | ~14 | ~14 | 100% |
| Admin/Platform | ~25 | ~10 | ~40% |
| Auth | ~10 | ~5 | ~50% |
| Loyalty/Referrals | ~15 | ~3 | ~20% |
| Other | ~55 | ~20 | ~36% |

## Scope

### Deliverables

1. **Route Inventory Spreadsheet**
   - All 309 routes cataloged
   - Test file mapping (if exists)
   - Coverage status
   - Priority assignment

2. **Gap Analysis Report**
   - Untested routes by category
   - Risk assessment per route
   - Recommended test priority

3. **Test Plan Tickets**
   - One ticket per major gap area
   - Effort estimates
   - Dependencies

## Audit Methodology

### Step 1: Generate Route Inventory

```bash
# List all API routes
find web/app/api -name "route.ts" -type f | \
  sed 's/web\/app//' | \
  sed 's/\/route.ts//' | \
  sort > api-routes.txt

# List all test files
find web/tests -name "*.test.ts" | \
  grep -E "(api|integration)" | \
  sort > test-files.txt
```

### Step 2: Map Routes to Tests

```typescript
// scripts/audit-api-coverage.ts
import { routes } from './api-routes'
import { tests } from './test-files'

interface RouteAudit {
  path: string
  methods: string[]
  hasTest: boolean
  testFile?: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  notes: string
}

function auditRoutes(): RouteAudit[] {
  return routes.map(route => {
    const testMatch = findMatchingTest(route, tests)
    return {
      path: route,
      methods: getHttpMethods(route),
      hasTest: !!testMatch,
      testFile: testMatch,
      priority: calculatePriority(route),
      notes: ''
    }
  })
}
```

### Step 3: Priority Classification

| Priority | Criteria | Examples |
|----------|----------|----------|
| P0 | Security-sensitive, financial, auth | /api/payments, /api/auth |
| P1 | Core user journeys | /api/appointments, /api/pets |
| P2 | Supporting features | /api/messaging, /api/loyalty |
| P3 | Admin/internal | /api/analytics, /api/settings |

## Expected Output

### Route Inventory Example

| Route | Methods | Test File | Status | Priority |
|-------|---------|-----------|--------|----------|
| /api/pets | GET, POST | pets/crud.test.ts | Covered | P1 |
| /api/pets/[id] | GET, PUT, DELETE | pets/crud.test.ts | Covered | P1 |
| /api/portal/profile | GET, PATCH | - | **Missing** | P0 |
| /api/loyalty/rewards | GET, POST | - | **Missing** | P2 |
| /api/analytics | GET | - | **Missing** | P3 |

### Gap Summary Example

```
API Route Coverage Audit Results
================================
Total Routes: 309
Tested: 140 (45%)
Untested: 169 (55%)

Untested by Priority:
- P0 Critical: 12 routes
- P1 High: 35 routes
- P2 Medium: 62 routes
- P3 Low: 60 routes

Top Untested Categories:
1. Portal/Owner (15 routes)
2. Loyalty/Referrals (12 routes)
3. Analytics (10 routes)
4. Admin Platform (15 routes)
```

## Acceptance Criteria

- [ ] Complete inventory of all 309 routes
- [ ] Each route mapped to test file or marked missing
- [ ] Priority assigned to each untested route
- [ ] Risk assessment for P0/P1 gaps
- [ ] Follow-up tickets created (TST-007 through TST-010)
- [ ] Audit script saved for re-running
- [ ] Results documented in `/documentation/testing/api-coverage-audit.md`

## Output Files

- `documentation/testing/api-coverage-audit.md` - Full report
- `scripts/audit-api-coverage.ts` - Reusable audit script
- `documentation/testing/api-route-inventory.csv` - Spreadsheet data

---

**Created**: 2026-01-12
**Status**: Not Started
