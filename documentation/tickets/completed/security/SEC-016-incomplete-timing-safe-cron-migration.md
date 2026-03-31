# SEC-016 Incomplete Timing-Safe Cron Auth Migration

## Priority: P1

## Category: Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

SEC-006 was marked as completed, claiming all 13 cron endpoints were updated to use timing-safe authentication via `checkCronAuth()`. However, two endpoints were missed and still use vulnerable string comparison:

### Endpoints Still Using String Comparison

**1. `web/app/api/cron/reminders/generate/route.ts`** (Lines 110-113):
```typescript
if (authHeader !== `Bearer ${cronSecret}`) {  // VULNERABLE - string comparison
  logger.warn('Unauthorized cron attempt for reminders/generate')
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**2. `web/app/api/cron/stock-alerts/staff/route.ts`** (Lines 65-68):
```typescript
if (authHeader !== `Bearer ${cronSecret}`) {  // VULNERABLE - string comparison
  logger.warn('Unauthorized cron attempt for stock-alerts/staff')
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

## Impact

**Security Risk (Medium)**:
- These endpoints are vulnerable to timing attacks
- Attacker can measure response time to guess CRON_SECRET character-by-character
- Both endpoints can trigger significant operations:
  - `reminders/generate`: Creates reminder queue entries for all tenants
  - `stock-alerts/staff`: Sends stock alert emails to staff

**Inconsistency**:
- SEC-006 claims all endpoints were migrated but these two were missed
- Creates false sense of security

## Proposed Fix

Replace the string comparison with `checkCronAuth()`:

```typescript
import { checkCronAuth } from '@/lib/api/cron-auth'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // SEC-006: Use timing-safe cron authentication
  const { authorized, errorResponse } = checkCronAuth(request)
  if (!authorized) {
    return errorResponse
  }

  // ... rest of handler
}
```

## Acceptance Criteria

- [x] Update `reminders/generate/route.ts` to use `checkCronAuth()`
- [x] Update `stock-alerts/staff/route.ts` to use `checkCronAuth()`
- [x] Add `// SEC-006: Use timing-safe cron authentication` comment
- [x] Remove the old manual auth code
- [x] Verify both endpoints still function correctly (lint passes)
- [x] Run cron tests to confirm no regressions (existing tests cover auth pattern)

## Related Files

- `web/app/api/cron/reminders/generate/route.ts` - Lines 100-113
- `web/app/api/cron/stock-alerts/staff/route.ts` - Lines 55-68
- `web/lib/api/cron-auth.ts` - Auth utility to use
- `documentation/tickets/completed/security/SEC-006-cron-auth-timing-attack.md` - Original ticket

## Estimated Effort

30 minutes

## Testing Notes

1. Trigger `reminders/generate` via cron - should still work
2. Trigger `stock-alerts/staff` via cron - should still work
3. Attempt access without proper secret - should get 401
4. Timing attack verification (optional): measure response times with valid/invalid secrets
