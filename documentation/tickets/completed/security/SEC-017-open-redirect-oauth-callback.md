# SEC-017 Open Redirect Vulnerability in OAuth Callback

## Priority: P0

## Category: Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

The OAuth callback route (`/auth/callback`) accepts an unvalidated `redirect` parameter from the URL and uses it directly in `NextResponse.redirect()`. This enables open redirect attacks.

**Note**: BUG-002 created `sanitizeRedirectUrl()` utility in `lib/auth/redirect.ts` but this utility is **not being used** in the auth callback.

### Vulnerable Code

**`web/app/auth/callback/route.ts`** (Lines 16, 37, 46):
```typescript
const redirectTo = searchParams.get('redirect') ?? searchParams.get('next') ?? '/'

// ... profile poll loop ...

// VULNERABLE: redirectTo used without sanitization
return NextResponse.redirect(`${origin}${redirectTo}`)
```

### Attack Vector

1. Attacker crafts malicious OAuth link:
   ```
   https://yourapp.com/auth/callback?code=valid_code&redirect=https://attacker.com
   ```
2. User completes OAuth authentication legitimately
3. After successful auth, user is redirected to attacker-controlled website
4. Attacker can:
   - Phish for credentials on a fake login page
   - Capture any tokens in the URL
   - Social engineering attacks with legitimate-looking referrer

## Impact

**Security Risk (Critical)**:
- OAuth tokens could be exposed to third parties
- Users can be phished immediately after successful authentication
- Damages trust - attack originates from legitimate login flow

**CVSS Score**: ~6.1 (Medium-High) - CWE-601: URL Redirection to Untrusted Site

## Proposed Fix

Use the existing `sanitizeRedirectUrl()` utility:

```typescript
import { sanitizeRedirectUrl } from '@/lib/auth/redirect'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawRedirect = searchParams.get('redirect') ?? searchParams.get('next') ?? '/'

  // SEC-017: Sanitize redirect to prevent open redirect attacks
  const redirectTo = sanitizeRedirectUrl(rawRedirect, '/', origin)

  if (code) {
    // ... existing code ...

    // Now safe to redirect
    return NextResponse.redirect(`${origin}${redirectTo}`)
  }

  // ...
}
```

## Acceptance Criteria

- [x] Import `sanitizeRedirectUrl` from `@/lib/auth/redirect`
- [x] Sanitize redirect URL before using it
- [x] Add `// SEC-017: Sanitize redirect to prevent open redirect attacks` comment
- [x] Test with external URLs (should redirect to `/` instead)
- [x] Test with valid internal paths (should work normally)
- [x] Test with protocol-relative URLs (`//evil.com`) - should be blocked

## Related Files

- `web/app/auth/callback/route.ts` - Main fix location
- `web/lib/auth/redirect.ts` - Utility already exists
- `documentation/tickets/completed/bugs/BUG-002-redirect-param-inconsistency.md` - Created the utility

## Estimated Effort

15 minutes

## Testing Notes

1. Navigate to `/auth/callback?code=test&redirect=https://evil.com`
2. Should NOT redirect to evil.com (should redirect to `/`)
3. Navigate to `/auth/callback?code=test&redirect=/adris/portal/dashboard`
4. Should redirect to `/adris/portal/dashboard` (valid internal path)
5. Test with `//evil.com` - should be blocked

## Security Severity

**CRITICAL** - This is a direct, exploitable open redirect vulnerability in the authentication flow.
