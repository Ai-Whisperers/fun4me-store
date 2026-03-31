# P0-003: Add Rate Limiting to Auth & Financial Endpoints

**Priority**: P0 (CRITICAL - SECURITY)  
**Category**: Security  
**Effort**: 2 days  
**Epic**: Security Hardening  
**Created**: 2026-01-19

---

## Problem

Critical authentication and financial endpoints lack rate limiting, making them vulnerable to **brute-force attacks** and **API abuse**.

### Current State

From `critique/13-api-routes-deep-roast.md`:

**Rate limiting exists but is barely used:**
- ✅ Rate limiting infrastructure exists (`lib/api/rate-limit.ts`)
- ❌ Applied to only **~10 routes** out of 312 API routes
- ❌ **Auth endpoints UNPROTECTED**: `/api/auth/*` can be brute-forced
- ❌ **Financial endpoints UNPROTECTED**: `/api/invoices/*`, `/api/payments/*`

**Attack vectors:**
1. **Login brute-force**: Try 1000+ passwords against admin accounts
2. **Signup spam**: Create hundreds of fake accounts
3. **Invoice enumeration**: Iterate through invoice IDs to extract financial data
4. **Payment manipulation**: Rapidly test payment endpoints for bugs

---

## Root Cause Analysis

**Why was rate limiting not applied everywhere?**

1. **Infrastructure exists but not enforced**: `rate-limit.ts` built but left optional
2. **No systematic application**: Each route file decides whether to use it
3. **Lack of documentation**: No guidance on which endpoints need protection
4. **Performance concerns**: Fear of rate limiting legitimate users

**Cost of not having it:**
- Exposed to credential stuffing attacks
- Invoice data can be scraped
- Payment endpoints can be probed for vulnerabilities
- No protection against DoS

---

## Proposed Solution

### Rate Limit Tiers

Define clear tiers based on sensitivity:

```typescript
// web/lib/api/rate-limits.ts
export const RateLimits = {
  // Public endpoints (unauthenticated)
  public: {
    requests: 100,
    window: '1m',
    identifier: 'ip'  // By IP address
  },

  // General authenticated endpoints
  authenticated: {
    requests: 60,
    window: '1m',
    identifier: 'user'  // By user ID
  },

  // Sensitive operations (data access)
  sensitive: {
    requests: 20,
    window: '1m',
    identifier: 'user'
  },

  // Authentication attempts (login, signup, password reset)
  auth: {
    requests: 5,
    window: '5m',  // 5 attempts per 5 minutes
    identifier: 'ip'
  },

  // Financial operations (invoices, payments, refunds)
  financial: {
    requests: 10,
    window: '1m',
    identifier: 'user'
  }
}
```

### Priority Endpoints (Phase 1 - TODAY)

**P0 - Authentication Endpoints** (Highest risk):
```typescript
// app/api/auth/login/route.ts
import { rateLimit, RateLimits } from '@/lib/api/rate-limit'

export async function POST(request: NextRequest) {
  // Apply strict rate limiting FIRST
  const limitResult = await rateLimit(request, RateLimits.auth)
  
  if (!limitResult.success) {
    return NextResponse.json(
      {
        error: "Demasiados intentos. Intente nuevamente en 5 minutos.",
        retryAfter: limitResult.resetAt
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(limitResult.resetAt),
          'X-RateLimit-Limit': String(RateLimits.auth.requests),
          'X-RateLimit-Remaining': String(limitResult.remaining || 0),
          'X-RateLimit-Reset': String(limitResult.resetAt)
        }
      }
    )
  }

  // Continue with authentication logic...
}
```

**Endpoints to protect:**
- `/api/auth/login` - Login attempts
- `/api/auth/signup` - Account creation
- `/api/auth/reset-password` - Password reset
- `/api/auth/verify-otp` - OTP verification

**P0 - Financial Endpoints**:
- `/api/invoices/*` - Invoice CRUD
- `/api/payments/*` - Payment processing
- `/api/refunds/*` - Refund operations
- `/api/store/checkout` - E-commerce checkout

---

## Implementation Steps

### Step 1: Enhance Rate Limiting Infrastructure (1 hour)

```typescript
// web/lib/api/rate-limit.ts (ENHANCE EXISTING)

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

export interface RateLimitConfig {
  requests: number
  window: string  // '1m', '5m', '1h'
  identifier: 'ip' | 'user'
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Determine identifier (IP or user ID)
  const identifier = config.identifier === 'ip'
    ? getClientIP(request)
    : await getUserId(request)

  if (!identifier) {
    // If no identifier, allow (but log warning)
    console.warn('[RateLimit] No identifier found, allowing request')
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests,
      resetAt: Date.now() + parseWindow(config.window)
    }
  }

  // Create Redis key
  const key = `rate-limit:${request.nextUrl.pathname}:${identifier}:${config.window}`
  
  // Increment counter
  const count = await redis.incr(key)
  
  // Set expiration on first request
  if (count === 1) {
    await redis.expire(key, parseWindow(config.window) / 1000)
  }
  
  // Get TTL for resetAt
  const ttl = await redis.ttl(key)
  const resetAt = Date.now() + (ttl * 1000)
  
  return {
    success: count <= config.requests,
    limit: config.requests,
    remaining: Math.max(0, config.requests - count),
    resetAt
  }
}

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]
    || request.headers.get('x-real-ip')
    || 'unknown'
}

async function getUserId(request: NextRequest): Promise<string | null> {
  // Extract from session/auth token
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  
  // ... decode JWT or session token to get user ID
  // Return user ID if authenticated, null otherwise
  return null // Placeholder - implement based on your auth
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smh])$/)
  if (!match) throw new Error(`Invalid window format: ${window}`)
  
  const [, amount, unit] = match
  const multipliers = { s: 1000, m: 60000, h: 3600000 }
  return parseInt(amount) * multipliers[unit as 's' | 'm' | 'h']
}
```

### Step 2: Create Rate Limit Middleware (2 hours)

```typescript
// web/lib/api/with-rate-limit.ts (NEW FILE)

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, RateLimitConfig, RateLimitResult } from './rate-limit'

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Apply rate limiting
    const result = await rateLimit(request, config)
    
    if (!result.success) {
      // Log rate limit violation
      console.warn('[RateLimit] Limit exceeded', {
        path: request.nextUrl.pathname,
        identifier: config.identifier,
        limit: result.limit
      })
      
      return NextResponse.json(
        {
          error: "Demasiadas solicitudes. Por favor, espere e intente nuevamente.",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: getRateLimitHeaders(result)
        }
      )
    }
    
    // Continue with handler, include rate limit headers
    const response = await handler(request)
    
    // Add rate limit headers to response
    const headers = getRateLimitHeaders(result)
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
    
    return response
  }
}

function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
    'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000))
  }
}
```

### Step 3: Apply to Auth Endpoints (3 hours)

```typescript
// app/api/auth/login/route.ts
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { RateLimits } from '@/lib/api/rate-limits'

async function handleLogin(request: NextRequest) {
  // Original login logic
  // ...
}

export const POST = withRateLimit(handleLogin, RateLimits.auth)
```

**Apply to all auth endpoints:**
- `app/api/auth/login/route.ts`
- `app/api/auth/signup/route.ts`
- `app/api/auth/reset-password/route.ts`
- `app/api/auth/verify-otp/route.ts`
- `app/api/auth/refresh-token/route.ts`

### Step 4: Apply to Financial Endpoints (4 hours)

```typescript
// app/api/invoices/route.ts
import { withRateLimit } from '@/lib/api/with-rate-limit'
import { withApiAuth } from '@/lib/api/with-api-auth'
import { RateLimits } from '@/lib/api/rate-limits'

async function handleInvoices(request: NextRequest, context: AuthContext) {
  // Original invoice logic
}

export const GET = withRateLimit(
  withApiAuth(handleInvoices),
  RateLimits.financial
)

export const POST = withRateLimit(
  withApiAuth(handleInvoices),
  RateLimits.financial
)
```

**Apply to all financial endpoints:**
- `app/api/invoices/route.ts`
- `app/api/invoices/[id]/route.ts`
- `app/api/payments/route.ts`
- `app/api/payments/[id]/route.ts`
- `app/api/refunds/route.ts`
- `app/api/store/checkout/route.ts`

### Step 5: Testing (2 hours)

```typescript
// tests/api/rate-limiting.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { RateLimits } from '@/lib/api/rate-limits'

describe('Rate Limiting - Auth Endpoints', () => {
  beforeEach(async () => {
    // Clear Redis before each test
    await clearRateLimitCache()
  })

  it('allows requests within limit', async () => {
    const requests = Array(RateLimits.auth.requests).fill(null)
    
    for (const _ of requests) {
      const response = await loginHandler(createMockRequest())
      expect(response.status).not.toBe(429)
    }
  })

  it('blocks requests exceeding limit', async () => {
    // Make requests up to limit
    for (let i = 0; i < RateLimits.auth.requests; i++) {
      await loginHandler(createMockRequest())
    }
    
    // Next request should be rate limited
    const response = await loginHandler(createMockRequest())
    expect(response.status).toBe(429)
    
    const data = await response.json()
    expect(data.error).toContain('Demasiados intentos')
    expect(data.retryAfter).toBeGreaterThan(0)
  })

  it('resets counter after window expires', async () => {
    // Make requests up to limit
    for (let i = 0; i < RateLimits.auth.requests; i++) {
      await loginHandler(createMockRequest())
    }
    
    // Wait for window to expire
    await sleep(parseWindow(RateLimits.auth.window))
    
    // Should allow requests again
    const response = await loginHandler(createMockRequest())
    expect(response.status).not.toBe(429)
  })

  it('includes rate limit headers', async () => {
    const response = await loginHandler(createMockRequest())
    
    expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy()
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
  })
})

describe('Rate Limiting - Financial Endpoints', () => {
  it('allows authenticated requests within limit', async () => {
    // Test invoice endpoint
    const requests = Array(RateLimits.financial.requests).fill(null)
    
    for (const _ of requests) {
      const response = await GET(createAuthenticatedRequest())
      expect(response.status).not.toBe(429)
    }
  })

  it('blocks excessive invoice queries', async () => {
    // Make requests up to limit
    for (let i = 0; i < RateLimits.financial.requests; i++) {
      await GET(createAuthenticatedRequest())
    }
    
    // Next request should be rate limited
    const response = await GET(createAuthenticatedRequest())
    expect(response.status).toBe(429)
  })
})
```

---

## Acceptance Criteria

### Infrastructure
- [ ] `RateLimits` configuration defined with 5 tiers
- [ ] `withRateLimit` middleware created and tested
- [ ] Rate limit headers included in all responses
- [ ] Redis/Upstash configured for rate limit storage

### Auth Endpoints (P0 - Day 1)
- [ ] `/api/auth/login` - 5 requests per 5 minutes by IP
- [ ] `/api/auth/signup` - 5 requests per 5 minutes by IP
- [ ] `/api/auth/reset-password` - 5 requests per 5 minutes by IP
- [ ] `/api/auth/verify-otp` - 5 requests per 5 minutes by IP
- [ ] `/api/auth/refresh-token` - 10 requests per 1 minute by user

### Financial Endpoints (P0 - Day 2)
- [ ] `/api/invoices/*` - 10 requests per 1 minute by user
- [ ] `/api/payments/*` - 10 requests per 1 minute by user
- [ ] `/api/refunds/*` - 10 requests per 1 minute by user
- [ ] `/api/store/checkout` - 10 requests per 1 minute by user

### Testing
- [ ] Unit tests for rate limit logic
- [ ] Integration tests for each protected endpoint
- [ ] Manual testing with realistic scenarios
- [ ] Performance testing (Redis latency < 50ms)

### Documentation
- [ ] `CLAUDE.md` updated with rate limiting guidelines
- [ ] API documentation includes rate limit headers
- [ ] `README.md` mentions rate limiting for API consumers

---

## Expected Issues & Solutions

### Issue 1: Legitimate Users Hit Limits

**Scenario**: Admin user refreshing invoices page repeatedly  
**Solution**: Use higher limits for authenticated users (60/min vs 10/min for financial)

**Scenario**: Mobile app retries failed requests aggressively  
**Solution**: Implement exponential backoff in client, respect `Retry-After` header

### Issue 2: Shared IPs (Corporate Networks)

**Scenario**: Entire office shares one public IP  
**Solution**: For authenticated endpoints, use user ID instead of IP

### Issue 3: Redis Unavailable

**Scenario**: Redis/Upstash down or unreachable  
**Solution**: Fallback to allow request (fail open), log error for investigation

```typescript
try {
  const result = await rateLimit(request, config)
  // ...
} catch (error) {
  console.error('[RateLimit] Redis error, allowing request', error)
  return { success: true, limit: config.requests, remaining: config.requests, resetAt: Date.now() + 60000 }
}
```

---

## Files to Modify

### New Files
- `web/lib/api/rate-limits.ts` - Rate limit tier definitions
- `web/lib/api/with-rate-limit.ts` - Middleware wrapper
- `tests/api/rate-limiting.test.ts` - Test suite

### Modified Files
- `web/lib/api/rate-limit.ts` - Enhance existing implementation
- `app/api/auth/login/route.ts` - Apply rate limiting
- `app/api/auth/signup/route.ts` - Apply rate limiting
- `app/api/auth/reset-password/route.ts` - Apply rate limiting
- `app/api/invoices/route.ts` - Apply rate limiting
- `app/api/payments/route.ts` - Apply rate limiting
- `app/api/store/checkout/route.ts` - Apply rate limiting
- `CLAUDE.md` - Document rate limiting standards

---

## Environment Variables

Required for Upstash Redis:

```bash
# web/.env.local
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

If not configured, rate limiting will fail open (allow requests) but log errors.

---

## Monitoring & Alerts

### Metrics to Track
- **Rate limit violations per endpoint** (high volume = attack or misconfiguration)
- **Rate limit hit rate** (% of requests that hit limit)
- **Redis latency** (should be < 50ms p99)

### Alerts to Configure
- **Alert if >100 rate limit violations per minute** (potential attack)
- **Alert if Redis latency >200ms** (performance issue)
- **Alert if Redis unavailable** (fail-open mode active)

---

## Related Issues

- **SEC-025**: Credentials in Git History (rotate credentials first!)
- **P0-001**: Enable Build Quality Gates (blocks type safety)
- **Critique**: `critique/13-api-routes-deep-roast.md` (API Routes section)
- **Master Report**: `critique/00-MASTER-DEEP-DIVE-REPORT.md` (lines 59-68)

---

**Status**: Ready for implementation  
**Owner**: TBD  
**Sprint**: IMMEDIATE (P0 - Security)  
**Last Updated**: 2026-01-19
