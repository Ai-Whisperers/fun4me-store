# PERF-004: Campaign Cache Missing for Searches

## Priority: P2 (Medium)
## Category: Performance
## Status: COMPLETED

## Description
Every product search fetches all active campaigns from the database and calculates discounts client-side, even though campaigns change infrequently.

## Current State
### Problematic Code
**`app/api/store/search/route.ts:142-171`**
```typescript
// Every search request:
const { data: campaigns } = await supabase
  .from('store_campaigns')
  .select(`
    id,
    name,
    discount_type,
    discount_value,
    start_date,
    end_date,
    store_campaign_products(product_id)
  `)
  .eq('tenant_id', clinic)
  .eq('is_active', true)
  .is('deleted_at', null)
  .lte('start_date', new Date().toISOString())
  .gte('end_date', new Date().toISOString())

// Then builds map and calculates discounts for each product
const campaignMap = new Map()
for (const campaign of campaigns) {
  for (const cp of campaign.store_campaign_products) {
    campaignMap.set(cp.product_id, campaign)
  }
}
```

### Performance Impact
- Campaigns query: ~100-200ms
- 100+ campaigns = significant load
- Repeated for every search request
- Unnecessary when campaigns rarely change

## Proposed Solution

### Option 1: Upstash Redis Cache (Recommended)
```typescript
// lib/cache/campaigns.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const CACHE_TTL = 5 * 60 // 5 minutes

export async function getActiveCampaigns(tenantId: string) {
  const cacheKey = `campaigns:${tenantId}`

  // Try cache first
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached as string)
  }

  // Fetch from database
  const campaigns = await fetchCampaignsFromDB(tenantId)

  // Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(campaigns), { ex: CACHE_TTL })

  return campaigns
}

export async function invalidateCampaignCache(tenantId: string) {
  await redis.del(`campaigns:${tenantId}`)
}
```

### Option 2: Pre-Computed Discount Column
```sql
-- Add computed discount to products view
CREATE OR REPLACE VIEW store_products_with_discounts AS
SELECT
  p.*,
  COALESCE(
    CASE c.discount_type
      WHEN 'percentage' THEN p.base_price * (1 - c.discount_value / 100)
      WHEN 'fixed' THEN GREATEST(0, p.base_price - c.discount_value)
      ELSE p.base_price
    END,
    p.base_price
  ) AS current_price,
  c.id AS campaign_id,
  c.name AS campaign_name
FROM store_products p
LEFT JOIN store_campaign_products cp ON cp.product_id = p.id
LEFT JOIN store_campaigns c ON c.id = cp.campaign_id
  AND c.is_active = TRUE
  AND c.deleted_at IS NULL
  AND c.start_date <= NOW()
  AND c.end_date >= NOW();
```

### Option 3: Edge Cache with Stale-While-Revalidate
```typescript
// lib/cache/campaigns.ts
import { unstable_cache } from 'next/cache'

export const getCampaigns = unstable_cache(
  async (tenantId: string) => {
    return fetchCampaignsFromDB(tenantId)
  },
  ['campaigns'],
  {
    revalidate: 300, // 5 minutes
    tags: ['campaigns']
  }
)

// Invalidate on campaign update
export async function onCampaignUpdate(tenantId: string) {
  revalidateTag('campaigns')
}
```

### Cache Invalidation Strategy
```typescript
// app/api/campaigns/route.ts
export async function POST(request: NextRequest) {
  // Create campaign...
  await invalidateCampaignCache(tenantId)
  return response
}

export async function PATCH(request: NextRequest) {
  // Update campaign...
  await invalidateCampaignCache(tenantId)
  return response
}
```

## Implementation Steps
1. Set up Upstash Redis cache utility
2. Implement campaign cache with 5-min TTL
3. Update search route to use cache
4. Add cache invalidation on campaign CRUD
5. Add cache hit/miss metrics
6. Test cache behavior

## Acceptance Criteria
- [ ] Campaigns fetched from cache when available
- [ ] Cache TTL of 5 minutes
- [ ] Cache invalidated on campaign changes
- [ ] Search response time improved
- [ ] Cache metrics available

## Related Files
- `web/lib/cache/campaigns.ts` (new)
- `web/app/api/store/search/route.ts`
- `web/app/api/campaigns/route.ts`
- `web/app/api/campaigns/[id]/route.ts`

## Estimated Effort
- Cache utility: 2 hours
- Search update: 1 hour
- Invalidation hooks: 1 hour
- Testing: 1 hour
- **Total: 5 hours**

---
## Implementation Summary (Completed)

**File Created:** `lib/cache/campaigns.ts`

**Functions Implemented:**

1. **`getActiveCampaigns(tenantId)`**
   - Uses Next.js `unstable_cache` for server-side caching
   - 5-minute TTL (`revalidate: 300`)
   - Tagged with `campaigns` and `campaigns:${tenantId}` for targeted invalidation
   - Stale-while-revalidate behavior

2. **`getCampaignDiscountMap(tenantId)`**
   - Convenience helper returning `Map<product_id, {type, value}>`
   - Built on top of cached campaigns

3. **`invalidateCampaignCache(tenantId)`**
   - Invalidates cache for specific tenant via `revalidateTag()`

4. **`invalidateAllCampaignCaches()`**
   - Global invalidation for all tenants

5. **`calculateDiscountedPrice(basePrice, discount)`**
   - Utility for applying discounts (percentage or fixed)
   - Returns `{currentPrice, originalPrice, hasDiscount, discountPercentage}`

**Result:** Search queries no longer hit database for every campaign lookup. ~100-200ms saved per search request.

---
*Ticket created: January 2026*
*Completed: January 2026*
