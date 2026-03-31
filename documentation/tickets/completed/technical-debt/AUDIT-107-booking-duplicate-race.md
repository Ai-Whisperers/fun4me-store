# AUDIT-107 Booking Request Duplicate Race Condition (TOCTOU)

## Priority: P1

## Category: Technical Debt / Data Integrity

## Status: Not Started

## Epic: [EPIC-01: Data Integrity](../epics/EPIC-01-data-integrity.md)

## Description

The booking request creation has a Time-of-Check-Time-of-Use (TOCTOU) race condition. The code checks for existing pending requests before creating a new one, but another request could be created between the check and the insert.

### Current State

**File**: `web/app/actions/create-booking-request.ts` (lines 77-98)

```typescript
// CHECK: Look for existing pending requests
const { data: existingRequests } = await supabase
  .from('appointments')
  .select('id')
  .eq('pet_id', pet_id)
  .eq('scheduling_status', 'pending_scheduling')
  .neq('status', 'cancelled')

if (existingRequests && existingRequests.length > 0) {
  return { success: false, error: 'Ya existe una solicitud pendiente para esta mascota' }
}

// GAP: Another request could be inserted here by concurrent request

// USE: Create the new request
const { data: result, error: rpcError } = await supabase.rpc('create_booking_request', {...})
```

### Race Condition Scenario

| Time | User A | User B |
|------|--------|--------|
| T1 | Check: No pending requests | - |
| T2 | - | Check: No pending requests |
| T3 | Insert: Creates request | - |
| T4 | - | Insert: Creates request |
| T5 | **Result: Two pending requests for same pet** |

### Impact

- Multiple pending requests for same pet
- Clinic confusion when scheduling
- User may not realize duplicate was created
- Inconsistent data state

## Proposed Fix

### Option A: Database Constraint (Recommended)

```sql
-- web/db/migrations/070_unique_pending_booking_per_pet.sql

-- Create partial unique index to prevent duplicates
CREATE UNIQUE INDEX idx_unique_pending_booking_per_pet
ON appointments (pet_id, scheduling_status)
WHERE scheduling_status = 'pending_scheduling'
  AND status != 'cancelled'
  AND deleted_at IS NULL;

COMMENT ON INDEX idx_unique_pending_booking_per_pet IS
  'Ensures only one pending booking request per pet at a time';
```

With this constraint:
- Database enforces uniqueness
- Concurrent inserts will fail with unique violation
- RPC function can catch and return friendly error

### Option B: Update RPC Function

```sql
-- In create_booking_request function
-- Add explicit locking and retry logic

CREATE OR REPLACE FUNCTION create_booking_request(...)
RETURNS JSONB AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  -- Lock the pet row to serialize booking requests
  PERFORM 1 FROM pets WHERE id = p_pet_id FOR UPDATE;

  -- Now check for existing (under lock)
  SELECT COUNT(*) INTO v_existing_count
  FROM appointments
  WHERE pet_id = p_pet_id
    AND scheduling_status = 'pending_scheduling'
    AND status != 'cancelled';

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ya existe una solicitud pendiente para esta mascota'
    );
  END IF;

  -- Safe to insert now
  INSERT INTO appointments (...) VALUES (...);

  RETURN jsonb_build_object('success', true, ...);
END;
$$ LANGUAGE plpgsql;
```

### Option C: Handle Constraint Violation in Code

```typescript
// web/app/actions/create-booking-request.ts
const { data: result, error: rpcError } = await supabase.rpc('create_booking_request', {...})

if (rpcError) {
  // Check for unique constraint violation
  if (rpcError.code === '23505') {  // PostgreSQL unique violation
    return {
      success: false,
      error: 'Ya existe una solicitud pendiente para esta mascota. Actualiza la página para verla.'
    }
  }
  return { success: false, error: 'Error al crear la solicitud' }
}
```

## Acceptance Criteria

- [ ] Database constraint prevents duplicate pending requests
- [ ] Concurrent booking attempts handled gracefully
- [ ] User receives clear error message if duplicate attempted
- [ ] Test: Two simultaneous requests for same pet → Only one succeeds
- [ ] Remove code-level check (now redundant) or keep as optimization
- [ ] Add comment `// AUDIT-107: DB constraint prevents duplicates`

## Related Files

- `web/app/actions/create-booking-request.ts`
- `web/db/migrations/062_booking_request_flow.sql`
- `web/db/` - New migration for constraint

## Estimated Effort

2-3 hours

## Testing Notes

1. Open two browser tabs for same user
2. Navigate both to booking wizard
3. Select same pet in both
4. Click submit simultaneously
5. Verify only one request created
6. Verify second attempt shows error message
