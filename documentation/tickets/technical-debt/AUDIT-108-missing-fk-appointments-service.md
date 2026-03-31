# AUDIT-108 Missing Foreign Key: appointments.service_id

## Priority: P2

## Category: Technical Debt / Data Integrity

## Status: Not Started

## Epic: [EPIC-01: Data Integrity](../epics/EPIC-01-data-integrity.md)

## Description

The `appointments.service_id` column has no foreign key constraint to the `services` table. This means appointments can be created with invalid or non-existent service IDs, breaking referential integrity.

### Current State

**File**: `web/db/40_scheduling/02_appointments.sql`

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  pet_id UUID NOT NULL REFERENCES pets(id),
  service_id UUID,  -- NO FOREIGN KEY!
  vet_id UUID REFERENCES profiles(id),
  -- ...
);
```

### Code Mitigation

The booking action validates services exist before calling RPC:

```typescript
// web/app/actions/create-booking-request.ts
const { data: services } = await supabase
  .from('services')
  .select('id, name')
  .in('id', service_ids)
  .eq('tenant_id', profile.tenant_id)

if (!services || services.length !== service_ids.length) {
  return { success: false, error: 'Uno o más servicios no existen' }
}
```

However:
- Direct database access bypasses this check
- RPC functions could insert invalid service_ids
- Admin tools could create bad data
- Database doesn't enforce integrity

### Risk

- Orphaned appointments referencing deleted services
- JOIN queries returning nulls unexpectedly
- Data integrity issues in reporting
- Harder to debug appointment issues

## Proposed Fix

### Migration

```sql
-- web/db/migrations/071_appointments_service_fk.sql

-- First, clean up any orphaned service_ids (if any exist)
UPDATE appointments
SET service_id = NULL
WHERE service_id IS NOT NULL
  AND service_id NOT IN (SELECT id FROM services);

-- Add foreign key constraint
ALTER TABLE appointments
ADD CONSTRAINT fk_appointments_service
FOREIGN KEY (service_id)
REFERENCES services(id)
ON DELETE SET NULL;  -- Keep appointment if service deleted

-- Add comment
COMMENT ON CONSTRAINT fk_appointments_service ON appointments IS
  'Ensures service_id references valid service. SET NULL on delete preserves appointment history.';
```

### Why SET NULL on Delete?

- Services may be discontinued
- Historical appointments should not be deleted
- `service_id = NULL` indicates "service no longer available"
- Alternative: Use soft delete on services (already in place?)

### Alternative: RESTRICT

If services should never be deleted while appointments exist:

```sql
ALTER TABLE appointments
ADD CONSTRAINT fk_appointments_service
FOREIGN KEY (service_id)
REFERENCES services(id)
ON DELETE RESTRICT;
```

## Acceptance Criteria

- [ ] Foreign key constraint added to appointments.service_id
- [ ] Orphaned service_ids cleaned up before constraint
- [ ] Inserting appointment with invalid service_id fails
- [ ] Deleting service with appointments behaves correctly
- [ ] Test: Create appointment with fake service_id → Fails
- [ ] Add comment in schema file

## Related Files

- `web/db/40_scheduling/02_appointments.sql`
- `web/db/migrations/` - New migration

## Estimated Effort

1-2 hours

## Migration Safety

Before running migration:
1. Check for orphaned appointments:
   ```sql
   SELECT COUNT(*) FROM appointments
   WHERE service_id IS NOT NULL
     AND service_id NOT IN (SELECT id FROM services);
   ```
2. If count > 0, investigate before cleaning up
3. Run in transaction with rollback capability
