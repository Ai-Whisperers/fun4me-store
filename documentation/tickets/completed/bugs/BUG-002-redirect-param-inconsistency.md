# BUG-002: Redirect Parameter Inconsistency

## Priority: P2 - Medium
## Category: Bug
## Affected Areas: Authentication flow, Login pages
## Status: COMPLETED

## Description

The login redirect parameter uses different names across the codebase:
- Some places use `?returnTo=`
- Some places use `?redirect=`
- Some places use `?next=`

This causes redirects to fail when the login page expects a different parameter.

## Current State

```typescript
// Pattern A - returnTo
redirect(`/${clinic}/portal/login?returnTo=${encodeURIComponent(pathname)}`)

// Pattern B - redirect
redirect(`/${clinic}/portal/login?redirect=${pathname}`)

// Pattern C - next (from auth callback)
const next = searchParams.get('next') || '/'

// Login page only checks one:
const returnTo = searchParams.get('returnTo')
// Ignores 'redirect' and 'next' params
```

### Issues:
1. Redirects fail when wrong param used
2. Users land on dashboard instead of intended page
3. Deep links don't work consistently

## Proposed Solution

### 1. Standardize on `returnTo`

```typescript
// lib/auth/redirect.ts
export const REDIRECT_PARAM = 'returnTo'

export function createLoginUrl(clinic: string, returnPath?: string) {
  const base = `/${clinic}/portal/login`
  if (returnPath) {
    return `${base}?${REDIRECT_PARAM}=${encodeURIComponent(returnPath)}`
  }
  return base
}

export function getReturnUrl(searchParams: URLSearchParams, fallback: string) {
  // Check all possible params for backwards compatibility
  return searchParams.get('returnTo')
    || searchParams.get('redirect')
    || searchParams.get('next')
    || fallback
}
```

### 2. Update Login Page

```typescript
// [clinic]/portal/login/page.tsx
const returnTo = getReturnUrl(searchParams, `/${clinic}/portal/dashboard`)

// After successful login:
redirect(returnTo)
```

### 3. Update All Redirect Calls

Search and replace across codebase:
- `?redirect=` → `?returnTo=`
- `?next=` → `?returnTo=`

## Implementation Steps

1. [ ] Create `lib/auth/redirect.ts` with helper functions
2. [ ] Update login page to use helper
3. [ ] Search for all redirect param usages
4. [ ] Update to use consistent `returnTo`
5. [ ] Update auth callback route
6. [ ] Test login flows from various entry points

## Acceptance Criteria

- [ ] Single redirect parameter name (`returnTo`)
- [ ] Backwards compatible with old params temporarily
- [ ] Deep links preserved through login
- [ ] No redirect loops

## Related Files

- `web/app/[clinic]/portal/login/page.tsx`
- `web/app/auth/callback/route.ts`
- `web/app/[clinic]/portal/layout.tsx`
- `web/app/[clinic]/dashboard/layout.tsx`

## Estimated Effort

- Implementation: 2 hours
- Testing: 1 hour
- **Total: 3 hours**

---
## Implementation Summary (Completed)

**Files Created:**
- `lib/auth/redirect.ts` - Centralized redirect URL utilities

**Files Modified:**
- `lib/auth/index.ts` - Export redirect utilities
- `app/[clinic]/portal/login/page.tsx` - Use `getReturnUrl`
- `app/[clinic]/portal/signup/page.tsx` - Use `getReturnUrl`

**Changes Made:**
1. **New redirect utilities:**
   - `REDIRECT_PARAM = 'redirect'` - Standard parameter name
   - `createLoginUrl(clinic, returnPath)` - Generate login URLs
   - `createSignupUrl(clinic, returnPath)` - Generate signup URLs
   - `getReturnUrl(searchParams, fallback)` - Get redirect URL supporting all param names
   - `isValidRedirectUrl(url)` - Validate against open redirect attacks
   - `sanitizeRedirectUrl(url, fallback)` - Safe redirect URL getter

2. **Updated pages:**
   - Login and signup pages now use `getReturnUrl` for consistent handling
   - Supports `redirect`, `returnTo`, and `next` parameters (backwards compatible)

**Backwards compatibility:**
- All three parameter names (`redirect`, `returnTo`, `next`) are supported
- Existing links continue to work
- New code should use `redirect` parameter via `createLoginUrl`/`createSignupUrl`

---
*Completed: January 2026*
