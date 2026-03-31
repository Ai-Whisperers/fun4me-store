# P1-002: Fix Appointment Service Tests

## Metadata

| Field | Value |
|-------|-------|
| **ID** | P1-002 |
| **Epic** | [EPIC-P1-01](../EPIC-P1-01-service-mocks.md) |
| **Priority** | P0 - Critical |
| **Estimate** | 4 hours |
| **Status** | Not Started |
| **Depends On** | Phase 0 Complete |
| **Blocks** | P1-006, P1-007, P1-009, P1-013 |

---

## Description

Fix all failing tests in `appointment-service.test.ts`. This service handles scheduling, rescheduling, and cancellation of veterinary appointments.

---

## Current State

- **Failing Tests:** ~30
- **Likely Causes:**
  - Chainable query mock incomplete
  - Schema field renames (clinic_id → tenant_id)
  - Error message changes

---

## Acceptance Criteria

- [ ] All tests in `appointment-service.test.ts` pass
- [ ] No tests skipped
- [ ] Coverage maintained or improved
- [ ] Fix documented with root cause

---

## Implementation Steps

1. **Run test file in isolation**
   ```bash
   npm test -- appointment-service.test.ts --reporter=verbose
   ```

2. **Categorize failures by type**
   - Mock issues
   - Schema drift
   - Logic changes

3. **Fix mocks first** (highest impact)
   - Update to use `createChainableQueryMock()`
   - Add missing RPC mocks

4. **Fix schema issues**
   - Update `clinic_id` → `tenant_id`
   - Add any new required fields

5. **Fix assertion issues**
   - Update expected error messages
   - Update expected return formats

6. **Run full test suite** to verify no regressions

---

## Test Cases to Verify

```typescript
describe('AppointmentService', () => {
  describe('create', () => {
    ✅/❌ 'creates appointment with valid data'
    ✅/❌ 'validates required fields'
    ✅/❌ 'prevents double-booking'
    ✅/❌ 'respects clinic hours'
  });

  describe('reschedule', () => {
    ✅/❌ 'reschedules to new time'
    ✅/❌ 'notifies patient of change'
    ✅/❌ 'validates new slot available'
  });

  describe('cancel', () => {
    ✅/❌ 'cancels with reason'
    ✅/❌ 'frees up slot'
    ✅/❌ 'handles late cancellation'
  });
});
```

---

## Related Files

- `web/tests/services/appointment-service.test.ts`
- `web/lib/services/appointment-service.ts`
- `web/tests/services/__mocks__/supabase-mock.ts`

---

## Notes

This is a critical service - appointments are core to clinic operations. High priority fix.

---

*Created: 2026-02-03*
