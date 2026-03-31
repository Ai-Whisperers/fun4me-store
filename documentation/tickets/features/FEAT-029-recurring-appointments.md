# FEAT-029 Recurring Appointment Support

## Priority: P2

## Category: Feature

## Status: Not Started

## Epic: [EPIC-09: Feature Expansion](../epics/EPIC-09-feature-expansion.md)

## Description

Customers cannot request recurring appointments (e.g., monthly check-ups, weekly grooming). Each appointment must be booked separately. This creates friction for preventive care patterns and routine services.

### Current State

- Each booking is single-occurrence
- No recurrence pattern fields in booking request
- Staff can create recurring appointments via dashboard (cron generates)
- Customers cannot request recurring from booking flow

### Use Cases

1. **Monthly wellness check-ups** - Senior pet monitoring
2. **Quarterly vaccinations** - Puppy vaccination series
3. **Weekly grooming** - Regular grooming appointments
4. **Bi-weekly therapy** - Rehabilitation sessions
5. **Annual check-ups** - Yearly health exams

## Proposed Solution

### Recurrence Pattern Schema

```typescript
interface RecurrencePattern {
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  interval: number  // Every X weeks/months
  endType: 'never' | 'after_occurrences' | 'on_date'
  endAfter?: number  // Number of occurrences
  endDate?: string   // ISO date
  preferredDayOfWeek?: number  // 0-6 for weekly
  preferredDayOfMonth?: number // 1-31 for monthly
}
```

### Database Changes

```sql
-- Add recurrence fields to appointments
ALTER TABLE appointments ADD COLUMN is_recurring BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN recurrence_pattern JSONB;
ALTER TABLE appointments ADD COLUMN recurring_parent_id UUID REFERENCES appointments(id);
ALTER TABLE appointments ADD COLUMN occurrence_number INTEGER;

-- Recurrence requests (before staff schedules)
CREATE TABLE appointment_recurrence_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  frequency TEXT NOT NULL,
  interval_value INTEGER DEFAULT 1,
  end_type TEXT NOT NULL,
  end_after_occurrences INTEGER,
  end_on_date DATE,
  preferred_day_of_week INTEGER,
  preferred_day_of_month INTEGER,
  status TEXT DEFAULT 'pending',  -- pending, approved, rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Booking Wizard Update

```typescript
// web/components/booking/booking-wizard/Confirmation.tsx
const [wantsRecurring, setWantsRecurring] = useState(false)
const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | null>(null)

return (
  <div>
    {/* ... existing confirmation content ... */}

    {/* Recurrence option */}
    <div className="border-t pt-4 mt-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={wantsRecurring}
          onChange={(e) => setWantsRecurring(e.target.checked)}
        />
        <span>Quiero programar citas recurrentes</span>
      </label>

      {wantsRecurring && (
        <RecurrenceSelector
          value={recurrencePattern}
          onChange={setRecurrencePattern}
        />
      )}
    </div>
  </div>
)
```

### Recurrence Selector Component

```typescript
// web/components/booking/recurrence-selector.tsx
export function RecurrenceSelector({ value, onChange }) {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg mt-4">
      <Select
        label="Frecuencia"
        value={value?.frequency}
        onChange={(f) => onChange({ ...value, frequency: f })}
      >
        <option value="weekly">Semanal</option>
        <option value="biweekly">Cada 2 semanas</option>
        <option value="monthly">Mensual</option>
        <option value="quarterly">Trimestral</option>
        <option value="yearly">Anual</option>
      </Select>

      <Select
        label="Termina"
        value={value?.endType}
        onChange={(e) => onChange({ ...value, endType: e })}
      >
        <option value="after_occurrences">Después de X citas</option>
        <option value="on_date">En una fecha específica</option>
        <option value="never">Sin fecha de fin</option>
      </Select>

      {value?.endType === 'after_occurrences' && (
        <Input
          type="number"
          label="Número de citas"
          value={value?.endAfter}
          onChange={(n) => onChange({ ...value, endAfter: n })}
          min={2}
          max={52}
        />
      )}

      {value?.endType === 'on_date' && (
        <Input
          type="date"
          label="Fecha de fin"
          value={value?.endDate}
          onChange={(d) => onChange({ ...value, endDate: d })}
        />
      )}

      <p className="text-sm text-gray-500">
        La clínica te contactará para confirmar las fechas de cada cita.
      </p>
    </div>
  )
}
```

### Staff Dashboard View

```typescript
// Staff sees recurrence request attached to booking
// Can approve/reject/modify the pattern
// Approved patterns get scheduled by existing cron job
```

## Implementation Steps

1. [ ] Create database migration for recurrence fields
2. [ ] Create appointment_recurrence_requests table
3. [ ] Build RecurrenceSelector component
4. [ ] Update Confirmation step to include recurrence option
5. [ ] Update createBookingRequest action to save recurrence
6. [ ] Update staff dashboard to show recurrence requests
7. [ ] Create approve/reject recurrence actions
8. [ ] Integrate with existing generate-recurring cron job
9. [ ] Show recurring badge on appointment cards

## Acceptance Criteria

- [ ] Customer can request recurring appointments
- [ ] Can choose frequency (weekly, monthly, etc.)
- [ ] Can set end condition (after X occurrences, on date)
- [ ] Staff sees recurrence request in dashboard
- [ ] Staff can approve/reject/modify pattern
- [ ] Approved recurrences generate via cron
- [ ] Customer sees recurring indicator on appointments

## Related Files

- `web/components/booking/booking-wizard/Confirmation.tsx`
- `web/components/booking/recurrence-selector.tsx` (create)
- `web/app/actions/create-booking-request.ts`
- `web/app/api/cron/generate-recurring/route.ts`

## Estimated Effort

12-16 hours
