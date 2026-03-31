# PERF-003: Sales Increment Not Batched

## Priority: P2 (Medium)
## Category: Performance
## Status: COMPLETED

## Description
Order creation increments product sales counters one at a time, creating N RPC calls where N is the number of items in the order.

## Current State
### Problematic Code
**`app/api/store/orders/route.ts:375-381`**
```typescript
// Increment sales count for each product
for (const item of items) {
  await supabase.rpc('increment_product_sales', {
    p_product_id: item.product_id,
    p_quantity: item.quantity,
  })
}
```

### Performance Impact
- Each RPC call adds ~50ms latency
- Order with 10 items = 500ms just for sales updates
- Checkout feels slow for larger orders
- Unnecessary database round trips

## Proposed Solution

### Option 1: Batch RPC Function
```sql
CREATE OR REPLACE FUNCTION increment_product_sales_batch(
  p_items JSONB  -- Array of {product_id, quantity}
)
RETURNS VOID AS $$
BEGIN
  UPDATE store_products
  SET
    sales_count = sales_count + (item->>'quantity')::INT,
    updated_at = NOW()
  FROM jsonb_array_elements(p_items) AS item
  WHERE id = (item->>'product_id')::UUID;
END;
$$ LANGUAGE plpgsql;
```

### Usage in Code
```typescript
// Single RPC call for all items
await supabase.rpc('increment_product_sales_batch', {
  p_items: items.map(item => ({
    product_id: item.product_id,
    quantity: item.quantity
  }))
})
```

### Option 2: Single UPDATE with CTE
```sql
CREATE OR REPLACE FUNCTION increment_product_sales_batch(
  p_product_ids UUID[],
  p_quantities INT[]
)
RETURNS VOID AS $$
BEGIN
  WITH updates AS (
    SELECT
      unnest(p_product_ids) AS product_id,
      unnest(p_quantities) AS quantity
  )
  UPDATE store_products p
  SET
    sales_count = sales_count + u.quantity,
    updated_at = NOW()
  FROM updates u
  WHERE p.id = u.product_id;
END;
$$ LANGUAGE plpgsql;
```

### Performance Comparison
| Items | Before (calls) | After (calls) | Time Saved |
|-------|----------------|---------------|------------|
| 1 | 1 | 1 | 0ms |
| 5 | 5 | 1 | ~200ms |
| 10 | 10 | 1 | ~450ms |
| 20 | 20 | 1 | ~950ms |

## Implementation Steps
1. Create batch RPC function
2. Update order creation to use batch call
3. Remove loop-based increment
4. Test with various order sizes
5. Add performance metrics

## Acceptance Criteria
- [ ] Single RPC call regardless of item count
- [ ] Checkout time reduced by ~50ms per item
- [ ] Sales counts accurately updated
- [ ] Works with partial order items
- [ ] Existing orders unaffected

## Related Files
- `web/db/migrations/xxx_batch_sales_increment.sql` (new)
- `web/app/api/store/orders/route.ts`
- `web/app/api/store/checkout/route.ts`

## Estimated Effort
- RPC function: 1 hour
- API update: 1 hour
- Testing: 1 hour
- **Total: 3 hours**

---
## Implementation Summary (Completed)

**Files Created:**
- `db/migrations/048_batch_sales_increment.sql`

**Files Modified:**
- `app/api/store/orders/route.ts`

**Changes Made:**

1. **New batch RPC function:**
   ```sql
   CREATE OR REPLACE FUNCTION increment_product_sales_batch(p_items JSONB)
   ```
   - Accepts JSONB array of `{product_id, quantity}` objects
   - Single UPDATE statement for all products
   - Handles empty/null arrays gracefully

2. **Backwards-compatible single-item function:**
   - `increment_product_sales(UUID, INT)` created/updated for existing code

3. **API route updated:**
   ```typescript
   await supabase.rpc('increment_product_sales_batch', {
     p_items: items.map(item => ({
       product_id: item.product_id,
       quantity: item.quantity,
     }))
   })
   ```

4. **Additional improvements:**
   - Added `sales_count` column if missing
   - Added index for popularity sorting

**Performance improvement:**
- Before: N RPC calls for N items (~50ms each)
- After: 1 RPC call regardless of item count
- 10-item order: ~450ms faster

---
*Ticket created: January 2026*
*Completed: January 2026*
*Based on security/performance audit*
