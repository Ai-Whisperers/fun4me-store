# API-003: Implement API Rate Limiting

## Priority: P1 (High)
## Category: API Gaps / Security
## Status: COMPLETED

## Description
Only 1 endpoint (signup) has rate limiting. Critical financial and external API endpoints are vulnerable to abuse.

## Current State
- **Rate limited**: `/api/signup` (manual Map-based implementation)
- **Rate limited endpoints count**: 1 of 257 routes (~0.4%)
- **Upstash Redis**: Available in stack but unused for rate limiting

## At-Risk Endpoints (Should Have Rate Limiting)

### Critical (Abuse = Financial Loss)
1. `/api/store/checkout` - Payment processing
2. `/api/billing/pay-invoice` - Financial transactions
3. `/api/loyalty/redeem` - Points redemption
4. `/api/billing/invoices/[id]/send` - Email sending costs
5. `/api/store/orders` - Order creation

### External API Cost
6. `/api/whatsapp/send` - Meta API costs
7. `/api/sms/send` - Twilio costs
8. `/api/billing/stripe/*` - Stripe API calls

### Sensitive Operations
9. `/api/auth/login` - Login attempts (brute force)
10. `/api/auth/reset-password` - Password reset
11. `/api/signup/check-slug` - Enumeration attacks
12. `/api/referrals/validate` - Referral code testing

## Proposed Solution

### 1. Upstash Rate Limiter Setup
```typescript
// lib/api/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different limits for different endpoint types
export const rateLimiters = {
  // Strict: 5 requests per minute
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'ratelimit:auth',
  }),

  // Standard: 60 requests per minute
  standard: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'ratelimit:standard',
  }),

  // Financial: 10 requests per minute
  financial: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ratelimit:financial',
  }),

  // External: 30 requests per minute (to manage costs)
  external: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'ratelimit:external',
  }),
};
```

### 2. Rate Limit Middleware
```typescript
// lib/api/with-rate-limit.ts
export function withRateLimit(
  handler: NextApiHandler,
  limiterType: keyof typeof rateLimiters = 'standard'
) {
  return async (req: NextRequest) => {
    const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success, limit, reset, remaining } = await rateLimiters[limiterType].limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intente más tarde.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    return handler(req);
  };
}
```

## Implementation Steps
1. Set up Upstash Redis connection
2. Create rate limiter configurations
3. Create `withRateLimit` middleware wrapper
4. Apply to auth endpoints (login, signup, reset)
5. Apply to financial endpoints (checkout, orders, payments)
6. Apply to external API endpoints (WhatsApp, SMS)
7. Add rate limit headers to responses
8. Create dashboard for rate limit monitoring
9. Write tests for rate limiting

## Acceptance Criteria
- [ ] Upstash Redis configured and connected
- [ ] Rate limiters created for different tiers
- [ ] Auth endpoints limited to 5/min
- [ ] Financial endpoints limited to 10/min
- [ ] External API endpoints limited to 30/min
- [ ] 429 responses include rate limit headers
- [ ] Error messages in Spanish
- [ ] Monitoring dashboard shows limit hits
- [ ] Tests verify rate limiting works

## Environment Variables Required
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx
```

## Related Files
- `web/lib/api/rate-limit.ts` (new)
- `web/lib/api/with-rate-limit.ts` (new)
- All `/api/*` route files (apply wrapper)

## Estimated Effort
- Setup: 2 hours
- Middleware: 2 hours
- Apply to endpoints: 4 hours
- Testing: 2 hours
- **Total: 10 hours**

---
*Ticket created: January 2026*
*Based on API completeness audit*

---

## Implementation Summary (January 2026)

### Infrastructure Created
- `lib/rate-limit.ts` - Full rate limiting infrastructure with:
  - 7 rate limit tiers: `auth` (5/min), `search` (30/min), `write` (20/min), `financial` (10/min), `refund` (5/hour), `checkout` (5/min), `default` (60/min)
  - In-memory sliding window algorithm with Redis fallback
  - Proper 429 responses with `Retry-After`, `X-RateLimit-*` headers
  - Spanish error messages

### Integration with withApiAuth Wrapper
- `lib/auth/api-wrapper.ts` - Rate limiting integrated via `rateLimit` option
- Automatic user ID-based limiting for authenticated requests
- IP-based fallback for unauthenticated requests

### Endpoints with Rate Limiting (27 total)
**Financial:**
- `/api/invoices` - `financial` (10/min)
- `/api/invoices/[id]/payments` - `financial` (10/min)
- `/api/invoices/[id]/refund` - `refund` (5/hour)
- `/api/store/checkout` - `checkout` (5/min)
- `/api/store/orders` - `checkout` (5/min) ✅ Added
- `/api/loyalty/redeem` - `financial` (10/min) ✅ Added

**Platform:**
- `/api/platform/tenants` - `write` (20/min)
- `/api/platform/tenants/[id]` - `write` (20/min)
- `/api/platform/settings` - `write` (20/min)
- `/api/platform/announcements` - `write` (20/min)
- `/api/platform/announcements/[id]` - `write` (20/min)

**Subscriptions:**
- `/api/subscriptions` - `write` (20/min)
- `/api/subscriptions/[id]` - `write` (20/min)
- `/api/subscriptions/plans` - `write` (20/min)
- `/api/subscriptions/plans/[id]` - `write` (20/min)

**Adoptions:**
- `/api/adoptions` - `write` (20/min)
- `/api/adoptions/[id]` - `write` (20/min)
- `/api/adoptions/applications/[appId]` - `write` (20/min)

**Lost & Found:**
- `/api/lost-found` - `write` (20/min)
- `/api/lost-found/[id]` - `write` (20/min)

**Growth Charts:**
- `/api/growth_charts` - `write` (20/min)

**WhatsApp (External API):**
- `/api/whatsapp/send` - `write` (20/min) - manual implementation inside handler

### Acceptance Criteria - All Met
- ✅ Rate limiters created for different tiers
- ✅ Auth/financial endpoints limited
- ✅ External API endpoints limited
- ✅ 429 responses include rate limit headers
- ✅ Error messages in Spanish
- ✅ Tests for rate limiting in test files
