# FEAT-027 Cancel Pending Booking Requests

## Priority: P1

## Category: Feature

## Status: Not Started

## Epic: [EPIC-16: User Experience](../epics/EPIC-16-user-experience.md)

## Description

After submitting a booking request, customers cannot cancel or modify it while waiting for clinic staff to schedule. The success screen only shows "We'll contact you" with no follow-up actions. Customers are stuck with their request until the clinic acts.

### Current State

- Booking request creates appointment with `scheduling_status: pending_scheduling`
- Success screen shows no cancel option
- Portal schedule page shows appointments but not pending requests
- No way to modify date preferences after submission
- No way to cancel and re-submit

### User Pain Points

1. Submitted wrong preferences → Can't fix it
2. Plans changed → Can't cancel request
3. No visibility into pending requests
4. Have to call clinic to cancel

## Proposed Solution

### Pending Requests View

```typescript
// web/app/[clinic]/portal/bookings/pending/page.tsx
export default async function PendingBookingsPage({ params }) {
  const { clinic } = params
  const supabase = await createClient()

  const { data: pendingRequests } = await supabase
    .from('appointments')
    .select(`
      id,
      service:services(name),
      pet:pets(name),
      preferred_date_start,
      preferred_date_end,
      preferred_time_of_day,
      notes,
      requested_at
    `)
    .eq('scheduling_status', 'pending_scheduling')
    .eq('status', 'scheduled')
    .order('requested_at', { ascending: false })

  return (
    <div>
      <h1>Solicitudes Pendientes</h1>
      {pendingRequests?.map(request => (
        <PendingRequestCard
          key={request.id}
          request={request}
          onCancel={() => cancelRequest(request.id)}
          onModify={() => openModifyModal(request)}
        />
      ))}
    </div>
  )
}
```

### Cancel Request Action

```typescript
// web/app/actions/cancel-booking-request.ts
export const cancelBookingRequest = withActionAuth(
  async ({ user, profile, supabase }, { appointmentId }: { appointmentId: string }) => {
    // Verify ownership
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, pet:pets(owner_id), scheduling_status')
      .eq('id', appointmentId)
      .single()

    if (!appointment) {
      return { success: false, error: 'Solicitud no encontrada' }
    }

    if (appointment.pet.owner_id !== user.id) {
      return { success: false, error: 'No autorizado' }
    }

    if (appointment.scheduling_status !== 'pending_scheduling') {
      return { success: false, error: 'Esta cita ya fue programada. Contacte a la clínica.' }
    }

    // Cancel the request
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Cancelado por el cliente antes de ser programada'
      })
      .eq('id', appointmentId)

    if (error) {
      return { success: false, error: 'Error al cancelar la solicitud' }
    }

    // Notify clinic (optional)
    await notifyClinicOfCancellation(appointment)

    return { success: true }
  }
)
```

### Modify Preferences Action

```typescript
// web/app/actions/modify-booking-request.ts
export const modifyBookingRequest = withActionAuth(
  async ({ user, profile, supabase }, input: ModifyRequestInput) => {
    const { appointmentId, preferredDateStart, preferredDateEnd, preferredTimeOfDay, notes } = input

    // Verify ownership and status
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, pet:pets(owner_id), scheduling_status')
      .eq('id', appointmentId)
      .single()

    if (appointment?.pet.owner_id !== user.id) {
      return { success: false, error: 'No autorizado' }
    }

    if (appointment.scheduling_status !== 'pending_scheduling') {
      return { success: false, error: 'No se puede modificar una cita ya programada' }
    }

    // Update preferences
    const { error } = await supabase
      .from('appointments')
      .update({
        preferred_date_start: preferredDateStart,
        preferred_date_end: preferredDateEnd,
        preferred_time_of_day: preferredTimeOfDay,
        notes
      })
      .eq('id', appointmentId)

    if (error) {
      return { success: false, error: 'Error al actualizar la solicitud' }
    }

    return { success: true }
  }
)
```

### Success Screen Update

```typescript
// web/components/booking/booking-wizard/SuccessScreen.tsx
// Add link to pending requests
<div className="mt-6 space-y-3">
  <Link
    href={`/${clinic}/portal/bookings/pending`}
    className="block text-center text-primary hover:underline"
  >
    Ver mis solicitudes pendientes
  </Link>
  <p className="text-sm text-gray-500">
    Puedes cancelar o modificar tu solicitud mientras esperamos confirmarte la cita.
  </p>
</div>
```

## Implementation Steps

1. [ ] Create pending bookings page route
2. [ ] Build PendingRequestCard component
3. [ ] Create cancelBookingRequest server action
4. [ ] Create modifyBookingRequest server action
5. [ ] Add cancel confirmation modal
6. [ ] Add modify preferences modal
7. [ ] Update success screen with link to pending
8. [ ] Add pending count badge to portal navigation
9. [ ] Send notification to clinic on cancel/modify

## Acceptance Criteria

- [ ] Customer can view pending booking requests
- [ ] Customer can cancel pending request
- [ ] Customer can modify date/time preferences
- [ ] Cannot cancel/modify after clinic schedules
- [ ] Confirmation dialog before cancel
- [ ] Success/error messages shown appropriately
- [ ] Clinic notified of cancellation
- [ ] Link to pending requests from success screen

## Related Files

- `web/app/[clinic]/portal/bookings/pending/page.tsx` (create)
- `web/app/actions/cancel-booking-request.ts` (create)
- `web/app/actions/modify-booking-request.ts` (create)
- `web/components/booking/pending-request-card.tsx` (create)
- `web/components/booking/booking-wizard/SuccessScreen.tsx`

## Estimated Effort

8-12 hours
