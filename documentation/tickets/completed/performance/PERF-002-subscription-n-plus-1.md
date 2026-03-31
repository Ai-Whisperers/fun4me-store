# PERF-002: N+1 Query in Subscription Processing

## Priority: P1 (High)
## Category: Performance
## Status: COMPLETED

## Description
The subscription processing cron job fetches product data individually for each subscription in a loop, creating an N+1 query problem.

## Current State
### Problematic Code
**`app/api/cron/process-subscriptions/route.ts:75-162`**
```typescript
for (const subscription of dueSubscriptions) {
  // ONE QUERY PER SUBSCRIPTION!
  const { data: product, error: productError } = await supabase
    .from('store_products')
    .select(`
      id,
      name,
      base_price,
      store_inventory!inner(stock_quantity, weighted_average_cost)
    `)
    .eq('id', subscription.product_id)
    .single()

  // Process subscription...
}
```

### Performance Impact
| Subscriptions | Queries | Time (est.) |
|---------------|---------|-------------|
| 10 | 10 | ~200ms |
| 100 | 100 | ~2s |
| 1000 | 1000 | ~20s |
| 10000 | 10000 | ~200s+ (timeout!) |

### Current Risk
- Cron job can timeout on busy systems
- Unnecessary database load
- Slow processing delays customer orders

## Proposed Solution

### Batch Product Fetch
```typescript
export async function GET(request: NextRequest) {
  // ... auth

  // Fetch due subscriptions
  const { data: dueSubscriptions } = await supabase
    .from('store_subscriptions')
    .select('*')
    .lte('next_order_date', today)
    .eq('status', 'active')

  if (!dueSubscriptions?.length) {
    return NextResponse.json({ message: 'No subscriptions to process' })
  }

  // BATCH FETCH: Get all products in ONE query
  const productIds = [...new Set(dueSubscriptions.map(s => s.product_id))]

  const { data: products } = await supabase
    .from('store_products')
    .select(`
      id,
      name,
      base_price,
      store_inventory!inner(stock_quantity, weighted_average_cost)
    `)
    .in('id', productIds)

  // Create lookup map for O(1) access
  const productMap = new Map(products?.map(p => [p.id, p]))

  // Process subscriptions with pre-fetched data
  const results = { processed: 0, skipped: 0, errors: [] }

  for (const subscription of dueSubscriptions) {
    const product = productMap.get(subscription.product_id)

    if (!product) {
      results.errors.push(`Product ${subscription.product_id} not found`)
      continue
    }

    // Process with product data...
    results.processed++
  }

  return NextResponse.json(results)
}
```

### Performance Comparison
| Subscriptions | Before (queries) | After (queries) |
|---------------|------------------|-----------------|
| 10 | 10 | 2 |
| 100 | 100 | 2 |
| 1000 | 1000 | 2 |
| 10000 | 10000 | 2 |

## Implementation Steps
1. Extract all product IDs from subscriptions
2. Batch fetch all products in one query
3. Create Map for O(1) lookups
4. Update loop to use pre-fetched data
5. Add metrics logging for processing time
6. Test with large subscription counts

## Acceptance Criteria
- [ ] Only 2 queries regardless of subscription count
- [ ] Processing time < 5s for 1000 subscriptions
- [ ] All existing functionality preserved
- [ ] Error handling for missing products
- [ ] Metrics logged for monitoring

## Related Files
- `web/app/api/cron/process-subscriptions/route.ts`

## Estimated Effort
- Code refactor: 2 hours
- Testing: 1 hour
- Performance validation: 1 hour
- **Total: 4 hours**

---
## Implementation Summary (Completed)

**Files Modified:**
- `app/api/cron/process-subscriptions/route.ts`

**Changes Made:**

1. **Batch product fetch before loop:**
   ```typescript
   // Extract unique product IDs
   const productIds = [...new Set(dueSubscriptions.map(s => s.product_id))]

   // Single query for all products
   const { data: products } = await supabase
     .from('store_products')
     .select('id, tenant_id, name, base_price, is_active, store_inventory(stock_quantity)')
     .in('id', productIds)
   ```

2. **O(1) lookup map:**
   ```typescript
   // Key: "product_id:tenant_id" for tenant-specific matching
   const productMap = new Map(products?.map(p => [`${p.id}:${p.tenant_id}`, p]))
   ```

3. **Replaced N queries with single lookup:**
   ```typescript
   // Before: await supabase.from('store_products')...single() (N times)
   // After: productMap.get(`${subscription.product_id}:${subscription.tenant_id}`)
   ```

**Performance improvement:**
| Subscriptions | Before (queries) | After (queries) |
|---------------|------------------|-----------------|
| 10 | 11 | 2 |
| 100 | 101 | 2 |
| 1000 | 1001 | 2 |

---
*Ticket created: January 2026*
*Completed: January 2026*
*Based on security/performance audit*
