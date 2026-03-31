# SEC-027: Add Rate Limiting to Sensitive Endpoints

**Category**: Security  
**Priority**: P0 - CRITICAL  
**Status**: Open  
**Effort**: 1 day  
**Impact**: Critical - Brute force protection  
**Created**: 2025-01-19  
**Source**: critique/03-api-design-roast.md (API-002)

## Summary

Rate limiting exists but is only applied to one endpoint. Critical endpoints (auth, financial, sensitive data) are unprotected against brute force attacks.

## Problem

**Unprotected endpoints:**
- `/api/auth/login` - No brute-force protection!
- `/api/invoices` - Financial data, brute-forceable
- `/api/appointments/slots` - Staff schedules exposed
- `/api/store/cart` - User cart manipulation
- `/api/pets/[id]/qr` - Sensitive pet data

**Rate limiter exists but unused:**
```typescript
// lib/api/rate-limit.ts - Built but only used on /api/services
import { rateLimit } from '@/lib/api/rate-limit';
```

## Solution

### Define Rate Limit Tiers

```typescript
// lib/api/rate-limits.ts
export const RateLimits = {
  public: { requests: 100, window: '1m' },
  authenticated: { requests: 60, window: '1m' },
  sensitive: { requests: 10, window: '1m' },
  auth: { requests: 5, window: '1m' },  // Login/signup
  financial: { requests: 20, window: '1m' },
};
```

### Apply to Sensitive Endpoints

```typescript
// app/api/auth/login/route.ts
import { rateLimit, RateLimits } from '@/lib/api/rate-limit';

export async function POST(request: NextRequest) {
  // Apply strict rate limiting
  const limitResult = await rateLimit(request, RateLimits.auth);
  if (!limitResult.success) {
    return NextResponse.json(
      { error: 'Too many attempts' },
      { status: 429 }
    );
  }
  
  // Continue with login logic
}
```

### Integration with withAuth

```typescript
// lib/api/with-auth.ts
export function withAuth(
  handler: Handler,
  options?: {
    roles?: Role[];
    rateLimit?: RateLimitConfig;
  }
) {
  return async (request: NextRequest) => {
    // Apply rate limiting if specified
    if (options?.rateLimit) {
      const limitResult = await rateLimit(request, options.rateLimit);
      if (!limitResult.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    }
    
    // Continue with auth check
  };
}

// Usage
export const POST = withAuth(handler, {
  rateLimit: RateLimits.financial
});
```

## Implementation Plan

### Phase 1: Critical Endpoints (TODAY)
- [ ] `/api/auth/login` - RateLimits.auth
- [ ] `/api/auth/signup` - RateLimits.auth
- [ ] `/api/auth/reset-password` - RateLimits.auth

### Phase 2: Financial Endpoints (THIS WEEK)
- [ ] `/api/invoices/*` - RateLimits.financial
- [ ] `/api/payments/*` - RateLimits.financial
- [ ] `/api/store/checkout` - RateLimits.financial

### Phase 3: Sensitive Data (THIS WEEK)
- [ ] `/api/pets/[id]/qr` - RateLimits.sensitive
- [ ] `/api/medical-records/*` - RateLimits.sensitive
- [ ] `/api/appointments/slots` - RateLimits.authenticated

## Acceptance Criteria
- [ ] All auth endpoints rate limited
- [ ] All financial endpoints rate limited
- [ ] Rate limiting returns proper 429 status
- [ ] Rate limit headers included in response
- [ ] Monitoring/logging for rate limit violations

## Testing

```typescript
// Test rate limiting
describe('Rate Limiting', () => {
  it('blocks after 5 login attempts', async () => {
    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      await fetch('/api/auth/login', { method: 'POST' });
    }
    
    // 6th request should be rate limited
    const response = await fetch('/api/auth/login', { method: 'POST' });
    expect(response.status).toBe(429);
  });
});
```

## Related
- REF-001: Centralize auth patterns
- Security audit
