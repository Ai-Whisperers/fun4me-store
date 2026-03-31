# PERF-006: Inefficient Cart Merge Logic

## Priority: P3 (Low)
## Category: Performance
## Status: Not Started

## Description
Cart merging (when anonymous user logs in) uses client-side JavaScript to process JSON, which is less efficient than a database function.

## Current State
### Current Code
**`app/api/store/cart/route.ts:286-310`**
```typescript
// Client-side merge logic
const existingMap = new Map<string, (typeof localItems)[0]>()

// Build map from existing cart
for (const item of existingCart.items) {
  const key = `${item.id}-${item.type}`
  existingMap.set(key, item)
}

// Merge local items
for (const localItem of localItems) {
  const key = `${localItem.id}-${localItem.type}`
  if (existingMap.has(key)) {
    const existing = existingMap.get(key)!
    existing.quantity += localItem.quantity
  } else {
    existingMap.set(key, { ...localItem })
  }
}

// Convert back to array
mergedItems = Array.from(existingMap.values())

// Update cart
await supabase
  .from('store_carts')
  .update({ items: mergedItems })
  .eq('id', existingCart.id)
```

### Issues
- JSON parsed in JavaScript (slower than JSONB operations)
- Multiple round trips: fetch cart → process → update
- Memory allocation for Map and arrays
- Not atomic (concurrent merges could conflict)

## Proposed Solution

### Database Function for Merge
```sql
CREATE OR REPLACE FUNCTION merge_cart_items(
  p_cart_id UUID,
  p_local_items JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_existing_items JSONB;
  v_merged JSONB;
BEGIN
  -- Get existing items with lock
  SELECT items INTO v_existing_items
  FROM store_carts
  WHERE id = p_cart_id
  FOR UPDATE;

  -- Merge using JSONB operations
  WITH existing AS (
    SELECT
      elem->>'id' AS id,
      elem->>'type' AS type,
      (elem->>'quantity')::INT AS quantity,
      elem - 'quantity' AS base
    FROM jsonb_array_elements(COALESCE(v_existing_items, '[]'::JSONB)) elem
  ),
  local AS (
    SELECT
      elem->>'id' AS id,
      elem->>'type' AS type,
      (elem->>'quantity')::INT AS quantity,
      elem - 'quantity' AS base
    FROM jsonb_array_elements(p_local_items) elem
  ),
  merged AS (
    SELECT
      COALESCE(e.id, l.id) AS id,
      COALESCE(e.type, l.type) AS type,
      COALESCE(e.quantity, 0) + COALESCE(l.quantity, 0) AS quantity,
      COALESCE(e.base, l.base) AS base
    FROM existing e
    FULL OUTER JOIN local l ON e.id = l.id AND e.type = l.type
  )
  SELECT jsonb_agg(
    base || jsonb_build_object(
      'id', id,
      'type', type,
      'quantity', quantity
    )
  ) INTO v_merged
  FROM merged;

  -- Update cart
  UPDATE store_carts
  SET items = COALESCE(v_merged, '[]'::JSONB),
      updated_at = NOW()
  WHERE id = p_cart_id;

  RETURN v_merged;
END;
$$ LANGUAGE plpgsql;
```

### Updated API Code
```typescript
// app/api/store/cart/route.ts
export async function POST(request: NextRequest) {
  // ... auth and get local items

  if (existingCart) {
    // Single RPC call for merge
    const { data: mergedItems, error } = await supabase.rpc('merge_cart_items', {
      p_cart_id: existingCart.id,
      p_local_items: localItems
    })

    if (error) throw error

    return NextResponse.json({
      success: true,
      cart: { id: existingCart.id, items: mergedItems }
    })
  }

  // Create new cart...
}
```

## Benefits
| Aspect | Before | After |
|--------|--------|-------|
| Database calls | 2 (fetch + update) | 1 (RPC) |
| Data transfer | Full cart twice | Items once |
| Processing | JavaScript | PostgreSQL (faster) |
| Atomicity | No | Yes (FOR UPDATE) |

## Implementation Steps
1. Create RPC function with JSONB merge
2. Update cart API to use RPC
3. Remove client-side merge code
4. Test with large carts (100+ items)
5. Verify stock reservations preserved

## Acceptance Criteria
- [ ] Single RPC call for merge
- [ ] Atomic merge (no race conditions)
- [ ] Quantities correctly summed
- [ ] Item metadata preserved
- [ ] Performance improved for large carts

## Related Files
- `web/db/migrations/xxx_cart_merge_function.sql` (new)
- `web/app/api/store/cart/route.ts`

## Estimated Effort
- RPC function: 2 hours
- API update: 1 hour
- Testing: 1 hour
- **Total: 4 hours**

---
*Ticket created: January 2026*
*Based on security/performance audit*
