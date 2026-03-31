# EPIC-002: Database Schema Consistency

**Status**: Not Started  
**Priority**: HIGH  
**Estimated Effort**: 1 week  
**Risk Level**: MEDIUM  
**Dependencies**: None (can run parallel to EPIC-001)

## Overview

This epic addresses critical inconsistencies in the database schema including duplicate migration numbers, missing RLS policies, inconsistent naming conventions, and missing audit fields. These issues create maintenance burden and potential data integrity problems.

## Business Impact

- **Risk**: Database migration failures in production
- **Impact**: Downtime during deployments, data corruption risk
- **Urgency**: Must be fixed before next major database migration

## Technical Context

The Vete platform uses:
- PostgreSQL via Supabase
- Numbered SQL migration files (001-067)
- Row-Level Security (RLS) for tenant isolation
- `handle_updated_at()` trigger for audit trails

Current issues:
1. Duplicate migration numbers (063, 064)
2. Missing RLS policies on new tables
3. Inconsistent column naming (`clinic_id` vs `tenant_id`)
4. Missing `updated_at` triggers

---

## Tickets

### TICKET-DB-001: Renumber Duplicate Migrations

**Priority**: CRITICAL  
**Effort**: 2 hours  
**Type**: Bug Fix  
**Component**: Database Migrations

#### Problem Statement

Multiple migration files share the same sequence numbers:
- **063**: 3 files (`add_subscription_tier_columns`, `consent_email_tracking`, `prescription_verification`)
- **064**: 2 files (`cron_job_tracking`, `export_jobs`)

This causes undefined execution order and breaks migration tracking.

#### Root Cause

- Parallel development without coordination
- No automated check for duplicate numbers
- Manual numbering process prone to errors

#### Current Files

```
web/db/migrations/
├── 063_add_subscription_tier_columns.sql
├── 063_consent_email_tracking.sql
├── 063_prescription_verification.sql
├── 064_cron_job_tracking.sql
├── 064_export_jobs.sql
├── 065_... (continues)
```

#### Solution

**Phase 1: Identify All Migrations**

```bash
# List all migration files with numbers
cd web/db/migrations
ls -1 *.sql | sort -V

# Expected output shows duplicates:
# 063_add_subscription_tier_columns.sql
# 063_consent_email_tracking.sql
# 063_prescription_verification.sql
# 064_cron_job_tracking.sql
# 064_export_jobs.sql
```

**Phase 2: Determine Correct Order**

Analyze dependencies between migrations:

```sql
-- Check if files reference each other
-- Look for table dependencies

-- 063_add_subscription_tier_columns.sql
ALTER TABLE subscriptions ADD COLUMN tier TEXT;

-- 063_consent_email_tracking.sql
ALTER TABLE consent_documents ADD COLUMN email_sent_at TIMESTAMPTZ;

-- 063_prescription_verification.sql
ALTER TABLE prescriptions ADD COLUMN verified_at TIMESTAMPTZ;

-- 064_cron_job_tracking.sql
CREATE TABLE cron_job_runs (...);

-- 064_export_jobs.sql
CREATE TABLE export_jobs (...);
```

**Dependency Analysis**:
- None of these files depend on each other
- Can be sequenced in any order
- Choose alphabetical for consistency

**Phase 3: Renumber Files**

```bash
# Create renumbering script
# web/db/scripts/renumber-migrations.sh

#!/bin/bash

# Backup first
cp -r migrations migrations.backup

# Renumber duplicates
mv 063_consent_email_tracking.sql 064_consent_email_tracking.sql
mv 063_prescription_verification.sql 065_prescription_verification.sql

# Shift subsequent files
mv 064_cron_job_tracking.sql 066_cron_job_tracking.sql
mv 064_export_jobs.sql 067_export_jobs.sql

# Verify sequence
ls -1 *.sql | grep -E '^[0-9]{3}_' | sort -V
```

**Phase 4: Update Migration Tracking**

If using a migration tracking table:

```sql
-- Update migration history if already run
UPDATE schema_migrations 
SET version = '064'
WHERE version = '063' 
AND name = 'consent_email_tracking';

UPDATE schema_migrations 
SET version = '065'
WHERE version = '063' 
AND name = 'prescription_verification';

UPDATE schema_migrations 
SET version = '066'
WHERE version = '064' 
AND name = 'cron_job_tracking';

UPDATE schema_migrations 
SET version = '067'
WHERE version = '064' 
AND name = 'export_jobs';
```

**Phase 5: Add Validation Script**

```bash
# web/db/scripts/validate-migration-numbers.sh

#!/bin/bash

# Get all migration files
migrations=$(ls -1 web/db/migrations/*.sql | grep -oE '[0-9]{3}' | sort)

# Check for duplicates
duplicates=$(echo "$migrations" | uniq -d)

if [ -n "$duplicates" ]; then
    echo "❌ ERROR: Duplicate migration numbers found"
    echo ""
    echo "Duplicates:"
    echo "$duplicates" | while read num; do
        echo "  • Migration $num:"
        ls -1 web/db/migrations/${num}_*.sql | sed 's/^/    - /'
    done
    echo ""
    echo "Solution: Renumber migrations using scripts/renumber-migrations.sh"
    exit 1
fi

# Check for gaps
expected=1
for num in $migrations; do
    if [ $num -ne $expected ]; then
        echo "⚠ WARNING: Gap in migration sequence"
        echo "  Expected: $(printf "%03d" $expected)"
        echo "  Found: $num"
        echo ""
        echo "This may be intentional if migrations were removed."
        echo "Verify migration history is correct."
    fi
    expected=$((num + 1))
done

echo "✅ Migration numbers are valid"
exit 0
```

#### Acceptance Criteria

- [ ] All migrations have unique numbers
- [ ] Migrations numbered sequentially (063, 064, 065, 066, 067)
- [ ] No gaps in sequence
- [ ] Migration tracking table updated (if applicable)
- [ ] Validation script added to pre-commit hook
- [ ] Documentation updated with new sequence
- [ ] Team notified of renumbering

#### Testing Plan

```bash
# Test validation script
./web/db/scripts/validate-migration-numbers.sh

# Test that migrations can be applied in order
# (on a test database)
for migration in web/db/migrations/*.sql; do
    echo "Applying $migration..."
    psql $TEST_DB_URL -f "$migration"
    if [ $? -ne 0 ]; then
        echo "❌ Failed to apply $migration"
        exit 1
    fi
done

echo "✅ All migrations applied successfully"
```

#### Rollback Plan

```bash
# If issues arise, restore backup
rm -rf web/db/migrations
mv web/db/migrations.backup web/db/migrations
```

---

### TICKET-DB-002: Add RLS Policies to Archive Tables

**Priority**: HIGH  
**Effort**: 4 hours  
**Type**: Security Enhancement  
**Component**: Database Schema

#### Problem Statement

Tables in the `archive` schema inherit structure from `public` schema using `LIKE ... INCLUDING ALL`, but do NOT inherit RLS policies. This creates a security gap where archived data can be accessed across tenants.

#### Current Code

```sql
-- web/db/migrations/028_data_archiving.sql

-- Create archive schema
CREATE SCHEMA IF NOT EXISTS archive;

-- Create archive tables (structure only)
CREATE TABLE archive.medical_records (LIKE public.medical_records INCLUDING ALL);
CREATE TABLE archive.invoices (LIKE public.invoices INCLUDING ALL);
CREATE TABLE archive.appointments (LIKE public.appointments INCLUDING ALL);

-- Add archive metadata
ALTER TABLE archive.medical_records ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE archive.invoices ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE archive.appointments ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NOW();

-- ❌ PROBLEM: Grant access without RLS
GRANT SELECT ON archive.medical_records TO authenticated;
GRANT SELECT ON archive.invoices TO authenticated;
GRANT SELECT ON archive.appointments TO authenticated;
```

#### Impact Assessment

| Risk | Description |
|------|-------------|
| Cross-tenant data leak | Users can query archived records from other tenants |
| GDPR violation | Historical patient data exposed |
| Audit trail gaps | No record of who accessed archived data |

#### Solution

**Step 1: Enable RLS on Archive Tables**

```sql
-- web/db/migrations/069_fix_archive_rls.sql

-- Enable RLS on all archive tables
ALTER TABLE archive.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.appointments ENABLE ROW LEVEL SECURITY;
```

**Step 2: Create Tenant Isolation Policies**

```sql
-- Policy for medical_records
CREATE POLICY "Staff view archived medical records in tenant"
ON archive.medical_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id = archive.medical_records.tenant_id
    AND profiles.role IN ('vet', 'admin')
  )
);

-- Policy for invoices
CREATE POLICY "Staff view archived invoices in tenant"
ON archive.invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id = archive.invoices.tenant_id
    AND profiles.role IN ('vet', 'admin')
  )
);

-- Policy for appointments
CREATE POLICY "Staff view archived appointments in tenant"
ON archive.appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id = archive.appointments.tenant_id
    AND profiles.role IN ('vet', 'admin')
  )
);
```

**Step 3: Add Performance Indexes**

```sql
-- Indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_archive_medical_records_tenant 
ON archive.medical_records(tenant_id, archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_archive_invoices_tenant 
ON archive.invoices(tenant_id, archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_archive_appointments_tenant 
ON archive.appointments(tenant_id, archived_at DESC);
```

**Step 4: Add Audit Logging**

```sql
-- Create audit function for archive access
CREATE OR REPLACE FUNCTION log_archive_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource,
    resource_id,
    tenant_id,
    details
  ) VALUES (
    auth.uid(),
    'ARCHIVE_ACCESS',
    TG_TABLE_NAME,
    NEW.id,
    NEW.tenant_id,
    jsonb_build_object(
      'archived_at', NEW.archived_at,
      'accessed_at', NOW()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to archive tables
CREATE TRIGGER audit_archive_medical_records
  AFTER SELECT ON archive.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION log_archive_access();

CREATE TRIGGER audit_archive_invoices
  AFTER SELECT ON archive.invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_archive_access();

CREATE TRIGGER audit_archive_appointments
  AFTER SELECT ON archive.appointments
  FOR EACH ROW
  EXECUTE FUNCTION log_archive_access();
```

#### Acceptance Criteria

- [ ] RLS enabled on all archive tables
- [ ] Tenant isolation policies created
- [ ] Performance indexes added
- [ ] Audit logging implemented
- [ ] Cross-tenant access blocked (verified in tests)
- [ ] Query performance acceptable (<100ms)
- [ ] Documentation updated

#### Testing Plan

```typescript
// web/tests/security/archive-rls.test.ts

describe('Archive RLS Policies', () => {
  let adrisAdmin: TestUser
  let petlifeAdmin: TestUser
  let adrisRecord: MedicalRecord
  
  beforeEach(async () => {
    adrisAdmin = await createTestUser({ tenant: 'adris', role: 'admin' })
    petlifeAdmin = await createTestUser({ tenant: 'petlife', role: 'admin' })
    
    // Create and archive a medical record for Adris
    adrisRecord = await createTestMedicalRecord({ tenant: 'adris' })
    await archiveRecord(adrisRecord.id)
  })
  
  it('prevents cross-tenant archive access', async () => {
    const supabase = createTestClient(petlifeAdmin.token)
    
    // Petlife admin tries to access Adris archive
    const { data, error } = await supabase
      .from('archive.medical_records')
      .select('*')
      .eq('id', adrisRecord.id)
      
    // Should not find the record
    expect(data).toHaveLength(0)
  })
  
  it('allows same-tenant archive access', async () => {
    const supabase = createTestClient(adrisAdmin.token)
    
    const { data, error } = await supabase
      .from('archive.medical_records')
      .select('*')
      .eq('id', adrisRecord.id)
      
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe(adrisRecord.id)
  })
  
  it('logs archive access', async () => {
    const supabase = createTestClient(adrisAdmin.token)
    
    await supabase
      .from('archive.medical_records')
      .select('*')
      .eq('id', adrisRecord.id)
      
    // Check audit log
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'ARCHIVE_ACCESS')
      .eq('resource_id', adrisRecord.id)
      
    expect(auditLogs).toHaveLength(1)
    expect(auditLogs[0].user_id).toBe(adrisAdmin.id)
  })
})
```

---

### TICKET-DB-003: Standardize Column Naming (clinic_id → tenant_id)

**Priority**: MEDIUM  
**Effort**: 3 hours  
**Type**: Refactoring  
**Component**: Database Schema

#### Problem Statement

Recent migrations use `clinic_id` instead of the project standard `tenant_id`:
- `claim_audit_log` table (migration 066)
- `loyalty_redeem` RPC function (migration 041)

This inconsistency creates confusion and breaks query patterns.

#### Project Standard

**Established in migrations 001-020:**
- Core tables use `tenant_id TEXT NOT NULL REFERENCES tenants(id)`
- All tenant filtering uses `.eq('tenant_id', tenantId)`
- RLS policies check `tenant_id` column

#### Files Affected

```sql
-- web/db/migrations/066_claim_code_verification.sql
CREATE TABLE claim_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id TEXT NOT NULL,  -- ❌ Should be tenant_id
  ...
);

-- web/db/migrations/041_atomic_loyalty_redeem.sql
CREATE OR REPLACE FUNCTION loyalty_redeem(
  clinic_id TEXT,  -- ❌ Should be tenant_id
  user_id UUID,
  points_to_redeem INTEGER
) RETURNS ...
```

#### Solution

**Step 1: Create Migration to Rename Columns**

```sql
-- web/db/migrations/070_standardize_tenant_naming.sql

-- Rename column in claim_audit_log
ALTER TABLE claim_audit_log 
  RENAME COLUMN clinic_id TO tenant_id;

-- Update foreign key if needed
ALTER TABLE claim_audit_log
  DROP CONSTRAINT IF EXISTS claim_audit_log_clinic_id_fkey;
  
ALTER TABLE claim_audit_log
  ADD CONSTRAINT claim_audit_log_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- Recreate loyalty_redeem function with correct parameter name
DROP FUNCTION IF EXISTS loyalty_redeem(TEXT, UUID, INTEGER);

CREATE OR REPLACE FUNCTION loyalty_redeem(
  tenant_id TEXT,  -- ✅ Renamed
  user_id UUID,
  points_to_redeem INTEGER
) RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER,
  message TEXT
) AS $$
DECLARE
  current_balance INTEGER;
  v_tenant_id TEXT := tenant_id;  -- Local variable
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM loyalty_points
  WHERE loyalty_points.user_id = loyalty_redeem.user_id
    AND loyalty_points.tenant_id = v_tenant_id
  FOR UPDATE;
  
  -- Validation
  IF current_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Usuario no encontrado';
    RETURN;
  END IF;
  
  IF current_balance < points_to_redeem THEN
    RETURN QUERY SELECT false, current_balance, 'Puntos insuficientes';
    RETURN;
  END IF;
  
  -- Deduct points
  UPDATE loyalty_points
  SET balance = balance - points_to_redeem
  WHERE loyalty_points.user_id = loyalty_redeem.user_id
    AND loyalty_points.tenant_id = v_tenant_id;
    
  -- Log transaction
  INSERT INTO loyalty_transactions (
    user_id,
    tenant_id,
    points,
    type,
    description
  ) VALUES (
    loyalty_redeem.user_id,
    v_tenant_id,
    -points_to_redeem,
    'redemption',
    'Canje de puntos'
  );
  
  RETURN QUERY SELECT true, current_balance - points_to_redeem, 'Éxito';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Update Application Code**

```typescript
// web/app/api/loyalty/redeem/route.ts

// ❌ BEFORE
const { data, error } = await supabase.rpc('loyalty_redeem', {
  clinic_id: profile.tenant_id,
  user_id: user.id,
  points_to_redeem: points,
})

// ✅ AFTER
const { data, error } = await supabase.rpc('loyalty_redeem', {
  tenant_id: profile.tenant_id,  // Renamed parameter
  user_id: user.id,
  points_to_redeem: points,
})
```

**Step 3: Search and Replace**

```bash
# Find all references to clinic_id
cd web
grep -r "clinic_id" app/ lib/ --include="*.ts" --include="*.tsx"

# Review each match and update to tenant_id where appropriate
# Note: Some might be legitimate (e.g., UI form fields named clinic_id)
```

#### Acceptance Criteria

- [ ] `claim_audit_log.clinic_id` renamed to `tenant_id`
- [ ] `loyalty_redeem()` function updated with `tenant_id` parameter
- [ ] All application code updated to use new parameter names
- [ ] Foreign key constraints updated
- [ ] RLS policies reference correct column names
- [ ] Tests updated and passing
- [ ] Documentation reflects standard naming

#### Testing Plan

```typescript
// web/tests/database/naming-consistency.test.ts

describe('Naming Consistency', () => {
  it('claim_audit_log uses tenant_id', async () => {
    const { data: columns } = await supabase.rpc('get_table_columns', {
      schema_name: 'public',
      table_name: 'claim_audit_log'
    })
    
    expect(columns.find(c => c.column_name === 'tenant_id')).toBeDefined()
    expect(columns.find(c => c.column_name === 'clinic_id')).toBeUndefined()
  })
  
  it('loyalty_redeem accepts tenant_id parameter', async () => {
    const { data, error } = await supabase.rpc('loyalty_redeem', {
      tenant_id: 'adris',
      user_id: testUser.id,
      points_to_redeem: 10
    })
    
    expect(error).toBeNull()
  })
})
```

---

### TICKET-DB-004: Add Missing updated_at Triggers

**Priority**: MEDIUM  
**Effort**: 2 hours  
**Type**: Enhancement  
**Component**: Database Schema

#### Problem Statement

Several new tables lack `updated_at` columns and `handle_updated_at()` triggers:
- `cron_job_runs`
- Archive tables (`archive.medical_records`, `archive.invoices`, `archive.appointments`)

This breaks the audit trail pattern used throughout the system.

#### Project Standard

Every table should have:
```sql
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

And a trigger:
```sql
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
```

#### Solution

```sql
-- web/db/migrations/071_add_missing_audit_fields.sql

-- Add updated_at to cron_job_runs
ALTER TABLE cron_job_runs 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER handle_updated_at_cron_job_runs
  BEFORE UPDATE ON cron_job_runs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Add updated_at to archive tables
ALTER TABLE archive.medical_records 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER handle_updated_at_archive_medical_records
  BEFORE UPDATE ON archive.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

ALTER TABLE archive.invoices 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER handle_updated_at_archive_invoices
  BEFORE UPDATE ON archive.invoices
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

ALTER TABLE archive.appointments 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER handle_updated_at_archive_appointments
  BEFORE UPDATE ON archive.appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Add validation check
CREATE OR REPLACE FUNCTION validate_audit_fields()
RETURNS TABLE (
  schema_name TEXT,
  table_name TEXT,
  has_created_at BOOLEAN,
  has_updated_at BOOLEAN,
  has_trigger BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_schema::TEXT,
    t.table_name::TEXT,
    EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = t.table_schema
      AND c.table_name = t.table_name
      AND c.column_name = 'created_at'
    ) as has_created_at,
    EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = t.table_schema
      AND c.table_name = t.table_name
      AND c.column_name = 'updated_at'
    ) as has_updated_at,
    EXISTS (
      SELECT 1 FROM information_schema.triggers tr
      WHERE tr.event_object_schema = t.table_schema
      AND tr.event_object_table = t.table_name
      AND tr.trigger_name LIKE '%updated_at%'
    ) as has_trigger
  FROM information_schema.tables t
  WHERE t.table_schema IN ('public', 'archive')
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT IN ('schema_migrations', '_migrations')
  ORDER BY t.table_schema, t.table_name;
END;
$$ LANGUAGE plpgsql;
```

#### Acceptance Criteria

- [ ] All tables have `updated_at` column
- [ ] All tables have `handle_updated_at()` trigger
- [ ] Validation function created
- [ ] Audit script added to CI/CD
- [ ] Documentation updated

---

## Success Metrics

- [ ] All migrations numbered sequentially
- [ ] Zero duplicate migration numbers
- [ ] 100% RLS coverage on all tables
- [ ] Consistent naming convention (tenant_id)
- [ ] All tables have audit fields

## Rollout Plan

1. **Week 1, Day 1-2**: TICKET-DB-001 (Renumber migrations)
2. **Week 1, Day 3-4**: TICKET-DB-002 (Archive RLS)
3. **Week 1, Day 5**: TICKET-DB-003 (Naming consistency)
4. **Week 2, Day 1**: TICKET-DB-004 (Audit fields)
5. **Week 2, Day 2**: Final validation and documentation

## Dependencies

- None (independent epic)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing migrations | Test on fresh database first |
| Data loss during renaming | Backup before migration |
| Performance impact of new indexes | Test query plans |

