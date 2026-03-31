# BUG-002: Fix Floating Point Currency Math

**Category**: Bug  
**Priority**: P1 - High  
**Status**: Open  
**Effort**: 1 week (includes migration)  
**Impact**: High - Financial accuracy  
**Created**: 2025-01-19  
**Source**: critique/02-code-quality-roast.md (QUAL-004)

## Summary

Currency calculations use JavaScript floating point arithmetic, causing rounding errors that accumulate over transactions.

## Problem

**Current implementation:**
```typescript
// app/actions/invoices.ts
const lineTotal = roundCurrency(
  item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100)
);
subtotal += lineTotal;
subtotal = roundCurrency(subtotal);  // Rounding AGAIN
```

**The Issue:**
```javascript
0.1 + 0.2 === 0.30000000000000004  // true in JavaScript!
```

Pennies disappear on every transaction. Auditors will have questions.

## Solution

**Option 1: Use Integers (Cents/Centavos)** - RECOMMENDED

```typescript
// Store prices as integers (centavos)
interface PriceInCentavos {
  amount: number;  // e.g., 1500000 = 15,000.00 PYG
}

// Database migration
ALTER TABLE products
ALTER COLUMN price TYPE INTEGER;  -- Store as centavos

// Helper functions
export function toCentavos(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCentavos(centavos: number): number {
  return centavos / 100;
}

export function formatCurrency(centavos: number): string {
  return fromCentavos(centavos).toLocaleString('es-PY', {
    style: 'currency',
    currency: 'PYG'
  });
}

// Usage
const priceInCentavos = 1500000;  // 15,000.00 PYG
const displayPrice = formatCurrency(priceInCentavos);
```

**Option 2: Let PostgreSQL Handle It**

```sql
-- Use NUMERIC type for precision
ALTER TABLE products
ALTER COLUMN price TYPE NUMERIC(10,2);

-- Calculate in database
SELECT
  quantity * unit_price * (1 - discount_percent/100)::NUMERIC(10,2)
  AS line_total
FROM invoice_items;
```

## Implementation Plan

### Phase 1: Analysis (1 day)
- [ ] Audit all currency fields in database
- [ ] Identify all currency calculations in code
- [ ] Estimate migration complexity

### Phase 2: Create Migration (2 days)
- [ ] Create database migration script
- [ ] Add helper functions for conversion
- [ ] Update TypeScript types
- [ ] Test migration on dev database

### Phase 3: Update Application Code (2-3 days)
- [ ] Update all currency calculations
- [ ] Update display formatters
- [ ] Update API responses
- [ ] Update form inputs

### Phase 4: Testing (1 day)
- [ ] Unit tests for currency helpers
- [ ] Integration tests for invoices
- [ ] Manual testing of financial reports
- [ ] Verify totals match before/after migration

## Acceptance Criteria
- [ ] All currency stored as integers (centavos)
- [ ] All calculations use integer math
- [ ] Display formatting uses helper functions
- [ ] Database migration completed successfully
- [ ] No rounding errors in test scenarios
- [ ] Financial reports match previous values

## Files to Modify
- Database: All tables with currency fields
- `lib/utils/currency.ts` - Create helper functions
- `app/actions/invoices.ts` - Update calculations
- `app/actions/payments.ts` - Update calculations
- Components displaying currency
- Forms accepting currency input

## Related
- Database schema documentation
- Financial reporting accuracy
