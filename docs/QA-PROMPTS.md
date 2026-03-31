# QA Infrastructure Prompts

> Ready-to-use prompts for working on the Vete project QA infrastructure with Claude Code.

---

## 1. Test Coverage Analysis

```
Analyze the test coverage of this project. Run the coverage report and identify:
1. Which modules have <50% coverage
2. Critical API routes without tests
3. Database operations without test coverage
4. Components lacking unit tests

Generate a prioritized list of files that need tests, ranked by:
- Business criticality (payments, auth, medical records)
- Code complexity
- Recent bug history (from git blame)

Output a markdown report with specific file paths and recommended test types.
```

---

## 2. Migrate High-Boilerplate Tests

```
Find all integration test files with >300 lines and analyze their mock boilerplate.

For each file:
1. Count lines of inline mock definitions
2. Identify if they use testStaffOnlyEndpoint or manual auth tests
3. Check if they use mockState or inline let variables
4. Calculate potential line reduction

Create refactored versions of the top 3 files using the new QA infrastructure:
- mockState for auth scenarios
- testStaffOnlyEndpoint/testAdminOnlyEndpoint for auth tests
- TENANTS/USERS/PETS fixtures instead of hardcoded data

Run tests to verify refactored versions pass.
```

---

## 3. Auth Security Test Audit

```
Audit all API routes in app/api/ for authorization testing:

1. List every route handler (GET, POST, PUT, DELETE, PATCH)
2. Check which have corresponding auth tests
3. Identify routes missing:
   - Unauthenticated rejection tests
   - Role-based access tests (owner vs vet vs admin)
   - Tenant isolation tests

For missing auth tests, generate test files using testStaffOnlyEndpoint or testAdminOnlyEndpoint. Prioritize:
- Payment/billing routes
- Medical record routes
- Admin-only routes

Output: List of routes with auth test status (✅/❌) and generated test files.
```

---

## 4. Database Mock Verification

```
Analyze the CleanupManager and mockState to verify database mocking is complete:

1. List all tables in the database schema (from db/*.sql files)
2. Compare against CLEANUP_TABLES in cleanup-manager.ts
3. Identify tables missing from cleanup order
4. Check mockState.setTableResult() usage across all tests

For each missing table:
- Add to CleanupManager with correct dependency order
- Add fixture data to lib/test-utils/fixtures/ if commonly used

Run integration tests to verify no orphaned records after cleanup.
```

---

## 5. E2E Test Gap Analysis

```
Review the Playwright E2E tests in tests/e2e/ and compare against user journeys:

Critical flows to verify have E2E coverage:
1. Pet owner registration → login → view pets → book appointment
2. Vet login → view dashboard → create medical record → prescribe medication
3. Admin login → manage staff → view reports → process refund
4. Store checkout flow → prescription upload → payment

For each flow:
- Check if E2E test exists
- Identify broken or flaky tests
- Suggest missing assertions

Create new E2E tests for any critical flows without coverage.
```

---

## 6. Factory Fixture Expansion

```
Analyze lib/test-utils/fixtures/ and expand coverage:

1. Review all database entity types in lib/types/
2. Compare against available fixtures (TENANTS, USERS, PETS, INVOICES, etc.)
3. Identify missing entity fixtures needed for common test scenarios

Create fixtures for:
- Lab orders and results
- Prescriptions
- Appointments with different statuses
- Hospitalization records
- Store products and orders

Ensure all fixtures use consistent tenant_id (TENANTS.ADRIS.id) and cross-reference correctly.
```

---

## 7. Test Performance Optimization

```
Profile the test suite performance:

1. Run `npm run test:unit` with timing output
2. Identify the 10 slowest test files
3. Analyze why they're slow:
   - Heavy mock setup?
   - Unnecessary async waits?
   - Missing test isolation (state leaking)?

For each slow file:
- Refactor to use beforeAll for shared setup
- Replace heavy mocks with mockState
- Add test.concurrent where tests are independent

Target: Reduce total test time by 30%.
```

---

## 8. Error Scenario Coverage

```
Audit tests for error handling coverage:

1. Find all try/catch blocks in app/api/ routes
2. Check which error paths have corresponding tests
3. Identify missing tests for:
   - Database connection failures
   - RPC errors
   - Validation errors (Zod schema failures)
   - Rate limiting errors
   - Tenant isolation violations

Generate test cases for each missing error scenario using:
- mockState.setTableError() for DB errors
- Invalid request bodies for validation
- Missing auth for 401/403 scenarios

Ensure error responses match the API error contract (code, message, details).
```

---

## 9. Test Documentation Generator

```
Generate comprehensive test documentation:

1. Scan all test files for @tags comments
2. Group tests by category: unit, integration, e2e, security, critical
3. Extract test descriptions and create a test catalog

Generate:
- `docs/testing/TEST-CATALOG.md` - All tests organized by feature
- `docs/testing/COVERAGE-GAPS.md` - Known untested areas
- `docs/testing/RUN-GUIDE.md` - How to run specific test subsets

Include commands for:
- Running critical tests only: `npm test -- --grep "@critical"`
- Running security tests: `npm test -- --grep "@security"`
- Running tests for specific feature: `npm test -- tests/integration/payments/`
```

---

## 10. CI/CD Test Integration Review

```
Review the test integration with CI/CD pipeline:

1. Check .github/workflows/ for test jobs
2. Verify test commands match local development
3. Identify:
   - Are unit tests running on every PR?
   - Are integration tests running with test database?
   - Is coverage being tracked and reported?
   - Are flaky tests causing false failures?

Recommend improvements:
- Add test splitting for parallel execution
- Configure test retries for flaky tests
- Set up coverage thresholds (fail if coverage drops)
- Add visual regression testing for components

Create/update CI workflow files with recommended changes.
```

---

## Quick Reference Commands

| Goal | Command |
|------|---------|
| Run all unit tests | `npm run test:unit` |
| Run with coverage | `npm run test:unit -- --coverage` |
| Run specific file | `npx vitest run tests/integration/payments/` |
| Run by tag | `npx vitest run --grep "critical"` |
| Watch mode | `npx vitest --watch` |
| E2E tests | `npm run test:e2e` |
| Run integration only | `npx vitest run tests/integration/` |

---

## QA Infrastructure Files

| File | Purpose |
|------|---------|
| `lib/test-utils/index.ts` | Unified exports for all test utilities |
| `lib/test-utils/mock-presets.ts` | mockState singleton, AUTH_SCENARIOS |
| `lib/test-utils/auth-test-suite.ts` | testStaffOnlyEndpoint, testAdminOnlyEndpoint |
| `lib/test-utils/fixtures/index.ts` | TENANTS, USERS, PETS, INVOICES fixtures |
| `lib/test-utils/factories.ts` | Legacy factories (createMockPet, etc.) |
| `lib/test-utils/CHEATSHEET.md` | Quick reference for test patterns |
| `lib/test-utils/README.md` | Full documentation |
| `tests/__helpers__/cleanup-manager.ts` | Database cleanup with 100+ tables |
| `vitest.setup.ts` | Global test setup with auto-reset |

---

## Current Test Stats

- **Unit Tests**: 563 passing
- **Integration Tests**: 498 passing
- **Refactored Files**: 3 (role-authorization, discharge-workflow, duplicate-prevention)
- **Line Reduction**: ~40% average in refactored files

---

## Migration Checklist for New Test Files

- [ ] Import from `@/lib/test-utils` (not individual files)
- [ ] Use `mockState.setAuthScenario()` instead of inline mocks
- [ ] Use `testStaffOnlyEndpoint()` for auth tests
- [ ] Use fixtures (TENANTS, USERS, PETS) instead of hardcoded data
- [ ] Add `mockState.reset()` in `beforeEach`
- [ ] Use `mockState.setTableResult()` for database mocks
- [ ] Use `mockState.setTableError()` for error scenarios

---

*Last updated: January 2026*
