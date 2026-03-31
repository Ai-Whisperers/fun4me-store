# Agent-03: Appointment Features (Pet Owner)

**Agent ID**: Agent-03
**Domain**: Pet Owner Appointment Management
**Priority**: 🔴 Critical
**Estimated Total Effort**: 6-8 hours
**Status**: ✅ Completed

---

## Ownership

### Files I OWN (can create/modify)
```
app/[clinic]/portal/appointments/           # CREATE/MODIFY
app/actions/appointments.ts                 # CREATE (shared with Agent-04)
components/appointments/                    # CREATE directory
  - cancel-button.tsx
  - reschedule-dialog.tsx
  - appointment-card.tsx
  - appointment-list.tsx
lib/types/appointments.ts                   # CREATE if needed
db/50_*.sql through db/54_*.sql            # Reserved range
tests/unit/appointments/owner/              # CREATE
```

### Files I can READ (not modify)
```
lib/supabase/server.ts
lib/supabase/client.ts
app/[clinic]/book/*                         # Existing booking flow
components/booking/*                        # Existing booking components
components/ui/*                             # Reuse these
```

### Shared with Agent-04
```
app/actions/appointments.ts                 # I create, Agent-04 can add to it
lib/types/appointments.ts                   # Shared types
```

### Files I must NOT touch
```
app/[clinic]/dashboard/*                    # Agent-04's domain
app/api/appointments/*                      # Agent-04's domain
Everything else
```

---

## Context

Read these files first:
1. `CLAUDE.md` - Project overview
2. `documentation/feature-gaps/06-technical-notes.md` - Code patterns
3. Existing booking flow in `app/[clinic]/book/`

---

## Tasks

### Task 1: Create Appointment Types
**File**: `lib/types/appointments.ts`

```typescript
export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'checked_in' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show'

export interface Appointment {
  id: string
  clinic_slug: string
  pet_id: string
  service_id: string
  appointment_date: string
  appointment_time: string
  status: AppointmentStatus
  notes?: string
  cancelled_at?: string
  cancelled_by?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
  // Joined data
  pet?: {
    id: string
    name: string
    species: string
    photo_url?: string
  }
  service?: {
    id: string
    name: string
    duration_minutes: number
    price: number
  }
}

export interface CancelAppointmentResult {
  success?: boolean
  error?: string
}

export interface RescheduleAppointmentResult {
  success?: boolean
  error?: string
  newAppointment?: Appointment
}
```

### Task 2: Create Appointment Server Actions
**File**: `app/actions/appointments.ts`

- [x] Create `cancelAppointment` action
- [x] Create `rescheduleAppointment` action
- [x] Add validation (future date, ownership)
- [ ] Handle notification queueing (deferred - no notification system yet)

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }
  
  // Get appointment with pet to verify ownership
  const { data: appointment } = await supabase
    .from('appointments')
    .select('*, pets!inner(owner_id)')
    .eq('id', appointmentId)
    .single()
    
  if (!appointment) {
    return { error: 'Cita no encontrada' }
  }
  
  // Check ownership
  if (appointment.pets.owner_id !== user.id) {
    // Check if staff (for Agent-04 usage)
    const { data: isStaff } = await supabase.rpc('is_staff_of', {
      _tenant_id: appointment.clinic_slug
    })
    if (!isStaff) {
      return { error: 'No tienes permiso para cancelar esta cita' }
    }
  }
  
  // Check if in future
  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
  if (appointmentDateTime < new Date()) {
    return { error: 'No se puede cancelar una cita pasada' }
  }
  
  // Check if already cancelled
  if (appointment.status === 'cancelled') {
    return { error: 'Esta cita ya está cancelada' }
  }
  
  // Update appointment
  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancellation_reason: reason || null
    })
    .eq('id', appointmentId)
    
  if (error) {
    return { error: 'Error al cancelar la cita' }
  }
  
  revalidatePath('/portal/appointments')
  return { success: true }
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }
  
  // Verify ownership
  const { data: appointment } = await supabase
    .from('appointments')
    .select('*, pets!inner(owner_id)')
    .eq('id', appointmentId)
    .single()
    
  if (!appointment || appointment.pets.owner_id !== user.id) {
    return { error: 'No autorizado' }
  }
  
  // Check new date is in future
  const newDateTime = new Date(`${newDate}T${newTime}`)
  if (newDateTime < new Date()) {
    return { error: 'La nueva fecha debe ser en el futuro' }
  }
  
  // TODO: Check slot availability (integrate with booking system)
  
  // Update appointment
  const { error } = await supabase
    .from('appointments')
    .update({
      appointment_date: newDate,
      appointment_time: newTime,
      status: 'scheduled' // Reset to scheduled
    })
    .eq('id', appointmentId)
    
  if (error) {
    return { error: 'Error al reprogramar la cita' }
  }
  
  revalidatePath('/portal/appointments')
  return { success: true }
}
```

### Task 3: Create Cancel Button Component
**File**: `components/appointments/cancel-button.tsx`

- [x] Create client component
- [x] Show confirmation dialog
- [x] Optional reason input
- [x] Loading state
- [x] Success/error handling

```typescript
'use client'

import { useState } from 'react'
import { cancelAppointment } from '@/app/actions/appointments'

interface Props {
  appointmentId: string
  onSuccess?: () => void
}

export function CancelButton({ appointmentId, onSuccess }: Props) {
  const [showDialog, setShowDialog] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  async function handleCancel() {
    setLoading(true)
    setError(null)
    
    const result = await cancelAppointment(appointmentId, reason || undefined)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setShowDialog(false)
      onSuccess?.()
    }
  }
  
  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="text-red-600 hover:text-red-800 text-sm"
      >
        Cancelar
      </button>
      
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              ¿Cancelar esta cita?
            </h3>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Esta acción no se puede deshacer.
            </p>
            
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo de cancelación (opcional)"
              className="w-full p-3 border border-[var(--border)] rounded-lg mb-4 text-sm"
              rows={3}
            />
            
            {error && (
              <p className="text-red-600 text-sm mb-4">{error}</p>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-[var(--text-secondary)] text-sm"
                disabled={loading}
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
                disabled={loading}
              >
                {loading ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

### Task 4: Create Appointment Card Component
**File**: `components/appointments/appointment-card.tsx`

- [x] Display appointment info (date, time, service, pet)
- [x] Show status badge
- [x] Include cancel button (for future appointments)
- [x] Include reschedule button
- [x] Link to detail view

### Task 5: Create Appointments List Page
**File**: `app/[clinic]/portal/appointments/page.tsx`

- [x] Fetch user's appointments
- [x] Show upcoming and past tabs
- [x] Display using AppointmentCard
- [x] Empty state when no appointments
- [x] Link to booking page

### Task 6: Create Appointment Detail Page
**File**: `app/[clinic]/portal/appointments/[id]/page.tsx`

- [x] Fetch appointment details
- [x] Show full info
- [x] Cancel button
- [x] Reschedule button
- [ ] Show status history (optional - deferred)

### Task 7: Create Reschedule Dialog
**File**: `components/appointments/reschedule-dialog.tsx`

- [x] Date picker for new date
- [x] Time slot selector
- [x] Show available slots (placeholder - real availability integration deferred)
- [x] Submit to reschedule action

### Task 8: Testing
**Directory**: `tests/unit/actions/appointments.test.ts`

- [x] Test cancelAppointment action
- [x] Test rescheduleAppointment action
- [x] Test ownership validation
- [x] Test date validation

---

## Spanish Text Reference

| Element | Spanish Text |
|---------|-------------|
| Page title | Mis Citas |
| Upcoming | Próximas |
| Past | Anteriores |
| Cancel | Cancelar |
| Reschedule | Reprogramar |
| No appointments | No tienes citas programadas |
| Book appointment | Agendar cita |
| Date | Fecha |
| Time | Hora |
| Service | Servicio |
| Pet | Mascota |
| Status | Estado |
| Scheduled | Programada |
| Confirmed | Confirmada |
| Completed | Completada |
| Cancelled | Cancelada |
| Cancel confirm | ¿Cancelar esta cita? |
| Cancellation reason | Motivo de cancelación |

---

## Status Badge Colors

```typescript
const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  checked_in: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
}
```

---

## Acceptance Criteria

- [x] Pet owner can view list of their appointments
- [x] Appointments show pet, service, date, time, status
- [x] Owner can cancel future appointments
- [x] Cancellation shows confirmation dialog
- [x] Owner can reschedule appointments
- [x] Past appointments cannot be cancelled
- [x] All text in Spanish
- [x] Uses CSS variables
- [x] Mobile responsive

---

## Dependencies

**None for core functionality.**

**Integration note for Agent-04**: The `cancelAppointment` action I create will also be used by staff. Agent-04 should read this file and use the same action.

---

## Handoff Notes

### Completed
- [x] Task 1 - Created `lib/types/appointments.ts` with types, status config, and utility functions
- [x] Task 2 - Created `app/actions/appointments.ts` with cancelAppointment, rescheduleAppointment, getOwnerAppointments
- [x] Task 3 - Created `components/appointments/cancel-button.tsx` with dialog, variants, and loading states
- [x] Task 4 - Created `components/appointments/appointment-card.tsx` with status badges and action buttons
- [x] Task 5 - Created `app/[clinic]/portal/appointments/page.tsx` with tabs for upcoming/past
- [x] Task 6 - Created `app/[clinic]/portal/appointments/[id]/page.tsx` with full detail view
- [x] Task 7 - Created `components/appointments/reschedule-dialog.tsx` with date/time pickers
- [x] Task 8 - Created `tests/unit/actions/appointments.test.ts` with 24 tests (all passing)

### Files Created
```
lib/types/appointments.ts
app/actions/appointments.ts
components/appointments/
  - index.ts
  - cancel-button.tsx
  - reschedule-dialog.tsx
  - appointment-card.tsx
  - appointment-list.tsx
app/[clinic]/portal/appointments/page.tsx
app/[clinic]/portal/appointments/[id]/page.tsx
tests/unit/actions/appointments.test.ts
```

### Deferred Items
- Notification queueing (no notification system exists yet)
- Status history timeline (optional feature)
- Real-time slot availability check (uses static time slots for now)

### Notes for Integration
- Agent-04 should use `cancelAppointment` from `app/actions/appointments.ts` - it supports both owner and staff
- The `getOwnerAppointments` action handles the Supabase array-to-object transform for pets join
- All components use CSS variables for theming
- Tests are in `tests/unit/actions/appointments.test.ts` (not a separate directory)

### Test Results
All 48 unit tests pass including 24 appointment-specific tests covering:
- Authentication validation
- Ownership verification
- Date validation (past dates rejected)
- Status checks (cancelled/completed can't be modified)
- Staff authorization
- Utility functions (canCancel, canReschedule, formatDate, formatTime)
- Status configuration

---

*Agent-03 Task File - Completed: December 2024*
