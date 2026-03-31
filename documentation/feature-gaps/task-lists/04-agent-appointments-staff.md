# Agent-04: Appointment Features (Staff/Dashboard)

**Agent ID**: Agent-04
**Domain**: Staff Appointment Management & Check-in
**Priority**: 🟡 High
**Estimated Total Effort**: 8-10 hours
**Status**: Completed

---

## Ownership

### Files I OWN (can create/modify)
```
app/[clinic]/dashboard/appointments/page.tsx    # CREATED
app/api/appointments/slots/route.ts             # CREATED
app/api/appointments/[id]/check-in/route.ts     # CREATED
app/api/appointments/[id]/complete/route.ts     # CREATED
app/actions/appointments.ts                     # MODIFIED (added staff actions)
components/dashboard/appointments/              # CREATED
  - appointment-queue.tsx
  - status-buttons.tsx
  - date-filter.tsx
  - status-filter.tsx
  - index.ts
db/55_appointment_workflow.sql                  # CREATED
```

### Files I can READ (not modify)
```
lib/supabase/server.ts
lib/supabase/client.ts
lib/types/appointments.ts                       # Used existing types
components/ui/*                                 # Reused
```

---

## Tasks

### Task 1: Create Slots API (Real-time Availability)
**File**: `app/api/appointments/slots/route.ts`

- [x] GET handler for available slots
- [x] Exclude existing appointments
- [x] Consider service duration
- [x] Support date queries
- [x] Skip break times (12:00-14:00)

### Task 2: Create Check-in API
**File**: `app/api/appointments/[id]/check-in/route.ts`

- [x] POST handler for check-in
- [x] Staff only (vet/admin role check)
- [x] Update status to 'checked_in'
- [x] Record check-in time and user

### Task 3: Create Complete Appointment API
**File**: `app/api/appointments/[id]/complete/route.ts`

- [x] POST handler for completing
- [x] Staff only
- [x] Update status to 'completed'
- [x] Support optional notes

### Task 4: Add Staff Actions to appointments.ts
**File**: `app/actions/appointments.ts` (ADDED TO existing file)

- [x] Add `checkInAppointment` action
- [x] Add `startAppointment` action
- [x] Add `completeAppointment` action
- [x] Add `markNoShow` action
- [x] Add `getStaffAppointments` action

### Task 5: Create Staff Appointments Dashboard Page
**File**: `app/[clinic]/dashboard/appointments/page.tsx`

- [x] List today's appointments
- [x] Filter by date and status
- [x] Show stats cards (pending, checked_in, in_progress, completed, no_show)
- [x] Staff-only access check

### Task 6: Create Appointment Queue Component
**File**: `components/dashboard/appointments/appointment-queue.tsx`

- [x] Show appointments grouped by status
- [x] Status indicators
- [x] Patient info display (pet, owner, phone)
- [x] Time display

### Task 7: Create Status Action Buttons
**File**: `components/dashboard/appointments/status-buttons.tsx`

- [x] Check-in button (for pending/confirmed)
- [x] Start (in_progress) button (for checked_in)
- [x] Complete button (for checked_in/in_progress)
- [x] No-show button (for pending/confirmed)
- [x] Cancel button (reuses cancelAppointment action)

### Task 8: Database Migration
**File**: `db/55_appointment_workflow.sql`

- [x] Updated status CHECK constraint (added checked_in, in_progress, no_show)
- [x] Added workflow columns (checked_in_at, checked_in_by, started_at, completed_at, completed_by)
- [x] Added indexes for common queries

---

## Implementation Notes

### Appointment Status Workflow
```
pending → confirmed → checked_in → in_progress → completed
                  ↘             ↘
                   → no_show     → completed (can skip in_progress)
                   → cancelled
```

### Staff Actions Added
| Action | From Status | To Status |
|--------|-------------|-----------|
| checkInAppointment | pending, confirmed | checked_in |
| startAppointment | checked_in | in_progress |
| completeAppointment | checked_in, in_progress | completed |
| markNoShow | pending, confirmed | no_show |
| cancelAppointment | pending, confirmed | cancelled |

### API Endpoints Created
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/appointments/slots` | GET | Get available time slots |
| `/api/appointments/[id]/check-in` | POST | Check in patient |
| `/api/appointments/[id]/complete` | POST | Complete appointment |

---

## Spanish Text Used

| Element | Spanish Text |
|---------|-------------|
| Page title | Citas de Hoy / Citas del Día |
| Pending | En Espera |
| Checked in | Registrados |
| In progress | En Consulta |
| Completed | Completadas |
| No show | No Presentados |
| Check in button | Registrar llegada |
| Start button | Iniciar consulta |
| Complete button | Completar |
| No show button | Marcar como no presentado |
| Cancel button | Cancelar cita |
| Queue | Cola de Espera |
| Next appointments | Próximas Citas |
| Finished | Finalizadas |

---

## Acceptance Criteria

- [x] Staff can view today's appointments
- [x] Staff can filter by date and status
- [x] Staff can check-in patients
- [x] Staff can mark appointments as started
- [x] Staff can complete appointments
- [x] Staff can mark no-shows
- [x] Staff can cancel appointments (reuses existing action)
- [x] Real-time slot availability works
- [x] Non-staff cannot access dashboard
- [x] All text in Spanish
- [x] Uses CSS variables
- [x] Mobile responsive

---

## Dependencies

**From existing codebase**:
- Uses `lib/types/appointments.ts` - Imported existing types and statusConfig
- Uses `app/actions/appointments.ts` - Added staff actions to this file
- Uses `cancelAppointment` action from existing code

---

## Handoff Notes

### Completed
- [x] Task 1 - Slots API created
- [x] Task 2 - Check-in API created
- [x] Task 3 - Complete API created
- [x] Task 4 - Staff actions added to appointments.ts
- [x] Task 5 - Dashboard page created
- [x] Task 6 - Appointment queue component created
- [x] Task 7 - Status action buttons created
- [x] Task 8 - Database migration created

### In Progress
- None

### Blockers
- None

### Notes for Integration
- Dashboard is at `/{clinic}/dashboard/appointments`
- Run migration `db/55_appointment_workflow.sql` to add new columns and statuses
- Staff actions require vet/admin role in the same tenant
- Slot API can be enhanced with staff schedules in the future

---

*Agent-04 Task File - Completed: December 2024*
