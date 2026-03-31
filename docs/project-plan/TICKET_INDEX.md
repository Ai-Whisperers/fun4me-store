# Complete Ticket Index

> All tickets organized by phase and epic.

---

## 📊 Summary

| Phase | Epics | Tickets | Est. Hours | Status |
|-------|-------|---------|------------|--------|
| Phase 0 | 3 | 13 | 26-38h | Not Started |
| Phase 1 | 4 | 42 | 84-114h | Not Started |
| Phase 2 | 4 | 20 | 100-142h | Not Started |
| Phase 3 | 3 | 17 | 95-125h | Not Started |
| Phase 4 | 3 | 19 | 89-117h | Not Started |
| Phase 5 | 3 | 14 | 38-57h | Not Started |
| **Total** | **20** | **125** | **432-593h** | **0%** |

---

## Phase 0: Test Infrastructure & Stabilization

### EPIC-P0-01: Test Audit & Inventory (5 tickets)

| ID | Title | Priority | Est. | Status |
|----|-------|----------|------|--------|
| P0-001 | Catalog All Test Files | P0 | 2h | Not Started |
| P0-002 | Analyze Failure Patterns | P0 | 4h | Not Started |
| P0-003 | Categorize Skipped Tests | P0 | 2h | Not Started |
| P0-004 | Identify Flaky Tests | P1 | 3h | Not Started |
| P0-005 | Document Test Quality Issues | P1 | 3h | Not Started |

### EPIC-P0-02: Mock Infrastructure (4 tickets)

| ID | Title | Priority | Est. | Status |
|----|-------|----------|------|--------|
| P0-006 | Audit Supabase Mock Patterns | P0 | 3h | Not Started |
| P0-007 | Standardize Chainable Mock | P0 | 3h | In Progress |
| P0-008 | Fix Mock Return Types | P0 | 3h | Not Started |
| P0-009 | Document Mock Patterns | P1 | 2h | Not Started |

### EPIC-P0-03: CI Stabilization (4 tickets)

| ID | Title | Priority | Est. | Status |
|----|-------|----------|------|--------|
| P0-010 | Fix CI Workflow Issues | P0 | 2h | ✅ Complete |
| P0-011 | Fix TypeScript Errors | P0 | 4h | ✅ Complete |
| P0-012 | Configure Test Thresholds | P1 | 2h | Not Started |
| P0-013 | Setup Test Reporting | P2 | 3h | Not Started |

---

## Phase 1: Test Synchronization & Mock Fixes

### EPIC-P1-01: Service Mock Fixes (16 tickets)

| ID | Service | Priority | Est. | Status |
|----|---------|----------|------|--------|
| P1-001 | pet-service | - | - | ✅ Already Passing |
| P1-002 | appointment-service | P0 | 4h | Not Started |
| P1-003 | invoice-service | P0 | 3h | Not Started |
| P1-004 | inventory-service | P0 | 4h | Not Started |
| P1-005 | medical-record-service | P0 | 4h | Not Started |
| P1-006 | vaccine-service | P1 | 3h | Not Started |
| P1-007 | hospitalization-service | P1 | 3h | Not Started |
| P1-008 | lab-service | P1 | 4h | Not Started |
| P1-009 | messaging-service | P1 | 3h | Not Started |
| P1-010 | payment-service | P1 | 3h | Not Started |
| P1-011 | store-service | P1 | 4h | Not Started |
| P1-012 | consent-service | P2 | 2h | Not Started |
| P1-013 | reminder-service | P2 | 2h | Not Started |
| P1-014 | safety-service | P2 | 2h | Not Started |
| P1-015 | clinical-tools-service | P2 | 3h | Not Started |
| P1-016 | user-service | P2 | 2h | Not Started |

### EPIC-P1-02: API Test Sync (11 tickets)

| ID | Route Group | Priority | Est. | Status |
|----|-------------|----------|------|--------|
| P1-020 | /api/appointments/* | P0 | 4h | Not Started |
| P1-021 | /api/billing/* | P0 | 4h | Not Started |
| P1-022 | /api/inventory/* | P0 | 3h | Not Started |
| P1-023 | /api/pets/* | P1 | 3h | Not Started |
| P1-024 | /api/prescriptions/* | P1 | 2h | Not Started |
| P1-025 | /api/lab-orders/* | P1 | 2h | Not Started |
| P1-026 | /api/medical-records/* | P1 | 3h | Not Started |
| P1-027 | /api/cron/* | P2 | 2h | Not Started |
| P1-028 | /api/health/* | P2 | 1h | Not Started |
| P1-029 | /api/settings/* | P2 | 2h | Not Started |
| P1-030 | Contract tests | P2 | 3h | Not Started |

### EPIC-P1-03: Database Test Sync (4 tickets)

| ID | Test Area | Priority | Est. | Status |
|----|-----------|----------|------|--------|
| P1-050 | RLS Policy Tests | P0 | 4h | Not Started |
| P1-051 | Tenant Isolation Tests | P0 | 3h | Not Started |
| P1-052 | Permission Tests | P0 | 4h | Not Started |
| P1-053 | Integration DB Tests | P1 | 3h | Not Started |

### EPIC-P1-04: Component/Functionality Tests (11 tickets)

| ID | Area | Priority | Est. | Status |
|----|------|----------|------|--------|
| P1-060 | Form Components | P1 | 3h | Not Started |
| P1-061 | Table Components | P1 | 3h | Not Started |
| P1-062 | Modal Components | P1 | 2h | Not Started |
| P1-063 | Clinical Drug Dosages | P1 | 2h | Not Started |
| P1-064 | Portal Pets | P2 | 2h | Not Started |
| P1-065 | Store Cart | P2 | 2h | Not Started |
| P1-066 | Store Products | P2 | 2h | Not Started |
| P1-067 | UAT Owner Tests | P2 | 3h | Not Started |
| P1-068 | TerraPet Config | P2 | 2h | Not Started |

---

## Phase 2: Coverage Expansion

### EPIC-P2-01: Service Coverage (15 tickets)

| ID | Service | Current | Target | Est. |
|----|---------|---------|--------|------|
| P2-001 | payment-service | ~20% | 90% | 8h |
| P2-002 | prescription-service | 0% | 90% | 6h |
| P2-003 | invoice-service | ~80% | 90% | 4h |
| P2-004 | appointment-service | ~80% | 90% | 4h |
| P2-005 | inventory-service | 0% | 80% | 6h |
| P2-006 | medical-record-service | 0% | 80% | 5h |
| P2-007 | lab-service | 0% | 80% | 5h |
| P2-008 | vaccine-service | 0% | 80% | 4h |
| P2-009 | hospitalization-service | 0% | 80% | 5h |
| P2-010 | store-service | 0% | 70% | 4h |
| P2-011 | messaging-service | 0% | 70% | 3h |
| P2-012 | consent-service | ~50% | 70% | 3h |
| P2-013 | reminder-service | 0% | 70% | 3h |
| P2-014 | clinical-tools-service | 0% | 70% | 3h |
| P2-015 | safety-service | 0% | 70% | 3h |

### EPIC-P2-02: Action Coverage (TBD)
### EPIC-P2-03: Utility Coverage (TBD)
### EPIC-P2-04: Hook Coverage (TBD)

---

## Phase 3: API & Component Testing

### EPIC-P3-01: API Route Tests (11 tickets)

| ID | Route | Priority | Est. |
|----|-------|----------|------|
| P3-001 | /api/billing/invoices | P0 | 6h |
| P3-002 | /api/billing/payments | P0 | 4h |
| P3-003 | /api/prescriptions | P0 | 5h |
| P3-004 | /api/medical-records | P0 | 5h |
| P3-005 | /api/appointments | P1 | 5h |
| P3-006 | /api/pets | P1 | 4h |
| P3-007 | /api/inventory | P1 | 4h |
| P3-008 | /api/lab-orders | P1 | 4h |
| P3-009 | /api/portal/* | P2 | 6h |
| P3-010 | /api/store/* | P2 | 5h |
| P3-011 | /api/messaging/* | P2 | 4h |

### EPIC-P3-02: Component Tests (TBD)
### EPIC-P3-03: Form Tests (TBD)

---

## Phase 4: Integration & E2E Testing

### EPIC-P4-01: E2E Critical Paths (11 tickets)

| ID | Journey | Priority | Est. |
|----|---------|----------|------|
| P4-001 | Appointment Booking E2E | P0 | 6h |
| P4-002 | Invoice Payment E2E | P0 | 5h |
| P4-003 | Store Purchase E2E | P0 | 6h |
| P4-004 | Prescription E2E | P0 | 5h |
| P4-005 | Pet Registration E2E | P1 | 4h |
| P4-006 | Medical Record E2E | P1 | 4h |
| P4-007 | Lab Order E2E | P1 | 5h |
| P4-008 | Hospitalization E2E | P1 | 5h |
| P4-009 | Staff Management E2E | P2 | 3h |
| P4-010 | Inventory E2E | P2 | 4h |
| P4-011 | Reports E2E | P2 | 3h |

### EPIC-P4-02: RLS Security Tests (TBD)
### EPIC-P4-03: Integration Tests (TBD)

---

## Phase 5: Quality Hardening & Documentation

### EPIC-P5-01: Lint Cleanup (8 tickets)

| ID | Focus | Warnings | Priority | Est. |
|----|-------|----------|----------|------|
| P5-001 | Replace console.log | 126 | P0 | 4h |
| P5-002 | Fix any types | 30 | P0 | 3h |
| P5-003 | Fix React hooks deps | 50 | P1 | 4h |
| P5-004 | Remove unused vars | 50 | P1 | 2h |
| P5-005 | Fix no-redeclare | 20 | P1 | 2h |
| P5-006 | Use next/image | 25 | P2 | 2h |
| P5-007 | Remaining warnings | 475 | P2 | 8h |
| P5-008 | Configure rules | - | P2 | 2h |

### EPIC-P5-02: Documentation (6 tickets)

| ID | Document | Priority | Est. |
|----|----------|----------|------|
| P5-010 | TESTING_GUIDE.md | P0 | 4h |
| P5-011 | MOCK_PATTERNS.md | P0 | 2h |
| P5-012 | API_TESTING.md | P1 | 2h |
| P5-013 | COMPONENT_TESTING.md | P1 | 2h |
| P5-014 | E2E_TESTING.md | P1 | 2h |
| P5-015 | COVERAGE_STRATEGY.md | P2 | 2h |

### EPIC-P5-03: CI Optimization (TBD)

---

## Quick Filters

### P0 (Critical) Tickets
- P0-001 through P0-008, P0-010, P0-011
- P1-002 through P1-005, P1-020 through P1-022, P1-050 through P1-052
- P2-001, P2-002
- P3-001 through P3-004
- P4-001 through P4-004
- P5-001, P5-002, P5-010, P5-011

### Blocking Tickets
- P0-006, P0-007 → Blocks all Phase 1 service tickets
- Phase 0 → Blocks Phase 1
- Phase 1 → Blocks Phase 2

---

*Last Updated: 2026-02-03*
