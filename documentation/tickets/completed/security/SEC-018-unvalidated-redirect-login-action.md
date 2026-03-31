# SEC-018 Unvalidated Redirect in Login Server Action

## Priority: P0

## Category: Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

The login server action (`auth/actions.ts`) accepts an unvalidated `redirect` parameter from FormData and uses it directly in `redirect()`. This enables open redirect attacks after successful authentication.

**Note**: BUG-002 created `sanitizeRedirectUrl()` utility but it's **not being used** in login actions.

### Vulnerable Code

**`web/app/auth/actions.ts`** (Lines 108, 126-129):
```typescript
export async function login(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  // ...
  const redirectParam = (formData.get('redirect') ?? formData.get('returnTo')) as string

  // ... auth logic ...

  // VULNERABLE: redirectParam used without sanitization
  const redirectPath = redirectParam || `/${data.clinic}/portal/dashboard`
  revalidatePath(`/${data.clinic}/portal`, 'layout')
  redirect(redirectPath)  // DANGER: Can redirect to external URL
}
```

### Attack Vector

1. Attacker creates form submission to login endpoint with:
   ```html
   <form action="/auth/login" method="POST">
     <input type="hidden" name="redirect" value="https://attacker.com/phish" />
     <!-- ... email/password fields ... -->
   </form>
   ```
2. User enters credentials on what looks like legitimate form
3. After successful login, user is redirected to attacker's site
4. Attacker captures session or runs phishing page

## Impact

**Security Risk (Critical)**:
- Users redirected to malicious sites after authenticating
- Session hijacking possible if tokens in URL
- Phishing attacks with legitimate auth flow
- Particularly dangerous because user just entered real credentials

**CVSS Score**: ~6.1 (Medium-High) - CWE-601: URL Redirection to Untrusted Site

## Proposed Fix

```typescript
import { sanitizeRedirectUrl } from '@/lib/auth/redirect'

export async function login(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  // ... existing validation ...

  const data = validation.data
  const redirectParam = (formData.get('redirect') ?? formData.get('returnTo')) as string

  // ... auth logic ...

  // SEC-018: Sanitize redirect to prevent open redirect attacks
  const defaultRedirect = `/${data.clinic}/portal/dashboard`
  const redirectPath = sanitizeRedirectUrl(
    redirectParam || defaultRedirect,
    defaultRedirect,
    process.env.NEXT_PUBLIC_SITE_URL
  )

  revalidatePath(`/${data.clinic}/portal`, 'layout')
  redirect(redirectPath)
}
```

## Acceptance Criteria

- [x] Import `sanitizeRedirectUrl` from `@/lib/auth/redirect`
- [x] Sanitize redirect URL in `login()` action
- [x] Add `// SEC-018: Sanitize redirect to prevent open redirect attacks` comment
- [x] Test with external URLs (should redirect to dashboard instead)
- [x] Test with valid internal paths (should work normally)
- [x] Add similar fix to any other auth actions that use redirect params (login only needs fix)

## Related Files

- `web/app/auth/actions.ts` - Main fix location
- `web/lib/auth/redirect.ts` - Utility already exists
- `web/app/auth/callback/route.ts` - Related issue (SEC-017)

## Estimated Effort

20 minutes

## Testing Notes

1. Submit login form with `redirect=https://evil.com`
2. Should redirect to `/[clinic]/portal/dashboard` (not evil.com)
3. Submit login form with `redirect=/adris/portal/pets/123`
4. Should redirect to `/adris/portal/pets/123` (valid path)
5. Submit login form without redirect param
6. Should redirect to default dashboard

## Security Severity

**CRITICAL** - Direct open redirect vulnerability in authentication flow.
