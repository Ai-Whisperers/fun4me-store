# E2E Tests - Vete Platform

End-to-end tests for the Vete multi-tenant veterinary platform using Playwright.

## Quick Start

```bash
# 1. Install Playwright browsers (first time only)
npx playwright install

# 2. Ensure database is seeded
npm run seed:demo

# 3. Start dev server (separate terminal)
npm run dev

# 4. Run tests with UI (recommended)
npm run test:e2e:ui

# Or run all tests in terminal
npm run test:e2e
```

## Documentation

- **[E2E_TEST_PLAN.md](./E2E_TEST_PLAN.md)** - Comprehensive test strategy and plan
- **[E2E_IMPLEMENTATION_SUMMARY.md](./E2E_IMPLEMENTATION_SUMMARY.md)** - Implementation details and results

## Directory Structure

```
e2e/
├── README.md                          # This file
├── E2E_TEST_PLAN.md                   # Test strategy document
├── E2E_IMPLEMENTATION_SUMMARY.md      # Implementation summary
│
├── helpers/                           # Test utilities
│   ├── auth.ts                       # Login/logout helpers
│   ├── navigation.ts                 # Page navigation helpers
│   └── database.ts                   # Database interaction helpers
│
├── auth/                              # Authentication tests
│   ├── login.spec.ts                 # Login flows (18 tests)
│   └── logout.spec.ts                # Logout & sessions (13 tests)
│
├── owner-portal/                      # Pet Owner Portal tests
│   └── pet-management.spec.ts        # Pet viewing & management (15 tests)
│
└── seeded-data-verification.test.ts   # Database seed verification
```

## Test Suites

### ✅ Implemented (46 tests)

| Suite                                 | Tests | Coverage                                                 |
| ------------------------------------- | ----- | -------------------------------------------------------- |
| `auth/login.spec.ts`                  | 18    | Owner/Vet/Admin login, invalid credentials, multi-tenant |
| `auth/logout.spec.ts`                 | 13    | Logout, session management, persistence                  |
| `owner-portal/pet-management.spec.ts` | 15    | View pets, medical history, vaccines, prescriptions      |

### ⏳ Planned (Priority 2)

| Suite                                     | Status | Coverage                     |
| ----------------------------------------- | ------ | ---------------------------- |
| `owner-portal/booking.spec.ts`            | TODO   | Appointment booking flow     |
| `staff-dashboard/appointments.spec.ts`    | TODO   | Staff appointment management |
| `staff-dashboard/medical-records.spec.ts` | TODO   | Medical record creation      |
| `store/checkout.spec.ts`                  | TODO   | E-commerce checkout flow     |
| `staff-dashboard/prescriptions.spec.ts`   | TODO   | Prescription issuance        |

### ⏳ Planned (Priority 3)

| Suite                                     | Status | Coverage               |
| ----------------------------------------- | ------ | ---------------------- |
| `multi-tenant/isolation.spec.ts`          | TODO   | Tenant data isolation  |
| `staff-dashboard/lab-orders.spec.ts`      | TODO   | Laboratory workflows   |
| `staff-dashboard/hospitalization.spec.ts` | TODO   | Kennel management      |
| `auth/role-access.spec.ts`                | TODO   | Role-based permissions |

## Running Tests

### All Tests

```bash
npm run test:e2e
```

### UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

### Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Specific Suite

```bash
npx playwright test tests/e2e/auth/
npx playwright test tests/e2e/owner-portal/
```

### Specific File

```bash
npx playwright test tests/e2e/auth/login.spec.ts
```

### By Tag

```bash
# Run only owner tests
npx playwright test --grep @owner

# Run only security tests
npx playwright test --grep @security

# Run only terrapet clinic tests
npx playwright test --grep @terrapet

# Multiple tags
npx playwright test --grep "@owner.*@terrapet"
```

### Generate Report

```bash
npx playwright show-report
```

## Test Tags

Tests are tagged for easy filtering:

### By Role

- `@owner` - Pet owner tests
- `@vet` - Veterinarian tests
- `@admin` - Administrator tests
- `@unauthenticated` - Public/unauthenticated tests

### By Clinic

- `@terrapet` - Veterinaria Adris
- `@petlife` - PetLife Center

### By Feature

- `@auth` - Authentication
- `@pets` - Pet management
- `@appointments` - Appointments
- `@medical` - Medical records
- `@vaccines` - Vaccinations
- `@prescriptions` - Prescriptions
- `@store` - E-commerce

### By Type

- `@security` - Security-focused tests
- `@multi-tenant` - Multi-tenancy tests
- `@public` - Public page tests

### Examples

```bash
# Run all owner tests for terrapet
npx playwright test --grep "@owner.*@terrapet"

# Run all security tests
npx playwright test --grep @security

# Run all pet management tests
npx playwright test --grep @pets
```

## Test Data

### Demo Accounts

**Clinic: Adris** (`/terrapet`)

```
admin@terrapet.demo / demo123
vet@terrapet.demo / demo123
owner@terrapet.demo / demo123
```

**Clinic: PetLife** (`/petlife`)

```
admin@petlife.demo / demo123
vet@petlife.demo / demo123
owner@petlife.demo / demo123
```

### Seed Data Requirements

Tests expect the following seed data:

- 2 clinics configured (terrapet, petlife)
- 6 demo user accounts (3 per clinic)
- 18+ pets with medical histories
- 20+ appointments
- Medical records and vaccinations
- 1000+ store products

### Setup Seed Data

```bash
# Full database setup
npm run db:setup

# Seed demo data
npm run seed:demo

# Verify seed data
npm run test:e2e tests/e2e/seeded-data-verification.test.ts
```

## Helper Utilities

### Authentication (`helpers/auth.ts`)

```typescript
import { loginAs, logout } from '../helpers/auth'

// Login as specific role at specific clinic
await loginAs(page, 'terrapet', 'owner')
await loginAs(page, 'petlife', 'vet')
await loginAs(page, 'terrapet', 'admin')

// Logout
await logout(page)

// Verify unauthorized access
await verifyUnauthorizedAccess(page, '/terrapet/dashboard')

// Check if logged in
const loggedIn = await isLoggedIn(page)
```

### Navigation (`helpers/navigation.ts`)

```typescript
import { navigateTo, ROUTES, clickNavLink } from '../helpers/navigation'

// Navigate to routes
await navigateTo(page, ROUTES.myPets('terrapet'))
await navigateTo(page, ROUTES.dashboard('petlife'))

// Click navigation links
await clickNavLink(page, 'Mis Mascotas')
await clickButton(page, 'Guardar')

// Verify navigation
await verifyUrl(page, /\/terrapet\/portal/)
await waitForHeading(page, 'Mis Mascotas')
```

### Database (`helpers/database.ts`)

```typescript
import { getOwnerPets, getUpcomingAppointments } from '../helpers/database'

// Get test data
const pets = await getOwnerPets('owner@terrapet.demo')
const appointments = await getUpcomingAppointments('terrapet')
const products = await getStoreProducts('terrapet', 20)

// Verify seed data
const verification = await verifySeededData('terrapet')
if (!verification.valid) {
  console.error('Seed data missing:', verification.errors)
}

// Count records
const petCount = await countRecords('pets', 'terrapet')

// Verify tenant isolation
await verifyTenantIsolation('terrapet', 'petlife')
```

## Writing New Tests

### Template

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth'
import { navigateTo, ROUTES } from '../helpers/navigation'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login as appropriate role
    await loginAs(page, 'terrapet', 'owner')
  })

  test('should do something @owner @terrapet @feature', async ({ page }) => {
    // Arrange: Setup test data/state
    await navigateTo(page, ROUTES.myPets('terrapet'))

    // Act: Perform action
    await page.click('[data-testid="pet-card"]')

    // Assert: Verify outcome
    await expect(page).toHaveURL(/\/terrapet\/portal\/pets\/[a-f0-9-]+/)
  })
})
```

### Best Practices

1. **Use helpers**: Don't reimplement login/navigation
2. **Use data-testid**: Prefer `[data-testid="..."]` over text selectors
3. **Add tags**: Tag tests by role, clinic, feature, type
4. **Spanish UI**: Use Spanish labels for text assertions
5. **Wait properly**: Use `waitForSelector`, `waitForLoadState`
6. **Clean descriptions**: Test names should be clear and specific
7. **Error handling**: Tests should handle missing elements gracefully

### Selectors Priority

1. `[data-testid="element-id"]` (best - stable)
2. `role="button" name="Submit"` (good - accessible)
3. `text=Spanish Label` (okay - depends on i18n)
4. CSS/XPath (last resort - fragile)

## Debugging

### UI Mode (Recommended)

```bash
npm run test:e2e:ui
```

- Visual test runner
- Step through tests
- View traces
- Edit and rerun tests

### Headed Mode

```bash
npm run test:e2e:headed
```

- See browser interactions
- Useful for visual debugging

### Debug Mode

```bash
npx playwright test --debug
```

- Playwright Inspector
- Step through line by line

### Screenshots & Videos

On test failure:

- Screenshots: `test-results/` directory
- Videos: `test-results/` directory
- Traces: Use `npx playwright show-trace trace.zip`

### Common Issues

**Test Timeout**

```typescript
test.setTimeout(60000) // Increase to 60 seconds
```

**Element Not Found**

```typescript
// Add explicit waits
await page.waitForSelector('[data-testid="pet-card"]')
await page.waitForLoadState('networkidle')
```

**Login Fails**

```bash
# Verify seed data exists
npm run seed:demo

# Check credentials in helpers/auth.ts
```

**Database Issues**

```bash
# Reset database
npm run db:setup
npm run seed:demo
```

## CI/CD Integration

### GitHub Actions (Example)

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run db:setup
      - run: npm run seed:demo
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance

### Current Execution Times (Estimated)

- Authentication tests (~18 tests): ~2-3 minutes
- Pet portal tests (~15 tests): ~2-3 minutes
- Total core tests (~46 tests): ~5-7 minutes

### Optimization Tips

- Use auth state persistence (already configured)
- Run tests in parallel where safe
- Use `waitForLoadState('domcontentloaded')` instead of `'networkidle'` when appropriate
- Minimize page navigations in tests

## Maintenance

### When to Update

- ✅ New feature → Add E2E test
- ✅ UI change → Update selectors
- ✅ Bug fix → Add regression test
- ✅ Permission change → Update auth tests

### Review Checklist

- [ ] Test name is clear and descriptive
- [ ] Uses proper authentication
- [ ] Verifies expected outcomes
- [ ] Uses Spanish UI labels
- [ ] Has appropriate tags
- [ ] Error handling present
- [ ] No hardcoded waits

## Resources

- **[Playwright Docs](https://playwright.dev/)**
- **[Best Practices](https://playwright.dev/docs/best-practices)**
- **[Locators Guide](https://playwright.dev/docs/locators)**
- **[Test Fixtures](https://playwright.dev/docs/test-fixtures)**

## Support

For questions or issues:

1. Check test plan: `E2E_TEST_PLAN.md`
2. Check implementation summary: `E2E_IMPLEMENTATION_SUMMARY.md`
3. Review existing tests for patterns
4. Check Playwright documentation

---

**Last Updated**: January 21, 2026  
**Test Count**: 46 tests implemented  
**Status**: Phase 1 Complete - Ready for execution
