# Phase 1: Test Synchronization & Mock Fixes

> **Duration:** 2 weeks (10 working days)
> **Goal:** Fix all 508 failing tests - bring to 0 failures
> **Entry Criteria:** Phase 0 complete (inventory, CI stable)
> **Exit Criteria:** 100% test pass rate, standardized mocks

---

## 📊 Phase Overview

This phase focuses on synchronizing tests with current codebase state. We fix tests, not skip them. Each fix is documented with the root cause.

---

## 🎯 Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| Failing tests | Count | 0 |
| Pass rate | Percentage | 100% |
| Mock standardization | Adoption | 100% |
| Fix documentation | Documented | 100% |

---

## 📋 Epics

| Epic | Title | Tickets | Est. Hours |
|------|-------|---------|------------|
| [EPIC-P1-01](./EPIC-P1-01-service-mocks.md) | Service Mock Fixes | 16 | 32-40h |
| [EPIC-P1-02](./EPIC-P1-02-api-test-sync.md) | API Test Sync | 12 | 24-32h |
| [EPIC-P1-03](./EPIC-P1-03-component-test-sync.md) | Component Test Sync | 8 | 16-24h |
| [EPIC-P1-04](./EPIC-P1-04-database-test-sync.md) | Database Test Sync | 6 | 12-18h |

**Total Estimated Hours:** 84-114h (~2 weeks)

---

## 📁 Ticket Index

### EPIC-P1-01: Service Mock Fixes (16 Services)

| Ticket | Service | Failing | Priority | Est. |
|--------|---------|---------|----------|------|
| P1-001 | pet-service | 0 | - | 0h (healthy) |
| P1-002 | appointment-service | ~30 | P0 | 4h |
| P1-003 | invoice-service | ~25 | P0 | 3h |
| P1-004 | inventory-service | ~40 | P0 | 4h |
| P1-005 | medical-record-service | ~35 | P0 | 4h |
| P1-006 | vaccine-service | ~20 | P1 | 3h |
| P1-007 | hospitalization-service | ~25 | P1 | 3h |
| P1-008 | lab-service | ~30 | P1 | 4h |
| P1-009 | messaging-service | ~20 | P1 | 3h |
| P1-010 | payment-service | ~25 | P1 | 3h |
| P1-011 | store-service | ~35 | P1 | 4h |
| P1-012 | consent-service | ~15 | P2 | 2h |
| P1-013 | reminder-service | ~10 | P2 | 2h |
| P1-014 | safety-service | ~15 | P2 | 2h |
| P1-015 | clinical-tools-service | ~20 | P2 | 3h |
| P1-016 | user-service | ~10 | P2 | 2h |

### EPIC-P1-02: API Test Sync

| Ticket | Route Group | Failing | Priority | Est. |
|--------|-------------|---------|----------|------|
| P1-020 | /api/appointments/* | ~40 | P0 | 4h |
| P1-021 | /api/billing/* | ~30 | P0 | 4h |
| P1-022 | /api/inventory/* | ~25 | P0 | 3h |
| P1-023 | /api/pets/* | ~20 | P1 | 3h |
| P1-024 | /api/prescriptions/* | ~15 | P1 | 2h |
| P1-025 | /api/lab-orders/* | ~15 | P1 | 2h |
| P1-026 | /api/store/* | ~20 | P1 | 3h |
| P1-027 | /api/portal/* | ~25 | P1 | 3h |
| P1-028 | /api/cron/* | ~10 | P2 | 2h |
| P1-029 | /api/health/* | ~5 | P2 | 1h |
| P1-030 | /api/user/* | ~10 | P2 | 2h |
| P1-031 | /api/settings/* | ~10 | P2 | 2h |

### EPIC-P1-03: Component Test Sync

| Ticket | Component Group | Failing | Priority | Est. |
|--------|-----------------|---------|----------|------|
| P1-040 | Form Components | ~30 | P0 | 4h |
| P1-041 | Table Components | ~20 | P1 | 3h |
| P1-042 | Modal Components | ~15 | P1 | 2h |
| P1-043 | Card Components | ~10 | P2 | 2h |
| P1-044 | Navigation Components | ~10 | P2 | 2h |
| P1-045 | Dashboard Components | ~15 | P2 | 3h |
| P1-046 | Auth Components | ~10 | P2 | 2h |
| P1-047 | Chart Components | ~10 | P2 | 2h |

### EPIC-P1-04: Database Test Sync

| Ticket | Test Area | Failing | Priority | Est. |
|--------|-----------|---------|----------|------|
| P1-050 | RLS Policies | ~20 | P0 | 4h |
| P1-051 | Tenant Isolation | ~15 | P0 | 3h |
| P1-052 | Permission Tests | ~25 | P0 | 4h |
| P1-053 | Migration Tests | ~10 | P1 | 2h |
| P1-054 | Trigger Tests | ~5 | P2 | 2h |
| P1-055 | Function Tests | ~10 | P2 | 3h |

---

## 📈 Progress

```
EPIC-P1-01 (Services):   ░░░░░░░░░░ 0%
EPIC-P1-02 (API):        ░░░░░░░░░░ 0%
EPIC-P1-03 (Components): ░░░░░░░░░░ 0%
EPIC-P1-04 (Database):   ░░░░░░░░░░ 0%
```

---

## 🔄 Daily Strategy

### Week 1: Services & API

| Day | Focus | Target |
|-----|-------|--------|
| 1 | P1-002 to P1-005 | 4 services fixed |
| 2 | P1-006 to P1-011 | 6 services fixed |
| 3 | P1-012 to P1-016 | 5 services fixed |
| 4 | P1-020 to P1-023 | 4 API groups fixed |
| 5 | P1-024 to P1-031 | 8 API groups fixed |

### Week 2: Components & Database

| Day | Focus | Target |
|-----|-------|--------|
| 6 | P1-040 to P1-043 | 4 component groups |
| 7 | P1-044 to P1-047 | 4 component groups |
| 8 | P1-050 to P1-052 | Critical DB tests |
| 9 | P1-053 to P1-055 | Remaining DB tests |
| 10 | Buffer & cleanup | All tests passing |

---

## ⚠️ Fix Guidelines

### DO
- Fix the test to match current behavior
- Update test data to match current schema
- Use standardized mock helpers
- Document why the fix was needed

### DON'T
- Skip tests without a ticket
- Delete tests (unless feature removed)
- Make tests pass with wrong assertions
- Mock too much (should still test something)

---

## 📊 Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| All tests passing | CI | Pending |
| Fix documentation | Each PR | Pending |
| Updated mock guide | `MOCK_PATTERNS.md` | Pending |

---

*Created: 2026-02-03 | Owner: AI Agent*
