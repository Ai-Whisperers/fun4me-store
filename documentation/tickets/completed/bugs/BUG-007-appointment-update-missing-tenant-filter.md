# BUG-007 Appointment Update Missing Tenant Filter

## Priority: P2

## Category: Bug / Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

The `updateAppointmentStatus` server action in `update-appointment-status.ts` updates appointments without explicitly filtering by `tenant_id`. While RLS (Row-Level Security) at the database level should prevent cross-tenant updates, the application layer lacks defense-in-depth.

```typescript
// update-appointment-status.ts lines 14-17
const { error } = await supabase
  .from('appointments')
  .update({ status: newStatus })
  .eq('id', appointmentId)
  // MISSING: .eq('tenant_id', ...)
```

The `clinic` parameter is passed but only used for cache revalidation, not for the actual database query.

## Impact

**Security Risk (Low)**:
- RLS policies should prevent actual cross-tenant updates
- However, relying solely on database-level protection without application-level filtering is risky
- If RLS policy is ever accidentally modified, this becomes an immediate vulnerability

**Inconsistency**:
- Other actions like `updateMedicalRecord`, `updateInvoice`, etc. all include explicit `tenant_id` filters
- This inconsistency makes security auditing harder

## Location

`web/app/actions/update-appointment-status.ts` lines 12-33

## Proposed Fix

Add explicit tenant_id filter using the profile's tenant_id from ActionContext:

```typescript
export const updateAppointmentStatus = withActionAuth(
  async ({ supabase, profile }, appointmentId: string, newStatus: string, clinic: string) => {
    // Verify clinic matches user's tenant for defense-in-depth
    if (clinic !== profile.tenant_id) {
      logger.warn('Tenant mismatch in appointment update', {
        userId: profile.id,
        requestedClinic: clinic,
        actualTenant: profile.tenant_id,
      })
      return actionError('Acceso denegado')
    }

    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)
      .eq('tenant_id', profile.tenant_id)  // ADD THIS

    if (error) {
      logger.error('Failed to update appointment status', {
        error,
        appointmentId,
        newStatus,
        tenant: clinic,
      })
      return actionError('Error al actualizar el estado de la cita')  // Spanish!
    }

    revalidatePath(`/${clinic}/dashboard`)
    return actionSuccess()
  },
  { requireStaff: true }
)
```

## Acceptance Criteria

- [x] Add `.eq('tenant_id', profile.tenant_id)` to the update query
- [x] Add validation that `clinic` parameter matches `profile.tenant_id`
- [x] Change error message from English to Spanish
- [x] Add warning log for tenant mismatch attempts
- [x] Test that staff can still update appointments in their own clinic
- [x] Verify cross-tenant update attempts are blocked

## Related Files

- `web/app/actions/update-appointment-status.ts` - Needs fix
- `web/app/actions/update-appointment.ts` - Reference for correct pattern
- `web/db/` - RLS policies for appointments table

## Estimated Effort

1 hour

## Testing Notes

1. As staff of Clinic A, update an appointment in Clinic A - should succeed
2. Modify request to use Clinic B's appointment ID - should fail with 'Acceso denegado'
3. Verify audit log captures the mismatch attempt
