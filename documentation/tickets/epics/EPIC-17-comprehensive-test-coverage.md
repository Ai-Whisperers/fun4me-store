# EPIC-17: Comprehensive Test Coverage Initiative

## Overview

**Status**: Not Started
**Priority**: P1 - High
**Estimated Effort**: 80-120 hours
**Target Coverage**: 70% statements, 60% branches, 75% functions
**Current Coverage**: 46.18% statements, 37.89% branches, 58.25% functions

## Business Justification

The current test coverage of 46% leaves significant gaps in quality assurance:
- **Owner user role** is tested primarily for access denial, not positive functionality
- **309 API routes** exist but only ~45% have dedicated tests
- **37 server actions** with inconsistent test coverage
- **No systematic role-based testing** for permission boundaries
- **Critical owner journeys** (appointments, medical records) undertested

## Coverage Analysis Summary

### Current State (January 2026)

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Statement Coverage | 46.18% | 70% | -23.82% |
| Branch Coverage | 37.89% | 60% | -22.11% |
| Function Coverage | 58.25% | 75% | -16.75% |
| Line Coverage | 45.78% | 70% | -24.22% |

### Coverage by Category

| Category | Files | Tests | Coverage | Priority |
|----------|-------|-------|----------|----------|
| Owner Portal Features | 24 | ~35 | ~35% | P0 |
| Appointment Booking | 12 | ~15 | ~25% | P0 |
| Medical Records (Owner) | 8 | ~5 | ~15% | P0 |
| API Routes | 309 | ~140 | ~45% | P1 |
| Server Actions | 37 | ~20 | ~54% | P1 |
| Security/RLS | 15 | ~32 | ~70% | P2 |
| Components | 89 | ~45 | ~50% | P2 |

### Test Distribution by Type

| Test Type | Files | Count | Notes |
|-----------|-------|-------|-------|
| Integration | 68 | ~1,800 | Good coverage for staff flows |
| Unit | 29 | ~600 | Utilities well covered |
| Component | 19 | ~400 | Basic coverage |
| API | 15 | ~350 | Health/metrics focused |
| E2E | 1 | ~30 | Seeded data only |
| Functionality | 5 | ~100 | Limited portal coverage |

## Tickets in this Epic

### Tier 1: Owner Role Testing (P0)

| Ticket | Title | Effort | Dependencies |
|--------|-------|--------|--------------|
| [TST-001](../testing/TST-001-owner-appointment-booking.md) | Owner Appointment Booking Flow Tests | 12-16h | None |
| [TST-002](../testing/TST-002-owner-medical-records.md) | Owner Medical Records Access Tests | 8-12h | None |
| [TST-003](../testing/TST-003-owner-profile-management.md) | Owner Profile & Pet Management Tests | 8-10h | None |
| [TST-004](../testing/TST-004-owner-permission-boundaries.md) | Owner Permission Boundary Tests | 10-14h | TST-018 |
| [TST-005](../testing/TST-005-cross-owner-isolation.md) | Cross-Owner Data Isolation Tests | 6-8h | None |

### Tier 2: API Coverage (P1)

| Ticket | Title | Effort | Dependencies |
|--------|-------|--------|--------------|
| [TST-006](../testing/TST-006-api-route-coverage-audit.md) | API Route Coverage Audit & Gaps | 4-6h | None |
| [TST-007](../testing/TST-007-portal-api-tests.md) | Portal API Routes Tests | 12-16h | TST-006 |
| [TST-008](../testing/TST-008-messaging-api-tests.md) | Messaging API Tests | 8-10h | TST-006 |
| [TST-009](../testing/TST-009-loyalty-referrals-api.md) | Loyalty & Referrals API Tests | 6-8h | TST-006 |
| [TST-010](../testing/TST-010-analytics-reports-api.md) | Analytics & Reports API Tests | 8-12h | TST-006 |

### Tier 3: Integration Testing (P1)

| Ticket | Title | Effort | Dependencies |
|--------|-------|--------|--------------|
| [TST-011](../testing/TST-011-owner-journey-e2e.md) | Owner Portal E2E Journey Tests | 10-14h | TST-001, TST-002 |
| [TST-012](../testing/TST-012-invoice-payment-flow.md) | Invoice & Payment Flow Integration | 8-10h | None |
| [TST-013](../testing/TST-013-hospitalization-complete.md) | Hospitalization Complete Workflow | 8-10h | None |
| [TST-014](../testing/TST-014-vaccination-workflow.md) | Vaccination Complete Workflow | 6-8h | None |
| [TST-015](../testing/TST-015-procurement-flow.md) | Procurement & Supplier Flow | 6-8h | None |

### Tier 4: Test Infrastructure (P2)

| Ticket | Title | Effort | Dependencies |
|--------|-------|--------|--------------|
| [TST-016](../testing/TST-016-test-helpers-expansion.md) | Test Helper Functions Expansion | 6-8h | None |
| [TST-017](../testing/TST-017-fixture-factory-patterns.md) | Fixture Factory Patterns | 4-6h | None |
| [TST-018](../testing/TST-018-role-based-test-generators.md) | Role-Based Test Generators | 8-10h | None |

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- TST-018: Role-Based Test Generators (enables TST-004)
- TST-006: API Route Coverage Audit
- TST-016: Test Helper Functions
- TST-017: Fixture Factory Patterns

### Phase 2: Owner Role Testing (Week 2-4)
- TST-001: Owner Appointment Booking
- TST-002: Owner Medical Records
- TST-003: Owner Profile Management
- TST-005: Cross-Owner Isolation

### Phase 3: API Coverage (Week 4-6)
- TST-004: Owner Permission Boundaries
- TST-007: Portal API Routes
- TST-008: Messaging API
- TST-009: Loyalty & Referrals

### Phase 4: Integration & E2E (Week 6-8)
- TST-010: Analytics & Reports
- TST-011: Owner Journey E2E
- TST-012: Invoice & Payment Flow
- TST-013: Hospitalization Workflow
- TST-014: Vaccination Workflow
- TST-015: Procurement Flow

## Success Criteria

### Coverage Targets
- [ ] Statement coverage >= 70%
- [ ] Branch coverage >= 60%
- [ ] Function coverage >= 75%
- [ ] Owner role positive tests >= 100 new tests
- [ ] API route coverage >= 70%

### Quality Gates
- [ ] All owner portal features have dedicated test files
- [ ] All permission boundaries tested (owner vs staff)
- [ ] Cross-owner isolation verified
- [ ] No failing tests in CI
- [ ] Test execution time < 5 minutes for unit tests

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test flakiness | Medium | Use `mockState` consistently, avoid real DB |
| Coverage inflation | Low | Focus on meaningful assertions, not line coverage |
| Maintenance burden | Medium | Use generators, avoid duplication |
| False confidence | High | Test edge cases, not just happy paths |

## Dependencies

- Vitest 4.0.16+ (current)
- Playwright 1.57.0+ for E2E
- `@/lib/test-utils` mock system
- Test fixtures in `tests/__fixtures__`

## Metrics to Track

1. **Coverage Delta**: Track weekly improvement
2. **Test Count**: Unit, Integration, E2E breakdown
3. **Owner Test Ratio**: % of tests covering owner scenarios
4. **Bug Escape Rate**: Bugs found in production vs tests
5. **CI Time**: Test execution duration

---

**Created**: 2026-01-12
**Last Updated**: 2026-01-12
**Epic Owner**: QA Engineering
