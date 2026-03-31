# E2E Test Gap Analysis

Review Playwright E2E tests and compare against critical user journeys.

## Critical User Flows

### Pet Owner Journey
1. Registration → Email verification → Login
2. Add pet profile with photo
3. View pet medical history
4. Book appointment
5. View and pay invoice
6. Purchase from store (with prescription upload if needed)

### Veterinarian Journey
1. Login → Dashboard
2. View today's appointments
3. Start consultation → Create medical record
4. Prescribe medication → Generate PDF
5. Complete appointment
6. Hospitalize patient → Daily rounds

### Admin Journey
1. Login → Admin dashboard
2. Manage staff (invite, roles)
3. View financial reports
4. Process refund
5. Approve prescription orders
6. Review pending products

## Analysis Steps

1. List existing E2E tests: `ls web/tests/e2e/`
2. Map tests to user flows above
3. Identify missing flows
4. Check for flaky tests (failures in CI)

## Create Missing Tests

For missing flows, create Playwright tests:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Pet Owner - Book Appointment', () => {
  test('should complete booking flow', async ({ page }) => {
    await page.goto('/adris/login')
    // ... test steps
  })
})
```

## Output

Update `docs/testing/E2E-COVERAGE.md` with flow status.
