# Agent-07: Calendar & Staff Scheduling

**Agent ID**: Agent-07
**Domain**: Calendar View & Staff Schedule Management
**Priority**: 🟡 High
**Estimated Total Effort**: 10-14 hours
**Status**: Not Started

---

## Ownership

### Files I OWN (can create/modify)
```
app/[clinic]/dashboard/calendar/            # CREATE directory
app/[clinic]/dashboard/schedule/            # CREATE/MODIFY
app/api/staff/schedule/                     # CREATE directory
app/actions/calendar.ts                     # CREATE
components/calendar/                        # CREATE directory
lib/types/calendar.ts                       # CREATE
db/80_*.sql through db/89_*.sql            # Reserved range
tests/unit/calendar/                        # CREATE
```

### Files I can READ (not modify)
```
lib/supabase/server.ts
app/api/appointments/*                      # Agent-04's domain - READ ONLY
lib/types/appointments.ts                   # Use these types
components/ui/*                             
```

### Files I must NOT touch
```
app/api/appointments/*                      # Agent-04 owns this
Everything else
```

---

## Context

Read these files first:
1. `CLAUDE.md` - Project overview
2. `documentation/feature-gaps/06-technical-notes.md` - Code patterns
3. Database schema for staff_schedules table

**Library to use**: Consider `react-big-calendar` or build custom calendar grid.

---

## Tasks

### Task 1: Create Calendar Types
**File**: `lib/types/calendar.ts`

```typescript
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'appointment' | 'block' | 'time_off'
  resourceId?: string // Staff ID
  status?: string
  color?: string
  data?: {
    appointment_id?: string
    pet_name?: string
    client_name?: string
    service_name?: string
  }
}

export interface StaffSchedule {
  id: string
  staff_id: string
  day_of_week: number // 0-6, Sunday-Saturday
  start_time: string  // HH:MM
  end_time: string    // HH:MM
  is_available: boolean
}

export interface TimeOff {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  reason: string
  type: 'vacation' | 'sick' | 'personal' | 'other'
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
}

export interface CalendarView = 'day' | 'week' | 'month'

export interface CalendarFilters {
  staffId?: string
  serviceId?: string
  status?: string
}
```

### Task 2: Create Staff Schedule API
**File**: `app/api/staff/schedule/route.ts`

- [ ] GET handler - fetch staff schedules
- [ ] POST handler - create/update schedule
- [ ] Staff only access

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const clinicSlug = searchParams.get('clinic')
  const staffId = searchParams.get('staff_id')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  // Verify staff access
  const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinicSlug })
  if (!isStaff) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  
  let query = supabase
    .from('staff_schedules')
    .select('*, staff:profiles(id, full_name)')
    
  if (staffId) {
    query = query.eq('staff_id', staffId)
  }
  
  const { data, error } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  // Validate and save schedule
  // ...
}
```

### Task 3: Create Time Off API
**File**: `app/api/staff/time-off/route.ts`

- [ ] GET - list time off requests
- [ ] POST - create request
- [ ] PATCH - approve/reject (admin only)

### Task 4: Create Calendar Component
**File**: `components/calendar/calendar-view.tsx`

Option A: Using react-big-calendar
```typescript
'use client'

import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { es }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales,
})

interface Props {
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  date: Date
  onDateChange: (date: Date) => void
}

export function CalendarView({
  events,
  onSelectEvent,
  onSelectSlot,
  view,
  onViewChange,
  date,
  onDateChange,
}: Props) {
  return (
    <div className="h-[700px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={onViewChange}
        date={date}
        onNavigate={onDateChange}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
        culture="es"
        messages={{
          today: 'Hoy',
          previous: 'Anterior',
          next: 'Siguiente',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          agenda: 'Agenda',
          noEventsInRange: 'No hay citas en este rango',
        }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.color || 'var(--primary)',
          },
        })}
      />
    </div>
  )
}
```

Option B: Custom calendar grid (if you prefer no external deps)

### Task 5: Create Calendar Page
**File**: `app/[clinic]/dashboard/calendar/page.tsx`

- [ ] Fetch appointments for date range
- [ ] Transform to calendar events
- [ ] Render calendar component
- [ ] Handle event click (show details)
- [ ] Handle slot click (create appointment)

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarContainer } from '@/components/calendar/calendar-container'

interface Props {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ date?: string; view?: string; staff?: string }>
}

export default async function CalendarPage({ params, searchParams }: Props) {
  const { clinic } = await params
  const { date, view, staff } = await searchParams
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/auth/login`)
  
  const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinic })
  if (!isStaff) redirect(`/${clinic}/portal`)
  
  // Fetch staff for filter
  const { data: staffList } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('tenant_id', clinic)
    .in('role', ['vet', 'admin'])
  
  // Fetch appointments (date range based on view)
  // ...
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        Calendario
      </h1>
      
      <CalendarContainer 
        clinic={clinic}
        initialDate={date}
        initialView={view}
        staffFilter={staff}
        staffList={staffList || []}
      />
    </div>
  )
}
```

### Task 6: Create Calendar Container (Client Component)
**File**: `components/calendar/calendar-container.tsx`

- [ ] Manage view state
- [ ] Manage date navigation
- [ ] Fetch events on date change
- [ ] Handle staff filter
- [ ] Render CalendarView

### Task 7: Create Event Detail Modal
**File**: `components/calendar/event-detail-modal.tsx`

- [ ] Show appointment details
- [ ] Action buttons (check-in, complete, cancel)
- [ ] Edit button
- [ ] Patient/client info

### Task 8: Create Quick Add Appointment Modal
**File**: `components/calendar/quick-add-modal.tsx`

- [ ] Triggered by clicking empty slot
- [ ] Pre-fill date/time from slot
- [ ] Service selector
- [ ] Client/pet search
- [ ] Save to database

### Task 9: Create Staff Schedule Page
**File**: `app/[clinic]/dashboard/schedule/page.tsx`

- [ ] Weekly schedule grid
- [ ] Edit availability by day
- [ ] View/request time off
- [ ] Admin: manage all staff schedules

### Task 10: Create Schedule Editor Component
**File**: `components/calendar/schedule-editor.tsx`

- [ ] Day/time grid
- [ ] Click to toggle availability
- [ ] Save changes

### Task 11: Create Time Off Request Component
**File**: `components/calendar/time-off-request.tsx`

- [ ] Date range picker
- [ ] Reason/type selector
- [ ] Submit request
- [ ] View request status

### Task 12: Testing
**Directory**: `tests/unit/calendar/`

- [ ] Test event transformation
- [ ] Test schedule API
- [ ] Test time off logic

---

## Database Schema Check

Verify these tables exist (or create migrations):

```sql
-- db/80_staff_schedules.sql
-- Check if staff_schedules exists, if not:

CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  staff_id UUID NOT NULL REFERENCES profiles(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, day_of_week)
);

ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own schedule" ON staff_schedules
  FOR ALL USING (
    staff_id = auth.uid() OR is_staff_of(tenant_id)
  );
```

---

## Spanish Text Reference

| Element | Spanish Text |
|---------|-------------|
| Calendar | Calendario |
| Today | Hoy |
| Day | Día |
| Week | Semana |
| Month | Mes |
| Previous | Anterior |
| Next | Siguiente |
| No events | No hay citas |
| Staff | Personal |
| All staff | Todo el personal |
| Schedule | Horario |
| Working hours | Horario laboral |
| Time off | Ausencias |
| Request time off | Solicitar ausencia |
| Vacation | Vacaciones |
| Sick leave | Enfermedad |
| Personal | Personal |
| Pending | Pendiente |
| Approved | Aprobada |
| Rejected | Rechazada |
| Monday | Lunes |
| Tuesday | Martes |
| Wednesday | Miércoles |
| Thursday | Jueves |
| Friday | Viernes |
| Saturday | Sábado |
| Sunday | Domingo |

---

## Event Colors

```typescript
const eventColors: Record<string, string> = {
  scheduled: '#3B82F6',    // blue
  confirmed: '#10B981',    // green
  checked_in: '#F59E0B',   // yellow
  in_progress: '#8B5CF6',  // purple
  completed: '#6B7280',    // gray
  cancelled: '#EF4444',    // red
  time_off: '#EC4899',     // pink
  block: '#1F2937',        // dark gray
}
```

---

## Package Installation

If using react-big-calendar, document this need:
```bash
npm install react-big-calendar date-fns
npm install -D @types/react-big-calendar
```

---

## Acceptance Criteria

- [ ] Staff can view calendar with day/week/month views
- [ ] Appointments show on calendar
- [ ] Click appointment shows details
- [ ] Click empty slot opens quick-add
- [ ] Staff filter works
- [ ] Staff can manage their schedule
- [ ] Staff can request time off
- [ ] Admin can approve time off
- [ ] Calendar is in Spanish
- [ ] Uses CSS variables
- [ ] Mobile responsive (simplified mobile view)

---

## Dependencies

**From Agent-04**: Uses appointment data. Can run in parallel since it only reads.

---

## Handoff Notes

(Fill this in when pausing or completing work)

### Completed
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
- [ ] Task 4
- [ ] Task 5
- [ ] Task 6
- [ ] Task 7
- [ ] Task 8
- [ ] Task 9
- [ ] Task 10
- [ ] Task 11
- [ ] Task 12

### In Progress
- 

### Blockers
- 

### Notes for Integration
- Need to install react-big-calendar (document in README)

---

*Agent-07 Task File - Last updated: December 2024*
