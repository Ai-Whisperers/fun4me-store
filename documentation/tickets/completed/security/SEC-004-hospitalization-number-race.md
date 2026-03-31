# SEC-004: Hospitalization Number Race Condition

## Priority: P1 (High)
## Category: Security / Race Condition
## Status: COMPLETED

## Description
The hospitalization number generation uses a non-atomic pattern that can produce duplicate numbers under concurrent load.

## Current State
### Problematic Code
**`app/api/hospitalizations/route.ts:123-140`**
```typescript
const { data: lastHospitalization } = await supabase
  .from('hospitalizations')
  .select('hospitalization_number')
  .like('hospitalization_number', `H-${new Date().getFullYear()}-%`)
  .order('hospitalization_number', { ascending: false })
  .limit(1)
  .single()

let nextNumber = 1
if (lastHospitalization?.hospitalization_number) {
  const match = lastHospitalization.hospitalization_number.match(/H-\d{4}-(\d+)/)
  if (match) {
    nextNumber = parseInt(match[1], 10) + 1
  }
}
```

### Issue
- Pattern: "read last number, increment, insert" is not atomic
- Two concurrent admissions can both read the same last number
- Regex parsing adds complexity and potential for bugs
- No unique constraint prevents duplicate insertions

### Impact
- Duplicate hospitalization numbers
- Patient care confusion
- Billing/insurance claim issues

## Proposed Solution

### Database Sequence Approach
```sql
-- Create sequence per year
CREATE SEQUENCE hospitalization_seq_2026 START 1;

-- Create atomic function
CREATE OR REPLACE FUNCTION generate_hospitalization_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  v_seq := nextval('hospitalization_seq_' || v_year);
  RETURN 'H-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

### API Update
```typescript
// Replace manual generation with RPC call
const { data: numberData } = await supabase.rpc('generate_hospitalization_number')
const hospitalizationNumber = numberData
```

## Implementation Steps
1. Create migration with sequence and function
2. Add unique constraint on hospitalization_number
3. Update POST handler to use RPC
4. Handle yearly sequence rollover
5. Write concurrent admission tests

## Acceptance Criteria
- [ ] Hospitalization numbers are unique
- [ ] Concurrent admissions get different numbers
- [ ] Yearly rollover works correctly (H-2027-00001)
- [ ] Existing records unaffected
- [ ] Integration tests pass

## Related Files
- `web/app/api/hospitalizations/route.ts`
- `web/db/migrations/xxx_hospitalization_sequence.sql` (new)

## Estimated Effort
- Migration: 1 hour
- Code update: 1 hour
- Testing: 1 hour
- **Total: 3 hours**

---
## Implementation Summary (Completed)

**Files Created:**
- `db/migrations/046_atomic_order_number_sequences.sql` (shared with SEC-003)

**Changes Made:**
1. Created `hospitalization_sequences` table for yearly sequences per tenant (PRIMARY KEY: tenant_id, year)
2. Created atomic `generate_hospitalization_number(p_tenant_id)` function using INSERT ON CONFLICT
3. Added unique constraint on `hospitalizations.hospitalization_number`
4. Added RLS policy for sequence table
5. Included data initialization from existing hospitalizations
6. Updated `app/api/hospitalizations/route.ts` to use atomic RPC call

**Technical Details:**
- Function uses INSERT ON CONFLICT DO UPDATE for atomic counter increment
- Returns format: `H-YYYY-XXXX` (4-digit padded sequence)
- Sequences reset yearly per tenant
- Old regex-based select-parse-increment pattern replaced

---
*Completed: January 2026*
