# TST-001: Owner Appointment Booking Flow Tests

## Summary

**Priority**: P0 - Critical
**Effort**: 12-16 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Coverage
**Dependencies**: None

## Problem Statement

The appointment booking flow—a critical owner journey—has minimal test coverage (~15%). Current tests focus on staff operations (check-in, complete) while owner-facing functionality is nearly untested.

### Current State

| Feature | Tested | Notes |
|---------|--------|-------|
| Submit booking request | No | Core owner action |
| View appointment history | No | Portal feature |
| Cancel appointment (owner) | No | If allowed by clinic |
| View slot availability | Partial | 4 tests exist |
| Reschedule request | No | New booking flow |
| Waitlist join/view | No | Owner actions |
| Appointment reminders | No | Notification trigger |

### Impact

- Owners represent 80%+ of platform users
- Appointment booking is the primary conversion action
- Booking failures directly impact clinic revenue
- No regression protection for booking changes

## Scope

### In Scope

1. **Booking Request API** (`POST /api/appointments/request`)
   - Valid submission with all fields
   - Submission with optional preferences
   - Validation errors (missing pet, invalid dates)
   - Auth requirement (owner must be logged in)
   - Pet ownership validation (can only book for own pets)

2. **Appointment History API** (`GET /api/appointments`)
   - List own appointments only
   - Filter by status (upcoming, past, cancelled)
   - Pagination
   - Cannot view other owners' appointments

3. **Cancellation API** (`DELETE /api/appointments/[id]`)
   - Owner can cancel own pending appointments
   - Cannot cancel other owners' appointments
   - Cannot cancel past/completed appointments
   - Cancellation triggers waitlist processing

4. **Waitlist API** (`POST /api/appointments/waitlist`)
   - Join waitlist for service
   - View waitlist position
   - Accept/decline waitlist offer

5. **Slot Availability** (expand existing tests)
   - Owner can view available slots
   - Slots respect clinic schedule
   - Blocked times not shown

### Out of Scope

- Staff appointment management (already covered)
- Check-in/complete flows (staff only)
- Appointment scheduling (staff action)

## Technical Approach

### Test Structure

```
tests/
├── integration/
│   └── owner/
│       └── appointments/
│           ├── booking-request.test.ts
│           ├── appointment-history.test.ts
│           ├── cancellation.test.ts
│           └── waitlist.test.ts
└── functionality/
    └── portal/
        └── appointments.test.ts
```

### Test Patterns

```typescript
// Example: booking-request.test.ts
describe('POST /api/appointments/request', () => {
  beforeEach(() => {
    resetAllMocks()
    mockState.setAuthScenario('OWNER')
  })

  describe('Authentication', () => {
    it('should return 401 when unauthenticated', async () => {
      mockState.setAuthScenario('UNAUTHENTICATED')
      const response = await POST(createRequest({ petId: PET.id, serviceId: SERVICE.id }))
      expect(response.status).toBe(401)
    })

    it('should allow owner to submit booking request', async () => {
      mockState.setTableResult('appointments', { id: 'new-apt-id' })
      const response = await POST(createRequest({
        petId: PET.id,
        serviceId: SERVICE.id,
        preferredDateStart: tomorrow(),
        preferredTimeOfDay: 'morning'
      }))
      expect(response.status).toBe(201)
    })
  })

  describe('Pet Ownership Validation', () => {
    it('should reject booking for pet not owned by user', async () => {
      mockState.setTableResult('pets', null) // Pet not found for this owner
      const response = await POST(createRequest({ petId: OTHER_OWNER_PET.id }))
      expect(response.status).toBe(403)
    })
  })

  describe('Validation', () => {
    it('should reject booking without pet ID', async () => {
      const response = await POST(createRequest({ serviceId: SERVICE.id }))
      expect(response.status).toBe(400)
    })

    it('should reject booking with past date preference', async () => {
      const response = await POST(createRequest({
        petId: PET.id,
        preferredDateStart: yesterday()
      }))
      expect(response.status).toBe(400)
    })
  })
})
```

### Fixtures Required

```typescript
// tests/__fixtures__/owner-appointments.ts
export const OWNER_APPOINTMENTS = {
  PENDING: {
    id: 'apt-pending-001',
    pet_id: PETS.OWNER_PET.id,
    status: 'pending_scheduling',
    scheduling_status: 'pending_scheduling',
    requested_at: '2026-01-10T10:00:00Z'
  },
  SCHEDULED: {
    id: 'apt-scheduled-001',
    pet_id: PETS.OWNER_PET.id,
    status: 'scheduled',
    start_time: tomorrow10am(),
    end_time: tomorrow11am()
  },
  COMPLETED: {
    id: 'apt-completed-001',
    pet_id: PETS.OWNER_PET.id,
    status: 'completed',
    completed_at: yesterday()
  }
}
```

## Test Cases (Detailed)

### 1. Booking Request (15 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Unauthenticated user | 401 Unauthorized |
| 2 | VET user submits | 403 Forbidden (owners only endpoint) |
| 3 | Valid booking request | 201 Created, appointment ID returned |
| 4 | Missing pet_id | 400 Bad Request |
| 5 | Missing service_id | 400 Bad Request |
| 6 | Pet belongs to other owner | 403 Forbidden |
| 7 | Pet from other tenant | 404 Not Found |
| 8 | Service not active | 400 Service unavailable |
| 9 | Preferred date in past | 400 Invalid date |
| 10 | Preferred date > 90 days out | 400 Date too far |
| 11 | Valid with all optional fields | 201 Created |
| 12 | Request with notes | 201, notes saved |
| 13 | Multiple concurrent requests | Rate limited |
| 14 | Database error during insert | 500 with Spanish error |
| 15 | Successful request triggers notification | Notification created |

### 2. Appointment History (12 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Unauthenticated | 401 |
| 2 | Owner views own appointments | 200, list returned |
| 3 | Filter by status=upcoming | Only future appointments |
| 4 | Filter by status=past | Only completed/cancelled |
| 5 | Pagination (page 1) | Correct count, has_more flag |
| 6 | Pagination (page 2) | Offset applied correctly |
| 7 | Empty result | 200, empty array |
| 8 | Cannot see other owners' appointments | Only own data |
| 9 | Cross-tenant isolation | No leak between tenants |
| 10 | Includes pet details | Pet name, photo populated |
| 11 | Includes service details | Service name, duration |
| 12 | Orders by date descending | Most recent first |

### 3. Cancellation (10 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Unauthenticated | 401 |
| 2 | Cancel pending appointment | 200, status=cancelled |
| 3 | Cancel scheduled appointment | 200, status=cancelled |
| 4 | Cancel checked_in | 400 too late |
| 5 | Cancel completed | 400 already done |
| 6 | Cancel already cancelled | 400 already cancelled |
| 7 | Cancel other owner's | 404 not found |
| 8 | Cancel triggers waitlist | Waitlist notified |
| 9 | Cancel with reason | Reason saved |
| 10 | Cross-tenant attempt | 404 |

### 4. Waitlist (8 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Join waitlist unauthenticated | 401 |
| 2 | Join waitlist valid | 201, position returned |
| 3 | View waitlist position | 200, position shown |
| 4 | Accept waitlist offer | 200, appointment created |
| 5 | Decline waitlist offer | 200, offer expired |
| 6 | Offer expired | 400 offer no longer valid |
| 7 | Already on waitlist | 409 conflict |
| 8 | Waitlist closed | 400 not accepting |

## Acceptance Criteria

- [ ] All 45 test cases implemented and passing
- [ ] Coverage for booking request API >= 90%
- [ ] Coverage for appointment history >= 85%
- [ ] Coverage for cancellation >= 85%
- [ ] Coverage for waitlist >= 80%
- [ ] Tests use consistent `mockState` patterns
- [ ] Tests verify Spanish error messages
- [ ] No hardcoded IDs (use fixtures)
- [ ] Tests run in < 30 seconds total

## Files to Create/Modify

### New Files
- `tests/integration/owner/appointments/booking-request.test.ts`
- `tests/integration/owner/appointments/appointment-history.test.ts`
- `tests/integration/owner/appointments/cancellation.test.ts`
- `tests/integration/owner/appointments/waitlist.test.ts`
- `tests/__fixtures__/owner-appointments.ts`

### Modified Files
- `tests/__fixtures__/index.ts` - export new fixtures
- `tests/integration/appointments/slot-availability.test.ts` - expand owner scenarios

## Verification

```bash
# Run just these tests
npm run test:unit -- tests/integration/owner/appointments

# Verify coverage
npm run test:unit -- --coverage tests/integration/owner/appointments
```

---

**Created**: 2026-01-12
**Status**: Not Started
