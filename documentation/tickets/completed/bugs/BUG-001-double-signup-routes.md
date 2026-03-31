# BUG-001: Double Signup Routes Confusion

## Priority: P1 - High
## Category: Bug
## Affected Areas: Authentication, Routing
## Status: COMPLETED

## Description

There are two signup routes in the application, causing developer confusion and potential user experience issues:

1. `/auth/signup` - Returns `null`, appears to be a placeholder
2. `/[clinic]/portal/signup` - Actual signup implementation

## Current State

```typescript
// web/app/auth/signup/page.tsx
export default function SignupPage() {
  return null  // Placeholder - does nothing
}

// web/app/[clinic]/portal/signup/page.tsx
export default function PortalSignupPage() {
  // Actual signup form implementation
  return <SignupForm />
}
```

### Issues:
1. `/auth/signup` is a dead route
2. SEO could index the empty page
3. Developers confused about which to use
4. Inconsistent with `/auth/callback` pattern
5. Links may point to wrong route

## Proposed Solution

**Option A (Recommended): Remove `/auth/signup`**

Delete the placeholder and ensure all signup flows use clinic-specific routes.

```bash
# Remove
rm web/app/auth/signup/page.tsx
rm -rf web/app/auth/signup/
```

**Option B: Redirect to clinic selection**

If a generic signup is needed:

```typescript
// web/app/auth/signup/page.tsx
export default function SignupPage() {
  return (
    <div>
      <h1>Selecciona tu clínica</h1>
      <Link href="/adris/portal/signup">Veterinaria Adris</Link>
      <Link href="/petlife/portal/signup">PetLife Center</Link>
    </div>
  )
}
```

## Implementation Steps

1. [ ] Search codebase for links to `/auth/signup`
2. [ ] Update any references to use `/${clinic}/portal/signup`
3. [ ] Delete `/auth/signup/page.tsx`
4. [ ] Test signup flow for all clinics
5. [ ] Update documentation

## Acceptance Criteria

- [ ] No dead signup route
- [ ] All signup links point to correct clinic-specific route
- [ ] No 404 on signup attempts
- [ ] Clear signup flow for new users

## Related Files

- `web/app/auth/signup/page.tsx` (to be deleted)
- `web/app/[clinic]/portal/signup/page.tsx`
- `web/components/**` (check for signup links)

## Estimated Effort

- Investigation: 30 minutes
- Implementation: 30 minutes
- Testing: 30 minutes
- **Total: 1.5 hours**

---
## Implementation Summary (Completed)

**Findings:**
- The `/auth/signup` directory didn't exist (ticket was based on outdated analysis)
- Found a broken link in `app/[clinic]/book/page.tsx` pointing to `/${clinic}/auth/signup`

**Fix Applied:**
- Changed link from `/${clinic}/auth/signup` to `/${clinic}/portal/signup` in booking page
- No other broken signup links found in codebase

---
*Completed: January 2026*
