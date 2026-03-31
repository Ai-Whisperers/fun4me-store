# TST-002: Owner Medical Records Access Tests

## Summary

**Priority**: P0 - Critical
**Effort**: 8-12 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Coverage
**Dependencies**: None

## Problem Statement

Owners need to view their pets' medical records, prescriptions, and lab results. Currently, the medical records tests focus on staff CRUD operations. There are virtually **no tests** for owner read access to their own pets' medical data.

### Current State

| Feature | Tested | Notes |
|---------|--------|-------|
| View medical record list | No | Owner sees own pets' records |
| View single medical record | No | Detail view with attachments |
| Download prescription PDF | No | PDF generation for owner |
| View lab results | Minimal | Only 2 tests touch owner |
| View vaccine history | No | Owner-facing endpoint |
| Export medical summary | No | For sharing with other vets |

### Impact

- Medical record access is a key value proposition for owners
- Prescription viewing required for pharmacy pickups
- Lab result viewing reduces clinic call volume
- Export feature enables second opinions

## Scope

### In Scope

1. **Medical Records List API** (`GET /api/medical-records`)
   - Owner sees only their pets' records
   - Filter by pet, date range, record type
   - Pagination and sorting
   - Cross-pet filtering within ownership

2. **Medical Record Detail API** (`GET /api/medical-records/[id]`)
   - Owner can view their pet's record
   - Cannot view other owners' records
   - Includes attachments, diagnosis codes
   - Links to related prescriptions

3. **Prescription API** (`GET /api/prescriptions`)
   - List prescriptions for own pets
   - Download prescription PDF
   - QR code validation

4. **Lab Results API** (`GET /api/lab/results`)
   - View lab orders for own pets
   - View individual test results
   - See abnormal value flags
   - Download result report

5. **Vaccine History API** (`GET /api/vaccines`)
   - View vaccination history
   - See upcoming due dates
   - Download vaccine certificate

### Out of Scope

- Creating/updating medical records (staff only)
- Approving lab results (staff only)
- Clinical tools (staff only)

## Technical Approach

### Test Structure

```
tests/
├── integration/
│   └── owner/
│       └── medical/
│           ├── medical-records-list.test.ts
│           ├── medical-records-detail.test.ts
│           ├── prescriptions.test.ts
│           ├── lab-results.test.ts
│           └── vaccine-history.test.ts
```

### Test Patterns

```typescript
// Example: medical-records-list.test.ts
describe('GET /api/medical-records (Owner)', () => {
  beforeEach(() => {
    resetAllMocks()
    mockState.setAuthScenario('OWNER')
  })

  describe('Data Scoping', () => {
    it('should only return records for owner\'s pets', async () => {
      mockState.setTableResult('pets', [{ id: OWNER_PET.id, owner_id: OWNER.id }])
      mockState.setTableResult('medical_records', [
        { id: 'rec-1', pet_id: OWNER_PET.id, type: 'consultation' },
        { id: 'rec-2', pet_id: OWNER_PET.id, type: 'surgery' }
      ])

      const response = await GET(createRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.records.length).toBe(2)
      expect(body.records.every(r => r.pet_id === OWNER_PET.id)).toBe(true)
    })

    it('should not include records for other owners\' pets', async () => {
      mockState.setTableResult('pets', [{ id: OWNER_PET.id, owner_id: OWNER.id }])
      // Even if medical_records contains other pets' records,
      // the query should filter them out
      mockState.setTableResult('medical_records', [])

      const response = await GET(createRequest())

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.records).toEqual([])
    })
  })

  describe('Filtering', () => {
    it('should filter by pet_id', async () => {
      mockState.setTableResult('medical_records', [{ id: 'rec-1' }])

      const response = await GET(createRequest({ petId: OWNER_PET.id }))

      expect(response.status).toBe(200)
    })

    it('should filter by record type', async () => {
      mockState.setTableResult('medical_records', [])

      const response = await GET(createRequest({ type: 'consultation' }))

      expect(response.status).toBe(200)
    })

    it('should filter by date range', async () => {
      const response = await GET(createRequest({
        from: '2026-01-01',
        to: '2026-01-31'
      }))

      expect(response.status).toBe(200)
    })
  })
})
```

### Fixtures Required

```typescript
// tests/__fixtures__/owner-medical.ts
export const OWNER_MEDICAL_RECORDS = {
  CONSULTATION: {
    id: 'med-rec-001',
    pet_id: PETS.OWNER_PET.id,
    tenant_id: TENANTS.ADRIS.id,
    type: 'consultation',
    title: 'Consulta de rutina',
    performed_by: USERS.VET.id,
    created_at: '2026-01-05T10:00:00Z'
  },
  SURGERY: {
    id: 'med-rec-002',
    pet_id: PETS.OWNER_PET.id,
    tenant_id: TENANTS.ADRIS.id,
    type: 'surgery',
    title: 'Esterilización',
    performed_by: USERS.VET.id,
    created_at: '2025-06-15T14:00:00Z'
  }
}

export const OWNER_PRESCRIPTIONS = {
  ACTIVE: {
    id: 'rx-001',
    pet_id: PETS.OWNER_PET.id,
    vet_id: USERS.VET.id,
    medications: [{ name: 'Amoxicilina', dosage: '250mg', frequency: '2x/día' }],
    valid_until: futureDate(30),
    signature_url: 'https://storage/signature.png'
  },
  EXPIRED: {
    id: 'rx-002',
    pet_id: PETS.OWNER_PET.id,
    valid_until: pastDate(30)
  }
}
```

## Test Cases (Detailed)

### 1. Medical Records List (12 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Unauthenticated | 401 |
| 2 | Owner views records | 200, own pets' records |
| 3 | Filter by pet_id | Only that pet's records |
| 4 | Filter by type | Only matching types |
| 5 | Filter by date range | Within range only |
| 6 | Pagination page 1 | First N records |
| 7 | Pagination page 2 | Offset applied |
| 8 | Empty result | 200, empty array |
| 9 | Cannot see other owners' | Empty/filtered |
| 10 | Cross-tenant isolation | No data leak |
| 11 | Includes vet name | Performed_by populated |
| 12 | Orders by date desc | Most recent first |

### 2. Medical Record Detail (8 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Unauthenticated | 401 |
| 2 | View own pet's record | 200, full details |
| 3 | View other owner's record | 404 |
| 4 | View non-existent record | 404 |
| 5 | Cross-tenant record | 404 |
| 6 | Includes attachments | File URLs populated |
| 7 | Includes diagnosis codes | Codes and descriptions |
| 8 | Links to prescriptions | Related Rx listed |

### 3. Prescriptions (10 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Unauthenticated | 401 |
| 2 | List own pet prescriptions | 200, Rx list |
| 3 | View single prescription | 200, full details |
| 4 | View other owner's Rx | 404 |
| 5 | Download Rx PDF | 200, application/pdf |
| 6 | Expired Rx download | 200, but marked expired |
| 7 | Rx has medications list | Dosage info included |
| 8 | Rx has vet signature | Signature URL valid |
| 9 | QR code validation | Code matches Rx |
| 10 | Filter active only | Excludes expired |

### 4. Lab Results (10 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Unauthenticated | 401 |
| 2 | List lab orders for pet | 200, orders list |
| 3 | View lab order detail | 200, all tests shown |
| 4 | View other owner's labs | 404 |
| 5 | See test values | Result + reference range |
| 6 | Abnormal flagged | is_abnormal = true shown |
| 7 | Pending results | Status = pending shown |
| 8 | Download report | 200, PDF generated |
| 9 | Filter by date | Date range applied |
| 10 | Filter by status | Completed/pending filter |

### 5. Vaccine History (8 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Unauthenticated | 401 |
| 2 | List vaccines for pet | 200, vaccine list |
| 3 | View other owner's vaccines | 404 |
| 4 | See due dates | Next due date shown |
| 5 | Overdue flagged | is_overdue calculated |
| 6 | Download certificate | 200, PDF |
| 7 | Filter by status | Due/overdue/current |
| 8 | Includes vaccine details | Name, manufacturer, lot |

## Acceptance Criteria

- [ ] All 48 test cases implemented and passing
- [ ] Medical records list coverage >= 85%
- [ ] Medical record detail coverage >= 90%
- [ ] Prescriptions coverage >= 85%
- [ ] Lab results coverage >= 80%
- [ ] Vaccine history coverage >= 85%
- [ ] All tests verify owner cannot see other owners' data
- [ ] PDF download tests verify content-type
- [ ] Tests run in < 45 seconds total

## Files to Create/Modify

### New Files
- `tests/integration/owner/medical/medical-records-list.test.ts`
- `tests/integration/owner/medical/medical-records-detail.test.ts`
- `tests/integration/owner/medical/prescriptions.test.ts`
- `tests/integration/owner/medical/lab-results.test.ts`
- `tests/integration/owner/medical/vaccine-history.test.ts`
- `tests/__fixtures__/owner-medical.ts`

### Modified Files
- `tests/__fixtures__/index.ts` - export new fixtures

## Verification

```bash
# Run medical tests
npm run test:unit -- tests/integration/owner/medical

# Verify coverage
npm run test:unit -- --coverage tests/integration/owner/medical
```

---

**Created**: 2026-01-12
**Status**: Not Started
