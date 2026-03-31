# SEC-027 Booking Request Server Action Lacks Rate Limiting

## Priority: P1

## Category: Security

## Status: Completed

## Resolution
1. Added `booking` rate limit tier (5 requests/hour) to `lib/rate-limit.ts`
2. Created `rateLimitByUser()` function for server actions
3. Applied rate limiting to `createBookingRequest` action in `app/actions/create-booking-request.ts`

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Description

The `createBookingRequest` server action does not have rate limiting configured in its `withActionAuth` options. Users could spam booking requests, potentially overwhelming clinic staff with notifications and filling up appointment queues.

### Current State

**File**: `web/app/actions/create-booking-request.ts`

```typescript
export const createBookingRequest = withActionAuth(
  async ({ user, profile, supabase }, input: CreateBookingRequestInput) => {
    // ... validation and processing ...
  }
  // Missing: { rateLimit: 'booking' } option
)
```

### Attack Scenario

1. Malicious user or bot repeatedly submits booking requests
2. Each request creates pending appointments in database
3. Staff receive notification flood
4. Dashboard becomes cluttered with spam requests
5. Legitimate requests get buried

## Impact

**Security Risk: MEDIUM**
- Appointment system spam/abuse
- Staff notification fatigue
- Database pollution with fake requests
- Degraded user experience for clinic staff

## Proposed Fix

Add rate limiting to the server action:

```typescript
// Option A: Add to withActionAuth options
export const createBookingRequest = withActionAuth(
  async ({ user, profile, supabase }, input: CreateBookingRequestInput) => {
    // ... handler code ...
  },
  { rateLimit: 'booking' }  // Add rate limit tier
)

// In lib/middleware/rate-limit.ts, add 'booking' tier:
const RATE_LIMITS = {
  // ... existing limits ...
  booking: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
}
```

```typescript
// Option B: Add explicit check at start of action
import { checkActionRateLimit } from '@/lib/middleware/rate-limit'

export const createBookingRequest = withActionAuth(
  async ({ user, profile, supabase }, input) => {
    const rateLimitResult = await checkActionRateLimit(user.id, 'booking')
    if (!rateLimitResult.success) {
      return { success: false, error: 'Demasiadas solicitudes. Intente más tarde.' }
    }
    // ... rest of handler ...
  }
)
```

### Suggested Limits

| Action | Limit | Window | Rationale |
|--------|-------|--------|-----------|
| `createBookingRequest` | 5/hour | 1 hour | Normal user needs at most 2-3 requests per hour |
| `scheduleAppointment` | 30/hour | 1 hour | Staff may schedule many, but not unlimited |

## Acceptance Criteria

- [ ] `createBookingRequest` has rate limiting (5 requests/hour per user)
- [ ] Returns user-friendly Spanish error when rate limited
- [ ] Test: Submit 6 booking requests → 6th returns rate limit error
- [ ] Consider IP-based limiting for unauthenticated probing
- [ ] Add comment `// SEC-027: Rate limited to prevent spam`

## Related Files

- `web/app/actions/create-booking-request.ts`
- `web/lib/middleware/rate-limit.ts`
- `web/lib/auth/with-action-auth.ts`

## Estimated Effort

1-2 hours

## Security Severity

**MEDIUM** - Spam prevention and system abuse protection.
