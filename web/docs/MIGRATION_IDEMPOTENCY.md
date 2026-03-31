# PostgreSQL Migration Idempotency Guide

## Overview

**Idempotent migrations** can be run multiple times safely without causing errors or duplicate effects. This is critical for:

- **Recovery**: Re-running failed migrations without manual cleanup
- **CI/CD**: Multiple deployments don't break if migrations run twice
- **Team Safety**: Developers can re-run migrations locally without corruption
- **Zero-Downtime Deployments**: Rollback-safe operations

---

## Core Principles

### ✅ Safe Idempotency Patterns

| Pattern                          | Use Case             | Example                            |
| -------------------------------- | -------------------- | ---------------------------------- |
| `IF NOT EXISTS`                  | Creating objects     | `ADD COLUMN IF NOT EXISTS`         |
| `CREATE OR REPLACE`              | Functions/triggers   | `CREATE OR REPLACE FUNCTION`       |
| `DROP IF EXISTS ... THEN CREATE` | Clean slate creation | `DROP TRIGGER IF EXISTS`           |
| `DO $$ ... EXCEPTION`            | Constraint handling  | Handle duplicate constraint errors |
| Conditional checks               | Data migrations      | Check before insert/update         |

### ❌ Dangerous Anti-Patterns

| Anti-Pattern                                 | Why It's Dangerous        | Fix                                  |
| -------------------------------------------- | ------------------------- | ------------------------------------ |
| Direct `ALTER TABLE ADD COLUMN`              | Fails on second run       | Use `IF NOT EXISTS`                  |
| Unconditional `INSERT`                       | Creates duplicates        | Check for existence first            |
| `ALTER COLUMN SET NOT NULL` without backfill | Fails if nulls exist      | Backfill first, then constrain       |
| `DROP COLUMN` in production                  | Data loss                 | Deprecate, then drop                 |
| Raw `CREATE INDEX`                           | Locks table + fails twice | Use `CONCURRENTLY` + `IF NOT EXISTS` |

---

## Pattern Catalog

### 1. Adding Columns (Safe Pattern)

```sql
-- ✅ IDEMPOTENT: Column creation
ALTER TABLE public.vaccines
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- ✅ IDEMPOTENT: Backfill with conditional check
UPDATE public.vaccines v
SET tenant_id = p.tenant_id
FROM public.pets p
WHERE v.pet_id = p.id
AND v.tenant_id IS NULL;  -- CRITICAL: Only update if not already set

-- ✅ IDEMPOTENT: Add constraint (nullable first strategy)
-- Run 1: Column is nullable
-- Run 2+: Column already has constraint (DO block handles error)
ALTER TABLE public.vaccines
    ALTER COLUMN tenant_id SET NOT NULL;
```

**Key Insight**: Always use `AND column IS NULL` in backfill queries to prevent re-processing on second run.

---

### 2. Adding Foreign Keys (DO Block Pattern)

```sql
-- ✅ IDEMPOTENT: Foreign key with duplicate handling
DO $$ BEGIN
    ALTER TABLE public.vaccines
        ADD CONSTRAINT vaccines_tenant_fk
        FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- Constraint already exists
END $$;
```

**Why This Works**:

- First run: Constraint created successfully
- Second run: `duplicate_object` exception caught silently
- No error, no duplicate constraint

---

### 3. Creating Indexes (CONCURRENTLY Pattern)

```sql
-- ✅ IDEMPOTENT: Safe index creation
CREATE INDEX IF NOT EXISTS idx_vaccines_tenant
ON public.vaccines(tenant_id);

-- ✅ PRODUCTION-SAFE: Non-blocking index (cannot use IF NOT EXISTS with CONCURRENTLY)
-- Run this outside transaction for production databases
CREATE INDEX CONCURRENTLY idx_appointments_tenant_status_start
ON appointments (tenant_id, status, start_time);
```

**Production Index Creation**:

1. **Development/Staging**: Use `CREATE INDEX IF NOT EXISTS` (faster, locks table briefly)
2. **Production**: Use `CREATE INDEX CONCURRENTLY` (slower, no locks, must run outside transaction)

**Handling CONCURRENTLY Idempotency**:

```sql
-- Check if index exists before creating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_appointments_active'
    ) THEN
        -- Cannot use CONCURRENTLY in DO block
        -- Run this directly in psql or SQL editor
        EXECUTE 'CREATE INDEX CONCURRENTLY idx_appointments_active
                 ON appointments (tenant_id, start_time)
                 WHERE status IN (''scheduled'', ''confirmed'')';
    END IF;
END $$;
```

**Practical Approach**:

- Use `IF NOT EXISTS` in migration files
- Document that production deployment should use `CONCURRENTLY` manually

---

### 4. Creating Triggers (DROP-THEN-CREATE Pattern)

```sql
-- ✅ IDEMPOTENT: Function creation
CREATE OR REPLACE FUNCTION public.vaccines_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.pets WHERE id = NEW.pet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ✅ IDEMPOTENT: Trigger creation
DROP TRIGGER IF EXISTS vaccines_auto_tenant ON public.vaccines;
CREATE TRIGGER vaccines_auto_tenant
    BEFORE INSERT ON public.vaccines
    FOR EACH ROW EXECUTE FUNCTION public.vaccines_set_tenant_id();
```

**Key Points**:

- `CREATE OR REPLACE FUNCTION` is naturally idempotent
- Triggers require `DROP IF EXISTS` before `CREATE` (no `CREATE OR REPLACE` for triggers)

---

### 5. Modifying RLS Policies (DROP-THEN-CREATE Pattern)

```sql
-- ✅ IDEMPOTENT: RLS policy update
DROP POLICY IF EXISTS "Public read global templates" ON public.vaccine_templates;
CREATE POLICY "Public read global templates" ON public.vaccine_templates
    FOR SELECT USING (tenant_id IS NULL AND is_active = true AND deleted_at IS NULL);
```

**Why This Pattern**:

- Policies don't support `CREATE OR REPLACE`
- `DROP IF EXISTS` ensures clean slate

---

### 6. Soft Delete Pattern (Reusable Function)

```sql
-- ✅ IDEMPOTENT: Reusable soft delete addition
CREATE OR REPLACE FUNCTION public.add_soft_delete_columns(
    p_table_name TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Add deleted_at column if not exists
    EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
        p_table_name
    );

    -- Add deleted_by column if not exists
    EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id)',
        p_table_name
    );

    -- Create partial index for active records
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_active ON public.%I(id) WHERE deleted_at IS NULL',
        p_table_name, p_table_name
    );

    RAISE NOTICE 'Added soft delete columns to %', p_table_name;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding soft delete to %: %', p_table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Usage (naturally idempotent)
SELECT public.add_soft_delete_columns('vaccine_templates');
SELECT public.add_soft_delete_columns('kennels');
```

**Key Insight**: Functions with built-in idempotency checks can be called repeatedly safely.

---

### 7. Atomic Operations (PostgreSQL Functions)

```sql
-- ✅ IDEMPOTENT: Atomic function creation
CREATE OR REPLACE FUNCTION create_lab_order_atomic(
  p_tenant_id TEXT,
  p_pet_id UUID,
  p_order_number TEXT,
  p_test_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert order
  INSERT INTO lab_orders (...) VALUES (...) RETURNING id INTO v_order_id;

  -- Insert items
  FOREACH v_test_id IN ARRAY p_test_ids LOOP
    INSERT INTO lab_order_items (order_id, test_id) VALUES (v_order_id, v_test_id);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_ORDER');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

**Function Creation is Idempotent**:

- `CREATE OR REPLACE` allows re-running migrations
- Function body can change between runs
- Caller code gets updated implementation automatically

---

## Common Scenarios

### Scenario 1: Two-Phase Column Addition (Production-Safe)

**Goal**: Add `NOT NULL` column with backfill

```sql
-- MIGRATION 001: Add nullable column
ALTER TABLE pets ADD COLUMN IF NOT EXISTS microchip_number TEXT;

-- Backfill existing records
UPDATE pets
SET microchip_number = 'UNKNOWN-' || id::TEXT
WHERE microchip_number IS NULL;

-- MIGRATION 002 (later): Make it NOT NULL (after verifying no nulls)
-- Check first
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pets WHERE microchip_number IS NULL) THEN
        RAISE EXCEPTION 'Cannot add NOT NULL constraint: null values exist';
    END IF;

    ALTER TABLE pets ALTER COLUMN microchip_number SET NOT NULL;
END $$;
```

**Why Split**:

- Phase 1: Deployable immediately (nullable column safe)
- Phase 2: Requires validation (no nulls exist)

---

### Scenario 2: Renaming Columns (Backward Compatibility)

**Goal**: Rename `deleted` (boolean) to `deleted_at` (timestamp)

```sql
-- MIGRATION 001: Add new column
ALTER TABLE pets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill from old column
UPDATE pets
SET deleted_at = CASE WHEN deleted = true THEN NOW() ELSE NULL END
WHERE deleted_at IS NULL AND deleted IS NOT NULL;

-- Keep both columns temporarily for backward compatibility

-- MIGRATION 002 (weeks later, after app updated): Drop old column
ALTER TABLE pets DROP COLUMN IF EXISTS deleted;
```

**Production Strategy**:

1. Add new column (safe)
2. Update application to write to both columns
3. Backfill historical data
4. Update application to read from new column only
5. Drop old column (after monitoring)

---

### Scenario 3: Changing Constraints

**Goal**: Relax `CHECK` constraint

```sql
-- Original constraint
ALTER TABLE appointments
ADD CONSTRAINT check_duration_positive CHECK (duration_minutes > 0);

-- Need to allow zero duration (same-day appointments)

-- ✅ IDEMPOTENT: Drop and recreate constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS check_duration_positive;
ALTER TABLE appointments
ADD CONSTRAINT check_duration_positive CHECK (duration_minutes >= 0);
```

**Key Point**: Constraints can't be modified, must drop and recreate.

---

## Testing Idempotency

### Pre-Deployment Checklist

Run this checklist before deploying any migration:

```bash
# 1. Apply migration to clean database
psql $DATABASE_URL -f migrations/XXX_migration.sql

# 2. Run migration AGAIN (should succeed with no errors)
psql $DATABASE_URL -f migrations/XXX_migration.sql

# 3. Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM table_name;"
# Compare counts - should be identical after both runs

# 4. Check for duplicate indexes/constraints
psql $DATABASE_URL -c "
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;"
```

### Automated Test Script

```bash
#!/bin/bash
# test-migration-idempotency.sh

MIGRATION_FILE=$1
DATABASE_URL=$2

echo "Testing idempotency of $MIGRATION_FILE..."

# Run migration first time
psql $DATABASE_URL -f $MIGRATION_FILE > /tmp/run1.log 2>&1
EXIT_CODE_1=$?

if [ $EXIT_CODE_1 -ne 0 ]; then
  echo "❌ FIRST RUN FAILED"
  cat /tmp/run1.log
  exit 1
fi

echo "✅ First run succeeded"

# Run migration second time
psql $DATABASE_URL -f $MIGRATION_FILE > /tmp/run2.log 2>&1
EXIT_CODE_2=$?

if [ $EXIT_CODE_2 -ne 0 ]; then
  echo "❌ SECOND RUN FAILED (NOT IDEMPOTENT)"
  cat /tmp/run2.log
  exit 1
fi

echo "✅ Second run succeeded"
echo "✅ MIGRATION IS IDEMPOTENT"
```

---

## Migration File Template

Use this template for all new migrations:

```sql
-- =============================================================================
-- XXX_FEATURE_NAME.SQL
-- =============================================================================
-- Description: What this migration does
--
-- Idempotency: Safe to run multiple times
-- Dependencies: List required prior migrations
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. TABLE MODIFICATIONS
-- =============================================================================

-- Add columns
ALTER TABLE public.table_name
ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Backfill data (with conditional check)
UPDATE public.table_name
SET new_column = 'default_value'
WHERE new_column IS NULL;

-- Add constraints (with error handling)
DO $$ BEGIN
    ALTER TABLE public.table_name
        ADD CONSTRAINT constraint_name CHECK (new_column IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- B. INDEXES
-- =============================================================================

-- Standard index (development)
CREATE INDEX IF NOT EXISTS idx_table_column ON public.table_name(new_column);

-- Note: For production, use CONCURRENTLY outside transaction
-- CREATE INDEX CONCURRENTLY idx_table_column ON public.table_name(new_column);

-- =============================================================================
-- C. FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.function_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Function logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- D. TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_name ON public.table_name;
CREATE TRIGGER trigger_name
    BEFORE INSERT ON public.table_name
    FOR EACH ROW EXECUTE FUNCTION public.function_name();

-- =============================================================================
-- E. RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Policy name" ON public.table_name;
CREATE POLICY "Policy name" ON public.table_name
    FOR ALL TO authenticated
    USING (tenant_id = get_user_tenant());

COMMIT;

-- =============================================================================
-- POST-MIGRATION VERIFICATION
-- =============================================================================
-- Run these queries to verify the migration:
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'table_name' AND column_name = 'new_column';
--
-- SELECT COUNT(*) FROM table_name WHERE new_column IS NOT NULL;
```

---

## Rollback Strategies

### Option 1: Reverse Migration File

Create a corresponding `XXX_rollback.sql`:

```sql
-- Rollback for 010_add_soft_delete.sql

BEGIN;

-- Remove RLS policy changes
DROP POLICY IF EXISTS "Staff manage templates" ON public.message_templates;
CREATE POLICY "Staff manage templates" ON public.message_templates
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

-- Drop added indexes
DROP INDEX IF EXISTS idx_vaccine_templates_active;
DROP INDEX IF EXISTS idx_kennels_active;

-- Remove columns
ALTER TABLE public.vaccine_templates DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.vaccine_templates DROP COLUMN IF EXISTS deleted_by;

COMMIT;
```

### Option 2: Compensating Transaction

Instead of reversing, apply a new migration that fixes issues:

```sql
-- 011_fix_soft_delete_issue.sql (compensating migration)
-- Fixes issue where deleted_at wasn't properly indexed

CREATE INDEX IF NOT EXISTS idx_vaccine_templates_deleted
ON public.vaccine_templates(deleted_at) WHERE deleted_at IS NOT NULL;
```

**Best Practice**: Prefer compensating transactions in production (forward-only migrations).

---

## Production Deployment Workflow

### Step 1: Pre-Deployment Validation

```bash
# On staging database
export DATABASE_URL="postgresql://staging..."

# Test idempotency
./test-migration-idempotency.sh migrations/050_new_feature.sql $DATABASE_URL

# Verify no errors
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction';"
```

### Step 2: Production Deployment

```bash
# Backup first
pg_dump $PROD_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration with timing
time psql $PROD_DATABASE_URL -f migrations/050_new_feature.sql

# Verify success
psql $PROD_DATABASE_URL -c "SELECT schemaname, tablename, indexname
                              FROM pg_indexes
                              WHERE indexname LIKE 'idx_new_%';"
```

### Step 3: Monitor

```sql
-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('vaccines', 'pets', 'appointments')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for lock waits
SELECT pid, usename, pg_blocking_pids(pid) as blocked_by, query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

---

## Common Pitfalls

### Pitfall 1: Assuming Data Exists

```sql
-- ❌ WRONG: Assumes pet exists
UPDATE vaccines
SET tenant_id = (SELECT tenant_id FROM pets WHERE id = vaccines.pet_id);

-- ✅ CORRECT: Handle missing pets
UPDATE vaccines v
SET tenant_id = p.tenant_id
FROM pets p
WHERE v.pet_id = p.id
AND v.tenant_id IS NULL;  -- Idempotency check
```

### Pitfall 2: Non-Idempotent Data Migrations

```sql
-- ❌ WRONG: Creates duplicates on second run
INSERT INTO vaccine_templates (name, species)
VALUES ('Rabies', 'dog'), ('Rabies', 'cat');

-- ✅ CORRECT: Check for existence
INSERT INTO vaccine_templates (name, species)
SELECT 'Rabies', 'dog'
WHERE NOT EXISTS (
    SELECT 1 FROM vaccine_templates WHERE name = 'Rabies' AND species = 'dog'
);
```

### Pitfall 3: Transaction Scope Issues

```sql
-- ❌ WRONG: CONCURRENTLY cannot be in transaction
BEGIN;
CREATE INDEX CONCURRENTLY idx_pets_microchip ON pets(microchip_number);
COMMIT;
-- ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block

-- ✅ CORRECT: Run outside transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pets_microchip ON pets(microchip_number);
```

**Solution**: Document in migration file which statements need manual execution.

---

## Summary Checklist

Before submitting a migration, verify:

- [ ] All `ALTER TABLE ADD COLUMN` use `IF NOT EXISTS`
- [ ] All data backfills check `WHERE column IS NULL`
- [ ] All constraints use `DO $$ ... EXCEPTION` pattern
- [ ] All indexes use `IF NOT EXISTS` (or document CONCURRENTLY requirement)
- [ ] All functions use `CREATE OR REPLACE`
- [ ] All triggers use `DROP IF EXISTS` before `CREATE`
- [ ] All RLS policies use `DROP IF EXISTS` before `CREATE`
- [ ] Tested by running migration twice on test database
- [ ] Rollback strategy documented
- [ ] Post-migration verification queries included

---

## References

- **PostgreSQL Best Practices**: `.claude/rules/postgres.md`
- **Example Migrations**:
  - `001_add_tenant_id_to_child_tables.sql` - Multi-table migration
  - `010_add_soft_delete.sql` - Reusable functions pattern
  - `050_composite_indexes.sql` - Production index creation
  - `057_atomic_lab_order_creation.sql` - Atomic functions
- **Database Documentation**: `web/db/README.md`

---

_Last updated: January 2026_
