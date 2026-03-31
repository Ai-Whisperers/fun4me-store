# SEC-025 Cart API Accepts Arbitrary Clinic Parameter

## Priority: P1

## Category: Security

## Status: Completed

## Resolution
Fixed in `web/app/api/store/cart/route.ts`. Removed acceptance of client-supplied `clinic` parameter. The `tenant_id` is now always derived from the authenticated user's profile, never from client input.

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Description

The Cart API PUT endpoint accepts a `clinic` parameter from the request body and uses it to determine the `tenant_id` without verifying it matches the user's profile. A malicious user could potentially save cart data to another tenant's cart table.

### Vulnerable Code

**File**: `web/app/api/store/cart/route.ts` (lines 115-137)

```typescript
const { items, clinic } = await request.json()
// ...
let tenantId = clinic
if (!tenantId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  // ...
  tenantId = profile.tenant_id
}

// Uses client-supplied clinic without verification
```

### Attack Scenario

1. User A is authenticated for clinic "adris"
2. User A sends PUT request with `clinic: "petlife"`
3. If RLS allows, cart data is saved under "petlife" tenant
4. Could pollute another clinic's data or cause confusion

## Impact

**Security Risk: MEDIUM**
- Cross-tenant data manipulation potential
- Cart pollution across tenants
- RLS may mitigate but defense-in-depth is missing

**Note**: RLS policies likely prevent actual cross-tenant writes, but the code pattern is unsafe and should be fixed.

## Proposed Fix

Always use the user's profile `tenant_id` instead of accepting it from client input:

```typescript
export async function PUT(request: NextRequest) {
  // ... auth check ...

  // Always get tenant from profile, never trust client
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { message: 'Profile not found' }
    })
  }

  const tenantId = profile.tenant_id  // Never from client

  const { items } = await request.json()
  // ... rest of handler
}
```

If clinic parameter is needed for multi-tenant users, verify it matches:

```typescript
const { items, clinic } = await request.json()
if (clinic && clinic !== profile.tenant_id) {
  return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
    details: { message: 'Clinic mismatch' }
  })
}
```

## Acceptance Criteria

- [ ] Cart PUT endpoint ignores client-supplied `clinic` parameter
- [ ] Always uses `profile.tenant_id` for tenant determination
- [ ] Same fix applied to Cart POST (merge) endpoint
- [ ] Test: Send PUT with different clinic → Uses profile tenant anyway
- [ ] Add comment `// SEC-025: tenant_id from profile only`

## Related Files

- `web/app/api/store/cart/route.ts` (PUT handler)
- `web/app/api/store/cart/route.ts` (POST handler)

## Estimated Effort

1-2 hours

## Security Severity

**MEDIUM** - Cross-tenant data access attempt, mitigated by RLS but pattern is unsafe.
