# SEC-015 Message Attachments Missing Tenant Isolation for Staff

## Priority: P2

## Category: Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

The message attachments upload endpoint at `/api/messages/attachments` has a tenant isolation gap for staff users. Staff members (vet/admin) can upload files to any conversation without verifying the conversation belongs to their tenant.

Current authorization logic:

```typescript
const isStaff = ['vet', 'admin'].includes(profile.role)
if (!isStaff && conversation.client_id !== user.id) {
  return NextResponse.json({ error: 'No tienes acceso a esta conversación' }, { status: 403 })
}
```

The problem: If `isStaff === true`, no further checks are performed. A staff member from Clinic A could theoretically upload attachments to conversations in Clinic B if they know the conversation ID.

## Impact

**Medium Severity**:
1. **Cross-Tenant Data Injection**: Staff from one clinic could upload files to another clinic's conversations
2. **Privacy Violation**: Attachments could be injected into private conversations between other clinics and their clients
3. **Audit Trail Confusion**: Files uploaded by unauthorized staff would appear in conversation history

**Mitigating Factors**:
- Requires knowledge of conversation UUID (not easily guessable)
- Requires valid staff credentials in the system
- The conversation itself wouldn't be visible - only injection possible

## Location

`web/app/api/messages/attachments/route.ts` lines 95-98

## Proposed Fix

Add tenant isolation check for staff users:

```typescript
const isStaff = ['vet', 'admin'].includes(profile.role)

if (isStaff) {
  // Staff must be from the same tenant as the conversation
  if (conversation.tenant_id !== profile.tenant_id) {
    return NextResponse.json(
      { error: 'No tienes acceso a esta conversación' },
      { status: 403 }
    )
  }
} else {
  // Non-staff (owners) must be the conversation client
  if (conversation.client_id !== user.id) {
    return NextResponse.json(
      { error: 'No tienes acceso a esta conversación' },
      { status: 403 }
    )
  }
}
```

Or more concisely:

```typescript
const isStaff = ['vet', 'admin'].includes(profile.role)
const hasAccess = isStaff
  ? conversation.tenant_id === profile.tenant_id
  : conversation.client_id === user.id

if (!hasAccess) {
  return NextResponse.json(
    { error: 'No tienes acceso a esta conversación' },
    { status: 403 }
  )
}
```

## Acceptance Criteria

- [x] Staff can only upload to conversations in their own tenant
- [x] Owners can still upload to their own conversations
- [x] Error message is consistent (Spanish, no information leakage)
- [ ] Add test case for cross-tenant staff access attempt (deferred)

## Related Files

- `web/app/api/messages/attachments/route.ts` - Needs fix
- `web/app/api/messages/route.ts` - Reference for similar patterns
- Other conversation-related endpoints should be audited for same pattern

## Estimated Effort

1 hour

## Testing Notes

1. Create staff user in Tenant A
2. Create conversation in Tenant B
3. Attempt to upload attachment to Tenant B's conversation using Tenant A staff credentials
4. Verify 403 Forbidden is returned
5. Verify staff can still upload to their own tenant's conversations
