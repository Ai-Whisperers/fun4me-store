# TST-003: Owner Profile & Pet Management Tests

## Summary

**Priority**: P0 - Critical
**Effort**: 8-10 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Coverage
**Dependencies**: None

## Problem Statement

Owner profile management and pet CRUD operations are core portal features. While `tests/functionality/portal/pets.test.ts` provides basic coverage, there are gaps in:
- Owner profile updates (own profile editing)
- Pet photo management
- Pet deletion/archival
- Multi-pet scenarios
- Microchip/QR tag management

### Current Coverage

| Feature | Tested | Notes |
|---------|--------|-------|
| Pet registration (basic) | Yes | ~60% coverage |
| Pet profile updates | Yes | ~60% coverage |
| Pet listing/filtering | Yes | Basic tests |
| Owner profile view | No | Missing |
| Owner profile update | No | Missing |
| Pet photo upload | No | Storage integration |
| Pet deletion/archive | No | Soft delete flow |
| QR tag assignment | No | Owner workflow |
| Microchip registration | Partial | Basic validation |

## Scope

### In Scope

1. **Owner Profile API** (`GET/PATCH /api/profile`)
   - View own profile
   - Update name, phone, preferences
   - Cannot view other profiles
   - Change notification preferences

2. **Pet CRUD Enhancements**
   - Pet creation with photo upload
   - Pet update with validation
   - Pet soft delete/archive
   - Pet photo management (upload, delete)

3. **QR Tag Management**
   - Assign QR tag to pet
   - View assigned tags
   - Deactivate tag
   - Transfer tag to another pet

4. **Microchip Management**
   - Register microchip number
   - Update microchip info
   - Microchip format validation

### Out of Scope

- Staff pet management (already covered)
- Pet creation by clinic staff
- Bulk pet operations

## Test Cases (Summary)

### Owner Profile (10 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View own profile unauthenticated | 401 |
| 2 | View own profile | 200, profile data |
| 3 | Update own name | 200, name changed |
| 4 | Update own phone | 200, phone changed |
| 5 | Update notification preferences | 200, preferences saved |
| 6 | Update with invalid phone | 400 validation error |
| 7 | Update with XSS in name | 400 or sanitized |
| 8 | Cannot view other profile | 404 |
| 9 | Cannot update other profile | 404 |
| 10 | Profile includes pet count | Pet count returned |

### Pet Creation (12 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create pet unauthenticated | 401 |
| 2 | Create pet minimal fields | 201, pet created |
| 3 | Create pet all fields | 201, all fields saved |
| 4 | Create with photo upload | 201, photo URL saved |
| 5 | Create with invalid species | 400 |
| 6 | Create with future birth date | 400 |
| 7 | Create with negative weight | 400 |
| 8 | Create with microchip | 201, microchip saved |
| 9 | Create with invalid microchip format | 400 |
| 10 | Create with duplicate microchip | 409 conflict |
| 11 | Rate limit pet creation | 429 after N pets |
| 12 | Create sets owner_id automatically | owner_id = current user |

### Pet Updates (10 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Update own pet | 200 |
| 2 | Update other owner's pet | 404 |
| 3 | Update name | Name changed |
| 4 | Update weight history | Weight tracked |
| 5 | Update photo | New photo URL |
| 6 | Remove photo | Photo URL null |
| 7 | Update medical notes | Notes saved |
| 8 | Update diet info | Diet saved |
| 9 | Cross-tenant pet update | 404 |
| 10 | Partial update (single field) | Only that field changed |

### Pet Deletion (8 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Delete own pet | 200, is_archived = true |
| 2 | Delete other owner's pet | 404 |
| 3 | Delete with appointments | 400 or cascade |
| 4 | Delete with medical records | Records preserved |
| 5 | Undelete/restore pet | 200, is_archived = false |
| 6 | Hard delete not allowed | 405 |
| 7 | Deleted pet hidden from list | Not in default list |
| 8 | Can view archived pets | ?include_archived=true |

### QR Tag Management (8 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Assign QR tag to pet | 200, tag linked |
| 2 | Assign already-used tag | 409 conflict |
| 3 | View pet's tags | 200, tags listed |
| 4 | Deactivate tag | 200, is_active = false |
| 5 | Transfer tag to another pet | 200, pet_id updated |
| 6 | Assign tag to other owner's pet | 404 |
| 7 | Validate tag code format | 400 on invalid |
| 8 | Lost tag workflow trigger | Notification created |

### Photo Management (6 tests)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Upload valid image | 200, URL returned |
| 2 | Upload invalid file type | 400 |
| 3 | Upload too large file | 413 |
| 4 | Delete photo | 200, photo removed |
| 5 | Replace photo | Old deleted, new saved |
| 6 | Multiple photos (gallery) | 200, array returned |

## Technical Approach

### Test Structure

```
tests/
├── integration/
│   └── owner/
│       └── profile/
│           ├── profile-management.test.ts
│           ├── pet-creation.test.ts
│           ├── pet-updates.test.ts
│           ├── pet-deletion.test.ts
│           ├── qr-tags.test.ts
│           └── photos.test.ts
```

## Acceptance Criteria

- [ ] All 54 test cases implemented and passing
- [ ] Owner profile API coverage >= 90%
- [ ] Pet CRUD coverage >= 85%
- [ ] QR tag management coverage >= 80%
- [ ] Photo upload tests mock storage correctly
- [ ] All validation errors return Spanish messages
- [ ] Tests run in < 40 seconds

## Files to Create

- `tests/integration/owner/profile/profile-management.test.ts`
- `tests/integration/owner/profile/pet-creation.test.ts`
- `tests/integration/owner/profile/pet-updates.test.ts`
- `tests/integration/owner/profile/pet-deletion.test.ts`
- `tests/integration/owner/profile/qr-tags.test.ts`
- `tests/integration/owner/profile/photos.test.ts`

---

**Created**: 2026-01-12
**Status**: Not Started
