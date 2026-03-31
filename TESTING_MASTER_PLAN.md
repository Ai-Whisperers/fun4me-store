# Vete Platform - Testing Master Plan

> **Created:** 2026-02-03  
> **Author:** AI Agent (Lead Engineer)  
> **Purpose:** Comprehensive testing analysis, best practices, and long-term improvement roadmap

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Gap Analysis](#2-gap-analysis)
3. [Best Practices to Implement](#3-best-practices-to-implement)
4. [Infrastructure Improvements](#4-infrastructure-improvements)
5. [Testing Strategy by Layer](#5-testing-strategy-by-layer)
6. [Tooling Recommendations](#6-tooling-recommendations)
7. [Automation & CI/CD](#7-automation--cicd)
8. [Metrics & Quality Gates](#8-metrics--quality-gates)
9. [Long-Term Roadmap](#9-long-term-roadmap)
10. [Action Items](#10-action-items)

---

## 1. Current State Analysis

### 1.1 Test Inventory Summary

| Category | Files | Test Cases | Status |
|----------|-------|------------|--------|
| **Service Tests** | 17 | 567 | ✅ 1524 passing |
| **Component Tests** | 23 | 573 | ❌ 249 failing, 324 passing |
| **API Tests** | 33 | ~100 | 🟡 Partial coverage |
| **Integration Tests** | ~30 | ~200 | 🟡 Many skipped |
| **E2E Tests** | 48 | ~150 | 🟡 Partial coverage |
| **Security Tests** | 3 | ~25 | ✅ Passing |
| **Performance Tests** | 2 | ~10 | ✅ Baseline exists |

**Total Test Files:** 220 unit/integration + 48 E2E = **268 test files**  
**Total Lines of Test Code:** ~102,000

### 1.2 Coverage Metrics

```
Current Coverage (Unit + Services):
├── Lines:       ~61%  (threshold: 45%) ✅
├── Functions:   ~54%  (threshold: 50%) ✅
├── Branches:    ~35%  (threshold: 35%) ✅
└── Statements:  ~61%  (threshold: 45%) ✅
```

### 1.3 Codebase Scale

| Asset Type | Count | Tests Coverage |
|------------|-------|----------------|
| API Routes | **311** | 33 tests (~10%) |
| Pages/Routes | **339** | Minimal |
| Components | **544** | 23 tests (~4%) |
| Services | **20** | 17 tests (85%) |
| Server Actions | ~22 | ~5 tests (~23%) |
| Database Tables | **94** | 1 test file |

### 1.4 Test Configuration Files

```
vitest.config.ts           - Main unit/service test config
vitest.config.api.ts       - API endpoint tests
vitest.config.components.ts - React component tests
vitest.config.database.ts   - Database/RLS tests
vitest.integration.config.ts - Integration tests
vitest.load.config.ts      - Load/stress tests
playwright.config.ts       - E2E browser tests
```

### 1.5 Existing Test Infrastructure

**Test Utilities:**
- `lib/test-utils/` - Factories, mocks, API client, context
- `tests/__helpers__/` - API helpers, auth, cleanup, mocks
- `tests/__fixtures__/` - Test data fixtures
- `tests/__mocks__/` - Module mocks (Supabase, Redis)

**Documentation:**
- `tests/COMPREHENSIVE_TEST_STRATEGY.md`
- `tests/CRITIQUE_AND_ANALYSIS.md`
- `tests/TESTING_PLAN.md`
- `lib/test-utils/README.md`
- `lib/test-utils/CHEATSHEET.md`

---

## 2. Gap Analysis

### 2.1 Critical Gaps

#### 🔴 API Routes (10% coverage → target 80%)
- **311 routes**, only **33 tested**
- Missing: Authentication flows, CRUD operations, error handling
- Impact: Bugs ship to production undetected

#### 🔴 Component Tests (4% coverage → target 60%)
- **544 components**, only **23 tested** (and 249 failing!)
- Missing: Form validation, user interactions, state management
- Impact: UI regressions, broken user flows

#### 🔴 Server Actions (~23% coverage → target 80%)
- Critical mutations untested
- Missing: Validation, authorization, error handling
- Impact: Data corruption, security vulnerabilities

#### 🟡 Integration Tests (partial → comprehensive)
- Many tests skipped or flaky
- Missing: Complex workflows, multi-step processes
- Impact: Feature interactions break silently

#### 🟡 E2E Tests (partial → critical paths)
- 48 spec files but many are incomplete
- Missing: Full booking flow, payment flow, staff workflows
- Impact: User-facing bugs

### 2.2 Quality Issues

| Issue | Count | Priority |
|-------|-------|----------|
| Skipped tests (`.skip`) | 16 | P1 |
| Failing component tests | 249 | P0 |
| Lint warnings | 776 | P2 |
| Over-mocked tests | Unknown | P1 |
| Flaky tests | Unknown | P1 |
| Hardcoded dates/IDs | Unknown | P2 |

### 2.3 Missing Test Categories

1. **Contract Tests** - API schema validation
2. **Snapshot Tests** - Component visual regression
3. **Accessibility Tests** - WCAG compliance
4. **Mutation Testing** - Test effectiveness
5. **Chaos Testing** - Failure scenarios
6. **Load Testing** - Performance under stress

---

## 3. Best Practices to Implement

### 3.1 Testing Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  ~10% (critical flows only)
                   ─┴─────────────┴─
                  ┌─────────────────┐
                  │  Integration    │  ~20% (API + workflows)
                 ─┴─────────────────┴─
                ┌───────────────────────┐
                │    Component          │  ~30% (UI behavior)
               ─┴───────────────────────┴─
              ┌─────────────────────────────┐
              │         Unit                │  ~40% (services, utils)
              └─────────────────────────────┘
```

### 3.2 Test Design Principles

#### Arrange-Act-Assert (AAA)
```typescript
it('should calculate total with tax', () => {
  // Arrange
  const items = [{ price: 100 }, { price: 200 }]
  const taxRate = 0.1
  
  // Act
  const total = calculateTotal(items, taxRate)
  
  // Assert
  expect(total).toBe(330)
})
```

#### One Assertion Focus
```typescript
// ❌ Bad: Multiple unrelated assertions
it('should process order', () => {
  expect(order.status).toBe('confirmed')
  expect(inventory.stock).toBe(9)
  expect(email.sent).toBe(true)
})

// ✅ Good: Separate tests for each behavior
it('should confirm order status', () => { ... })
it('should decrement inventory', () => { ... })
it('should send confirmation email', () => { ... })
```

#### Descriptive Test Names
```typescript
// ❌ Bad
it('works', () => { ... })
it('test 1', () => { ... })

// ✅ Good
it('returns 401 when user is not authenticated', () => { ... })
it('calculates discount for orders over $100', () => { ... })
```

### 3.3 Mocking Strategy

#### Mock Boundaries, Not Implementation
```typescript
// ❌ Over-mocking (tests nothing)
vi.mock('@/lib/services/pet-service')
vi.mock('@/lib/supabase/client')
vi.mock('@/lib/utils/format')

// ✅ Mock only external boundaries
vi.mock('@/lib/supabase/client') // Database is external
// Let services and utils run with real code
```

#### Use Factories for Test Data
```typescript
// ❌ Bad: Hardcoded test data
const pet = { id: '123', name: 'Max', species: 'dog' }

// ✅ Good: Factory with defaults + overrides
const pet = createPet({ name: 'Max' })
const pet2 = createPet({ species: 'cat', vaccinated: true })
```

### 3.4 Async Testing Patterns

```typescript
// ❌ Bad: Race conditions
it('loads data', () => {
  render(<Component />)
  expect(screen.getByText('Data')).toBeInTheDocument()
})

// ✅ Good: Wait for async operations
it('loads data', async () => {
  render(<Component />)
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument()
  })
})
```

---

## 4. Infrastructure Improvements

### 4.1 Test Database Strategy

**Current:** Tests use mocked Supabase client  
**Recommended:** Add real database tests with isolated test tenant

```typescript
// Option 1: Test-specific tenant
const TEST_TENANT = 'test-clinic-uuid'

// Option 2: Per-test database reset
beforeEach(async () => {
  await resetTestDatabase()
})

// Option 3: Transaction rollback
beforeEach(async () => {
  await db.transaction(async (tx) => {
    // Test runs in transaction, rolled back after
  })
})
```

### 4.2 Test Data Management

**Create centralized factories:**
```
lib/test-utils/factories/
├── index.ts           # Re-exports all
├── pet.factory.ts     # Pet test data
├── owner.factory.ts   # Owner test data
├── appointment.factory.ts
├── invoice.factory.ts
└── ...
```

**Factory pattern:**
```typescript
// lib/test-utils/factories/pet.factory.ts
export const createPet = (overrides?: Partial<Pet>): Pet => ({
  id: crypto.randomUUID(),
  name: faker.animal.dog(),
  species: 'dog',
  breed: faker.animal.dog(),
  birth_date: faker.date.past({ years: 5 }).toISOString(),
  weight_kg: faker.number.float({ min: 1, max: 50 }),
  tenant_id: TEST_TENANT,
  created_at: new Date().toISOString(),
  ...overrides,
})
```

### 4.3 Supabase Mock Improvements

**Current mock issues:**
- Query chaining doesn't work consistently
- Error simulation is manual
- RLS not testable

**Recommended: createChainableQueryMock pattern:**
```typescript
export function createChainableQueryMock(data: unknown, error: unknown = null) {
  const mock = {
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
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data, error })),
  }
  return mock
}
```

### 4.4 Component Test Setup

**Fix failing component tests with proper providers:**
```typescript
// tests/setup-components.ts
export function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    tenant?: string
    user?: User
    initialRoute?: string
  }
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider tenant={options?.tenant ?? 'test-clinic'}>
        <AuthProvider user={options?.user}>
          <ToastProvider>
            {ui}
          </ToastProvider>
        </AuthProvider>
      </TenantProvider>
    </QueryClientProvider>
  )
}
```

---

## 5. Testing Strategy by Layer

### 5.1 Service Layer (Current: 85% → Target: 95%)

**Priority:** P0 - Foundation for all other tests

**What to test:**
- All CRUD operations
- Validation logic
- Error handling
- Edge cases (null, empty, max values)
- Tenant isolation

**Pattern:**
```typescript
describe('PetService', () => {
  describe('createPet', () => {
    describe('validation', () => {
      it('rejects empty name', async () => { ... })
      it('rejects invalid species', async () => { ... })
    })
    
    describe('success cases', () => {
      it('creates pet with minimum required fields', async () => { ... })
      it('creates pet with all optional fields', async () => { ... })
    })
    
    describe('error handling', () => {
      it('handles database connection errors', async () => { ... })
      it('handles constraint violations', async () => { ... })
    })
    
    describe('tenant isolation', () => {
      it('assigns correct tenant_id', async () => { ... })
      it('cannot access other tenant data', async () => { ... })
    })
  })
})
```

### 5.2 API Layer (Current: 10% → Target: 80%)

**Priority:** P0 - Public contract

**What to test:**
- Authentication/authorization
- Request validation
- Response format
- Error responses (400, 401, 403, 404, 500)
- Rate limiting

**Pattern:**
```typescript
describe('GET /api/pets', () => {
  describe('authentication', () => {
    it('returns 401 without auth token', async () => { ... })
    it('returns 401 with expired token', async () => { ... })
    it('returns 403 for wrong tenant', async () => { ... })
  })
  
  describe('query parameters', () => {
    it('filters by species', async () => { ... })
    it('paginates results', async () => { ... })
    it('validates pagination params', async () => { ... })
  })
  
  describe('response format', () => {
    it('returns array of pets', async () => { ... })
    it('includes required fields', async () => { ... })
    it('excludes sensitive fields', async () => { ... })
  })
})
```

### 5.3 Component Layer (Current: 4% → Target: 60%)

**Priority:** P1 - User interface

**What to test:**
- Rendering with different props
- User interactions (clicks, typing)
- Form validation feedback
- Loading/error states
- Accessibility

**Pattern:**
```typescript
describe('PetForm', () => {
  describe('rendering', () => {
    it('renders all required fields', () => { ... })
    it('shows optional fields when expanded', () => { ... })
  })
  
  describe('validation', () => {
    it('shows error for empty name on blur', async () => { ... })
    it('shows error for invalid weight', async () => { ... })
    it('disables submit until valid', () => { ... })
  })
  
  describe('submission', () => {
    it('calls onSubmit with form data', async () => { ... })
    it('shows loading state during submit', async () => { ... })
    it('shows error message on failure', async () => { ... })
  })
  
  describe('accessibility', () => {
    it('has no axe violations', async () => { ... })
    it('supports keyboard navigation', async () => { ... })
  })
})
```

### 5.4 Integration Layer (Current: Partial → Comprehensive)

**Priority:** P1 - Feature workflows

**What to test:**
- Multi-step workflows
- Cross-service interactions
- Data flow through system
- Side effects (emails, notifications)

**Pattern:**
```typescript
describe('Appointment Booking Flow', () => {
  it('completes full booking: search → select → confirm → notify', async () => {
    // 1. Search available slots
    const slots = await getAvailableSlots(date, service)
    expect(slots.length).toBeGreaterThan(0)
    
    // 2. Create booking
    const booking = await createBooking(slots[0], petId)
    expect(booking.status).toBe('confirmed')
    
    // 3. Verify in database
    const saved = await getBooking(booking.id)
    expect(saved).toMatchObject(booking)
    
    // 4. Verify notification sent
    expect(mockNotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'booking_confirmation' })
    )
  })
})
```

### 5.5 E2E Layer (Current: Partial → Critical Paths)

**Priority:** P2 - User journeys

**Critical paths to cover:**
1. Owner registration → Add pet → Book appointment
2. Staff login → View appointments → Create invoice
3. Visitor → Browse store → Add to cart → Checkout
4. Owner → View medical records → Download PDF

**Pattern:**
```typescript
test('owner can book appointment for pet', async ({ page }) => {
  // Login as owner
  await page.goto('/portal/login')
  await page.fill('[name="email"]', testOwner.email)
  await page.fill('[name="password"]', testOwner.password)
  await page.click('button[type="submit"]')
  
  // Navigate to booking
  await page.click('text=Reservar Cita')
  
  // Select service
  await page.click('[data-service="consultation"]')
  
  // Select pet
  await page.click(`[data-pet="${testPet.id}"]`)
  
  // Confirm
  await page.click('button:has-text("Confirmar")')
  
  // Verify success
  await expect(page.locator('.success-message')).toBeVisible()
})
```

---

## 6. Tooling Recommendations

### 6.1 Add to Current Stack

| Tool | Purpose | Priority |
|------|---------|----------|
| **@testing-library/user-event** | Realistic user interactions | P0 |
| **msw** (Mock Service Worker) | API mocking for integration tests | P1 |
| **@axe-core/playwright** | Accessibility testing | P1 |
| **@faker-js/faker** | Test data generation | P0 |
| **vitest-mock-extended** | Better mock typing | P2 |

### 6.2 Testing Library Best Practices

```typescript
// ❌ Bad: Implementation details
const input = container.querySelector('input.name-field')

// ✅ Good: User-facing queries
const input = screen.getByRole('textbox', { name: /nombre/i })
const input = screen.getByLabelText('Nombre de mascota')
const button = screen.getByRole('button', { name: /guardar/i })
```

### 6.3 Code Coverage Tools

**Add to CI:**
```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: ./web/coverage/lcov.info
    fail_ci_if_error: true
```

### 6.4 Visual Regression Testing

**Consider adding:**
```typescript
// Using Playwright's built-in
await expect(page).toHaveScreenshot('dashboard.png', {
  maxDiffPixels: 100,
})
```

---

## 7. Automation & CI/CD

### 7.1 Current CI Workflow

```yaml
jobs:
  lint → typecheck → unit-tests → integration-tests → e2e-tests
```

### 7.2 Recommended Improvements

#### Parallel Test Execution
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    
  typecheck:
    runs-on: ubuntu-latest
    
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: npm run test:unit -- --shard=${{ matrix.shard }}/4
```

#### Test Result Caching
```yaml
- name: Cache test results
  uses: actions/cache@v4
  with:
    path: |
      .vitest-cache
      .playwright-cache
    key: tests-${{ hashFiles('**/*.test.ts') }}
```

#### Selective Test Running
```yaml
- name: Run affected tests
  run: |
    CHANGED=$(git diff --name-only HEAD~1)
    if echo "$CHANGED" | grep -q "lib/services/"; then
      npm run test:unit -- tests/services/
    fi
```

### 7.3 Pre-commit Hooks

```json
// .husky/pre-commit
{
  "hooks": {
    "pre-commit": "lint-staged"
  }
}

// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
}
```

### 7.4 PR Quality Gates

```yaml
# Required checks before merge
required_status_checks:
  - lint
  - typecheck
  - unit-tests
  - coverage-threshold
```

---

## 8. Metrics & Quality Gates

### 8.1 Coverage Thresholds

| Metric | Current | Target (3mo) | Target (6mo) |
|--------|---------|--------------|--------------|
| Lines | 61% | 70% | 80% |
| Functions | 54% | 65% | 75% |
| Branches | 35% | 50% | 60% |
| Statements | 61% | 70% | 80% |

### 8.2 Test Health Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Failing tests | 249 | 0 |
| Skipped tests | 16 | 0 (or with tickets) |
| Flaky tests | Unknown | 0 |
| Avg test duration | ~2s | <1s |
| Total suite time | ~5min | <3min |

### 8.3 Quality Dashboard

**Track weekly:**
- Coverage delta
- New tests added
- Tests fixed
- Flaky test occurrences
- CI failure rate

---

## 9. Long-Term Roadmap

### Phase 1: Foundation (Weeks 1-2) 🔴 CURRENT

**Goal:** Fix broken tests, establish baseline

- [ ] Fix 249 failing component tests
- [ ] Resolve 16 skipped tests
- [ ] Audit and fix flaky tests
- [ ] Document testing patterns
- [ ] Set up coverage tracking

### Phase 2: Service Coverage (Weeks 3-4)

**Goal:** 95% service layer coverage

- [ ] Add missing service tests
- [ ] Add edge case tests
- [ ] Add error handling tests
- [ ] Add tenant isolation tests

### Phase 3: API Coverage (Weeks 5-8)

**Goal:** 80% API route coverage

- [ ] Prioritize by usage (analytics)
- [ ] Test authentication flows
- [ ] Test authorization (roles)
- [ ] Test validation
- [ ] Test error responses

### Phase 4: Component Coverage (Weeks 9-12)

**Goal:** 60% component coverage

- [ ] Test forms (highest priority)
- [ ] Test data display components
- [ ] Test navigation
- [ ] Test modals/dialogs
- [ ] Add accessibility tests

### Phase 5: Integration & E2E (Weeks 13-16)

**Goal:** Critical path coverage

- [ ] Document critical user journeys
- [ ] Implement E2E for each journey
- [ ] Add visual regression tests
- [ ] Add performance benchmarks

### Phase 6: Advanced (Ongoing)

- [ ] Mutation testing
- [ ] Contract testing
- [ ] Chaos engineering
- [ ] Load testing

---

## 10. Action Items

### Immediate (This Week)

1. **Fix Component Tests** - 249 failures blocking CI
   ```bash
   npm run test:components 2>&1 | tee component-failures.log
   ```

2. **Audit Skipped Tests** - Create tickets or fix
   ```bash
   grep -r "\.skip\|\.todo" tests/ --include="*.test.ts"
   ```

3. **Set Up Coverage Tracking** - Add Codecov to CI

### Short-Term (2 Weeks)

4. **Create Test Data Factories** - Centralized, typed factories

5. **Fix Supabase Mocks** - Use chainable mock pattern

6. **Document Testing Standards** - Update CONTRIBUTING.md

### Medium-Term (1 Month)

7. **API Test Generator** - Script to scaffold tests for routes

8. **Component Test Generator** - Script for component tests

9. **Pre-commit Hooks** - Lint + affected tests

### Long-Term (Quarter)

10. **Test Dashboard** - Visibility into test health

11. **Mutation Testing** - Validate test effectiveness

12. **Performance Baselines** - Track regressions

---

## Appendix: Commands Reference

```bash
# Run all tests
npm run test

# Run specific categories
npm run test:unit          # Unit + service tests
npm run test:components    # React components
npm run test:integration   # Integration tests
npm run test:api           # API route tests
npm run test:e2e           # Playwright E2E
npm run test:security      # Security tests
npm run test:database      # Database/RLS tests

# Run with coverage
npm run test:unit -- --coverage

# Run specific file
npm run test:unit -- tests/services/pet-service.test.ts

# Run in watch mode
npm run test:watch

# Run with verbose output
npm run test:unit -- --reporter=verbose

# Generate coverage report
npm run test:coverage:html
open coverage/index.html
```

---

*This document should be updated as the testing infrastructure evolves.*
