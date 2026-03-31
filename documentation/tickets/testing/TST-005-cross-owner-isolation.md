# TST-005: Cross-Owner Data Isolation Tests

## Summary

**Priority**: P0 - Critical
**Effort**: 6-8 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Security Testing
**Dependencies**: None

## Problem Statement

While `tenant-isolation.test.ts` verifies cross-tenant isolation, there are **no tests** verifying that one owner cannot access another owner's data **within the same tenant**.

### Risk Scenario

Owner A and Owner B both belong to clinic "Adris":
- Owner A should only see their pets
- Owner A should NOT see Owner B's pets, appointments, medical records
- Even if Owner A guesses Owner B's pet ID, access should be denied

### Current State

| Scenario | Tested |
|----------|--------|
| Cross-tenant isolation | Yes (32 tests) |
| Cross-owner (same tenant) isolation | No |
| Pet access by other owner | No |
| Appointment access by other owner | No |
| Medical records by other owner | No |
| Prescriptions by other owner | No |
| Invoices by other owner | No |

## Scope

### In Scope

1. **Pet Isolation**
   - Owner A cannot view Owner B's pets
   - Owner A cannot update Owner B's pets
   - Owner A cannot delete Owner B's pets

2. **Appointment Isolation**
   - Owner A cannot view Owner B's appointments
   - Owner A cannot cancel Owner B's appointments
   - Owner A cannot book for Owner B's pets

3. **Medical Record Isolation**
   - Owner A cannot view Owner B's pet records
   - Owner A cannot download Owner B's prescriptions
   - Owner A cannot view Owner B's lab results

4. **Financial Isolation**
   - Owner A cannot view Owner B's invoices
   - Owner A cannot view Owner B's payment history

5. **Messaging Isolation**
   - Owner A cannot view Owner B's conversations
   - Owner A cannot send messages as Owner B

### Out of Scope

- Staff access patterns (tested elsewhere)
- Cross-tenant (already covered)

## Technical Approach

### Fixtures Setup

```typescript
// tests/__fixtures__/multi-owner.ts
export const OWNER_A = {
  id: 'owner-a-001',
  email: 'owner.a@test.local',
  tenant_id: 'adris'
}

export const OWNER_B = {
  id: 'owner-b-002',
  email: 'owner.b@test.local',
  tenant_id: 'adris' // SAME tenant as Owner A
}

export const OWNER_A_PET = {
  id: 'pet-owner-a-001',
  owner_id: OWNER_A.id,
  tenant_id: 'adris',
  name: 'Max'
}

export const OWNER_B_PET = {
  id: 'pet-owner-b-001',
  owner_id: OWNER_B.id,
  tenant_id: 'adris',
  name: 'Luna'
}
```

### Test Pattern

```typescript
describe('Cross-Owner Isolation', () => {
  beforeEach(() => {
    resetAllMocks()
    // Set current user as Owner A
    mockState.setUser({ id: OWNER_A.id, email: OWNER_A.email })
    mockState.setProfile({
      id: OWNER_A.id,
      tenant_id: 'adris',
      role: 'owner'
    })
  })

  describe('Pet Isolation', () => {
    it('Owner A cannot view Owner B\'s pet', async () => {
      // Mock: when querying for OWNER_B_PET, return null (not found for this owner)
      mockState.setTableResult('pets', null)

      const response = await GET_PET(createRequest({ petId: OWNER_B_PET.id }))

      expect(response.status).toBe(404)
    })

    it('Owner A cannot update Owner B\'s pet', async () => {
      mockState.setTableResult('pets', null)

      const response = await PUT_PET(createRequest({
        petId: OWNER_B_PET.id,
        body: { name: 'Hacked Name' }
      }))

      expect(response.status).toBe(404)
    })

    it('Owner A cannot delete Owner B\'s pet', async () => {
      mockState.setTableResult('pets', null)

      const response = await DELETE_PET(createRequest({ petId: OWNER_B_PET.id }))

      expect(response.status).toBe(404)
    })
  })

  describe('Appointment Isolation', () => {
    it('Owner A cannot view Owner B\'s appointment', async () => {
      mockState.setTableResult('appointments', null)

      const response = await GET(createRequest({ appointmentId: OWNER_B_APPOINTMENT.id }))

      expect(response.status).toBe(404)
    })

    it('Owner A cannot cancel Owner B\'s appointment', async () => {
      mockState.setTableResult('appointments', null)

      const response = await DELETE(createRequest({ appointmentId: OWNER_B_APPOINTMENT.id }))

      expect(response.status).toBe(404)
    })

    it('Owner A cannot book appointment for Owner B\'s pet', async () => {
      // Pet ownership check should fail
      mockState.setTableResult('pets', null)

      const response = await POST(createRequest({
        petId: OWNER_B_PET.id,
        serviceId: 'service-001'
      }))

      expect(response.status).toBe(403) // Forbidden - not your pet
    })
  })
})
```

## Test Cases (Complete)

### 1. Pet Isolation (8 tests)

| # | Test Case | Action | Expected |
|---|-----------|--------|----------|
| 1 | View other owner's pet | GET /api/pets/[id] | 404 |
| 2 | Update other owner's pet | PUT /api/pets/[id] | 404 |
| 3 | Delete other owner's pet | DELETE /api/pets/[id] | 404 |
| 4 | List pets - only own | GET /api/pets | Only own pets |
| 5 | Search pets - only own | GET /api/pets?search=X | Only own pets |
| 6 | Add photo to other's pet | POST /api/pets/[id]/photo | 404 |
| 7 | Assign QR to other's pet | POST /api/qr-tags/assign | 403 |
| 8 | Transfer pet to self | POST /api/pets/[id]/transfer | 403 |

### 2. Appointment Isolation (6 tests)

| # | Test Case | Action | Expected |
|---|-----------|--------|----------|
| 1 | View other's appointment | GET /api/appointments/[id] | 404 |
| 2 | Cancel other's appointment | DELETE /api/appointments/[id] | 404 |
| 3 | Book for other's pet | POST /api/appointments/request | 403 |
| 4 | List appointments - only own | GET /api/appointments | Only own |
| 5 | Join waitlist for other's pet | POST /api/waitlist | 403 |
| 6 | Accept waitlist for other's pet | POST /api/waitlist/[id]/accept | 404 |

### 3. Medical Record Isolation (8 tests)

| # | Test Case | Action | Expected |
|---|-----------|--------|----------|
| 1 | View other's records | GET /api/medical-records/[id] | 404 |
| 2 | List other's records | GET /api/medical-records?pet_id=X | Empty |
| 3 | Download other's prescription | GET /api/prescriptions/[id]/pdf | 404 |
| 4 | View other's lab results | GET /api/lab/orders/[id] | 404 |
| 5 | View other's vaccines | GET /api/vaccines?pet_id=X | Empty |
| 6 | Download vaccine cert for other | GET /api/vaccines/certificate | 404 |
| 7 | View other's growth chart | GET /api/growth/[pet_id] | 404 |
| 8 | Report reaction for other's pet | POST /api/vaccine-reactions | 403 |

### 4. Financial Isolation (6 tests)

| # | Test Case | Action | Expected |
|---|-----------|--------|----------|
| 1 | View other's invoice | GET /api/invoices/[id] | 404 |
| 2 | List other's invoices | GET /api/invoices?client_id=X | Empty |
| 3 | View other's payments | GET /api/payments?client_id=X | Empty |
| 4 | View other's loyalty points | GET /api/loyalty/[user_id] | 403 |
| 5 | Download other's invoice PDF | GET /api/invoices/[id]/pdf | 404 |
| 6 | View other's order history | GET /api/store/orders | Only own |

### 5. Messaging Isolation (5 tests)

| # | Test Case | Action | Expected |
|---|-----------|--------|----------|
| 1 | View other's conversations | GET /api/messages/conversations | Only own |
| 2 | View other's conversation detail | GET /api/messages/[conv_id] | 404 |
| 3 | Send message in other's conv | POST /api/messages | 403 |
| 4 | View other's notifications | GET /api/notifications | Only own |
| 5 | Mark other's notification read | PUT /api/notifications/[id] | 404 |

### 6. Store Isolation (4 tests)

| # | Test Case | Action | Expected |
|---|-----------|--------|----------|
| 1 | View other's cart | GET /api/store/cart?user_id=X | Only own |
| 2 | View other's wishlist | GET /api/store/wishlist | Only own |
| 3 | View other's order | GET /api/store/orders/[id] | 404 |
| 4 | Track other's order | GET /api/store/orders/[id]/track | 404 |

## Acceptance Criteria

- [ ] All 37 cross-owner isolation tests implemented
- [ ] Tests use two owner fixtures (Owner A, Owner B)
- [ ] Both owners in same tenant (adris)
- [ ] All tests verify 404 or 403 appropriately
- [ ] No data leakage in list endpoints
- [ ] Tests document expected RLS behavior
- [ ] Tests run in < 25 seconds

## Files to Create

- `tests/__fixtures__/multi-owner.ts`
- `tests/security/cross-owner-isolation.test.ts`
- `tests/security/cross-owner-pets.test.ts`
- `tests/security/cross-owner-appointments.test.ts`
- `tests/security/cross-owner-medical.test.ts`

---

**Created**: 2026-01-12
**Status**: Not Started
