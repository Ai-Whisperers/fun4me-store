# P2-001: Payment Service Coverage

## Metadata

| Field | Value |
|-------|-------|
| **ID** | P2-001 |
| **Epic** | [EPIC-P2-01](../EPIC-P2-01-service-coverage.md) |
| **Priority** | P0 - Critical |
| **Estimate** | 8 hours |
| **Status** | Not Started |
| **Depends On** | Phase 1 Complete |
| **Blocks** | None |

---

## Description

Expand test coverage for `payment-service.ts` from ~20% to 90%. This service handles all financial transactions - payments, refunds, payment methods.

---

## Current State

- **Current Coverage:** ~20%
- **Covered:** Basic payment recording
- **Missing:** Refunds, failures, reconciliation, edge cases

---

## Coverage Target: 90%

### Functions to Cover

| Function | Current | Target | Priority |
|----------|---------|--------|----------|
| `recordPayment()` | Partial | Full | P0 |
| `processRefund()` | 0% | 100% | P0 |
| `validatePayment()` | 0% | 100% | P0 |
| `getPaymentMethods()` | 0% | 100% | P1 |
| `addPaymentMethod()` | 0% | 100% | P1 |
| `removePaymentMethod()` | 0% | 100% | P1 |
| `reconcilePayments()` | 0% | 100% | P2 |
| `getPaymentHistory()` | 0% | 100% | P2 |

---

## Acceptance Criteria

- [ ] Coverage reaches 90%
- [ ] All critical paths tested (payments, refunds)
- [ ] Error scenarios covered
- [ ] Edge cases documented and tested

---

## Test Cases to Add

```typescript
describe('PaymentService', () => {
  describe('recordPayment', () => {
    it('records full payment', async () => {});
    it('records partial payment', async () => {});
    it('rejects negative amount', async () => {});
    it('rejects amount exceeding balance', async () => {});
    it('updates invoice status to paid', async () => {});
    it('handles concurrent payments atomically', async () => {});
    it('logs payment for audit trail', async () => {});
  });

  describe('processRefund', () => {
    it('processes full refund', async () => {});
    it('processes partial refund', async () => {});
    it('rejects refund exceeding payment', async () => {});
    it('updates invoice status', async () => {});
    it('requires reason for refund', async () => {});
    it('notifies customer of refund', async () => {});
  });

  describe('validatePayment', () => {
    it('validates credit card format', async () => {});
    it('validates expiry date', async () => {});
    it('validates CVV', async () => {});
    it('rejects expired cards', async () => {});
  });

  describe('getPaymentMethods', () => {
    it('returns customer payment methods', async () => {});
    it('masks sensitive data', async () => {});
    it('filters by tenant', async () => {});
  });

  describe('reconcilePayments', () => {
    it('matches payments to invoices', async () => {});
    it('identifies discrepancies', async () => {});
    it('generates reconciliation report', async () => {});
  });

  describe('error handling', () => {
    it('handles payment gateway timeout', async () => {});
    it('handles insufficient funds', async () => {});
    it('handles card declined', async () => {});
    it('retries on transient failures', async () => {});
  });

  describe('security', () => {
    it('enforces tenant isolation', async () => {});
    it('requires authentication', async () => {});
    it('logs sensitive operations', async () => {});
  });
});
```

---

## Implementation Steps

1. **Analyze current tests**
   - What's covered?
   - What patterns are used?

2. **Identify uncovered functions**
   - Run coverage report
   - List uncovered lines/branches

3. **Write tests in priority order**
   - P0: recordPayment, processRefund, validatePayment
   - P1: Payment method management
   - P2: Reconciliation, history

4. **Follow TDD for any code changes**
   - Write test first
   - If test reveals bug, fix it
   - Document any behavioral changes

5. **Verify coverage target met**
   ```bash
   npm test -- payment-service.test.ts --coverage
   ```

---

## Related Files

- `web/lib/services/payment-service.ts`
- `web/tests/services/payment-service.test.ts`
- `web/app/actions/invoices/payment.ts`

---

## Notes

Payment handling is security-critical. All tests should verify:
- Tenant isolation (can't pay other clinic's invoices)
- Amount validation (no negative, no overflow)
- Audit logging (all transactions logged)

---

*Created: 2026-02-03*
