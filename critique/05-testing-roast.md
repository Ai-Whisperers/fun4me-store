# 🧪 Testing Roast

> *"Tests are like insurance. You don't appreciate them until everything is on fire."*

**Score: 4/10** — *"The tests that exist work. Most tests don't exist."*

---

## Overview

You have a testing infrastructure. You have test utilities. You have fixtures. You even have a comprehensive test strategy document. What you don't have is actual test coverage.

**Current state:** 39 test files covering ~20% of the codebase
**Target state:** 200+ test files covering 75% of critical paths

This isn't a roast. This is an intervention.

---

## 🔴 Critical Issues

### TEST-001: 20% Coverage

**The Reality Check:**

| Category | Files | Coverage | Status |
|----------|-------|----------|--------|
| Unit Tests | 6 | ~15% | 🔴 |
| Integration Tests | 8 | ~25% | 🔴 |
| E2E Tests | 8 | ~10% | 🔴 |
| API Tests | 5 | ~15% | 🔴 |
| Component Tests | 0 | 0% | 💀 |

**What's Not Tested:**

Server Actions (22 total, ~5 tested):
- ❌ Authentication flows (signup, login, password reset)
- ❌ Pet CRUD validation
- ❌ Appointment booking logic
- ❌ Payment processing
- ❌ Prescription generation

API Endpoints (87 total, ~15 tested):
- ❌ Invoice operations
- ❌ Store checkout
- ❌ Dashboard analytics
- ❌ Lab results
- ❌ Hospitalization flows

Components (300+, ~0 tested):
- ❌ Form validation
- ❌ Calendar interactions
- ❌ Cart operations
- ❌ Booking wizard
- ❌ Everything else

**Effort:** 🔴 Critical (ongoing commitment)

---

### TEST-002: E2E Tests Are Mostly Skipped

**The Crime:**

```typescript
// e2e/auth.spec.ts
describe('Authentication', () => {
  it('should allow user signup', async () => {
    // This one works
  })

  it.skip('should allow user login', async () => {
    // Skipped
  })

  it.skip('should allow password reset', async () => {
    // Skipped
  })

  it.skip('should handle OAuth', async () => {
    // Skipped
  })
})
```

You have 8 E2E test files. Most tests inside them are skipped.

**Why It Hurts:**
- No confidence in critical user flows
- Regressions ship to production
- Manual testing for every release

**The Fix:**

Priority E2E tests:
```typescript
// Critical paths that MUST have E2E coverage
const CRITICAL_FLOWS = [
  'User signup → Email verification → First login',
  'Pet owner: View pets → Book appointment → Pay',
  'Store: Browse → Add to cart → Checkout',
  'Vet: View patients → Create prescription → Print',
  'Admin: View dashboard → Manage staff',
]
```

**Effort:** 🟠 High (1-2 weeks for critical paths)

---

### TEST-003: Generic Supabase Mock

**The Crime:**

```typescript
// vitest.setup.ts (lines 5-23)
vi.mock('@supabase/supabase-js', async (importOriginal) => {
  return {
    createClient: () => ({
      from: () => ({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockResolvedValue({ data: [], error: null }),
        delete: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  };
});
```

**Translation:** Every query returns an empty array. Every insert "succeeds." Your tests are lying to you.

**Why It Hurts:**
- Tests pass but code is broken
- Edge cases never discovered
- RLS issues never caught
- No realistic data flow

**The Fix:**

Factory-based mocking:
```typescript
// tests/__mocks__/supabase-factory.ts
export function createMockSupabase(initialData: MockData) {
  const database = new MockDatabase(initialData)

  return {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (field: string, value: unknown) =>
          database.select(table, columns).where(field, value),
        single: () => database.selectOne(table, columns),
      }),
      insert: (data: unknown) => database.insert(table, data),
      update: (data: unknown) => ({
        eq: (field: string, value: unknown) =>
          database.update(table, data).where(field, value),
      }),
    }),
  }
}

// Usage
const supabase = createMockSupabase({
  pets: [buildPet({ name: 'Fido' }), buildPet({ name: 'Whiskers' })],
  profiles: [buildProfile({ role: 'owner' })],
})
```

**Effort:** 🟡 Medium (2-3 days)

---

## 🟠 High Priority Issues

### TEST-004: No Pre-Commit Hooks

**The Crime:**

```json
// package.json - husky not configured
{
  "scripts": {
    "test": "vitest run",
    // No pre-commit, no pre-push
  }
}
```

Developers can commit and push broken code. There's no gate.

**The Fix:**

```bash
npm install husky lint-staged --save-dev
npx husky install
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "vitest related --run"],
    "*.{json,md}": ["prettier --write"]
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:critical"
    }
  }
}
```

**Effort:** 🟢 Low (1 hour)

---

### TEST-005: No Test Database Isolation

**The Crime:**

```typescript
// vitest.integration.config.ts
// Uses real Supabase URL from .env
// No test database
// No cleanup between tests
// Tests can interfere with each other
```

Integration tests run against... production? development? Nobody knows.

**The Fix:**

```typescript
// vitest.integration.setup.ts
import { execSync } from 'child_process'

beforeAll(async () => {
  // Use test database
  process.env.SUPABASE_URL = process.env.TEST_SUPABASE_URL

  // Reset to known state
  execSync('npm run seed:v2:integration', { stdio: 'inherit' })
})

afterEach(async () => {
  // Clean up test data
  await cleanupTestData()
})
```

**Effort:** 🟡 Medium

---

### TEST-006: Factory Underutilization

**The Crime:**

You have excellent factories:
```typescript
// tests/__helpers__/factories.ts
export function buildPet(overrides?: Partial<Pet>): Pet
export function buildAppointment(overrides?: Partial<Appointment>): Appointment
export function buildInvoice(overrides?: Partial<Invoice>): Invoice
// ... 10+ more
```

But tests don't use them:
```typescript
// tests/integration/pet.test.ts
const pet = {
  id: '00000000-0000-0000-0000-000000000001',  // Hardcoded UUID
  name: 'Test Pet',
  species: 'dog',
  // Manual object creation
}
```

**The Fix:**

Use factories everywhere:
```typescript
// Proper usage
const pet = buildPet({ name: 'Fido', species: 'dog' })
const owner = buildProfile({ role: 'owner' })
const appointment = buildAppointment({ petId: pet.id, ownerId: owner.id })

// Factories handle:
// - Valid UUIDs
// - Required relationships
// - Realistic default data
// - Type safety
```

**Effort:** 🟢 Low (cultural change)

---

## 🟡 Medium Priority Issues

### TEST-007: Missing Component Tests

**The Crime:**

300+ components. 0 component tests.

- Forms don't have validation tests
- Calendar doesn't have interaction tests
- Cart doesn't have quantity tests
- Booking wizard doesn't have flow tests

**The Fix:**

Start with critical components:
```typescript
// tests/components/cart/cart-item.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { CartItem } from '@/components/cart/cart-item'

describe('CartItem', () => {
  it('renders product name and price', () => {
    render(<CartItem item={buildCartItem()} />)
    expect(screen.getByText('Product Name')).toBeInTheDocument()
  })

  it('increments quantity when + clicked', () => {
    const onUpdate = vi.fn()
    render(<CartItem item={buildCartItem({ quantity: 1 })} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onUpdate).toHaveBeenCalledWith(2)
  })

  it('shows error when quantity exceeds stock', () => {
    render(<CartItem item={buildCartItem({ quantity: 100, stock: 5 })} />)
    expect(screen.getByText(/excede el stock/)).toBeInTheDocument()
  })
})
```

**Effort:** 🟠 High (ongoing)

---

### TEST-008: No Accessibility Testing

**The Crime:**

No `axe-core` integration. No keyboard navigation tests. No screen reader tests.

**The Fix:**

```typescript
// tests/a11y/homepage.test.tsx
import { axe } from 'jest-axe'
import { render } from '@testing-library/react'
import HomePage from '@/app/[clinic]/page'

describe('Accessibility', () => {
  it('homepage has no a11y violations', async () => {
    const { container } = render(<HomePage />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

**Effort:** 🟡 Medium

---

### TEST-009: No Performance Tests

**The Crime:**

- No load testing
- No slow query detection
- No bundle size monitoring

**The Fix:**

```typescript
// tests/performance/api-load.test.ts
import { performance } from 'perf_hooks'

describe('API Performance', () => {
  it('GET /api/services responds under 200ms', async () => {
    const start = performance.now()
    await fetch('/api/services')
    const duration = performance.now() - start
    expect(duration).toBeLessThan(200)
  })
})
```

```json
// package.json
{
  "scripts": {
    "test:lighthouse": "lighthouse http://localhost:3000 --output json"
  }
}
```

**Effort:** 🟡 Medium

---

## 📊 Testing Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Overall coverage | ~20% | 75% | 🔴 |
| E2E test pass rate | Unknown | 100% | 🔴 |
| Unit tests | 6 files | 50+ | 🔴 |
| Component tests | 0 | 30+ | 💀 |
| Pre-commit hooks | No | Yes | 🔴 |
| CI test pipeline | Unknown | Yes | 🟠 |

---

## Test Priority Roadmap

### Week 1: Foundation
- [ ] Set up pre-commit hooks
- [ ] Configure test database isolation
- [ ] Improve Supabase mock with factories
- [ ] Add 5 critical API integration tests

### Week 2-3: Critical Paths
- [ ] E2E: Authentication flow (signup → login → logout)
- [ ] E2E: Pet booking flow (browse → book → confirm)
- [ ] E2E: Store checkout (add → cart → pay)
- [ ] Integration: Invoice creation and payment

### Week 4-6: Component Coverage
- [ ] Cart components (add, remove, update quantity)
- [ ] Booking wizard steps
- [ ] Form validation
- [ ] Calendar interactions

### Ongoing
- [ ] Add tests for every bug fix
- [ ] Add tests before new features
- [ ] Review coverage weekly
- [ ] Never skip tests without documented reason

---

## Testing Manifesto

1. **No code without tests** — New features must include tests
2. **No bug fix without regression test** — Prove it's fixed
3. **Pre-commit hooks are non-negotiable** — Gate bad code
4. **Factories over fixtures** — Dynamic over static
5. **Integration tests are insurance** — Worth the time investment

---

## Summary

You built a testing infrastructure. You wrote test utilities. You documented a test strategy. Then you stopped.

The platform has grown to 100+ tables, 87 API endpoints, and 300+ components, but testing hasn't kept pace. You're shipping with 20% coverage on a SaaS platform that handles appointments and payments.

This is technical debt with interest.

**Priority Actions:**
1. Add pre-commit hooks (today)
2. Write E2E tests for auth flow (this week)
3. Create test database isolation (this week)
4. Achieve 50% coverage on critical paths (this month)

*"The best time to write tests was when you wrote the code. The second best time is now."*
