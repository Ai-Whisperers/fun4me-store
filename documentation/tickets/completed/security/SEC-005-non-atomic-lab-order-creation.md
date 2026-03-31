# SEC-005: Non-Atomic Lab Order Creation

## Priority: P2 (Medium)
## Category: Security / Atomicity
## Status: COMPLETED

## Description
Lab order creation with items uses manual rollback that is not transactional, potentially leaving orphaned records.

## Current State
### Problematic Code
**`app/api/lab-orders/route.ts:134-161`**
```typescript
// Create order
const { data: order, error: orderError } = await supabase
  .from('lab_orders')
  .insert(orderData)
  .select()
  .single()

if (orderError) { return error... }

// Create items
const { error: itemsError } = await supabase
  .from('lab_order_items')
  .insert(items)

if (itemsError) {
  // Manual rollback - NOT ATOMIC
  await supabase.from('lab_orders').delete().eq('id', order.id)
  return apiError(...)
}
```

### Issues
1. If items insert fails, the rollback delete can also fail
2. No guarantee rollback completes if request times out
3. Network errors between order and items = orphan record
4. No transaction semantics

### Impact
- Orphaned lab orders without items
- Database inconsistency
- Manual cleanup required
- Potential billing issues

## Proposed Solution

### Database Transaction Function
```sql
CREATE OR REPLACE FUNCTION create_lab_order_with_items(
  p_order JSONB,
  p_items JSONB[]
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_result JSONB;
BEGIN
  -- Insert order
  INSERT INTO lab_orders (...)
  VALUES (...)
  RETURNING id INTO v_order_id;

  -- Insert all items
  INSERT INTO lab_order_items (lab_order_id, test_id, ...)
  SELECT v_order_id, ...
  FROM jsonb_array_elements(p_items);

  -- Return created order
  SELECT to_jsonb(o.*) INTO v_result
  FROM lab_orders o WHERE o.id = v_order_id;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Transaction automatically rolled back
  RAISE;
END;
$$ LANGUAGE plpgsql;
```

### API Update
```typescript
const { data, error } = await supabase.rpc('create_lab_order_with_items', {
  p_order: orderData,
  p_items: items
})
```

## Implementation Steps
1. Create RPC function with proper transaction handling
2. Update POST handler to use RPC
3. Remove manual rollback code
4. Add test for failure scenarios
5. Verify existing lab orders unaffected

## Acceptance Criteria
- [ ] Order + items created atomically
- [ ] Failure rolls back all changes
- [ ] No orphaned records possible
- [ ] Error messages still informative
- [ ] Tests cover failure scenarios

## Related Files
- `web/app/api/lab-orders/route.ts`
- `web/db/migrations/xxx_lab_order_transaction.sql` (new)

## Estimated Effort
- RPC function: 2 hours
- API update: 1 hour
- Testing: 1 hour
- **Total: 4 hours**

---
## Implementation Summary (Completed)

**Migration Created:** `db/migrations/057_atomic_lab_order_creation.sql`

**Changes Made:**
1. Created `create_lab_order_atomic()` PostgreSQL function that:
   - Accepts all order parameters including test_ids and panel_ids arrays
   - Creates order, items, and panel links in a single transaction
   - Returns JSONB with success status and order_id
   - Automatically rolls back on any failure

2. Updated `app/api/lab-orders/route.ts`:
   - Replaced manual insert + rollback pattern with `supabase.rpc('create_lab_order_atomic', {...})`
   - Handles atomic function error responses (DUPLICATE_ORDER, INVALID_REFERENCE)
   - Removed manual rollback code

**Result:** Lab orders now created atomically - no orphaned records possible.

---
*Ticket created: January 2026*
*Completed: January 2026*
