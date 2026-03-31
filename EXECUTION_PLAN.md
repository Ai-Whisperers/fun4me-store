# Vete Platform - Comprehensive Execution Plan

> **Created:** 2026-02-03
> **Author:** AI Agent (Lead Engineer)
> **Methodology:** Test-Driven Development (TDD)
> **Principle:** No shortcuts. No fake passes. No ignored tests.

---

## Table of Contents

1. [Philosophy & Ground Rules](#philosophy--ground-rules)
2. [Current State Deep Dive](#current-state-deep-dive)
3. [Phase 0: Test Infrastructure Audit](#phase-0-test-infrastructure-audit)
4. [Phase 1: Critical Fixes](#phase-1-critical-fixes)
5. [Phase 2: Test Coverage Expansion](#phase-2-test-coverage-expansion)
6. [Phase 3: Feature Completion](#phase-3-feature-completion)
7. [Phase 4: Technical Debt Cleanup](#phase-4-technical-debt-cleanup)
8. [Phase 5: Polish & Hardening](#phase-5-polish--hardening)
9. [Quality Gates](#quality-gates)
10. [Daily Workflow](#daily-workflow)

---

## Philosophy & Ground Rules

### TDD Cycle (Red-Green-Refactor)

```
1. RED    → Write a failing test that defines expected behavior
2. GREEN  → Write minimal code to make the test pass
3. REFACTOR → Clean up without changing behavior, tests still pass
```

### Non-Negotiable Rules

| Rule | Rationale |
|------|-----------|
| **Never delete a failing test** | If it fails, either the code is wrong or the test expectation needs updating with justification |
| **Never use `.skip()` without TODO ticket** | Skipped tests must have a linked issue and deadline |
| **Never mock what you can test** | Mocks hide bugs; use real implementations where feasible |
| **Every PR needs test proof** | No code changes without corresponding test changes |
| **Warnings are bugs** | 774 warnings = 774 potential issues to triage |

### Test Quality Criteria

A test is VALID only if it:
1. Tests ONE behavior (single assertion focus)
2. Has a descriptive name explaining the scenario
3. Follows Arrange-Act-Assert pattern
4. Fails for the RIGHT reason when code breaks
5. Doesn't depend on other tests (isolated)
6. Doesn't use hardcoded dates/times (use mocks)

### Test Categories

| Category | Purpose | Location | Runner |
|----------|---------|----------|--------|
| Unit | Single function/component in isolation | `tests/unit/` | Vitest |
| Integration | Multiple units working together | `tests/integration/` | Vitest |
| Component | React component rendering + interaction | `tests/components/` | Vitest + Testing Library |
| API | HTTP endpoint behavior | `tests/api/` | Vitest |
| E2E | Full user flows in browser | `e2e/` | Playwright |
| Database | RLS policies, migrations, triggers | `tests/database/` | Vitest + real Supabase |

---

## Current State Deep Dive

### Test Coverage Analysis

```
Current Coverage:
- Lines:      29.88%  (threshold: 45%) ❌ FAILING
- Functions:  32.21%  (threshold: 50%) ❌ FAILING  
- Statements: 29.05%  (threshold: 45%) ❌ FAILING
- Branches:   24.51%  (threshold: 35%) ❌ FAILING
```

### Service Layer Coverage (Critical)

| Service | Coverage | Status | Priority |
|---------|----------|--------|----------|
| `pet-service.ts` | 97.56% | ✅ Excellent | - |
| `appointment-service.ts` | 82.85% | ✅ Good | P2 |
| `invoice-service.ts` | 85.89% | ✅ Good | P2 |
| `base-service.ts` | 79.31% | 🟡 OK | P2 |
| `inventory-service.ts` | 0% | 🔴 Critical | P0 |
| `prescription-service.ts` | 0% | 🔴 Critical | P0 |
| `medical-record-service.ts` | 0% | 🔴 Critical | P0 |
| `lab-service.ts` | 0% | 🔴 Critical | P0 |
| `hospitalization-service.ts` | 0% | 🔴 Critical | P0 |
| `vaccine-service.ts` | 0% | 🔴 Critical | P0 |
| `store-service.ts` | 0% | 🔴 Critical | P1 |
| `messaging-service.ts` | 0% | 🔴 Critical | P1 |
| `payment-service.ts` | 0% | 🔴 Critical | P1 |
| `safety-service.ts` | 0% | 🔴 Critical | P1 |
| `reminder-service.ts` | 0% | 🔴 Critical | P1 |
| `clinical-tools-service.ts` | 0% | 🔴 Critical | P1 |

### Lint Warning Categories (774 total)

| Category | Count | Action Required |
|----------|-------|-----------------|
| `no-console` | ~126 | Replace with `logger.*` |
| `no-explicit-any` | ~30 | Add proper types |
| `no-redeclare` | ~20 | Fix variable naming in tests |
| `@typescript-eslint/*` | ~200 | Type safety improvements |
| `react-hooks/*` | ~50 | Dependency array fixes |
| Other | ~348 | Individual triage |

### Existing Test Analysis Required

Before writing new tests, audit ALL existing tests for:
1. **False positives** — Tests that pass but don't actually verify behavior
2. **Flaky tests** — Tests that sometimes pass/fail randomly
3. **Over-mocking** — Tests that mock so much they test nothing
4. **Wrong assertions** — Tests checking the wrong thing
5. **Missing edge cases** — Happy path only, no error handling tests

---

## Phase 0: Test Infrastructure Audit

**Duration:** 2-3 days
**Goal:** Understand what we have before adding more

### Task 0.1: Catalog All Existing Tests

```bash
# Generate test inventory
find tests -name "*.test.ts" -o -name "*.test.tsx" | wc -l
find e2e -name "*.spec.ts" | wc -l
```

**Deliverable:** `EXISTING_TESTS_INVENTORY.md` with:
- Every test file listed
- Number of test cases per file
- Last modified date
- Coverage contribution

### Task 0.2: Run Full Test Suite with Verbose Output

```bash
npm run test:unit -- --reporter=verbose 2>&1 | tee test-audit-unit.log
npm run test:integration -- --reporter=verbose 2>&1 | tee test-audit-integration.log
npm run test:components -- --reporter=verbose 2>&1 | tee test-audit-components.log
npm run test:api -- --reporter=verbose 2>&1 | tee test-audit-api.log
npm run test:e2e 2>&1 | tee test-audit-e2e.log
```

**Analyze each log for:**
- Skipped tests (why?)
- Slow tests (>5s — why?)
- Console warnings during tests
- Uncaught promise rejections

### Task 0.3: Audit Test Quality

For each test file, evaluate:

```markdown
## Test File: [filename]

### Quality Checklist
- [ ] Tests have descriptive names
- [ ] Each test tests ONE thing
- [ ] Arrange-Act-Assert pattern used
- [ ] No hardcoded dates/IDs that will break
- [ ] Mocks are minimal and justified
- [ ] Error cases covered, not just happy path
- [ ] Async operations properly awaited
- [ ] Cleanup happens in afterEach/afterAll

### Issues Found
- Issue 1: [description]
- Issue 2: [description]

### Verdict
- [ ] KEEP AS-IS
- [ ] NEEDS FIXES (list them)
- [ ] NEEDS REWRITE (justify)
- [ ] DELETE (justify — e.g., tests removed feature)
```

### Task 0.4: Analyze Lint Warnings

```bash
npm run lint 2>&1 | tee lint-full-audit.log
```

Create `LINT_WARNING_TRIAGE.md`:

| File | Warning | Count | Decision | Justification |
|------|---------|-------|----------|---------------|
| `file.ts` | no-console | 5 | FIX | Replace with logger |
| `file.ts` | no-explicit-any | 2 | FIX | Add proper types |
| `test.ts` | no-redeclare | 1 | FIX | Rename variable |

**Decisions allowed:**
- **FIX** — Will fix the underlying issue
- **DISABLE-LINE** — False positive, add `// eslint-disable-next-line` with comment explaining why
- **CONFIGURE** — Rule is too strict for our codebase, adjust `.eslintrc`

### Task 0.5: Document Test Infrastructure

Create `TESTING_GUIDE.md`:
- How to run each test category
- How to add new tests
- Mocking patterns we use
- Test data management
- CI/CD test configuration

---

## Phase 1: Critical Fixes

**Duration:** 1 week
**Goal:** Fix blocking issues, establish baseline

### Task 1.1: Fix Mock Availability API (P0)

**Problem:** `web/app/api/availability/route.ts` uses hardcoded mock data in production

**TDD Approach:**
```typescript
// tests/api/availability/route.test.ts

describe('GET /api/availability', () => {
  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      const response = await GET(createMockRequest({ authenticated: false }));
      expect(response.status).toBe(401);
    });

    it('returns 401 when token is expired', async () => {
      const response = await GET(createMockRequest({ tokenExpired: true }));
      expect(response.status).toBe(401);
    });
  });

  describe('tenant isolation', () => {
    it('only returns slots for the requested tenant', async () => {
      // Setup: Create slots for tenant A and tenant B
      // Act: Request slots for tenant A
      // Assert: Only tenant A slots returned
    });
  });

  describe('slot calculation', () => {
    it('returns available slots based on staff schedules', async () => {
      // Setup: Create staff with schedule 9-17
      // Act: Request slots for a date
      // Assert: Slots returned within schedule hours
    });

    it('excludes slots that are already booked', async () => {
      // Setup: Create appointment at 10:00
      // Act: Request slots
      // Assert: 10:00 slot not in results
    });

    it('respects appointment duration when calculating slots', async () => {
      // Setup: 30-min appointments, slot at 10:00 booked
      // Act: Request slots
      // Assert: 10:00 AND 10:30 unavailable (overlap)
    });
  });

  describe('date handling', () => {
    it('returns empty array for past dates', async () => {
      const yesterday = subDays(new Date(), 1);
      const response = await GET(createMockRequest({ date: yesterday }));
      const data = await response.json();
      expect(data.slots).toEqual([]);
    });

    it('handles timezone correctly for clinic timezone', async () => {
      // Test with America/Asuncion timezone
    });
  });
});
```

**Implementation:** Replace mock with real slot calculation using:
- Staff schedules from database
- Existing appointments
- Clinic operating hours
- Appointment type durations

### Task 1.2: Fix Test Coverage Thresholds (P0)

**Strategy:** Don't lower thresholds — raise coverage.

**Target services for immediate coverage:**

#### 1.2.1 inventory-service.ts (0% → 80%)

```typescript
// tests/unit/services/inventory-service.test.ts

describe('InventoryService', () => {
  describe('getStock', () => {
    it('returns current stock level for product', async () => {});
    it('returns 0 for product with no stock records', async () => {});
    it('throws when product does not exist', async () => {});
    it('filters by tenant_id', async () => {});
  });

  describe('adjustStock', () => {
    it('increases stock with positive adjustment', async () => {});
    it('decreases stock with negative adjustment', async () => {});
    it('throws when adjustment would make stock negative', async () => {});
    it('creates stock_movement record', async () => {});
    it('uses transaction for atomicity', async () => {});
  });

  describe('getLowStockItems', () => {
    it('returns items below reorder point', async () => {});
    it('excludes items at or above reorder point', async () => {});
    it('includes current stock and reorder point in result', async () => {});
  });

  describe('reserveStock', () => {
    it('creates reservation for available stock', async () => {});
    it('throws when insufficient stock', async () => {});
    it('reservation expires after configured time', async () => {});
  });

  // ... more test cases
});
```

#### 1.2.2 prescription-service.ts (0% → 80%)

```typescript
describe('PrescriptionService', () => {
  describe('create', () => {
    it('creates prescription with medications', async () => {});
    it('validates medication dosages', async () => {});
    it('checks drug interactions', async () => {});
    it('requires veterinarian signature', async () => {});
    it('links to medical record', async () => {});
  });

  describe('generatePDF', () => {
    it('includes clinic header', async () => {});
    it('includes patient and owner info', async () => {});
    it('lists all medications with instructions', async () => {});
    it('includes vet signature', async () => {});
    it('includes QR code for verification', async () => {});
  });

  describe('refill', () => {
    it('creates new prescription based on original', async () => {});
    it('checks refill limit not exceeded', async () => {});
    it('updates refill count', async () => {});
    it('throws when prescription expired', async () => {});
  });
});
```

#### 1.2.3 vaccine-service.ts (0% → 80%)

```typescript
describe('VaccineService', () => {
  describe('getVaccinationSchedule', () => {
    it('returns recommended vaccines for species and age', async () => {});
    it('marks overdue vaccines', async () => {});
    it('excludes already administered vaccines', async () => {});
  });

  describe('recordVaccination', () => {
    it('creates vaccination record', async () => {});
    it('updates pet vaccination status', async () => {});
    it('schedules next dose if multi-dose', async () => {});
    it('deducts vaccine from inventory', async () => {});
    it('records batch number for traceability', async () => {});
  });

  describe('checkContraindications', () => {
    it('warns for known allergies', async () => {});
    it('warns for recent illness', async () => {});
    it('warns for pregnancy', async () => {});
  });
});
```

### Task 1.3: Decompose God Component (P0)

**Problem:** `web/app/[clinic]/dashboard/inventory/client.tsx` is 2122 lines

**TDD Approach for decomposition:**

1. **Write integration tests for current behavior** (before touching code)
2. **Extract components one at a time**, ensuring tests still pass
3. **Add unit tests for each extracted component**

```typescript
// tests/components/inventory/inventory-client.integration.test.tsx

describe('InventoryClient Integration', () => {
  it('renders product list', async () => {});
  it('filters products by category', async () => {});
  it('filters products by search term', async () => {});
  it('opens product detail modal on row click', async () => {});
  it('opens import wizard on import button click', async () => {});
  it('shows low stock alert badge', async () => {});
  // Capture ALL current behaviors before refactoring
});
```

**Extraction plan:**

| New Component | Lines | Responsibility |
|---------------|-------|----------------|
| `InventoryFilters.tsx` | ~150 | Search, category, status filters |
| `InventoryTable.tsx` | ~300 | Product data table |
| `ProductDetailModal.tsx` | ~400 | View/edit product details |
| `ImportWizardModal.tsx` | ~500 | CSV import workflow |
| `StockAdjustmentForm.tsx` | ~200 | Manual stock adjustments |
| `LowStockAlert.tsx` | ~100 | Alert banner |
| `InventoryClient.tsx` | ~400 | Orchestration only |

### Task 1.4: Fix console.log Statements (P1)

**Approach:** Systematic replacement, not bulk find-replace

For each console.log:
1. Determine appropriate log level (debug/info/warn/error)
2. Add context (function name, relevant IDs)
3. Replace with `logger` call

```typescript
// Before
console.log('Loading products...');
console.log('Products:', products);
console.log('Error loading products', error);

// After
logger.debug('[InventoryService.list] Loading products', { tenantId });
logger.info('[InventoryService.list] Products loaded', { count: products.length });
logger.error('[InventoryService.list] Failed to load products', { error, tenantId });
```

**Test for logging:**
```typescript
it('logs error when product fetch fails', async () => {
  const loggerSpy = vi.spyOn(logger, 'error');
  
  // Cause failure
  mockSupabase.from.mockRejectedValue(new Error('DB error'));
  
  await expect(service.list(tenantId)).rejects.toThrow();
  
  expect(loggerSpy).toHaveBeenCalledWith(
    expect.stringContaining('Failed to load'),
    expect.objectContaining({ error: expect.any(Error) })
  );
});
```

---

## Phase 2: Test Coverage Expansion

**Duration:** 2 weeks
**Goal:** Reach 80% coverage on critical paths

### Task 2.1: Service Layer Tests

For each service at 0% coverage, write comprehensive tests:

| Day | Service | Target Coverage |
|-----|---------|-----------------|
| 1-2 | medical-record-service | 80% |
| 3-4 | lab-service | 80% |
| 5-6 | hospitalization-service | 80% |
| 7-8 | store-service | 80% |
| 9-10 | messaging-service | 80% |
| 11-12 | payment-service | 80% |
| 13-14 | clinical-tools-service + safety-service | 80% |

### Task 2.2: API Route Tests

**Current:** 3% coverage (8/269 routes)
**Target:** 60% coverage on critical routes

Priority routes:
1. `/api/checkout/*` — Payment processing
2. `/api/prescriptions/*` — Medical data
3. `/api/appointments/*` — Booking mutations
4. `/api/invoices/*` — Financial operations
5. `/api/auth/*` — Authentication flows
6. `/api/inventory/*` — Stock management

**Test template for each route:**
```typescript
describe('POST /api/[resource]', () => {
  describe('authentication', () => {
    it('rejects unauthenticated requests', async () => {});
    it('rejects expired tokens', async () => {});
  });

  describe('authorization', () => {
    it('rejects users without required role', async () => {});
    it('rejects access to other tenant data', async () => {});
  });

  describe('validation', () => {
    it('rejects missing required fields', async () => {});
    it('rejects invalid field formats', async () => {});
    it('rejects values outside allowed range', async () => {});
  });

  describe('business logic', () => {
    it('creates resource with valid data', async () => {});
    it('handles edge case X', async () => {});
    it('handles edge case Y', async () => {});
  });

  describe('error handling', () => {
    it('returns appropriate error for DB failure', async () => {});
    it('returns appropriate error for external service failure', async () => {});
    it('logs errors with context', async () => {});
  });
});
```

### Task 2.3: Component Tests

**Priority components:**
1. Forms (validation, submission, error display)
2. Data tables (sorting, filtering, pagination)
3. Modals (open/close, data loading, submission)
4. Auth-dependent components (role-based rendering)

### Task 2.4: E2E Test Expansion

**Current:** Happy paths only
**Target:** Error paths, edge cases, multi-step workflows

```typescript
// e2e/appointments/booking-errors.spec.ts

test.describe('Appointment Booking - Error Scenarios', () => {
  test('shows error when slot becomes unavailable', async ({ page }) => {
    // Setup: Two users looking at same slot
    // User A books the slot
    // User B tries to book same slot
    // Assert: User B sees "slot no longer available" error
  });

  test('handles network failure gracefully', async ({ page }) => {
    // Intercept API call and force failure
    // Assert: User sees retry option, data not lost
  });

  test('prevents double-booking on rapid clicks', async ({ page }) => {
    // Click book button multiple times quickly
    // Assert: Only one appointment created
  });
});
```

---

## Phase 3: Feature Completion

**Duration:** 2 weeks
**Goal:** Complete half-built features with full test coverage

### Task 3.1: Password Reset UI

**Backend exists:** `requestPasswordReset()`, `updatePassword()` in auth actions

**TDD for new pages:**

```typescript
// tests/components/auth/forgot-password-form.test.tsx

describe('ForgotPasswordForm', () => {
  it('renders email input and submit button', () => {});
  it('shows validation error for invalid email', async () => {});
  it('calls requestPasswordReset on submit', async () => {});
  it('shows success message after submission', async () => {});
  it('shows error message on failure', async () => {});
  it('disables submit while loading', async () => {});
});

// tests/components/auth/reset-password-form.test.tsx

describe('ResetPasswordForm', () => {
  it('renders password inputs', () => {});
  it('validates password strength', async () => {});
  it('validates password confirmation match', async () => {});
  it('calls updatePassword on submit', async () => {});
  it('redirects to login on success', async () => {});
  it('shows error for invalid/expired token', async () => {});
});
```

**E2E test:**
```typescript
// e2e/auth/password-reset.spec.ts

test('complete password reset flow', async ({ page }) => {
  // Navigate to forgot password
  // Enter email, submit
  // Check email (mock or test inbox)
  // Click reset link
  // Enter new password
  // Verify can login with new password
});
```

### Task 3.2: Messaging Chat UI

**Backend exists:** Full API at `/api/conversations/*`, `/api/messages/*`

**Components to build with TDD:**
1. `ConversationList` — List of chat threads
2. `ChatWindow` — Active conversation view
3. `MessageBubble` — Individual message display
4. `MessageInput` — Compose new message
5. `TypingIndicator` — Real-time typing status

### Task 3.3: Notification Center

**Components to build:**
1. `NotificationBell` — Header icon with unread count
2. `NotificationDropdown` — Quick view of recent notifications
3. `NotificationsPage` — Full notification history
4. `NotificationItem` — Individual notification display

---

## Phase 4: Technical Debt Cleanup

**Duration:** 1 week
**Goal:** Eliminate debt markers, improve code quality

### Task 4.1: Fix `any` Types (30 instances)

For each `any`:
1. Determine correct type
2. Add type definition if missing
3. Update code to use type
4. Verify no type errors

```typescript
// Before
const handleSubmit = (data: any) => { ... }

// After
interface PetFormData {
  name: string;
  species: 'dog' | 'cat' | 'other';
  breed?: string;
  dateOfBirth: Date;
}
const handleSubmit = (data: PetFormData) => { ... }
```

### Task 4.2: Resolve TODO Comments (59 items)

For each TODO:
1. Create GitHub issue if significant
2. Fix immediately if small (<1 hour)
3. Document decision if won't fix (convert to comment explaining why)

### Task 4.3: Theme Compliance (266 violations)

Systematic replacement of hardcoded colors:

```typescript
// Before
<div className="bg-blue-600 text-white">

// After  
<div className="bg-[var(--primary)] text-[var(--text-on-primary)]">
```

**Add ESLint rule to prevent regression:**
```javascript
// eslint.config.mjs
{
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^(bg|text|border)-(blue|green|red|gray|slate|zinc)-\\d+$/]',
        message: 'Use CSS variables for theme compliance: var(--primary), var(--success), etc.'
      }
    ]
  }
}
```

---

## Phase 5: Polish & Hardening

**Duration:** 1 week
**Goal:** Production-ready quality

### Task 5.1: Security Audit

- Review all API routes for auth/authz
- Verify RLS policies cover all tables
- Check for SQL injection vectors
- Validate input sanitization
- Test rate limiting

### Task 5.2: Performance Testing

- Identify slow queries (>100ms)
- Add database indexes where needed
- Optimize N+1 query patterns
- Test under load (concurrent users)

### Task 5.3: Error Handling Audit

- Every catch block logs properly
- User-facing errors are Spanish and helpful
- No silent failures
- Sentry captures all errors

### Task 5.4: Documentation

- API documentation (OpenAPI/Swagger)
- Component storybook
- Architecture decision records
- Runbook for common issues

---

## Quality Gates

### Before Any PR

```bash
# All must pass
npm run lint              # 0 errors (warnings tracked)
npm run typecheck         # 0 errors
npm run test:unit         # 100% pass, coverage thresholds met
npm run test:integration  # 100% pass
```

### Before Merge to Develop

- Code review approved
- Tests cover new/changed code
- No new lint warnings without justification
- Documentation updated if needed

### Before Merge to Main

- All CI checks pass
- E2E tests pass
- Manual QA sign-off on affected features
- No known critical bugs

### Coverage Thresholds (Progressive)

| Phase | Lines | Functions | Branches |
|-------|-------|-----------|----------|
| Current | 30% | 32% | 25% |
| After Phase 1 | 45% | 50% | 35% |
| After Phase 2 | 65% | 70% | 55% |
| After Phase 3 | 75% | 80% | 65% |
| Final Target | 80% | 85% | 70% |

---

## Daily Workflow

### Morning (30 min)

1. Pull latest from `develop`
2. Run test suite, note any new failures
3. Review overnight CI results
4. Update task progress in this doc

### Work Session

1. Pick task from current phase
2. Write tests first (RED)
3. Implement code (GREEN)
4. Clean up (REFACTOR)
5. Run full test suite
6. Commit with descriptive message

### Before Ending Day

1. Push all work to feature branch
2. Open draft PR if substantial progress
3. Update EXECUTION_PLAN.md with progress
4. Note any blockers or questions

---

## Progress Tracking

### Phase 0: Test Infrastructure Audit
- [ ] Task 0.1: Catalog existing tests
- [ ] Task 0.2: Run full test suite with verbose output
- [ ] Task 0.3: Audit test quality
- [ ] Task 0.4: Analyze lint warnings
- [ ] Task 0.5: Document test infrastructure

### Phase 1: Critical Fixes
- [ ] Task 1.1: Fix mock availability API
- [ ] Task 1.2: Fix test coverage (inventory, prescription, vaccine services)
- [ ] Task 1.3: Decompose God component
- [ ] Task 1.4: Fix console.log statements

### Phase 2: Test Coverage Expansion
- [ ] Task 2.1: Service layer tests (all 0% services)
- [ ] Task 2.2: API route tests
- [ ] Task 2.3: Component tests
- [ ] Task 2.4: E2E test expansion

### Phase 3: Feature Completion
- [ ] Task 3.1: Password reset UI
- [ ] Task 3.2: Messaging chat UI
- [ ] Task 3.3: Notification center

### Phase 4: Technical Debt Cleanup
- [ ] Task 4.1: Fix `any` types
- [ ] Task 4.2: Resolve TODO comments
- [ ] Task 4.3: Theme compliance

### Phase 5: Polish & Hardening
- [ ] Task 5.1: Security audit
- [ ] Task 5.2: Performance testing
- [ ] Task 5.3: Error handling audit
- [ ] Task 5.4: Documentation

---

## Estimated Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 0 | 2-3 days | Day 1 | Day 3 |
| Phase 1 | 5-7 days | Day 4 | Day 10 |
| Phase 2 | 10-14 days | Day 11 | Day 24 |
| Phase 3 | 10-14 days | Day 25 | Day 38 |
| Phase 4 | 5-7 days | Day 39 | Day 45 |
| Phase 5 | 5-7 days | Day 46 | Day 52 |

**Total: ~8-10 weeks for comprehensive coverage**

---

## Appendix: Test File Naming Conventions

```
tests/
├── unit/
│   ├── services/
│   │   └── [service-name].test.ts
│   ├── utils/
│   │   └── [util-name].test.ts
│   └── lib/
│       └── [module-name].test.ts
├── integration/
│   └── [feature]/
│       └── [scenario].test.ts
├── components/
│   └── [component-name]/
│       ├── [component-name].test.tsx
│       └── [component-name].integration.test.tsx
├── api/
│   └── [route-path]/
│       └── route.test.ts
└── database/
    └── [table-or-feature].test.ts

e2e/
├── [feature]/
│   ├── [happy-path].spec.ts
│   └── [error-cases].spec.ts
└── smoke/
    └── critical-paths.spec.ts
```

---

*This is a living document. Update progress daily.*
