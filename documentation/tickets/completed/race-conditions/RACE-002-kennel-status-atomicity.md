# RACE-002: Kennel Status Update Not Atomic

## Priority: P1 (High)
## Category: Race Condition
## Status: COMPLETED

## Description
Hospitalization creation and kennel status update are separate operations, allowing double-booking of kennels.

## Current State
### Problematic Code
**`app/api/hospitalizations/route.ts:180-182`**
```typescript
// Step 1: Insert hospitalization
const { data: hospitalization, error: hospError } = await supabase
  .from('hospitalizations')
  .insert({
    kennel_id: kennel_id,
    // ... other fields
  })
  .select()
  .single()

if (hospError) { return error... }

// Step 2: Update kennel status (SEPARATE OPERATION)
await supabase
  .from('kennels')
  .update({ kennel_status: 'occupied' })
  .eq('id', kennel_id)
```

### Race Condition Scenario
1. Admin A starts admitting pet to kennel 5 (available)
2. Admin B starts admitting pet to kennel 5 (still shows available)
3. Admin A's hospitalization inserted
4. Admin B's hospitalization inserted (same kennel!)
5. Both kennel updates run
6. Two patients in same kennel!

### Impact
- Double-booked kennels
- Patient care issues
- Staff confusion
- Potential animal welfare concerns

## Proposed Solution

### Option 1: Database Trigger (Recommended)
```sql
-- Trigger to auto-update kennel status on hospitalization
CREATE OR REPLACE FUNCTION update_kennel_on_hospitalization()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Verify kennel is available (atomic check)
    IF EXISTS (
      SELECT 1 FROM kennels
      WHERE id = NEW.kennel_id
      AND kennel_status != 'available'
    ) THEN
      RAISE EXCEPTION 'Kennel is not available'
        USING ERRCODE = 'P0001';
    END IF;

    -- Mark as occupied
    UPDATE kennels
    SET kennel_status = 'occupied', updated_at = NOW()
    WHERE id = NEW.kennel_id;

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'discharged' THEN
    -- Mark as available on discharge
    UPDATE kennels
    SET kennel_status = 'available', updated_at = NOW()
    WHERE id = OLD.kennel_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hospitalization_kennel_status
  AFTER INSERT OR UPDATE ON hospitalizations
  FOR EACH ROW EXECUTE FUNCTION update_kennel_on_hospitalization();
```

### Option 2: Unique Active Hospitalization Constraint
```sql
-- Only one active hospitalization per kennel
CREATE UNIQUE INDEX idx_one_active_per_kennel
ON hospitalizations (kennel_id)
WHERE status NOT IN ('discharged', 'cancelled');
```

### Updated API Code
```typescript
try {
  const { data: hospitalization, error } = await supabase
    .from('hospitalizations')
    .insert(hospitalizationData)
    .select()
    .single()

  if (error) {
    if (error.code === 'P0001') {
      return apiError('El canil no está disponible', 409)
    }
    throw error
  }

  // Kennel status updated automatically by trigger
  return NextResponse.json(hospitalization)
} catch (error) {
  // Handle unique constraint violation
  if (error.code === '23505') {
    return apiError('El canil ya está ocupado', 409)
  }
  throw error
}
```

## Implementation Steps
1. Create unique index for active hospitalizations
2. Create trigger for kennel status sync
3. Update API to handle constraint errors
4. Remove manual kennel update code
5. Test concurrent admissions
6. Add discharge flow update

## Acceptance Criteria
- [ ] Cannot double-book kennels
- [ ] Kennel status auto-updates on admission
- [ ] Kennel status auto-updates on discharge
- [ ] Clear error message for conflicts
- [ ] Existing hospitalizations unaffected

## Related Files
- `web/db/migrations/xxx_kennel_atomicity.sql` (new)
- `web/app/api/hospitalizations/route.ts`
- `web/app/api/hospitalizations/[id]/route.ts` (discharge)

## Estimated Effort
- Migration with trigger: 2 hours
- API updates: 1 hour
- Testing: 2 hours
- **Total: 5 hours**

---
## Implementation Summary (Completed)

**Files Created:**
- `db/migrations/049_kennel_atomicity.sql`

**Files Modified:**
- `app/api/hospitalizations/route.ts`

**Changes Made:**

1. **Unique partial index:**
   ```sql
   CREATE UNIQUE INDEX idx_hospitalizations_one_active_per_kennel
   ON hospitalizations (kennel_id)
   WHERE status NOT IN ('discharged', 'cancelled', 'transferred');
   ```
   - Prevents database-level double-booking
   - Concurrent inserts fail with unique constraint violation

2. **Database trigger (`sync_kennel_status_on_hospitalization`):**
   - INSERT: Marks kennel as 'occupied', validates availability
   - UPDATE (discharge): Marks kennel as 'cleaning'
   - UPDATE (transfer): Updates both old and new kennels
   - DELETE: Marks kennel as 'available'

3. **Helper function:**
   - `mark_kennel_cleaned(UUID)` - Staff marks kennel ready after cleaning

4. **API error handling:**
   - Catches error code `23505` (unique violation) and `P0001` (trigger exception)
   - Returns 409 Conflict with clear Spanish message

5. **Removed manual updates:**
   - Removed manual kennel status update on admission
   - Removed manual kennel status update on discharge
   - Trigger handles all status transitions atomically

**Behavior:**
- Double-booking now impossible at database level
- Clear error: "El canil no está disponible o ya está ocupado"
- Discharge sets kennel to 'cleaning' (requires staff to mark clean)

---
*Ticket created: January 2026*
*Completed: January 2026*
*Based on security/performance audit*
