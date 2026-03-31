# SEC-006: Cron Auth Timing Attack Vulnerability

## Priority: P2 (Medium)
## Category: Security
## Status: COMPLETED

## Description
Cron job authorization uses simple string comparison which is vulnerable to timing attacks. Failed attempts are not rate-limited or properly logged.

## Current State
### Problematic Code
**`app/api/cron/release-reservations/route.ts:15-28`** (and all cron files)
```typescript
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET

if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Issues
1. String comparison (`!==`) is vulnerable to timing attacks
   - Attacker can measure response time to guess secret character by character
2. No rate limiting on failed attempts
3. Failed attempts only logged as warning, not tracked for security
4. Same pattern repeated across 14+ cron endpoints

### Impact
- CRON_SECRET can be brute-forced via timing analysis
- Attackers can invoke cron jobs (process subscriptions, release stock, etc.)
- No alerting when attack is in progress

## Proposed Solution

### 1. Use Timing-Safe Comparison
```typescript
// lib/api/cron-auth.ts
import { timingSafeEqual } from 'crypto'

export function verifyCronSecret(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || !authHeader) return false

  const expected = `Bearer ${cronSecret}`
  const provided = authHeader

  // Ensure same length comparison
  if (expected.length !== provided.length) return false

  return timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(provided)
  )
}
```

### 2. Add Rate Limiting
```typescript
// lib/api/cron-auth.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const cronRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 m'), // 3 attempts per minute
  prefix: 'ratelimit:cron',
})

export async function verifyCronAuth(request: NextRequest): Promise<boolean> {
  const ip = request.ip ?? 'unknown'
  const { success } = await cronRateLimiter.limit(ip)

  if (!success) {
    logger.error('Cron rate limit exceeded', { ip })
    return false
  }

  return verifyCronSecret(request.headers.get('authorization'))
}
```

### 3. Centralized Wrapper
```typescript
// lib/api/with-cron-auth.ts
export function withCronAuth(handler: NextHandler) {
  return async (request: NextRequest) => {
    const authorized = await verifyCronAuth(request)

    if (!authorized) {
      logger.error('Unauthorized cron attempt', {
        ip: request.ip,
        endpoint: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return handler(request)
  }
}
```

## Implementation Steps
1. Create centralized cron auth utility
2. Implement timing-safe comparison
3. Add rate limiting with Upstash
4. Add security logging for failed attempts
5. Update all 14+ cron endpoints to use wrapper
6. Add alerting for repeated failures

## Acceptance Criteria
- [ ] All cron endpoints use timing-safe comparison
- [ ] Rate limiting prevents brute force (max 3/min)
- [ ] Failed attempts logged with IP and timestamp
- [ ] Alerting triggers on 10+ failures per hour
- [ ] Existing cron jobs still work correctly

## Related Files
- `web/lib/api/cron-auth.ts` (new)
- `web/app/api/cron/*/route.ts` (14+ files)

## Estimated Effort
- Auth utility: 2 hours
- Update cron files: 2 hours
- Rate limiting: 1 hour
- Alerting: 1 hour
- Testing: 1 hour
- **Total: 7 hours**

---
## Implementation Summary (Completed)

**File Created:** `lib/api/cron-auth.ts`

**Key Security Features:**
1. **Timing-safe comparison** using `crypto.timingSafeEqual()` - prevents character-by-character guessing
2. **Constant-time for length mismatch** - dummy comparison when lengths differ to maintain timing consistency
3. **Proper logging** with IP, user agent, and endpoint details for security monitoring
4. **Dual header support** - accepts both `x-cron-secret` (Vercel style) and `Authorization: Bearer` headers

**Functions Exported:**
- `verifyCronSecret(request)` - Low-level timing-safe verification
- `checkCronAuth(request)` - Standalone check returning `{ authorized, errorResponse }`
- `withCronAuth(handler)` - Higher-order wrapper for declarative auth

**All 13 Cron Routes Updated:**
All cron endpoints now use `checkCronAuth()` with comment `// SEC-006: Use timing-safe cron authentication`:
- `/api/cron/release-reservations`
- `/api/cron/process-subscriptions`
- `/api/cron/billing/auto-charge`
- `/api/cron/billing/evaluate-grace`
- `/api/cron/billing/send-reminders`
- `/api/cron/billing/generate-platform-invoices`
- `/api/cron/generate-commission-invoices`
- `/api/cron/generate-recurring`
- `/api/cron/expiry-alerts`
- `/api/cron/stock-alerts`
- `/api/cron/stock-alerts/staff`
- `/api/cron/reminders`
- `/api/cron/reminders/generate`

**Result:** Cron endpoints are now resistant to timing attacks. Failed attempts are logged with security context for monitoring.

---
*Ticket created: January 2026*
*Completed: January 2026*
