# EPIC-P4-01: E2E Critical Path Tests

> **Epic Owner:** AI Agent
> **Duration:** 5-7 days
> **Priority:** P1 - High
> **Status:** Not Started
> **Depends On:** Phase 3 Complete

---

## 📋 Summary

Create comprehensive E2E tests for critical user journeys. These tests verify the entire application stack works together for real user workflows.

---

## 🎯 Goals

1. **Cover** all revenue-critical user journeys
2. **Test** complete workflows from login to completion
3. **Verify** data persists correctly across steps
4. **Catch** integration issues between components

---

## 📊 Critical Journeys

### Tier 1: Revenue Critical (Must Pass 100%)

| Journey | Steps | Current | Target |
|---------|-------|---------|--------|
| Appointment Booking | Login → Search → Book → Confirm | ~30% | 100% |
| Invoice Payment | View → Pay → Receipt | ~20% | 100% |
| Store Purchase | Browse → Cart → Checkout | ~25% | 100% |
| Prescription Fill | Create → Verify → Print | ~10% | 100% |

### Tier 2: Core Operations (Must Pass 90%+)

| Journey | Steps | Current | Target |
|---------|-------|---------|--------|
| Pet Registration | Create Owner → Add Pet → History | ~40% | 90% |
| Medical Record | Create → Update → View | ~30% | 90% |
| Lab Order | Order → Process → Results | ~20% | 90% |
| Hospitalization | Admit → Update → Discharge | ~15% | 90% |

### Tier 3: Admin Operations (Must Pass 80%+)

| Journey | Steps | Current | Target |
|---------|-------|---------|--------|
| Staff Management | Add → Assign → Modify | ~50% | 80% |
| Inventory Restock | Alert → Order → Receive | ~20% | 80% |
| Report Generation | Select → Configure → Export | ~30% | 80% |

---

## 📝 Tickets

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

**Total Estimated: 50 hours**

---

## 🔧 E2E Test Structure

```typescript
// e2e/journeys/appointment-booking.spec.ts

import { test, expect } from '@playwright/test';
import { loginAs, createTestData, cleanupTestData } from '../helpers';

test.describe('Appointment Booking Journey', () => {
  let testData: TestData;

  test.beforeAll(async () => {
    testData = await createTestData({
      owner: true,
      pet: true,
      vet: true,
      services: true
    });
  });

  test.afterAll(async () => {
    await cleanupTestData(testData);
  });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'owner', testData.owner.email);
  });

  test('owner books appointment for pet', async ({ page }) => {
    // Navigate to booking
    await page.goto('/portal/booking');
    await expect(page.getByRole('heading', { name: 'Agendar Cita' })).toBeVisible();

    // Select pet
    await page.getByLabel('Mascota').click();
    await page.getByRole('option', { name: testData.pet.name }).click();

    // Select service
    await page.getByLabel('Servicio').click();
    await page.getByRole('option', { name: 'Consulta General' }).click();

    // Select date
    await page.getByRole('button', { name: /mañana/i }).click();

    // Select time slot
    await page.getByRole('button', { name: '10:00' }).click();

    // Confirm
    await page.getByRole('button', { name: 'Confirmar Cita' }).click();

    // Verify confirmation
    await expect(page.getByRole('alert')).toContainText('Cita confirmada');
    await expect(page.getByText(testData.pet.name)).toBeVisible();
  });

  test('prevents double-booking same slot', async ({ page, context }) => {
    // First user books slot
    await page.goto('/portal/booking');
    // ... book 10:00 slot

    // Second user (different tab) tries same slot
    const page2 = await context.newPage();
    await loginAs(page2, 'owner', 'other-owner@test.com');
    await page2.goto('/portal/booking');
    // ... try to book 10:00 slot

    // Should show error
    await expect(page2.getByRole('alert')).toContainText('no disponible');
  });

  test('handles network failure gracefully', async ({ page }) => {
    await page.goto('/portal/booking');
    // Fill form...

    // Simulate network failure
    await page.route('**/api/appointments', route => route.abort());

    await page.getByRole('button', { name: 'Confirmar' }).click();

    // Should show error with retry option
    await expect(page.getByText('Error de conexión')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
```

---

## 📊 Test Data Management

```typescript
// e2e/helpers/test-data.ts

export interface TestData {
  tenant: { id: string; slug: string };
  owner: { id: string; email: string };
  pet: { id: string; name: string };
  vet: { id: string; name: string };
  // ...
}

export async function createTestData(options: CreateOptions): Promise<TestData> {
  // Create isolated test data via API or direct DB
}

export async function cleanupTestData(data: TestData): Promise<void> {
  // Remove all test data after tests complete
}
```

---

## ✅ Acceptance Criteria

- [ ] All Tier 1 journeys pass 100%
- [ ] All Tier 2 journeys pass 90%+
- [ ] All Tier 3 journeys pass 80%+
- [ ] Tests run in CI pipeline
- [ ] Test data properly isolated
- [ ] No flaky tests

---

*Last Updated: 2026-02-03*
