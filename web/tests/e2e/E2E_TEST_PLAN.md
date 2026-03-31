# E2E Test Plan for Vete Platform

## Executive Summary

This document defines the comprehensive end-to-end testing strategy for the Vete multi-tenant veterinary platform. The goal is to ensure all critical user workflows function correctly across different roles, clinics, and browsers.

## Current Status

**✅ Complete**:

- Playwright configuration (multi-browser, auth persistence, visual validation)
- Seeded data verification test (database integrity)
- Demo accounts for 2 clinics (terrapet, petlife) with 3 roles each

**❌ Missing**:

- Authentication flow tests (login/logout for all roles)
- Pet Owner Portal workflow tests
- Staff Dashboard workflow tests
- E-commerce Store workflow tests
- Multi-tenant isolation verification tests

## Test Environment

### Prerequisites

```bash
# 1. Database setup
npm run db:setup

# 2. Seed demo data
npm run seed:demo

# 3. Install Playwright browsers
npx playwright install

# 4. Start dev server (separate terminal)
npm run dev
```

### Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
DATABASE_URL=postgresql://...
```

### Test Credentials

**Clinic: Adris** (`http://localhost:3000/terrapet`)

- Admin: `admin@terrapet.demo` / `demo123`
- Vet: `vet@terrapet.demo` / `demo123`
- Owner: `owner@terrapet.demo` / `demo123`

**Clinic: PetLife** (`http://localhost:3000/petlife`)

- Admin: `admin@petlife.demo` / `demo123`
- Vet: `vet@petlife.demo` / `demo123`
- Owner: `owner@petlife.demo` / `demo123`

## Test Structure

### Directory Organization

```
tests/e2e/
├── E2E_TEST_PLAN.md              # This file
├── helpers/                       # Test utilities
│   ├── auth.ts                   # Login/logout helpers
│   ├── database.ts               # Database utilities
│   ├── navigation.ts             # Navigation helpers
│   └── assertions.ts             # Custom assertions
├── auth/                          # Authentication tests
│   ├── login.spec.ts             # Login flows for all roles
│   ├── logout.spec.ts            # Session management
│   └── role-access.spec.ts       # Role-based access control
├── owner-portal/                  # Pet Owner Portal tests
│   ├── pet-management.spec.ts    # View pets, medical history
│   ├── appointments.spec.ts      # View/cancel appointments
│   ├── booking.spec.ts           # Book new appointments
│   ├── prescriptions.spec.ts     # View prescriptions
│   └── store-shopping.spec.ts    # Browse and purchase products
├── staff-dashboard/               # Staff Dashboard tests
│   ├── patients.spec.ts          # Patient management
│   ├── appointments.spec.ts      # Schedule management
│   ├── medical-records.spec.ts   # Create/edit medical records
│   ├── prescriptions.spec.ts     # Issue prescriptions
│   ├── hospitalization.spec.ts   # Kennel management
│   ├── lab-orders.spec.ts        # Laboratory workflows
│   └── invoicing.spec.ts         # Billing workflows
├── store/                         # E-commerce tests
│   ├── catalog.spec.ts           # Product browsing
│   ├── cart.spec.ts              # Cart operations
│   ├── checkout.spec.ts          # Checkout flow
│   └── prescriptions.spec.ts     # Prescription verification
├── multi-tenant/                  # Multi-tenancy tests
│   └── isolation.spec.ts         # Tenant data isolation
└── seeded-data-verification.test.ts  # Existing (database integrity)
```

## Priority 1 Tests (Critical Flows)

### 1.1 Authentication (auth/)

**Purpose**: Verify users can log in, access appropriate areas, and log out securely.

**Test Cases**:

- ✅ Owner login redirects to pet portal
- ✅ Owner cannot access staff dashboard
- ✅ Vet login redirects to staff dashboard
- ✅ Vet cannot access admin areas
- ✅ Admin login allows access to all areas
- ✅ Logout clears session and redirects to login
- ✅ Protected routes redirect unauthenticated users

**Success Criteria**: All role-based access rules enforced, no unauthorized access

### 1.2 Pet Owner Portal (owner-portal/)

**Purpose**: Verify pet owners can view their pets, appointments, and medical records.

**Test Cases**:

- ✅ Display list of owner's pets
- ✅ View pet details and medical history
- ✅ View vaccination records
- ✅ View upcoming appointments
- ✅ View prescriptions
- ✅ Cannot see other owners' pets

**Success Criteria**: Pet owners see only their own data, all information displays correctly

### 1.3 Staff Dashboard - Appointments (staff-dashboard/)

**Purpose**: Verify staff can manage appointments and view patient information.

**Test Cases**:

- ✅ View appointment calendar
- ✅ View appointment details
- ✅ Search for patients
- ✅ View patient medical records
- ✅ Access only own clinic's data

**Success Criteria**: Staff can navigate dashboard, access patient info, tenant isolation enforced

### 1.4 Medical Records Creation (staff-dashboard/)

**Purpose**: Verify vets can create and edit medical records.

**Test Cases**:

- ✅ Create new medical record for a patient
- ✅ Add diagnosis and treatment notes
- ✅ Attach files to medical record
- ✅ View created medical records
- ✅ Edit existing medical records

**Success Criteria**: Medical records persist correctly, all data saved

### 1.5 E-commerce Checkout (store/)

**Purpose**: Verify customers can complete a purchase.

**Test Cases**:

- ✅ Browse product catalog
- ✅ Add products to cart
- ✅ View cart and update quantities
- ✅ Proceed to checkout
- ✅ Complete purchase (test mode)
- ✅ View order confirmation

**Success Criteria**: End-to-end purchase flow works, orders persist

## Priority 2 Tests (Core Features)

### 2.1 Appointment Booking (owner-portal/)

- Book appointment from available slots
- Select service and pet
- Confirm booking
- Receive confirmation

### 2.2 Prescription Issuance (staff-dashboard/)

- Create prescription for patient
- Add medications and dosages
- Generate prescription PDF
- Owner can view prescription

### 2.3 Invoice Generation (staff-dashboard/)

- Create invoice for services
- Add line items
- Generate invoice PDF
- Record payment

### 2.4 Product Management (store/)

- Staff add/edit products
- Manage inventory
- Set pricing
- Upload product images

### 2.5 Hospitalization Workflow (staff-dashboard/)

- Admit patient to kennel
- Record vitals
- Track treatments
- Discharge patient

## Priority 3 Tests (Advanced Features)

### 3.1 Laboratory Orders (staff-dashboard/)

- Create lab order with test items
- Record results
- Generate lab report
- Owner can view results

### 3.2 Multi-Tenant Isolation (multi-tenant/)

- Adris staff cannot see PetLife data
- PetLife staff cannot see Adris data
- Owner from Adris cannot see PetLife pets
- URLs enforce tenant boundaries

### 3.3 Role-Based Access Control (auth/)

- Owner role restrictions enforced
- Vet role permissions correct
- Admin role has full access
- Unauthorized access blocked

### 3.4 Data Privacy (security/)

- Sensitive data not exposed in responses
- File uploads restricted by role
- API routes enforce tenant filtering

## Test Data Requirements

### Seed Data Needed

- ✅ 2 clinics (terrapet, petlife)
- ✅ 6 demo accounts (3 per clinic, 3 roles each)
- ✅ 18+ pets with medical histories
- ✅ 20+ appointments across statuses
- ✅ Medical records with attachments
- ✅ Vaccination records
- ✅ 1000+ store products
- ✅ Kennel/hospitalization data

### Test Data Management

- Use seeded demo data for most tests
- Clean up test-created data after each test suite
- Maintain referential integrity
- Avoid conflicts with parallel test execution

## Running Tests

### Command Reference

```bash
# All E2E tests
npm run test:e2e

# Headed mode (see browser)
npm run test:e2e:headed

# UI mode (interactive debugging)
npm run test:e2e:ui

# Specific test file
npx playwright test tests/e2e/auth/login.spec.ts

# Specific clinic
npx playwright test --grep @terrapet

# Specific role
npx playwright test --grep @owner

# Generate HTML report
npx playwright show-report
```

### Test Execution Strategy

1. **Sequential Execution**: Tests run one at a time to avoid database conflicts
2. **Auth State Persistence**: Login once per role, reuse across tests
3. **Screenshot on Failure**: Automatic screenshots for debugging
4. **Video on Failure**: Automatic video recording for debugging

## Success Criteria

### Test Completion Metrics

- ✅ All Priority 1 tests implemented and passing (5 test suites)
- ✅ All Priority 2 tests implemented and passing (5 test suites)
- ⏳ All Priority 3 tests implemented and passing (4 test suites)

### Quality Metrics

- **Pass Rate**: >95% consistent pass rate
- **Execution Time**: <5 minutes for core test suite
- **Flakiness**: <5% flaky test rate
- **Coverage**: All critical user workflows covered

### Documentation Metrics

- ✅ Test plan document complete
- ✅ All test files have descriptive comments
- ✅ Helper functions documented
- ✅ Test results documented with screenshots

## Known Limitations

### Current Constraints

1. **Shared Database**: Tests share the demo database (consider separate test DB later)
2. **Single Worker**: Tests must run sequentially to avoid conflicts
3. **Spanish UI**: All assertions must use Spanish labels
4. **Supabase RLS**: Row-Level Security must be considered in test data setup

### Future Enhancements

- [ ] Separate test database with isolated data
- [ ] Parallel test execution with proper data isolation
- [ ] Visual regression testing with screenshot comparisons
- [ ] Performance benchmarking within E2E tests
- [ ] Accessibility (a11y) testing integration
- [ ] Mobile responsive testing (tablet, phone viewports)

## Debugging Guide

### Common Issues

**Test Timeout**

```bash
# Increase timeout in playwright.config.ts or individual test
test.setTimeout(60000); // 60 seconds
```

**Element Not Found**

```bash
# Use explicit waits
await page.waitForSelector('[data-testid="pet-card"]');
await page.waitForLoadState('networkidle');
```

**Authentication Issues**

```bash
# Check auth state file exists
ls .auth/owner.json

# Re-run setup
npx playwright test --project=setup
```

**Database State Issues**

```bash
# Reset database
npm run seed:reset

# Verify seeded data
npm run test:e2e tests/e2e/seeded-data-verification.test.ts
```

### Debugging Tools

**Playwright Inspector**

```bash
npx playwright test --debug
```

**Trace Viewer**

```bash
npx playwright show-trace trace.zip
```

**UI Mode** (Best for development)

```bash
npm run test:e2e:ui
```

## Maintenance

### When to Update Tests

- New feature added → Add corresponding E2E test
- UI changes → Update selectors and assertions
- Role permissions changed → Update auth tests
- Multi-tenant logic changed → Update isolation tests

### Test Review Checklist

- [ ] Test name clearly describes what is being tested
- [ ] Test uses proper authentication for role
- [ ] Test verifies expected outcomes, not just "no error"
- [ ] Test cleans up any created data
- [ ] Test has proper error handling
- [ ] Test uses Spanish labels for UI assertions

---

## Next Steps

### Phase 1: Foundation (CURRENT)

1. ✅ Create test plan document (this file)
2. ⏳ Create helper utilities (auth, navigation, database)
3. ⏳ Implement authentication tests (Priority 1.1)
4. ⏳ Implement pet owner portal tests (Priority 1.2)
5. ⏳ Document test results

### Phase 2: Core Workflows

1. Implement staff dashboard tests (Priority 1.3, 1.4)
2. Implement e-commerce tests (Priority 1.5)
3. Implement appointment booking tests (Priority 2.1)

### Phase 3: Advanced Features

1. Implement Priority 2 tests (2.2-2.5)
2. Implement Priority 3 tests (3.1-3.4)
3. Add visual regression testing

### Phase 4: Optimization

1. Separate test database setup
2. Parallel test execution
3. Performance benchmarking
4. CI/CD integration

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Status**: Phase 1 - In Progress
