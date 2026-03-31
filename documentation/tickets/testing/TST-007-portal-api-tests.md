# TST-007: Portal API Routes Tests

## Summary

**Priority**: P1 - High
**Effort**: 12-16 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Coverage
**Dependencies**: TST-006 (API Audit)

## Problem Statement

Owner portal API routes have the lowest test coverage (~25%) despite being the primary interface for 80%+ of users. These routes handle sensitive owner data and require comprehensive testing.

## Routes to Test

### Profile Management (4 routes)

| Route | Methods | Current Coverage |
|-------|---------|------------------|
| /api/portal/profile | GET, PATCH | 0% |
| /api/portal/preferences | GET, PUT | 0% |
| /api/portal/notifications/settings | GET, PUT | 0% |
| /api/portal/password | POST | 0% |

### Pet Portal (6 routes)

| Route | Methods | Current Coverage |
|-------|---------|------------------|
| /api/portal/pets | GET, POST | ~30% |
| /api/portal/pets/[id] | GET, PUT, DELETE | ~30% |
| /api/portal/pets/[id]/photo | POST, DELETE | 0% |
| /api/portal/pets/[id]/qr-tag | GET, POST | 0% |
| /api/portal/pets/[id]/share | POST | 0% |
| /api/portal/pets/[id]/export | GET | 0% |

### Medical Portal (5 routes)

| Route | Methods | Current Coverage |
|-------|---------|------------------|
| /api/portal/records | GET | 0% |
| /api/portal/records/[id] | GET | 0% |
| /api/portal/prescriptions | GET | 0% |
| /api/portal/prescriptions/[id]/pdf | GET | 0% |
| /api/portal/lab-results | GET | 0% |

### Appointment Portal (4 routes)

| Route | Methods | Current Coverage |
|-------|---------|------------------|
| /api/portal/appointments | GET | 0% |
| /api/portal/appointments/request | POST | 0% |
| /api/portal/appointments/[id] | GET, DELETE | 0% |
| /api/portal/appointments/history | GET | 0% |

### Store Portal (5 routes)

| Route | Methods | Current Coverage |
|-------|---------|------------------|
| /api/portal/orders | GET | ~40% |
| /api/portal/orders/[id] | GET | ~40% |
| /api/portal/orders/[id]/track | GET | 0% |
| /api/portal/wishlist | GET, POST, DELETE | 90% |
| /api/portal/loyalty | GET | 0% |

## Test Structure

```
tests/
└── integration/
    └── portal/
        ├── profile.test.ts
        ├── pets.test.ts
        ├── medical.test.ts
        ├── appointments.test.ts
        ├── orders.test.ts
        └── loyalty.test.ts
```

## Test Cases (Summary)

### Profile (15 tests)
- Get own profile
- Update profile fields
- Validation errors
- Cross-owner protection

### Pets (25 tests)
- Full CRUD operations
- Photo upload/delete
- QR tag management
- Share/export functions

### Medical (20 tests)
- List own records
- View record details
- Download prescriptions
- View lab results

### Appointments (18 tests)
- List appointments
- Submit requests
- Cancel appointments
- View history

### Orders (12 tests)
- List orders
- View order details
- Track shipment
- Order history

### Loyalty (8 tests)
- View points balance
- View transaction history
- Redeem points

## Acceptance Criteria

- [ ] All 98 test cases implemented
- [ ] Portal API coverage >= 85%
- [ ] All routes test auth requirement
- [ ] Cross-owner isolation verified
- [ ] Spanish error messages verified
- [ ] Tests run in < 90 seconds

---

**Created**: 2026-01-12
**Status**: Not Started
