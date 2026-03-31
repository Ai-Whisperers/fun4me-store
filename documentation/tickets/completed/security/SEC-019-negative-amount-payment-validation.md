# SEC-019 Missing Negative Amount Validation in Financial Endpoints

## Priority: P0

## Category: Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

Multiple financial API endpoints validate that `amount` is a number but don't validate it's positive. This allows attackers to submit negative amounts, potentially:
- Recording negative payments (credits)
- Creating negative refunds (charges)
- Manipulating invoice balances

### Vulnerable Endpoints

**1. `web/app/api/invoices/[id]/payments/route.ts`** (Line 20):
```typescript
// Basic validation before calling RPC
if (!amount || typeof amount !== 'number') {
  return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
    details: { field: 'amount' },
  })
}
// MISSING: Validation that amount > 0
```

**2. `web/app/api/invoices/[id]/refund/route.ts`** (Lines 20-28):
```typescript
if (!amount || typeof amount !== 'number') {
  return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, { field: 'amount' })
}
// MISSING: A negative "refund" is actually a charge
```

**3. Other potential locations** to audit:
- `web/app/api/billing/confirm-transfer/route.ts`
- `web/app/api/billing/pay-invoice/route.ts`
- Any endpoint accepting monetary amounts

### Attack Scenario

1. Invoice for ₲100,000 is created
2. Attacker submits payment with `amount: -50000`
3. If processed, invoice now shows ₲150,000 owed instead of ₲50,000 remaining
4. Or worse - the RPC function might not handle it and create accounting chaos

## Impact

**Security Risk (Critical)**:
- Financial data manipulation
- Fraudulent accounting entries
- Potential for embezzlement schemes
- Breaks billing integrity

**Financial Risk**: Direct monetary impact through fraudulent transactions

## Proposed Fix

### Option A: Add validation at API level

```typescript
// web/app/api/invoices/[id]/payments/route.ts
if (!amount || typeof amount !== 'number' || amount <= 0) {
  return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
    details: { field: 'amount', message: 'Amount must be positive' },
  })
}
```

### Option B: Create centralized monetary validation

```typescript
// web/lib/validation/monetary.ts
import { z } from 'zod'

export const positiveAmountSchema = z.number()
  .positive('Amount must be positive')
  .finite('Amount must be finite')
  .max(999999999, 'Amount exceeds maximum') // ~1B guaraníes limit

// Usage:
const validation = positiveAmountSchema.safeParse(body.amount)
if (!validation.success) {
  return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
    details: { field: 'amount', message: validation.error.issues[0].message },
  })
}
```

### Option C: Defense in depth - RPC function validation

Also ensure the RPC function `record_invoice_payment` validates:
```sql
-- In the RPC function
IF p_amount <= 0 THEN
  RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
END IF;
```

## Acceptance Criteria

- [x] All payment endpoints validate `amount > 0`
- [x] All refund endpoints validate `amount > 0`
- [x] Bank transfer confirmation validates `amount > 0` (already existed at line 91)
- [ ] RPC functions also validate as defense-in-depth (deferred - DB layer)
- [x] Add `// SEC-019: Validate positive amount` comments
- [x] Test with negative amounts (should return 400)
- [x] Test with zero amounts (should return 400)
- [x] Test with valid positive amounts (should work)

## Related Files

- `web/app/api/invoices/[id]/payments/route.ts`
- `web/app/api/invoices/[id]/refund/route.ts`
- `web/app/api/billing/confirm-transfer/route.ts`
- `web/app/api/billing/pay-invoice/route.ts`
- `web/db/` - RPC functions for payments

## Estimated Effort

1-2 hours

## Testing Notes

1. POST to `/api/invoices/[id]/payments` with `{"amount": -1000}`
   - Expected: 400 error
2. POST to `/api/invoices/[id]/payments` with `{"amount": 0}`
   - Expected: 400 error
3. POST to `/api/invoices/[id]/payments` with `{"amount": 1000}`
   - Expected: 201 success
4. Same tests for refund endpoint
5. Verify database has no negative payment records

## Security Severity

**CRITICAL** - Financial manipulation vulnerability with direct monetary impact.
