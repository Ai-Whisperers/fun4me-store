# SEC-003: Lab Order Number Race Condition

## Priority: P1 (High)
## Category: Security / Race Condition
## Status: COMPLETED

## Description
The lab order number generation in the POST endpoint has a race condition where two concurrent requests can generate the same order number.

## Current State
### Problematic Code
**`app/api/lab-orders/route.ts:96-103`**
```typescript
const { count } = await supabase
  .from('lab_orders')
  .select('id', { count: 'exact', head: true })
  .like('order_number', `LAB-${today}-%`)

const orderNumber = `LAB-${today}-${String((count || 0) + 1).padStart(4, '0')}`
```

### Issue
1. Two requests arrive simultaneously
2. Both count existing orders and get the same result (e.g., 5)
3. Both increment to 6 and generate `LAB-2026-01-07-0006`
4. One insert fails on unique constraint OR both succeed with duplicate

### Impact
- Duplicate lab order numbers
- Invoice/billing system conflicts
- Potential data integrity issues

## Proposed Solution

### Option 1: Database Sequence (Recommended)
```sql
-- Create sequence
CREATE SEQUENCE lab_order_seq START 1;

-- Create atomic function
CREATE OR REPLACE FUNCTION generate_lab_order_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_seq INT;
BEGIN
  v_date := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
  v_seq := nextval('lab_order_seq');
  RETURN 'LAB-' || v_date || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

### Option 2: Row-Level Lock with SELECT FOR UPDATE
```typescript
const { data: lastOrder } = await supabase.rpc('get_next_lab_order_number', {
  p_tenant_id: tenantId,
  p_date: today
})
```

## Implementation Steps
1. Create migration with sequence and atomic function
2. Add unique constraint on lab_orders.order_number if missing
3. Update POST handler to use RPC function
4. Add retry logic for the rare case of sequence gaps
5. Write tests for concurrent order creation

## Acceptance Criteria
- [ ] Order numbers are always unique
- [ ] Concurrent requests get different numbers
- [ ] No performance degradation
- [ ] Existing orders unaffected
- [ ] Tests verify race condition is fixed

## Related Files
- `web/app/api/lab-orders/route.ts`
- `web/db/migrations/xxx_lab_order_sequence.sql` (new)

## Estimated Effort
- Migration: 1 hour
- Code update: 1 hour
- Testing: 1 hour
- **Total: 3 hours**

---
## Implementation Summary (Completed)

**Files Created:**
- `db/migrations/046_atomic_order_number_sequences.sql`

**Changes Made:**
1. Created `lab_order_sequences` table for daily sequences per tenant (PRIMARY KEY: tenant_id, date)
2. Created atomic `generate_lab_order_number(p_tenant_id)` function using INSERT ON CONFLICT for guaranteed unique numbers
3. Added unique constraint on `lab_orders.order_number`
4. Added RLS policy for sequence table
5. Included data initialization from existing orders
6. Updated `app/api/lab-orders/route.ts` to use atomic RPC call

**Technical Details:**
- Function uses INSERT ON CONFLICT DO UPDATE for atomic counter increment
- Returns format: `LAB-YYYYMMDD-XXXX` (4-digit padded sequence)
- Sequences reset daily per tenant
- Old select-increment-insert pattern replaced

---
*Completed: January 2026*
