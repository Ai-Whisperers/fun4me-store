# RACE-001: Stock Decrement Not Atomic in Subscriptions

## Priority: P0 (Critical)
## Category: Race Condition
## Status: COMPLETED

## Description
The subscription processing cron job checks stock availability and decrements in separate operations, allowing concurrent runs to cause overselling.

## Current State
### Problematic Code
**`app/api/cron/process-subscriptions/route.ts:205-209`**
```typescript
// Step 1: Check stock (READ)
const stock = inventory.stock_quantity ?? 0
if (stock < subscription.quantity) {
  results.skipped++
  continue
}

// Step 2: Decrement stock (WRITE) - NOT ATOMIC WITH CHECK
await supabase.rpc('decrement_stock', {
  p_product_id: subscription.product_id,
  p_quantity: subscription.quantity,
})
```

### Race Condition Scenario
1. Cron job A checks product X: 10 in stock, needs 8
2. Cron job B checks product X: 10 in stock, needs 8
3. Both see sufficient stock (10 >= 8)
4. Cron job A decrements: stock = 2
5. Cron job B decrements: stock = -6 (OVERSOLD!)

### Impact
- **Critical**: Negative inventory quantities
- Customer orders that can't be fulfilled
- Financial losses from refunds
- Data integrity issues

## Proposed Solution

**Decision: Block Entirely** - If stock check fails, the order should be blocked completely (not queued or soft-blocked).

### Atomic RPC with Stock Check (Approved Approach)
```sql
CREATE OR REPLACE FUNCTION decrement_stock_if_available(
  p_product_id UUID,
  p_quantity INT
)
RETURNS JSONB AS $$
DECLARE
  v_current_stock INT;
  v_new_stock INT;
BEGIN
  -- Lock the row for update
  SELECT stock_quantity INTO v_current_stock
  FROM store_inventory
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'product_not_found');
  END IF;

  IF v_current_stock < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'insufficient_stock',
      'available', v_current_stock,
      'requested', p_quantity
    );
  END IF;

  v_new_stock := v_current_stock - p_quantity;

  UPDATE store_inventory
  SET stock_quantity = v_new_stock,
      updated_at = NOW()
  WHERE product_id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_stock', v_current_stock,
    'new_stock', v_new_stock
  );
END;
$$ LANGUAGE plpgsql;
```

### Updated Cron Code
```typescript
// Replace check + decrement with atomic operation
const { data: result } = await supabase.rpc('decrement_stock_if_available', {
  p_product_id: subscription.product_id,
  p_quantity: subscription.quantity,
})

if (!result.success) {
  logger.warn('Subscription skipped', {
    subscriptionId: subscription.id,
    reason: result.reason,
    available: result.available,
  })
  results.skipped++
  continue
}

// Stock decremented successfully, proceed with order
```

### Option 2: Database Constraint (Defense in Depth)
```sql
-- Add CHECK constraint to prevent negative stock
ALTER TABLE store_inventory
ADD CONSTRAINT check_non_negative_stock
CHECK (stock_quantity >= 0);
```

## Implementation Steps
1. Create atomic RPC function with FOR UPDATE lock
2. Add non-negative stock constraint
3. Update cron job to use new RPC
4. Remove separate stock check
5. Add integration tests with concurrent execution
6. Monitor for any constraint violations

## Acceptance Criteria
- [ ] Stock can never go negative
- [ ] Concurrent subscriptions processed correctly
- [ ] Insufficient stock logged with details
- [ ] Integration tests prove race condition fixed
- [ ] Existing subscription processing still works

## Related Files
- `web/db/migrations/xxx_atomic_stock_decrement.sql` (new)
- `web/app/api/cron/process-subscriptions/route.ts`

## Estimated Effort
- RPC function: 2 hours
- Cron update: 1 hour
- Testing: 2 hours
- **Total: 5 hours**

---
## Implementation Summary (Completed)

**Files Modified:**
- `web/db/migrations/045_atomic_stock_decrement_subscription.sql` - New migration
- `web/app/api/cron/process-subscriptions/route.ts` - Updated cron job

**Changes Made:**
1. Created `decrement_stock_if_available` RPC function with `FOR UPDATE` row-level locking
2. Created `increment_stock` RPC function for rollback scenarios
3. Added `CHECK (stock_quantity >= 0)` constraint on `store_inventory` table
4. Updated cron job to:
   - Decrement stock FIRST (before creating order) using atomic RPC
   - Roll back stock if order creation fails
   - Roll back stock if order items creation fails
   - Roll back stock on any exception after decrement
5. User decision: **Block Entirely** - orders blocked completely if insufficient stock

---
*Ticket created: January 2026*
*Based on security/performance audit*
*Completed: January 2026*
