# SEC-014 Referrals Apply Endpoint Missing Authentication

## Priority: P0

## Category: Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

The referral apply endpoint at `/api/referrals/apply` has **no authentication check**. Any unauthenticated user can call this endpoint and create referral associations for any tenant.

The endpoint uses service role directly without verifying caller identity:

```typescript
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { code, tenant_id, utm_source, utm_medium, utm_campaign } = body
    // ...
    const supabase = createClient(supabaseUrl, supabaseServiceKey)  // Service role!
    // No auth check - anyone can call this
```

The comment says "Should be called from the signup flow with service role" but there's no validation that the caller is actually the signup flow or has any authorization.

## Impact

**CRITICAL**:
1. **Abuse of Referral Program**: Attackers could apply referral codes to any tenant, potentially:
   - Granting themselves referral bonuses for tenants they didn't refer
   - Gaming the referral program to earn commissions
   - Exhausting referral codes or creating fraudulent referral chains

2. **No Rate Limiting**: Combined with missing auth, this endpoint can be spammed to test referral codes.

3. **Data Integrity**: Any referral statistics would be unreliable since referrals can be applied without legitimate signup flow.

## Location

`web/app/api/referrals/apply/route.ts` lines 25-52

## Proposed Fix

This endpoint should only be callable from the signup flow. Options:

### Option A: Internal-only endpoint (Recommended)
Make this a server action or internal function called only from the signup process, not an API route.

### Option B: Verify signup context
Add a signed token or HMAC verification to ensure the request comes from a legitimate signup flow:

```typescript
import { checkCronAuth } from '@/lib/auth'  // Similar pattern
import { timingSafeEqual } from 'crypto'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify internal caller with secret
  const authHeader = request.headers.get('x-internal-auth')
  const expectedToken = process.env.INTERNAL_API_SECRET

  if (!authHeader || !expectedToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedToken))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // ... rest of handler
}
```

### Option C: Rate limiting (minimum)
At minimum, add aggressive rate limiting to prevent abuse:

```typescript
import { ratelimit } from '@/lib/ratelimit'

const ip = request.headers.get('x-forwarded-for') || 'unknown'
const { success } = await ratelimit.limit(`referral-apply:${ip}`)
if (!success) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

## Acceptance Criteria

- [x] Endpoint requires authentication OR internal secret (uses X-Internal-Auth header with timing-safe comparison)
- [x] Rate limiting applied to prevent abuse (10 requests/hour per IP)
- [x] Only legitimate signup flows can apply referrals (referral processing integrated into /api/signup)
- [x] Existing referral attribution for legitimate signups continues to work (referralCode processed in signup flow)

## Implementation Notes

Two-pronged approach implemented:

1. **API Route Security** (`/api/referrals/apply`):
   - Added `X-Internal-Auth` header validation with timing-safe comparison
   - Added rate limiting (10 requests/hour per IP)
   - Requires `INTERNAL_API_SECRET` environment variable
   - Fails safely if secret not configured

2. **Signup Integration** (`/api/signup`):
   - Added Step 8: Apply referral code if provided
   - Processes referral directly using service role (no external API call needed)
   - Non-fatal: signup succeeds even if referral fails
   - Returns referral bonus info in response

## Related Files

- `web/app/api/referrals/apply/route.ts` - Needs auth
- `web/lib/auth/index.ts` - Auth utilities reference
- `web/app/actions/auth.ts` - Signup flow that calls this endpoint

## Estimated Effort

2-3 hours

## Testing Notes

1. Verify unauthenticated requests are rejected
2. Verify legitimate signup flow can still apply referral codes
3. Test rate limiting by making multiple rapid requests
4. Verify error messages don't leak internal details
