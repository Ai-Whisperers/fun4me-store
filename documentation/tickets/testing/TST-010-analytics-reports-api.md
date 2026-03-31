# TST-010: Analytics & Reports API Tests

## Summary

**Priority**: P1 - High
**Effort**: 8-12 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Coverage
**Dependencies**: TST-006 (API Audit)

## Problem Statement

Analytics and reporting endpoints have ~33% coverage. These are admin-only endpoints critical for business decisions and require:
- Permission verification (admin only)
- Data accuracy testing
- Export functionality testing
- Date range filtering

## Routes to Test

### Dashboard Analytics (6 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/analytics | GET | 8 |
| /api/analytics/revenue | GET | 6 |
| /api/analytics/appointments | GET | 5 |
| /api/analytics/patients | GET | 5 |
| /api/analytics/services | GET | 4 |
| /api/analytics/products | GET | 4 |

### Export (4 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/analytics/export | POST | 8 |
| /api/analytics/export/[id] | GET | 4 |
| /api/reports/generate | POST | 6 |
| /api/reports/[id]/download | GET | 4 |

### Audit Logs (3 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/audit-logs | GET | 5 |
| /api/audit-logs/[id] | GET | 3 |
| /api/audit-logs/export | GET | 3 |

### Statistics (4 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/stats/overview | GET | 4 |
| /api/stats/compare | GET | 4 |
| /api/stats/trends | GET | 4 |
| /api/stats/heatmap | GET | 3 |

## Test Cases

### Permission Tests (12 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Owner accesses analytics | 403 |
| 2 | Vet accesses analytics | 403 |
| 3 | Admin accesses analytics | 200 |
| 4 | Owner exports data | 403 |
| 5 | Vet exports data | 403 |
| 6 | Admin exports data | 200 |
| ... | ... | ... |

### Data Accuracy Tests (15 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Revenue matches invoices | Correct sum |
| 2 | Appointment count accurate | Correct count |
| 3 | Patient count by species | Correct breakdown |
| 4 | Service popularity ranking | Correct order |
| 5 | Date filtering works | Only in-range data |
| 6 | Cross-tenant isolation | No data leak |
| ... | ... | ... |

### Export Tests (12 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Export to CSV | Valid CSV |
| 2 | Export to Excel | Valid XLSX |
| 3 | Export to PDF | Valid PDF |
| 4 | Large date range | Handles pagination |
| 5 | Empty result export | Valid empty file |
| 6 | Export with filters | Filters applied |
| ... | ... | ... |

### Audit Log Tests (10 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | View audit logs | 200, logs listed |
| 2 | Filter by action type | Correct filter |
| 3 | Filter by user | Correct filter |
| 4 | Filter by date range | Correct filter |
| 5 | Pagination | Correct pages |
| ... | ... | ... |

## Acceptance Criteria

- [ ] 73 analytics tests implemented
- [ ] All admin-only verified
- [ ] Data accuracy tests pass
- [ ] Export formats validated
- [ ] Date filtering tested
- [ ] Tenant isolation verified
- [ ] Tests run in < 60 seconds

---

**Created**: 2026-01-12
**Status**: Not Started
