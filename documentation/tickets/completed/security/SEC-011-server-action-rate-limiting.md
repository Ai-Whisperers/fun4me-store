# SEC-011 Missing Rate Limiting on Public Server Actions

## Priority: P2

## Category: Security

## Status: ✅ Complete

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completion Date: January 2026

## Description

Several server actions that handle public-facing forms lack rate limiting, making them vulnerable to abuse:

1. **`submitContactForm`** (`web/app/actions/contact-form.ts`) - Public contact form with no rate limiting
2. **`reportFoundPet`** (`web/app/actions/safety.ts`) - Public lost pet reporting with no rate limiting

While API routes have been secured with rate limiting (SEC-002), server actions were missed in that implementation. Server actions are equally vulnerable to abuse since they're directly callable from client-side forms.

## Current State

```typescript
// web/app/actions/contact-form.ts:15-49
export async function submitContactForm(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // No rate limiting - vulnerable to spam
  const rawData = { ... }
  const validation = contactFormSchema.safeParse(rawData)
  // ... processes form
}

// web/app/actions/safety.ts:92-117
export async function reportFoundPet(petId: string, location?: string, contact?: string) {
  // No auth required AND no rate limiting
  const supabase = await createClient()
  // ... inserts record directly
}
```

## Impact

- **Spam/DoS**: Attackers can flood the contact form with garbage submissions
- **Resource Exhaustion**: Database can be filled with spam records
- **Email Abuse**: If contact form triggers email notifications, this could be used to spam
- **Data Pollution**: Lost pet reports could be spammed with fake sightings
- **IP Reputation**: Server IPs could be blacklisted if used to send spam

## Location

- `web/app/actions/contact-form.ts` lines 15-49
- `web/app/actions/safety.ts` lines 92-117

## Proposed Fix

Create a rate limiting wrapper for server actions similar to the API route pattern:

```typescript
// web/lib/auth/action-rate-limit.ts
import { rateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

export async function checkActionRateLimit(type: RateLimitType): Promise<boolean> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') || 'unknown'

  const { success } = await rateLimit(
    { ip } as any,  // Mock request object
    type
  )

  return success
}

// Usage in contact-form.ts
export async function submitContactForm(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // Rate limit: 5 submissions per minute
  const allowed = await checkActionRateLimit('auth')
  if (!allowed) {
    return { success: false, error: 'Demasiados intentos. Espera un momento.' }
  }

  // ... rest of function
}
```

## Implementation Steps

1. [x] Create `lib/auth/action-rate-limit.ts` helper for server actions
2. [x] Add rate limiting to `submitContactForm` (5 req/min)
3. [x] Add rate limiting to `reportFoundPet` (10 req/hour per IP)
4. [x] Audit other public server actions for similar issues
5. [x] Add tests for rate limiting behavior
6. [x] Document the pattern for future server actions

## Other Public Actions to Audit

- `assignTag` - Has auth check, may still need rate limiting
- Any future public-facing server actions

## Acceptance Criteria

- [x] All public server actions have rate limiting
- [x] Rate limit errors return user-friendly Spanish messages
- [x] Rate limits use in-memory sliding window (consistent pattern)
- [x] Tests verify rate limiting works
- [x] Documentation updated with pattern

## Implementation Notes

Created `lib/auth/action-rate-limit.ts` with:
- `checkActionRateLimit(type, identifier?)` - Check and consume rate limit
- `clearActionRateLimits()` - Clear all limits (testing)
- `ACTION_RATE_LIMITS` presets for common actions

Rate limits applied to:
- `submitContactForm` - 5 requests per minute (auth type)
- `reportFoundPet` - 5 requests per hour (refund type)

Tests added:
- `tests/unit/lib/action-rate-limit.test.ts` - 15 tests
- Updated `tests/unit/actions/safety.test.ts` - Mocked rate limiting
- Updated `tests/unit/actions/contact-form.test.ts` - Mocked rate limiting

## Related Files

- `web/app/actions/contact-form.ts`
- `web/app/actions/safety.ts`
- `web/lib/rate-limit.ts` (existing infrastructure)
- `web/lib/auth/api-wrapper.ts` (reference implementation)

## Estimated Effort

- 3-4 hours
