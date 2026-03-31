# TST-011: Owner Portal E2E Journey Tests

## Summary

**Priority**: P1 - High
**Effort**: 10-14 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Integration/E2E Testing
**Dependencies**: TST-001, TST-002, TST-003

## Problem Statement

The owner portal is the primary interface for 80%+ of users but has no complete journey tests. Individual API tests exist but don't validate the full user experience from registration through daily usage.

## Journeys to Test

### Journey 1: New User Onboarding (8 tests)

```
Register → Verify Email → Complete Profile → Add First Pet → Book First Appointment
```

| Step | Test | Validation |
|------|------|------------|
| 1 | User registers with email | Account created, verification sent |
| 2 | User clicks verification link | Email verified, can login |
| 3 | User completes profile | Profile saved, preferences set |
| 4 | User adds first pet | Pet created with photo |
| 5 | User browses services | Services displayed for clinic |
| 6 | User submits booking request | Request created, confirmation shown |
| 7 | Clinic schedules appointment | User notified, can view |
| 8 | User checks appointment status | Correct status displayed |

### Journey 2: Medical Records Access (6 tests)

```
Login → Select Pet → View Records → Download Prescription → View Lab Results
```

| Step | Test | Validation |
|------|------|------------|
| 1 | User logs in | Session established |
| 2 | User views pet list | Only own pets shown |
| 3 | User selects pet | Pet details correct |
| 4 | User views medical history | Records chronological |
| 5 | User downloads prescription PDF | Valid PDF, correct content |
| 6 | User views lab results | Results with reference ranges |

### Journey 3: Store Purchase Flow (10 tests)

```
Browse → Add to Cart → Apply Coupon → Checkout → Track Order
```

| Step | Test | Validation |
|------|------|------------|
| 1 | User browses store | Products displayed |
| 2 | User filters by category | Correct filtering |
| 3 | User adds item to cart | Cart updated, stock reserved |
| 4 | User views cart | Correct items and prices |
| 5 | User applies coupon | Discount calculated |
| 6 | User proceeds to checkout | Order summary correct |
| 7 | User completes payment | Order created, payment recorded |
| 8 | User views order confirmation | Correct details |
| 9 | User tracks order | Status updates shown |
| 10 | User receives order | Status marked delivered |

### Journey 4: Appointment Lifecycle (8 tests)

```
Book → Receive Reminder → Check-in → Complete → View Record → Leave Review
```

| Step | Test | Validation |
|------|------|------------|
| 1 | User submits booking request | Request pending |
| 2 | Clinic schedules appointment | User notified |
| 3 | User receives reminder | 24h before |
| 4 | User arrives, checks in | Status updated |
| 5 | Appointment completed | Record created |
| 6 | User views visit summary | Details correct |
| 7 | User receives follow-up | Reminder for vaccine |
| 8 | User leaves review | Review saved |

### Journey 5: Multi-Pet Management (6 tests)

```
Add Pet → Transfer Pet → Share Pet Profile → Delete Pet
```

| Step | Test | Validation |
|------|------|------------|
| 1 | User adds second pet | Both pets visible |
| 2 | User switches between pets | Correct data shown |
| 3 | User generates share link | Link works, limited access |
| 4 | User exports pet data | Complete history exported |
| 5 | User requests pet transfer | Transfer request created |
| 6 | User deletes pet (soft) | Pet archived, not shown |

### Journey 6: Messaging Flow (5 tests)

```
Start Conversation → Send Message → Attach Image → Receive Reply → Close
```

| Step | Test | Validation |
|------|------|------------|
| 1 | User starts conversation | Conversation created |
| 2 | User sends message | Message delivered |
| 3 | User attaches image | Image uploaded, linked |
| 4 | Clinic replies | User notified, can view |
| 5 | User closes conversation | Status updated |

## Test Implementation

### Playwright E2E Structure

```typescript
// tests/e2e/owner-portal/onboarding.spec.ts
import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser } from '../helpers/user';

test.describe('Owner Onboarding Journey', () => {
  let testUser: { email: string; password: string };

  test.beforeAll(async () => {
    testUser = await createTestUser();
  });

  test.afterAll(async () => {
    await deleteTestUser(testUser.email);
  });

  test('complete onboarding flow', async ({ page }) => {
    // Step 1: Register
    await page.goto('/adris/auth/signup');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page.locator('.success-message')).toBeVisible();

    // Step 2-8: Continue journey...
  });
});
```

### Database Seeding

```typescript
// tests/e2e/helpers/seed.ts
export async function seedOwnerPortalData(tenantId: string) {
  // Create owner with pets
  const owner = await createOwner(tenantId);
  const pets = await createPetsForOwner(owner.id, 2);

  // Create medical history
  await createVaccineRecords(pets[0].id, 3);
  await createMedicalRecords(pets[0].id, 5);

  // Create appointments
  await createAppointmentHistory(owner.id, pets[0].id, 3);

  // Create orders
  await createOrderHistory(owner.id, 2);

  return { owner, pets };
}
```

## Test Environment

### Requirements

- Dedicated test tenant: `test-clinic`
- Isolated test database (or transaction rollback)
- Mock payment provider
- Mock email service (capture emails)
- Mock SMS/WhatsApp service

### Configuration

```env
# .env.test
TEST_TENANT_ID=test-clinic
TEST_BASE_URL=http://localhost:3000/test-clinic
MOCK_PAYMENTS=true
MOCK_NOTIFICATIONS=true
```

## Acceptance Criteria

- [ ] 43 E2E journey tests implemented
- [ ] All 6 journeys covered
- [ ] Tests run in < 5 minutes
- [ ] Tests isolated (no cross-contamination)
- [ ] CI/CD integration with Playwright
- [ ] Visual regression baseline captured
- [ ] Mobile viewport tests included

## Success Metrics

| Metric | Target |
|--------|--------|
| Journey test count | 43 |
| Average journey time | < 30s |
| Flakiness rate | < 2% |
| CI runtime | < 5 min |

---

**Created**: 2026-01-12
**Status**: Not Started
