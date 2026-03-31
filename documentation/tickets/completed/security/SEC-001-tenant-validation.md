# SEC-001: Add Tenant Validation to Portal Layout

## Priority: P1 - High
## Category: Security
## Affected Areas: Portal layout, Dashboard layout
## Status: COMPLETED

## Description

The `[clinic]/portal/layout.tsx` checks authentication but does NOT verify that the user's `tenant_id` matches the clinic slug in the URL. This could allow a user from clinic A to access clinic B's portal by changing the URL.

## Current State

```typescript
// [clinic]/portal/layout.tsx
export default async function PortalLayout({ children, params }) {
  const { clinic } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // BUG: No check that user.tenant_id === clinic
  // User from 'petlife' could access /adris/portal/...

  return <>{children}</>
}
```

### Risk:
- User from clinic A could see clinic B's data by navigating to their URL
- RLS on database protects actual data queries, but UI/UX allows access
- Could expose menu items, navigation, and layout elements
- Potential information disclosure

## Proposed Solution

```typescript
// [clinic]/portal/layout.tsx
export default async function PortalLayout({ children, params }) {
  const { clinic } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Get user's tenant
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  // Verify tenant matches URL
  if (!profile || profile.tenant_id !== clinic) {
    // Option A: Redirect to correct clinic
    if (profile?.tenant_id) {
      redirect(`/${profile.tenant_id}/portal/dashboard`)
    }
    // Option B: Show error
    redirect(`/${clinic}/portal/login?error=tenant_mismatch`)
  }

  return <>{children}</>
}
```

### Also apply to Dashboard:

```typescript
// [clinic]/dashboard/layout.tsx
// Add same tenant check after staff role check
```

## Implementation Steps

1. [ ] Add tenant_id check to `[clinic]/portal/layout.tsx`
2. [ ] Add tenant_id check to `[clinic]/dashboard/layout.tsx`
3. [ ] Create error page/message for tenant mismatch
4. [ ] Add logging for security audit when mismatch detected
5. [ ] Test with multi-tenant scenarios
6. [ ] Document security pattern

## Acceptance Criteria

- [ ] Users cannot access portal of a different tenant
- [ ] Users redirected to their correct tenant on mismatch
- [ ] Clear error message shown if user has no tenant
- [ ] Mismatch attempts logged for security audit
- [ ] No regression in normal auth flow

## Related Files

- `web/app/[clinic]/portal/layout.tsx`
- `web/app/[clinic]/dashboard/layout.tsx`
- `web/lib/audit.ts`

## Estimated Effort

- Implementation: 1-2 hours
- Testing: 1 hour
- **Total: 2-3 hours**

## Security Impact

**Before**: Medium risk - URL manipulation could show wrong clinic's UI
**After**: No risk - Proper tenant isolation at layout level

---
## Implementation Summary (Completed)

**Files Modified:**
- `web/app/[clinic]/portal/layout.tsx` - Converted to server component with tenant validation
- `web/app/[clinic]/portal/providers.tsx` - Added CommandPaletteProvider
- `web/lib/auth/require-owner.ts` - Added security audit logging
- `web/lib/auth/require-staff.ts` - Added security audit logging
- `web/lib/auth/index.ts` - Exported `requireOwner`

**Changes Made:**
1. Portal layout now calls `requireOwner(clinic)` to validate tenant matches URL
2. Dashboard layout already called `requireStaff(clinic)` - verified working
3. Both `requireOwner` and `requireStaff` now log `tenant_mismatch` security events
4. Users are automatically redirected to their correct tenant if mismatch detected

**Security Audit Events:**
- `auditLogger.security('tenant_mismatch', { severity: 'medium', ... })` logged for all mismatch attempts

---
*Completed: January 2026*
