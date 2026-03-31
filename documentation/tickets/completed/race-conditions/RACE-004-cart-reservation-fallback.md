# RACE-004: Cart Reservation Release Only Via Cron

## Priority: P2 (Medium)
## Category: Race Condition / Availability
## Status: COMPLETED

## Description
Expired cart reservations are only released by a cron job. If the cron fails or is disabled, stock becomes permanently blocked.

## Current State
### Current Architecture
```
Cart Add → Reserve Stock → Cart Expires (30 min)
                              ↓
                    Cron Job (every 5 min) → Release Stock
```

**`app/api/cron/release-reservations/route.ts`**
- Runs every 5 minutes via Vercel Cron
- Finds carts older than 30 minutes
- Releases their reserved stock

### Single Point of Failure
1. If cron job fails repeatedly, no stock is released
2. If Vercel cron is misconfigured, reservations accumulate
3. No fallback mechanism in checkout
4. No monitoring for stuck reservations

### Impact
- Stock shows as unavailable but isn't in any cart
- Legitimate customers can't purchase
- Manual intervention required
- Revenue loss during outage

## Proposed Solution

### 1. Fallback in Checkout Flow
```typescript
// app/api/store/checkout/route.ts
async function ensureReservationsReleased(supabase: SupabaseClient) {
  // Release any expired reservations before checkout
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  await supabase.rpc('release_expired_reservations', {
    p_cutoff_time: thirtyMinutesAgo
  })
}

export async function POST(request: NextRequest) {
  // Release expired reservations as fallback
  await ensureReservationsReleased(supabase)

  // Proceed with checkout
  // ...
}
```

### 2. Add Reservation to Product Query
```typescript
// When fetching product availability, consider reservation age
const { data: product } = await supabase.rpc('get_available_stock', {
  p_product_id: productId,
  p_ignore_expired_reservations: true  // Count expired as available
})
```

### 3. Database Function with Built-in Expiry
```sql
CREATE OR REPLACE FUNCTION get_effective_available_stock(
  p_product_id UUID
)
RETURNS INT AS $$
DECLARE
  v_total_stock INT;
  v_valid_reservations INT;
BEGIN
  -- Get total stock
  SELECT stock_quantity INTO v_total_stock
  FROM store_inventory
  WHERE product_id = p_product_id;

  -- Get only non-expired reservations
  SELECT COALESCE(SUM(
    (item->>'quantity')::INT
  ), 0) INTO v_valid_reservations
  FROM store_carts, jsonb_array_elements(items) AS item
  WHERE item->>'product_id' = p_product_id::TEXT
  AND updated_at > NOW() - INTERVAL '30 minutes';

  RETURN v_total_stock - v_valid_reservations;
END;
$$ LANGUAGE plpgsql;
```

### 4. Monitoring & Alerting
```typescript
// lib/monitoring/reservation-health.ts
export async function checkReservationHealth() {
  const { data } = await supabase.rpc('count_expired_reservations')

  if (data > 100) {
    await sendAlert({
      type: 'reservation_backlog',
      count: data,
      message: 'More than 100 expired reservations pending release'
    })
  }
}
```

### 5. Retry Logic in Cron
```typescript
// app/api/cron/release-reservations/route.ts
export async function GET(request: NextRequest) {
  // ...auth

  let attempts = 0
  const maxAttempts = 3

  while (attempts < maxAttempts) {
    try {
      const released = await releaseExpiredReservations()
      return NextResponse.json({ released })
    } catch (error) {
      attempts++
      if (attempts === maxAttempts) {
        await sendCronFailureAlert('release-reservations', error)
        return NextResponse.json({ error: 'Failed after retries' }, { status: 500 })
      }
      await sleep(1000 * attempts) // Backoff
    }
  }
}
```

## Implementation Steps
1. Add fallback release in checkout flow
2. Create `get_effective_available_stock` function
3. Add retry logic to cron job
4. Add monitoring for reservation backlog
5. Add alerting for cron failures
6. Test failure scenarios

## Acceptance Criteria
- [ ] Stock available even if cron fails
- [ ] Checkout releases nearby expired reservations
- [ ] Monitoring alerts on backlog > 100
- [ ] Cron failure triggers alert
- [ ] Manual intervention not required

## Related Files
- `web/app/api/cron/release-reservations/route.ts`
- `web/app/api/store/checkout/route.ts`
- `web/app/api/store/products/[id]/route.ts`
- `web/lib/monitoring/reservation-health.ts` (new)

## Estimated Effort
- Fallback in checkout: 2 hours
- Stock function update: 1 hour
- Monitoring: 2 hours
- Retry logic: 1 hour
- Testing: 2 hours
- **Total: 8 hours**

---
## Implementation Summary (Completed)

**Migration Created:** `db/migrations/052_reservation_fallback.sql`

**Functions Added:**

1. **`get_effective_available_stock(p_product_id UUID)`**
   - Returns available stock treating expired reservations (>30min) as available
   - Provides fallback if cron job fails to release reservations
   - Uses `CROSS JOIN LATERAL jsonb_array_elements` for efficient cart item parsing

2. **`release_expired_reservations(p_cutoff_time TIMESTAMPTZ)`**
   - Can be called from cron OR as checkout fallback
   - Uses `FOR UPDATE SKIP LOCKED` to avoid deadlocks
   - Returns JSONB summary: `expired_carts_cleared`, `items_released`, `processed_at`

3. **`count_expired_reservations()`**
   - Returns count of carts with expired reservations
   - Used for monitoring/alerting when backlog exceeds threshold

**Result:** Stock availability no longer solely dependent on cron job. Checkout can trigger fallback release, and stock queries consider reservation age.

---
*Ticket created: January 2026*
*Completed: January 2026*
