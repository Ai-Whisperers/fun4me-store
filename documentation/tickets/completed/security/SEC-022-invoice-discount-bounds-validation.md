# SEC-022 Missing Discount Percentage Bounds Validation

## Priority: P1

## Category: Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

Invoice line item discount percentages are not validated for bounds. A discount greater than 100% creates negative line totals, which could manipulate invoice calculations.

### Vulnerable Code

**`web/app/api/invoices/route.ts`** (Lines 154-158):
```typescript
let subtotal = 0
const processedItems = items.map((item: InvoiceItem) => {
  const discount = item.discount_percent || 0
  // VULNERABLE: No validation that discount is 0-100
  const lineTotal = roundCurrency(item.quantity * item.unit_price * (1 - discount / 100))
  subtotal += lineTotal
  return { ...item, line_total: lineTotal }
})
```

### Attack Scenario

1. Create invoice with item: `quantity: 1, unit_price: 100000, discount_percent: 200`
2. Calculation: `100000 * (1 - 200/100) = 100000 * -1 = -100000`
3. Line total is -₲100,000
4. Combined with legitimate items, could zero out or reduce invoice total
5. Client pays nothing or receives credit

## Impact

**Security Risk (High)**:
- Invoice total manipulation
- Financial fraud through over-discounting
- Accounting system corruption
- Negative balances in AR

## Proposed Fix

```typescript
// web/app/api/invoices/route.ts
const processedItems = items.map((item: InvoiceItem) => {
  const discount = item.discount_percent || 0

  // SEC-022: Validate discount percentage bounds
  if (discount < 0 || discount > 100) {
    throw new ValidationError('Discount must be between 0 and 100%')
  }

  const lineTotal = roundCurrency(item.quantity * item.unit_price * (1 - discount / 100))
  subtotal += lineTotal
  return { ...item, line_total: lineTotal }
})
```

Or use Zod schema:

```typescript
const invoiceItemSchema = z.object({
  // ...
  discount_percent: z.number().min(0).max(100).optional().default(0),
  // ...
})
```

## Acceptance Criteria

- [x] Validate `discount_percent` is between 0-100
- [x] Return 400 error for out-of-bounds discounts
- [x] Add `// SEC-022: Validate discount bounds` comment
- [x] Test with discount > 100 (should fail)
- [x] Test with negative discount (should fail)
- [x] Test with valid discounts 0-100 (should work)

## Related Files

- `web/app/api/invoices/route.ts`
- Any other endpoints that accept discount percentages

## Estimated Effort

30 minutes

## Testing Notes

1. POST invoice with `discount_percent: 150` - should fail
2. POST invoice with `discount_percent: -10` - should fail
3. POST invoice with `discount_percent: 50` - should succeed
4. Verify no invoices in DB have discount_percent outside 0-100
