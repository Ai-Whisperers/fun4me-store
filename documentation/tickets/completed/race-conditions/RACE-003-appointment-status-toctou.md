# RACE-003: Appointment Status TOCTOU Bug

## Priority: P2 (Medium)
## Category: Race Condition
## Status: COMPLETED

## Description
Appointment status transitions are validated in application code, then updated in a separate operation, allowing time-of-check-time-of-use (TOCTOU) race conditions.

## Current State
### Problematic Code
**`app/api/booking/route.ts:248-303`**
```typescript
// Step 1: Fetch current status (CHECK)
const { data: existing } = await supabase
  .from('appointments')
  .select('status')
  .eq('id', id)
  .single()

// Step 2: Validate transition in JS
const VALID_TRANSITIONS = {
  scheduled: ['checked_in', 'cancelled'],
  checked_in: ['in_progress', 'no_show'],
  in_progress: ['completed'],
  // ...
}

const allowed = VALID_TRANSITIONS[existing.status]
if (!allowed.includes(newStatus)) {
  return apiError('Transición de estado no válida', 400)
}

// Step 3: Update (USE) - status could have changed!
const { data, error } = await supabase
  .from('appointments')
  .update({ status: newStatus })
  .eq('id', id)
  .select()
  .single()
```

### Race Condition Scenario
1. Receptionist A checks appointment (status: scheduled)
2. Receptionist B checks appointment (status: scheduled)
3. Receptionist A marks as "checked_in" - valid
4. Receptionist B marks as "cancelled" - should be invalid!
5. Update succeeds because check happened when status was "scheduled"

### Impact
- Invalid state transitions
- Appointment in unexpected states
- Check-in → cancelled transition allowed
- Audit trail shows impossible transitions

## Proposed Solution

### Option 1: Database Constraint (Recommended)
```sql
-- Create ENUM for appointment status
CREATE TYPE appointment_status AS ENUM (
  'scheduled',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

-- Create transition validation function
CREATE OR REPLACE FUNCTION validate_appointment_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow same status (no change)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  IF OLD.status = 'scheduled' AND NEW.status IN ('confirmed', 'checked_in', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'confirmed' AND NEW.status IN ('checked_in', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'checked_in' AND NEW.status IN ('in_progress', 'no_show', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled') THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = 'P0002';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_status_transition
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_appointment_transition();
```

### Option 2: Optimistic Locking
```typescript
// Add version column to appointments
// Update only if version matches
const { data, error } = await supabase
  .from('appointments')
  .update({
    status: newStatus,
    version: existing.version + 1
  })
  .eq('id', id)
  .eq('version', existing.version)  // Optimistic lock
  .select()
  .single()

if (!data) {
  return apiError('La cita fue modificada por otro usuario', 409)
}
```

### Updated API Code
```typescript
try {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'P0002') {
      return apiError('Transición de estado no válida', 400)
    }
    throw error
  }

  return NextResponse.json(data)
} catch (error) {
  // ...
}
```

## Implementation Steps
1. Create status transition trigger
2. Update API to handle trigger errors
3. Remove client-side validation (keep for UX)
4. Add version column for optimistic locking (optional)
5. Test concurrent status changes
6. Update frontend error handling

## Acceptance Criteria
- [ ] Invalid transitions rejected at database level
- [ ] Concurrent updates don't bypass validation
- [ ] Clear error messages for invalid transitions
- [ ] Existing appointments unaffected
- [ ] Frontend still shows valid options

## Related Files
- `web/db/migrations/xxx_appointment_status_trigger.sql` (new)
- `web/app/api/booking/route.ts`
- `web/components/dashboard/appointment-card.tsx`

## Estimated Effort
- Migration: 2 hours
- API update: 1 hour
- Frontend handling: 1 hour
- Testing: 1 hour
- **Total: 5 hours**

---
## Implementation Summary (Completed)

**Migration Created:** `db/migrations/059_atomic_appointment_status.sql`

**Changes Made:**
1. Created `update_appointment_status_atomic()` PostgreSQL function that:
   - Uses `FOR UPDATE` row-level locking to prevent concurrent modifications
   - Validates status transitions within the same atomic operation (no TOCTOU gap)
   - Defines allowed transitions: scheduled→confirmed/cancelled, confirmed→checked_in/cancelled, etc.
   - Enforces owner-only-cancel rule for non-staff users
   - Sets cancellation/completion/check-in timestamps automatically

2. Updated `app/api/booking/route.ts`:
   - Status updates now use `supabase.rpc('update_appointment_status_atomic', {...})`
   - Handles INVALID_TRANSITION and OWNER_CANCEL_ONLY error codes
   - Returns appropriate 400/403 responses with Spanish error messages

**Function Returns JSONB:**
- `success`: boolean
- `previous_status`, `status`: for audit trail
- `error`, `message`: on failure

**Result:** Concurrent status changes now handled atomically - impossible state transitions prevented at database level.

---
*Ticket created: January 2026*
*Completed: January 2026*
