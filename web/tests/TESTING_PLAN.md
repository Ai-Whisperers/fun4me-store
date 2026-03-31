# Vete Platform - Comprehensive Testing Plan

## Table of Contents

1. [Project Overview](#project-overview)
2. [Testing Strategy](#testing-strategy)
3. [Test Categories](#test-categories)
4. [Feature Coverage Matrix](#feature-coverage-matrix)
5. [Test Organization](#test-organization)
6. [Running Tests](#running-tests)
7. [CI/CD Integration](#cicd-integration)

---

## Project Overview

### Application Summary

- **Name:** Vete - Multi-Tenant Veterinary Platform
- **Technology:** Next.js 15, TypeScript, Supabase (PostgreSQL), Tailwind CSS
- **Tenants:** `terrapet`, `petlife`
- **Architecture:** JSON-CMS with dynamic routing

### Key Features by Area

#### Public Website

| Feature             | Route                            | Priority |
| ------------------- | -------------------------------- | -------- |
| Homepage            | `/[clinic]`                      | Critical |
| Services Catalog    | `/[clinic]/services`             | Critical |
| E-commerce Store    | `/[clinic]/store`                | High     |
| Appointment Booking | `/[clinic]/book`                 | Critical |
| Shopping Cart       | `/[clinic]/cart`                 | High     |
| About Page          | `/[clinic]/about`                | Medium   |
| Toxic Food Checker  | `/[clinic]/tools/toxic-food`     | Medium   |
| Age Calculator      | `/[clinic]/tools/age-calculator` | Low      |

#### Portal (Authenticated Users)

| Feature         | Route                                 | Priority |
| --------------- | ------------------------------------- | -------- |
| Login/Signup    | `/[clinic]/portal/login`, `/signup`   | Critical |
| User Profile    | `/[clinic]/portal/profile`            | High     |
| Pet Management  | `/[clinic]/portal/pets/*`             | Critical |
| Medical Records | `/[clinic]/portal/pets/[id]/records`  | Critical |
| Vaccines        | `/[clinic]/portal/pets/[id]/vaccines` | Critical |
| Appointments    | `/[clinic]/portal/appointments`       | High     |
| Prescriptions   | `/[clinic]/portal/prescriptions`      | High     |

#### Staff Dashboard

| Feature              | Route                           | Priority |
| -------------------- | ------------------------------- | -------- |
| Dashboard Overview   | `/[clinic]/portal/dashboard`    | Critical |
| Inventory Management | `/[clinic]/portal/inventory`    | High     |
| Finance/Expenses     | `/[clinic]/portal/finance`      | High     |
| Team Management      | `/[clinic]/portal/team`         | Medium   |
| Product Management   | `/[clinic]/portal/products`     | Medium   |
| Epidemiology         | `/[clinic]/portal/epidemiology` | Low      |
| Campaigns            | `/[clinic]/portal/campaigns`    | Low      |
| Admin Panel          | `/[clinic]/portal/admin`        | High     |

#### Clinical Tools

| Feature                | Route                              | Priority |
| ---------------------- | ---------------------------------- | -------- |
| Diagnosis Codes        | `/[clinic]/diagnosis_codes`        | Medium   |
| Drug Dosages           | `/[clinic]/drug_dosages`           | High     |
| Growth Charts          | `/[clinic]/growth_charts`          | Medium   |
| Euthanasia Assessments | `/[clinic]/euthanasia_assessments` | Medium   |
| Vaccine Reactions      | `/[clinic]/vaccine_reactions`      | Medium   |
| Reproductive Cycles    | `/[clinic]/reproductive_cycles`    | Low      |
| Loyalty Points         | `/[clinic]/loyalty_points`         | Low      |

#### API Endpoints

| Endpoint                      | Methods | Priority |
| ----------------------------- | ------- | -------- |
| `/api/pets`                   | CRUD    | Critical |
| `/api/booking`                | CRUD    | Critical |
| `/api/diagnosis_codes`        | GET     | Medium   |
| `/api/drug_dosages`           | GET     | High     |
| `/api/finance`                | CRUD    | High     |
| `/api/inventory`              | CRUD    | High     |
| `/api/prescriptions`          | CRUD    | High     |
| `/api/store`                  | GET     | High     |
| `/api/growth_charts`          | GET     | Medium   |
| `/api/vaccine_reactions`      | CRUD    | Medium   |
| `/api/reproductive_cycles`    | CRUD    | Low      |
| `/api/loyalty_points`         | CRUD    | Low      |
| `/api/epidemiology`           | GET     | Low      |
| `/api/euthanasia_assessments` | CRUD    | Medium   |

#### Server Actions

| Action                | File                       | Priority |
| --------------------- | -------------------------- | -------- |
| Create Pet            | `create-pet.ts`            | Critical |
| Create Vaccine        | `create-vaccine.ts`        | Critical |
| Create Appointment    | `create-appointment.ts`    | Critical |
| Create Medical Record | `create-medical-record.ts` | Critical |
| Update Appointment    | `update-appointment.ts`    | High     |
| Update Profile        | `update-profile.ts`        | High     |
| Assign Tag            | `assign-tag.ts`            | Medium   |
| Create Product        | `create-product.ts`        | Medium   |
| Invite Staff          | `invite-staff.ts`          | Medium   |
| Safety Actions        | `safety.ts`                | High     |
| Send Email            | `send-email.ts`            | Medium   |

---

## Testing Strategy

### Testing Pyramid

```
                    ┌─────────────────┐
                    │   E2E / UI      │  ← Playwright (Critical flows)
                    │   (10-15%)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     UAT         │  ← Playwright (User scenarios)
                    │   (15-20%)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   System        │  ← Vitest (Full stack flows)
                    │   (15-20%)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Functionality  │  ← Vitest (Feature tests)
                    │   (20-25%)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Integration    │  ← Vitest (API + DB)
                    │   (25-30%)      │
                    └────────┬────────┘
                             │
            ┌────────────────▼────────────────┐
            │           Unit Tests            │  ← Vitest (Utilities, Hooks)
            │            (10-15%)             │
            └─────────────────────────────────┘
```

### Environment Setup Strategy

Since SQL scripts exist for clean database setup, testing will use:

1. **Fresh Database Per Test Suite:** Run SQL scripts to create clean state
2. **Test Isolation:** Each test cleans up its own data
3. **Fixture Management:** Shared test data loaded from seed files

---

## Test Categories

### 1. Unit Tests (`tests/unit/`)

Test individual functions, utilities, and hooks in isolation.

**Scope:**

- Pure functions in `lib/`
- React hooks in `hooks/`
- Component logic (non-visual)
- Validation schemas (Zod)
- Data transformations

**Tools:** Vitest, @testing-library/react

### 2. Integration Tests (`tests/integration/`)

Test interactions between components and external services.

**Scope:**

- Database operations (CRUD via Supabase)
- Server actions
- API route handlers
- Authentication flows
- Multi-tenant data isolation

**Tools:** Vitest, Supabase client

### 3. System Tests (`tests/system/`)

Test complete features working together.

**Scope:**

- Full feature workflows (e.g., "Add pet → Add vaccine → Generate PDF")
- Cross-module interactions
- Data consistency across features
- Error handling and recovery

**Tools:** Vitest, mocked services

### 4. Functionality Tests (`tests/functionality/`)

Test that features work as specified.

**Scope:**

- Business logic correctness
- Feature-specific requirements
- Edge cases and boundary conditions
- Data validation rules

**Tools:** Vitest

### 5. User Acceptance Tests (`tests/uat/`)

Test from user perspective with real scenarios.

**Scope:**

- User stories and acceptance criteria
- End-to-end workflows
- Multi-role scenarios (owner, vet, admin)
- Real-world use cases

**Tools:** Playwright

### 6. UI Tests (`e2e/`)

Test visual interface and user interactions.

**Scope:**

- Page loads and navigation
- Form interactions
- Visual elements presence
- Responsive design
- Accessibility

**Tools:** Playwright

---

## Feature Coverage Matrix

### Public Website Tests

| Feature              | Unit | Integration | System | Functionality | UAT | UI  |
| -------------------- | :--: | :---------: | :----: | :-----------: | :-: | :-: |
| Homepage Load        |  -   |      -      |   -    |       ✓       |  ✓  |  ✓  |
| Multi-tenant Routing |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Theme Provider       |  ✓   |      -      |   ✓    |       ✓       |  -  |  ✓  |
| Services Display     |  -   |      -      |   -    |       ✓       |  ✓  |  ✓  |
| Store Products       |  -   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Shopping Cart        |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Booking Form         |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Toxic Food Checker   |  ✓   |      -      |   -    |       ✓       |  ✓  |  ✓  |
| Age Calculator       |  ✓   |      -      |   -    |       ✓       |  -  |  ✓  |

### Portal Tests

| Feature         | Unit | Integration | System | Functionality | UAT | UI  |
| --------------- | :--: | :---------: | :----: | :-----------: | :-: | :-: |
| Login           |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Signup          |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Profile Update  |  ✓   |      ✓      |   -    |       ✓       |  ✓  |  ✓  |
| Pet CRUD        |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Medical Records |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Vaccine CRUD    |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Vaccine PDF     |  ✓   |      -      |   ✓    |       ✓       |  ✓  |  ✓  |
| Appointments    |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| QR Tags         |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |

### Staff Dashboard Tests

| Feature            | Unit | Integration | System | Functionality | UAT | UI  |
| ------------------ | :--: | :---------: | :----: | :-----------: | :-: | :-: |
| Dashboard Stats    |  -   |      ✓      |   -    |       ✓       |  ✓  |  ✓  |
| Inventory CRUD     |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Finance/Expenses   |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Team Management    |  -   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Product Management |  ✓   |      ✓      |   -    |       ✓       |  ✓  |  ✓  |
| Prescriptions      |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |

### Clinical Tools Tests

| Feature               | Unit | Integration | System | Functionality | UAT | UI  |
| --------------------- | :--: | :---------: | :----: | :-----------: | :-: | :-: |
| Diagnosis Codes       |  -   |      ✓      |   -    |       ✓       |  -  |  ✓  |
| Drug Dosages          |  ✓   |      ✓      |   -    |       ✓       |  ✓  |  ✓  |
| Growth Charts         |  ✓   |      ✓      |   -    |       ✓       |  -  |  ✓  |
| Euthanasia Assessment |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |
| Vaccine Reactions     |  -   |      ✓      |   -    |       ✓       |  -  |  ✓  |
| Reproductive Cycles   |  -   |      ✓      |   -    |       ✓       |  -  |  ✓  |
| Loyalty Points        |  ✓   |      ✓      |   ✓    |       ✓       |  ✓  |  ✓  |

### API Tests

| Endpoint             | Unit | Integration | System | Functionality |
| -------------------- | :--: | :---------: | :----: | :-----------: |
| `/api/pets`          |  -   |      ✓      |   ✓    |       ✓       |
| `/api/booking`       |  -   |      ✓      |   ✓    |       ✓       |
| `/api/drug_dosages`  |  -   |      ✓      |   -    |       ✓       |
| `/api/inventory`     |  -   |      ✓      |   ✓    |       ✓       |
| `/api/finance`       |  -   |      ✓      |   ✓    |       ✓       |
| `/api/store`         |  -   |      ✓      |   -    |       ✓       |
| `/api/prescriptions` |  -   |      ✓      |   -    |       ✓       |

---

## Test Organization

### Directory Structure

```
web/tests/
├── __fixtures__/           # Shared test data
│   ├── tenants.ts
│   ├── users.ts
│   ├── pets.ts
│   └── ...
├── __helpers__/            # Test utilities
│   ├── db.ts               # Database helpers
│   ├── auth.ts             # Auth helpers
│   ├── api.ts              # API test helpers
│   └── factories.ts        # Data factories
├── unit/                   # Unit tests
│   ├── lib/
│   │   ├── clinics.test.ts
│   │   ├── image-validation.test.ts
│   │   └── audit.test.ts
│   ├── hooks/
│   │   └── ...
│   └── components/
│       └── ...
├── integration/            # Integration tests
│   ├── auth/
│   │   ├── login.test.ts
│   │   └── signup.test.ts
│   ├── pets/
│   │   ├── crud.test.ts
│   │   └── vaccines.test.ts
│   ├── booking/
│   │   └── appointments.test.ts
│   └── api/
│       ├── pets.test.ts
│       ├── booking.test.ts
│       └── ...
├── system/                 # System tests
│   ├── pet-lifecycle.test.ts
│   ├── booking-workflow.test.ts
│   ├── inventory-management.test.ts
│   └── multi-tenant-isolation.test.ts
├── functionality/          # Functionality tests
│   ├── public/
│   │   ├── homepage.test.ts
│   │   ├── services.test.ts
│   │   └── store.test.ts
│   ├── portal/
│   │   ├── pets.test.ts
│   │   ├── vaccines.test.ts
│   │   └── appointments.test.ts
│   ├── dashboard/
│   │   ├── inventory.test.ts
│   │   └── finance.test.ts
│   └── clinical/
│       ├── drug-dosages.test.ts
│       └── growth-charts.test.ts
├── uat/                    # User acceptance tests
│   ├── owner/
│   │   ├── register-and-add-pet.test.ts
│   │   ├── book-appointment.test.ts
│   │   └── view-medical-history.test.ts
│   ├── vet/
│   │   ├── manage-patients.test.ts
│   │   └── create-prescription.test.ts
│   └── admin/
│       ├── manage-inventory.test.ts
│       └── manage-team.test.ts
└── api/                    # API-specific tests
    ├── pets.test.ts
    ├── booking.test.ts
    └── ...

web/e2e/                    # Playwright E2E tests
├── public/
│   ├── homepage.spec.ts
│   ├── services.spec.ts
│   └── store.spec.ts
├── auth/
│   ├── login.spec.ts
│   └── signup.spec.ts
├── portal/
│   ├── pets.spec.ts
│   ├── vaccines.spec.ts
│   └── appointments.spec.ts
├── dashboard/
│   ├── inventory.spec.ts
│   └── finance.spec.ts
└── tools/
    ├── toxic-food.spec.ts
    └── age-calculator.spec.ts
```

### Tagging System

Tests are tagged for selective execution:

```typescript
// Example test with tags
describe('Pet Management', () => {
  test.meta({ tags: ['critical', 'pets', 'portal'] }, 'creates a pet', async () => {
    // ...
  })
})
```

**Available Tags:**

- **Priority:** `critical`, `high`, `medium`, `low`
- **Feature:** `pets`, `vaccines`, `booking`, `inventory`, `finance`, etc.
- **Area:** `public`, `portal`, `dashboard`, `api`, `clinical`
- **Tenant:** `terrapet`, `petlife`, `multi-tenant`
- **Role:** `owner`, `vet`, `admin`

---

## Running Tests

### NPM Scripts

```bash
# Run all tests
npm run test

# By category
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
npm run test:system            # System tests only
npm run test:functionality     # Functionality tests only
npm run test:uat               # UAT tests only
npm run test:api               # API tests only
npm run test:e2e               # Playwright E2E tests

# By tag (critical paths)
npm run test:critical          # All critical tests

# By feature
npm run test:feature:pets      # Pet-related tests
npm run test:feature:booking   # Booking-related tests
npm run test:feature:inventory # Inventory-related tests

# By area
npm run test:public            # Public website tests
npm run test:portal            # Portal tests
npm run test:dashboard         # Dashboard tests

# With coverage
npm run test:coverage          # All tests with coverage report

# Watch mode (for development)
npm run test:watch             # Re-run tests on file changes
```

### Smart Test Selection

Tests automatically run based on changed files:

```bash
# Run tests related to changed files (for CI)
npm run test:changed

# Run tests for specific changed directories
npm run test:related -- --since=HEAD~1
```

### Database Setup for Tests

```bash
# Reset test database (runs SQL scripts)
npm run test:db:reset

# Seed test data
npm run test:db:seed

# Full setup
npm run test:db:setup
```

---

## CI/CD Integration

### GitHub Actions Workflow

The test suite integrates with CI/CD via selective test execution:

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  # Fast feedback - run critical tests first
  critical:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm ci
      - name: Run critical tests
        run: npm run test:critical

  # Run tests by category in parallel
  unit:
    needs: critical
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit

  integration:
    needs: critical
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration

  e2e:
    needs: [unit, integration]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

### Path-Based Test Selection

Configure tests to run based on changed files:

| Changed Path                  | Tests to Run                                                 |
| ----------------------------- | ------------------------------------------------------------ |
| `app/[clinic]/portal/pets/**` | `test:feature:pets`, `e2e/portal/pets.spec.ts`               |
| `app/api/booking/**`          | `test:integration:api:booking`, `test:functionality:booking` |
| `lib/**`                      | `test:unit:lib`                                              |
| `components/**`               | `test:unit:components`                                       |
| `app/[clinic]/store/**`       | `test:public:store`, `e2e/public/store.spec.ts`              |
| `db/**`                       | All integration and system tests                             |

---

## Next Steps

1. **Phase 1:** Set up test infrastructure (helpers, fixtures, factories)
2. **Phase 2:** Implement critical path tests (login, pets, booking)
3. **Phase 3:** Expand integration tests for all API endpoints
4. **Phase 4:** Add system tests for complex workflows
5. **Phase 5:** Complete functionality and UAT test coverage
6. **Phase 6:** Add comprehensive E2E tests
7. **Phase 7:** Set up CI/CD pipeline with smart test selection

---

## API Testing (Future - Next Year)

### Planned API Test Coverage

When implementing dedicated API tests:

1. **Contract Testing:** Ensure API responses match TypeScript types
2. **Load Testing:** Use k6 or similar for performance testing
3. **Security Testing:** OWASP ZAP integration for vulnerability scanning
4. **API Documentation:** Auto-generate from tests using OpenAPI

### API Test Structure

```
tests/api/
├── contracts/           # Schema validation tests
├── performance/         # Load and stress tests
├── security/            # Security-focused tests
└── smoke/               # Quick health checks
```
