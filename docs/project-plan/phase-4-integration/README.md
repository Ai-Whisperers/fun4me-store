# Phase 4: Integration & E2E Testing

> **Duration:** 2 weeks (10 working days)
> **Goal:** Critical user journeys tested end-to-end
> **Entry Criteria:** Phase 3 complete (API & component tests)
> **Exit Criteria:** E2E critical paths pass, RLS verified

---

## 📊 Phase Overview

This phase focuses on integration and end-to-end tests that verify complete user workflows. These tests catch issues that unit tests miss - timing, state management, real database interactions.

---

## 🎯 Objectives

| Objective | Current | Target |
|-----------|---------|--------|
| E2E Critical Paths | ~30% | 100% |
| RLS Policy Coverage | ~50% | 100% |
| Workflow Integration | ~20% | 80% |

---

## 📋 Epics

| Epic | Title | Tickets | Est. Hours |
|------|-------|---------|------------|
| [EPIC-P4-01](./EPIC-P4-01-workflow-integration.md) | Workflow Integration | 10 | 30-40h |
| [EPIC-P4-02](./EPIC-P4-02-e2e-expansion.md) | E2E Test Expansion | 12 | 35-45h |
| [EPIC-P4-03](./EPIC-P4-03-rls-security-tests.md) | RLS & Security Tests | 8 | 24-32h |

**Total Estimated Hours:** 89-117h (~2 weeks)

---

## 📁 Critical User Journeys (E2E)

### Tier 1: Revenue Critical

| Journey | Steps | Priority | Est. |
|---------|-------|----------|------|
| Appointment Booking | Login → Search → Select → Book → Confirm | P0 | 4h |
| Invoice Payment | View → Pay → Receipt | P0 | 4h |
| Prescription Fill | Create → Print → Dispense | P0 | 4h |
| Store Purchase | Browse → Cart → Checkout → Complete | P0 | 5h |

### Tier 2: Core Operations

| Journey | Steps | Priority | Est. |
|---------|-------|----------|------|
| Pet Registration | Create Owner → Add Pet → Medical History | P1 | 3h |
| Medical Record | Create → Update → View History | P1 | 3h |
| Lab Order | Create → Process → Results | P1 | 4h |
| Hospitalization | Admit → Daily Updates → Discharge | P1 | 4h |

### Tier 3: Admin Operations

| Journey | Steps | Priority | Est. |
|---------|-------|----------|------|
| Staff Management | Add → Assign Role → Deactivate | P2 | 3h |
| Inventory Restock | Low Alert → Order → Receive | P2 | 3h |
| Report Generation | Select → Configure → Export | P2 | 3h |
| Settings Update | Navigate → Change → Save | P2 | 2h |

---

## 📝 E2E Test Template

```typescript
// e2e/journeys/appointment-booking.spec.ts

import { test, expect } from '@playwright/test';
import { loginAsOwner, createTestPet } from '../helpers';

test.describe('Appointment Booking Journey', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test('owner can book appointment for their pet', async ({ page }) => {
    // Navigate to booking
    await page.goto('/booking');
    
    // Select pet
    await page.getByRole('combobox', { name: 'Mascota' }).click();
    await page.getByRole('option', { name: 'Max' }).click();
    
    // Select service
    await page.getByRole('combobox', { name: 'Servicio' }).click();
    await page.getByRole('option', { name: 'Consulta General' }).click();
    
    // Select date/time
    await page.getByRole('button', { name: /mañana/i }).click();
    await page.getByRole('button', { name: '10:00' }).click();
    
    // Confirm booking
    await page.getByRole('button', { name: 'Confirmar Cita' }).click();
    
    // Verify confirmation
    await expect(page.getByRole('alert')).toContainText('Cita confirmada');
    await expect(page.getByText('Max')).toBeVisible();
    await expect(page.getByText('10:00')).toBeVisible();
  });

  test('shows error when slot becomes unavailable', async ({ page, context }) => {
    // Setup: Another user books the slot
    const otherPage = await context.newPage();
    await loginAsOwner(otherPage, 'other-owner');
    
    // Both users select same slot
    await page.goto('/booking');
    await otherPage.goto('/booking');
    
    // ... select same date/time
    
    // Other user books first
    await otherPage.getByRole('button', { name: 'Confirmar Cita' }).click();
    
    // This user tries to book
    await page.getByRole('button', { name: 'Confirmar Cita' }).click();
    
    // Should see error
    await expect(page.getByRole('alert')).toContainText('no disponible');
  });

  test('prevents double-booking on rapid clicks', async ({ page }) => {
    await page.goto('/booking');
    // ... fill form
    
    // Rapid double-click
    await page.getByRole('button', { name: 'Confirmar Cita' }).dblclick();
    
    // Should only create one appointment
    await page.goto('/mis-citas');
    const appointments = await page.getByRole('listitem').count();
    expect(appointments).toBe(1);
  });
});
```

---

## 📁 RLS Policy Testing

### Tables Requiring Verification

| Table | Policies | Priority |
|-------|----------|----------|
| appointments | tenant_isolation, owner_access | P0 |
| invoices | tenant_isolation, owner_access | P0 |
| prescriptions | tenant_isolation, vet_required | P0 |
| medical_records | tenant_isolation, access_control | P0 |
| pets | tenant_isolation, owner_access | P1 |
| inventory | tenant_isolation, staff_only | P1 |
| users | tenant_isolation, self_access | P1 |

### RLS Test Template

```typescript
// tests/database/rls-appointments.test.ts

describe('appointments RLS policies', () => {
  describe('tenant isolation', () => {
    it('user A cannot read tenant B appointments', async () => {
      const client = createClientForTenant('tenant-a');
      const { data } = await client
        .from('appointments')
        .select()
        .eq('tenant_id', 'tenant-b');
      
      expect(data).toEqual([]);
    });

    it('user A cannot insert into tenant B', async () => {
      const client = createClientForTenant('tenant-a');
      const { error } = await client
        .from('appointments')
        .insert({ tenant_id: 'tenant-b', ...validData });
      
      expect(error?.code).toBe('42501'); // RLS violation
    });
  });

  describe('owner access', () => {
    it('owner can only see their appointments', async () => {
      const client = createClientForOwner('owner-1');
      const { data } = await client.from('appointments').select();
      
      data?.forEach(apt => {
        expect(apt.owner_id).toBe('owner-1');
      });
    });
  });

  describe('staff access', () => {
    it('staff can see all tenant appointments', async () => {
      const client = createClientForStaff('staff-1', 'tenant-a');
      const { data } = await client.from('appointments').select();
      
      expect(data?.length).toBeGreaterThan(0);
    });
  });
});
```

---

## 📈 Progress

```
EPIC-P4-01 (Workflows):  ░░░░░░░░░░ 0%
EPIC-P4-02 (E2E):        ░░░░░░░░░░ 0%
EPIC-P4-03 (RLS):        ░░░░░░░░░░ 0%
```

---

## 🔧 Test Environment

### E2E Setup

```bash
# Start test database with seed data
npm run db:test:reset

# Start app in test mode
npm run dev:test

# Run E2E tests
npm run test:e2e
```

### Test Users

| Role | Email | Password | Tenant |
|------|-------|----------|--------|
| Admin | admin@test.com | test123 | demo-clinic |
| Vet | vet@test.com | test123 | demo-clinic |
| Receptionist | reception@test.com | test123 | demo-clinic |
| Owner | owner@test.com | test123 | demo-clinic |

---

## 📊 Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| E2E journey tests | `e2e/journeys/*.spec.ts` | Pending |
| RLS tests | `tests/database/rls-*.test.ts` | Pending |
| Integration tests | `tests/integration/*.test.ts` | Pending |
| Test seed data | `db/seeds/test-data.sql` | Pending |

---

*Created: 2026-02-03 | Owner: AI Agent*
