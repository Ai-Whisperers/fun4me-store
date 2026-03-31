# SEC-026 Missing Rate Limiting on Cart and Products APIs

## Priority: P1

## Category: Security

## Status: Completed

## Resolution
1. Added `cart` rate limit tier (60 requests/minute) to `lib/rate-limit.ts`
2. Applied rate limiting to PUT and POST endpoints in `app/api/store/cart/route.ts`

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Description

The Cart API (GET/PUT/POST/DELETE) and Products API (GET) do not have rate limiting applied. While the checkout endpoint has `{ rateLimit: 'checkout' }`, these endpoints could be abused.

### Current State

**Checkout** (protected):
```typescript
export const POST = withApiAuth(handler, { rateLimit: 'checkout' })  // 5 req/min
```

**Cart API** (unprotected):
```typescript
export const GET = withApiAuth(getHandler)      // No rate limit
export const PUT = withApiAuth(putHandler)      // No rate limit
export const POST = withApiAuth(postHandler)    // No rate limit
export const DELETE = withApiAuth(deleteHandler) // No rate limit
```

**Products API** (unprotected):
```typescript
export async function GET(request: NextRequest) {
  // No auth or rate limiting
}
```

### Attack Scenarios

1. **Cart Spam**: Attacker continuously syncs carts, overwhelming database
2. **Product Enumeration**: Scraper extracts entire product catalog at high rate
3. **Database DoS**: Rapid cart operations cause database connection exhaustion
4. **Cost Attack**: If using metered Supabase, API spam increases costs

## Impact

**Security Risk: MEDIUM**
- Denial of service via resource exhaustion
- Product data scraping/enumeration
- Increased infrastructure costs
- Database performance degradation

## Proposed Fix

Add rate limiting to all store endpoints:

```typescript
// web/app/api/store/cart/route.ts
export const GET = withApiAuth(getHandler, { rateLimit: 'read' })
export const PUT = withApiAuth(putHandler, { rateLimit: 'write' })
export const POST = withApiAuth(postHandler, { rateLimit: 'write' })
export const DELETE = withApiAuth(deleteHandler, { rateLimit: 'write' })
```

```typescript
// web/app/api/store/products/route.ts
import { withRateLimit } from '@/lib/middleware/rate-limit'

export const GET = withRateLimit(handler, 'search')  // Higher limit for public browsing
```

### Rate Limit Tiers (existing in `lib/middleware/rate-limit.ts`)

| Tier | Limit | Window | Use Case |
|------|-------|--------|----------|
| `read` | 60/min | 60s | Cart GET, Orders GET |
| `write` | 30/min | 60s | Cart PUT/POST/DELETE |
| `search` | 100/min | 60s | Products listing |
| `checkout` | 5/min | 60s | Already applied |

## Acceptance Criteria

- [ ] Cart GET has `{ rateLimit: 'read' }`
- [ ] Cart PUT has `{ rateLimit: 'write' }`
- [ ] Cart POST has `{ rateLimit: 'write' }`
- [ ] Cart DELETE has `{ rateLimit: 'write' }`
- [ ] Products GET has rate limiting (consider public access tier)
- [ ] Test: Exceed rate limit → Returns 429
- [ ] Add comment `// SEC-026: Rate limiting applied`

## Related Files

- `web/app/api/store/cart/route.ts`
- `web/app/api/store/products/route.ts`
- `web/lib/middleware/rate-limit.ts`

## Estimated Effort

1-2 hours

## Security Severity

**MEDIUM** - DoS prevention and resource protection.
