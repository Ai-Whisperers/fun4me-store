# Test Coverage Report

> Generated: January 2026

## Summary

| Metric | Count |
|--------|-------|
| **API Routes** | 188 |
| **Test Files** | 64 |
| **Unit Tests** | 518 passing |
| **Integration Tests** | ~500 passing |
| **Coverage Ratio** | 34% (routes with tests) |

## Test Distribution

| Category | Count | Notes |
|----------|-------|-------|
| Unit Tests (actions) | 7 | Form validation, auth rules |
| Unit Tests (lib) | 8 | Utilities, formatting, security |
| Unit Tests (clinical) | 3 | Drug dosages, growth charts, HHHHHMM |
| Integration Tests | 28 | API workflows, CRUD operations |
| Security Tests | 3 | Auth, RLS, tenant isolation |
| E2E Tests | 1 | Seeded data verification |
| Functionality Tests | 4 | Clinical, portal, store |

---

## Critical Gaps (Priority 1 - Financial/Legal)

These routes handle money or legal documents and MUST have tests:

### Payment/Billing Routes

| Route | Status | Priority | Recommended Tests |
|-------|--------|----------|-------------------|
| `invoices/[id]/payments` | ✅ Has tests | - | - |
| `invoices/[id]/refund` | ✅ Has tests | - | - |
| `invoices/[id]/send` | ❌ No tests | **HIGH** | Email delivery, PDF generation |
| `invoices/[id]/pdfx` | ❌ No tests | **HIGH** | PDF generation, data accuracy |
| `hospitalizations/[id]/invoice` | ❌ No tests | **HIGH** | Auto-invoice calculation |

### Prescription Routes

| Route | Status | Priority | Recommended Tests |
|-------|--------|----------|-------------------|
| `prescriptions` | ✅ Has tests | - | - |
| `store/prescriptions/upload` | ❌ No tests | **HIGH** | File validation, security |
| `store/orders/pending-prescriptions` | ❌ No tests | **HIGH** | Prescription approval workflow |
| `store/orders/[id]/prescription` | ❌ No tests | **HIGH** | Prescription attachment |

---

## Critical Gaps (Priority 2 - Medical Data)

### Medical Records

| Route | Status | Priority | Recommended Tests |
|-------|--------|----------|-------------------|
| `medical-records` (CRUD) | ✅ Has tests | - | - |
| `diagnosis_codes` | ❌ No tests | MEDIUM | Search, filtering |
| `vaccines/recommendations` | ❌ No tests | MEDIUM | Age-based recommendations |
| `vaccines/send-reminder` | ❌ No tests | MEDIUM | Email/SMS delivery |
| `vaccine_reactions` | ❌ No tests | **HIGH** | Adverse reaction tracking |
| `vaccine_reactions/check` | ❌ No tests | **HIGH** | Contraindication alerts |

---

## Critical Gaps (Priority 3 - Auth/Admin)

### Admin Routes

| Route | Status | Priority | Recommended Tests |
|-------|--------|----------|-------------------|
| `admin/products/pending` | ✅ Has tests | - | role-authorization.test.ts |
| `admin/products/[id]/approve` | ✅ Has tests | - | role-authorization.test.ts |
| `insurance/pre-authorizations` | ❌ No tests | MEDIUM | Insurance claim workflow |

---

## Coverage by Feature Area

### Well-Covered Areas ✅

| Area | Test Files | Notes |
|------|------------|-------|
| Payments | 5 | duplicate-prevention, recording, validation, refund |
| Hospitalization | 4 | admission, discharge, vitals |
| Auth | 4 | login, core, security, tenant isolation |
| Lab | 2 | order-placement, result-entry |
| Store Checkout | 1 | checkout-flow |

### Under-Covered Areas ❌

| Area | Test Files | Gap |
|------|------------|-----|
| **Appointments** | 1 | Missing: recurrence, waitlist, slots |
| **Conversations/Messaging** | 0 | No tests for chat system |
| **Calendar** | 0 | No tests for availability, events |
| **Analytics** | 0 | No tests for reports, exports |
| **Cron Jobs** | 0 | No tests for background jobs |
| **Consents** | 0 | No tests for consent management |
| **Dashboard** | 0 | No tests for dashboard endpoints |
| **Lost Pets** | 0 | No tests for lost pet system |
| **QR Tags** | 0 | No tests for QR scanning |

---

## Prioritized Test Backlog

### Tier 1 - Must Have (Financial/Legal Risk)

1. **`invoices/[id]/send`** - Invoice email delivery
   - Type: Integration
   - Risk: Failed invoice delivery = unpaid bills

2. **`vaccine_reactions`** - Adverse reaction tracking
   - Type: Integration + Unit
   - Risk: Legal liability for missed contraindications

3. **`store/prescriptions/upload`** - Prescription file upload
   - Type: Integration + Security
   - Risk: Prescription fraud, file security

4. **`hospitalizations/[id]/invoice`** - Auto-invoice generation
   - Type: Integration
   - Risk: Incorrect billing

### Tier 2 - Should Have (Business Critical)

5. **`appointments/slots`** - Availability calculation
   - Type: Unit + Integration
   - Risk: Double-booking

6. **`appointments/recurrences`** - Recurring appointments
   - Type: Integration
   - Risk: Missed appointments

7. **`conversations`** - Messaging system
   - Type: Integration
   - Risk: Missed client communication

8. **`cron/reminders`** - Reminder system
   - Type: Integration
   - Risk: Missed vaccine reminders

### Tier 3 - Nice to Have

9. **`analytics/*`** - Reporting endpoints
10. **`dashboard/*`** - Dashboard data endpoints
11. **`consents/*`** - Consent management
12. **`calendar/*`** - Calendar integration

---

## Component Test Gaps

Currently **0 component tests**. Priority components:

| Component | Priority | Why |
|-----------|----------|-----|
| `booking/` | HIGH | User-facing booking wizard |
| `invoices/` | HIGH | Invoice display, payment forms |
| `dashboard/` | MEDIUM | Admin dashboards |
| `clinical/` | MEDIUM | Medical record forms |

---

## Recommendations

### Immediate Actions

1. **Add tests for vaccine reactions** - Legal liability
2. **Add tests for prescription upload** - Security risk
3. **Add tests for invoice sending** - Revenue impact
4. **Add tests for appointment slots** - Core functionality

### Infrastructure Improvements

1. **Enable coverage threshold** in CI (fail if < 60%)
2. **Add component testing** with React Testing Library
3. **Add E2E tests** for critical user journeys
4. **Mock cron jobs** for background task testing

### Test Quality

1. **Migrate remaining high-boilerplate tests** using QA infrastructure
2. **Add error scenario tests** for all API routes
3. **Add tenant isolation tests** for multi-tenant routes

---

## Test Commands

```bash
# Run all unit tests with coverage
npm run test:unit -- --coverage

# Run specific integration tests
npx vitest run tests/integration/payments/

# Run tests matching pattern
npx vitest run --grep "invoice"

# Run security tests
npx vitest run tests/security/
```

---

*Report generated by `/qa-coverage` command*
