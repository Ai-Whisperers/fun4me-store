# Test Inventory

> Generated: 2026-02-03
> Total Test Files: 220
> Total Test Lines: 102,219
> E2E Spec Files: 48

---

## Summary

| Category | Files | Status |
|----------|-------|--------|
| Service Tests | 17 | Mixed |
| API Tests | ~50 | Mixed |
| Integration Tests | ~40 | Mixed |
| Component Tests | ~15 | Unknown |
| Unit Tests | ~30 | Mixed |
| Database Tests | 4 | Failing |
| E2E Tests | 48 | Unknown |
| Other | ~16 | Mixed |

---

## Test Results Summary

| Metric | Count |
|--------|-------|
| **Total Tests** | 1950 |
| **Passing** | 1341 (68.8%) |
| **Failing** | 509 (26.1%) |
| **Skipped** | 100 (5.1%) |
| **Test Files** | 79 |
| **Passing Files** | 37 |
| **Failing Files** | 42 |

---

## Service Tests (17 files)

| File | Tests | Status | Notes |
|------|-------|--------|-------|
| `pet-service.test.ts` | 124 | ✅ Passing | Well-maintained |
| `base-service.test.ts` | ~40 | ✅ Passing | Core service tests |
| `appointment-service.test.ts` | ~100 | ⚠️ Mixed | Some failures |
| `invoice-service.test.ts` | 123 | ⚠️ Mixed | Payment tests failing |
| `inventory-service.test.ts` | 146 | ❌ Failing | Mock issues |
| `hospitalization-service.test.ts` | 178 | ❌ Failing | Mock issues |
| `lab-service.test.ts` | 134 | ❌ Failing | Mock issues |
| `messaging-service.test.ts` | 142 | ❌ Failing | Mock issues |
| `clinical-tools-service.test.ts` | 133 | ❌ Failing | Mock issues |
| `medical-record-service.test.ts` | ~80 | ❌ Failing | Mock issues |
| `vaccine-service.test.ts` | ~60 | ❌ Failing | Mock issues |
| `store-service.test.ts` | ~80 | ❌ Failing | Mock issues |
| `payment-service.test.ts` | ~70 | ❌ Failing | Mock issues |
| `consent-service.test.ts` | ~50 | ⚠️ Mixed | Partial |
| `reminder-service.test.ts` | ~40 | ❌ Failing | Mock issues |
| `safety-service.test.ts` | ~50 | ❌ Failing | Mock issues |
| `user-service.test.ts` | ~60 | ⚠️ Mixed | Auth issues |

---

## API Tests (~50 files)

### High Test Count (>100 tests)

| File | Tests | Status |
|------|-------|--------|
| `appointments/waitlist/route.test.ts` | 207 | ❌ Failing |
| `prescriptions/route.test.ts` | 182 | ❌ Failing |
| `lab-orders/route.test.ts` | 152 | ❌ Failing |
| `inventory/receive/route.test.ts` | 151 | ❌ Failing |
| `store-contract.test.ts` | 148 | ❌ Failing |
| `medical-records/route.test.ts` | 140 | ❌ Failing |
| `store/cart/route.test.ts` | 130 | ❌ Failing |
| `cron/expiry-alerts/route.test.ts` | 123 | ⚠️ Mixed |

### Medium Test Count (50-100 tests)

| File | Tests | Status |
|------|-------|--------|
| `billing/invoices/route.test.ts` | ~80 | ⚠️ Mixed |
| `billing/payments/route.test.ts` | ~60 | ⚠️ Mixed |
| `pets/route.test.ts` | ~70 | ⚠️ Mixed |
| `user/preferences.test.ts` | ~50 | ⚠️ Mixed |

---

## Integration Tests (~40 files)

### Largest Files

| File | Tests | Status |
|------|-------|--------|
| `lab/lab-order-detail.test.ts` | 219 | ❌ Failing |
| `hospitalization/auto-invoice.test.ts` | 179 | ❌ Failing |
| `store/store-cart.test.ts` | 176 | ❌ Failing |
| `hospitalization/admission-workflow.test.ts` | 153 | ❌ Failing |
| `lab/result-entry.test.ts` | 152 | ❌ Failing |
| `inventory/inventory-receiving.test.ts` | 149 | ❌ Failing |
| `vaccines/vaccine-reactions.test.ts` | 133 | ❌ Failing |
| `services/store-service.integration.test.ts` | 131 | ❌ Failing |
| `insurance/insurance-claims.test.ts` | 129 | ❌ Failing |
| `inventory/inventory-adjustments.test.ts` | 124 | ❌ Failing |
| `analytics/analytics.test.ts` | 120 | ❌ Failing |

---

## Database Tests (4 files)

| File | Tests | Status | Issue |
|------|-------|--------|-------|
| `terrapet-rls.test.ts` | ~50 | ❌ Failing | RLS context |
| `terrapet-isolation.test.ts` | ~40 | ❌ Failing | Schema drift |
| `permission-tests.test.ts` | ~100 | ❌ Failing | Auth mock |

---

## Unit Tests

| File | Tests | Status |
|------|-------|--------|
| `services/pet-service.test.ts` | 124 | ✅ Passing |
| `services/invoice-service.test.ts` | 123 | ⚠️ Mixed |
| `api/invoice-status-transitions.test.ts` | 189 | ⚠️ Mixed |
| `clinical/growth-chart-percentiles.test.ts` | ~50 | ✅ Passing |

---

## Skipped Tests Analysis

| Reason | Count |
|--------|-------|
| WIP / Incomplete | ~40 |
| Flaky | ~20 |
| Blocked by infrastructure | ~30 |
| Feature removed | ~10 |

---

## Test Organization Issues

1. **Inconsistent naming**: Mix of `*.test.ts` and `*.test.tsx`
2. **No clear separation**: Unit vs integration tests mixed
3. **Missing index files**: No barrel exports for test utilities
4. **Duplicate test files**: Some functionality tested in multiple places

---

## Recommendations

1. **Priority 1**: Fix mock infrastructure (unblocks ~300 tests)
2. **Priority 2**: Fix `cookies()` mock for API tests (unblocks ~150 tests)
3. **Priority 3**: Fix schema drift (`microchip_id`) (unblocks ~50 tests)
4. **Priority 4**: Review and unskip blocked tests

---

*This document will be updated as tests are fixed.*
