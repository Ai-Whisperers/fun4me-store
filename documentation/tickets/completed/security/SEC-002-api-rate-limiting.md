# SEC-002: Expand API Rate Limiting

## Priority: P2 - Medium
## Category: Security
## Status: COMPLETED
## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)
## Affected Areas: API routes, lib/rate-limit.ts

## Description

Rate limiting exists in `lib/rate-limit.ts` but is only applied to a few sensitive endpoints. Many endpoints that could be abused (search, booking, auth) lack protection.

## Current State

```typescript
// lib/rate-limit.ts exists with basic implementation
// Only used in handful of routes

// Most API routes have no rate limiting:
export async function POST(request: NextRequest) {
  // Directly process request - no rate check
  const body = await request.json()
  // ...
}
```

### Vulnerable Endpoints:
1. `/api/booking` - Could be spammed to fill calendar
2. `/api/search` - Could be used for data scraping
3. `/api/store/checkout` - Payment abuse
4. `/api/whatsapp/send` - SMS cost abuse
5. Auth routes - Brute force attacks

## Proposed Solution

### 1. Expand Rate Limit Configuration

```typescript
// lib/rate-limit.ts
interface RateLimitConfig {
  windowMs: number    // Time window in milliseconds
  maxRequests: number // Max requests per window
  identifier: 'ip' | 'user' | 'tenant'
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth - strict limits
  'auth/login': { windowMs: 60000, maxRequests: 5, identifier: 'ip' },
  'auth/signup': { windowMs: 3600000, maxRequests: 3, identifier: 'ip' },
  'auth/reset-password': { windowMs: 3600000, maxRequests: 3, identifier: 'ip' },

  // High-cost operations
  'booking': { windowMs: 60000, maxRequests: 10, identifier: 'user' },
  'whatsapp/send': { windowMs: 60000, maxRequests: 20, identifier: 'tenant' },
  'store/checkout': { windowMs: 60000, maxRequests: 5, identifier: 'user' },

  // Search/Read - moderate limits
  'search': { windowMs: 60000, maxRequests: 30, identifier: 'ip' },
  'api/default': { windowMs: 60000, maxRequests: 100, identifier: 'user' },
}
```

### 2. Rate Limit Middleware

```typescript
export function withRateLimit(
  routeKey: string,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const config = RATE_LIMITS[routeKey] || RATE_LIMITS['api/default']
    const identifier = getIdentifier(req, config.identifier)

    const { success, remaining, reset } = await checkRateLimit(
      `${routeKey}:${identifier}`,
      config
    )

    if (!success) {
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes',
          code: 'RATE_LIMITED',
          retryAfter: reset
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(reset),
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000))
          }
        }
      )
    }

    const response = await handler(req)
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    return response
  }
}
```

## Implementation Steps

1. [ ] Update `lib/rate-limit.ts` with new configuration
2. [ ] Create in-memory rate limit store (or use Redis if available)
3. [ ] Apply to auth routes
4. [ ] Apply to booking routes
5. [ ] Apply to WhatsApp/SMS routes
6. [ ] Apply to checkout routes
7. [ ] Add rate limit headers to responses
8. [ ] Add monitoring/alerts for rate limit hits

## Acceptance Criteria

- [ ] All sensitive endpoints have rate limiting
- [ ] Rate limits configurable per route
- [ ] Clear response when rate limited (429 + Retry-After)
- [ ] Rate limit headers on all responses
- [ ] No impact on normal usage patterns

## Related Files

- `web/lib/rate-limit.ts`
- `web/app/api/**/route.ts`

## Estimated Effort

- Implementation: 4-5 hours
- Testing: 2 hours
- **Total: 6-7 hours**

---
## Implementation Summary (Completed)

**Analysis:**
Rate limiting was already extensively implemented in `lib/rate-limit.ts` with:
- Sliding window algorithm with in-memory store + optional Redis
- 7 rate limit types: auth, search, write, financial, refund, checkout, default
- `rateLimit()` function for inline use
- `withRateLimit()` HOF for wrapping handlers
- Proper 429 responses with `Retry-After` and `X-RateLimit-*` headers

**Current Coverage (35+ routes):**
Already protected endpoints include:
- `/api/booking` - search/write limits
- `/api/store/checkout` - checkout limit (5/min)
- `/api/whatsapp/send` - write limit
- `/api/signup` - custom in-route rate limiting (5/hour)
- `/api/search` - search limit (30/min)
- `/api/invoices` - financial limits
- `/api/invoices/[id]/refund` - refund limit (5/hour)
- Medical records, vaccines, prescriptions, lab orders, etc.

**New Protection Added:**
1. `/api/claim` (POST) - auth limit (5/min)
   - Pre-generated website claiming with account creation
2. `/api/ambassador` (POST) - auth limit (5/min)
   - Ambassador registration with account creation

**Coverage Summary:**
- 37+ API routes now have rate limiting
- All sensitive auth-related endpoints protected
- Financial/checkout operations strictly limited
- Search operations have moderate limits

---
*Completed: January 2026*
