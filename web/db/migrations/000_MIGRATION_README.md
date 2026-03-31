# Database Migrations

This directory contains incremental migrations to improve the database schema.

## Migration Files

| #   | File                                            | Description                                                       | Priority |
| --- | ----------------------------------------------- | ----------------------------------------------------------------- | -------- |
| 001 | `001_add_tenant_id_to_child_tables.sql`         | Adds `tenant_id` to child tables for better RLS performance       | HIGH     |
| 002 | `002_add_missing_foreign_keys.sql`              | Adds missing FK constraints (invoice_items.product_id, etc.)      | HIGH     |
| 003 | `003_fix_sequence_generation.sql`               | Fixes race conditions in invoice/admission number generation      | HIGH     |
| 004 | `004_fix_handle_new_user.sql`                   | Removes hardcoded demo emails from auth trigger                   | HIGH     |
| 005 | `005_add_brin_indexes.sql`                      | Adds BRIN indexes for time-series tables                          | MEDIUM   |
| 006 | `006_add_constraints.sql`                       | Adds CHECK constraints and unique constraints                     | MEDIUM   |
| 007 | `007_optimize_rls_policies.sql`                 | Optimizes RLS policies to use direct tenant_id                    | MEDIUM   |
| 008 | `008_add_covering_indexes.sql`                  | Adds covering indexes for common query patterns                   | MEDIUM   |
| 009 | `009_fix_invoice_totals.sql`                    | Fixes invoice total calculation logic                             | MEDIUM   |
| 010 | `010_add_soft_delete.sql`                       | Adds soft delete to remaining tables                              | LOW      |
| 011 | `011_quick_fix_profile_creation.sql`            | Quick fix for profile creation issues                             | HIGH     |
| 012 | `012_security_audit_fixes.sql`                  | Security hardening from audit (18.5KB of fixes)                   | HIGH     |
| 013 | `013_enable_missing_rls.sql`                    | Enables RLS on tables missing policies                            | HIGH     |
| 014 | `014_enable_vaccine_staff_policies.sql`         | Adds staff policies for vaccine tables                            | HIGH     |
| 015 | `015_import_mappings.sql`                       | Adds import mapping tables for data imports                       | MEDIUM   |
| 016 | `016_product_barcodes.sql`                      | Adds barcode support for products                                 | MEDIUM   |
| 017 | `017_subscriptions.sql`                         | Adds subscription/recurring billing support                       | MEDIUM   |
| 018 | `018_fix_vaccine_rls_policies.sql`              | Fixes vaccine RLS policies for proper access                      | HIGH     |
| 019 | `019_pet_documents.sql`                         | Adds pet documents table for attachments                          | LOW      |
| 020 | `020_appointment_race_condition_fix.sql`        | Fixes appointment booking race conditions                         | HIGH     |
| 021 | `021_fix_checkout_and_inventory_race_conditions.sql` | Fixes checkout and inventory race conditions               | HIGH     |
| 022 | `022_add_missing_indexes.sql`                   | Adds missing indexes for performance                              | MEDIUM   |
| 023 | `023_add_reminder_channels.sql`                 | Adds reminder channel preferences                                 | LOW      |
| 024 | `024_add_tenant_id_to_vaccine_reactions.sql`    | Adds tenant_id to vaccine_reactions for direct RLS                | HIGH     |
| 025 | `025_session_context_rls.sql`                   | Implements session-based tenant context for optimized RLS         | HIGH     |
| 026 | `026_autovacuum_and_composite_indexes.sql`      | Configures autovacuum and adds composite indexes for dashboards   | MEDIUM   |
| 027 | `027_table_partitioning.sql`                    | Partitions high-volume tables (requires maintenance window)       | HIGH     |
| 028 | `028_data_archiving.sql`                        | Implements archive schema and retention policies                  | MEDIUM   |

## Archived Migrations

The following files have been archived to `archive/`:

| File                                | Reason                    |
| ----------------------------------- | ------------------------- |
| `0000_parched_scalphunter.sql`      | Drizzle snapshot (legacy) |
| `0001_broad_katie_power.sql`        | Drizzle snapshot (legacy) |
| `20251221_add_pet_columns.sql`      | Stub file (empty)         |
| `fix_product_image_urls.sql`        | One-time fix script       |

## Running Migrations

### Option 1: Using Supabase CLI

```bash
# Run all migrations in order
supabase db push
```

### Option 2: Using psql directly

```bash
# Connect to your database
psql $DATABASE_URL

# Run migrations in order
\i web/db/migrations/001_add_tenant_id_to_child_tables.sql
\i web/db/migrations/002_add_missing_foreign_keys.sql
# ... continue for each migration ...
\i web/db/migrations/025_session_context_rls.sql
```

### Option 3: Using the run script

```bash
# From project root
./web/db/migrations/run_migrations.sh
```

## Pre-Migration Checklist

- [ ] Backup the database
- [ ] Test migrations on staging first
- [ ] Review migration logs for errors
- [ ] Verify RLS policies work correctly
- [ ] Test application functionality

## Post-Migration Verification

Run these queries to verify the migrations:

```sql
-- Check tenant_id was added to all tables
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'tenant_id'
AND table_schema = 'public'
ORDER BY table_name;

-- Check for tables still missing tenant_id
SELECT t.table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND t.table_name NOT IN (
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'tenant_id'
    AND table_schema = 'public'
)
AND t.table_name NOT IN ('tenants', 'demo_accounts', 'document_sequences');

-- Check all constraints were added
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

-- Check index sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Verify session context functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('set_tenant_context', 'get_session_tenant', 'is_staff_of_fast', 'auto_set_tenant_context');
```

## Rollback

Each migration is wrapped in a transaction (BEGIN/COMMIT). If a migration fails, it will automatically rollback.

For manual rollback, you'll need to:

1. Drop added columns/indexes
2. Restore original functions
3. Restore original RLS policies

**Note**: Some migrations (like sequence generation fix) create new tables that may need manual cleanup.

## Production Considerations

### Before deploying to production:

1. **Remove demo accounts**:

   ```sql
   DELETE FROM public.demo_accounts;
   -- Or disable them:
   UPDATE public.demo_accounts SET is_active = false;
   ```

2. **Verify constraints won't fail**:
   Run validation queries in each migration's comments to check for data issues.

3. **Monitor performance**:
   After adding indexes, run `ANALYZE` on affected tables:

   ```sql
   ANALYZE public.appointments;
   ANALYZE public.invoices;
   ANALYZE public.vaccines;
   ANALYZE public.medical_records;
   ```

4. **Set up autovacuum** for high-volume tables:
   ```sql
   ALTER TABLE audit_logs SET (autovacuum_vacuum_scale_factor = 0.01);
   ALTER TABLE messages SET (autovacuum_vacuum_scale_factor = 0.01);
   ```

5. **Enable session context** for optimized RLS (migration 025):
   ```typescript
   // At the start of each authenticated request
   await supabase.rpc('set_tenant_context', {
     p_tenant_id: profile.tenant_id,
     p_user_role: profile.role
   })
   ```

## Changes Summary

### Security Fixes

- Removed hardcoded demo email logic from `handle_new_user()`
- Added demo accounts table for configurable development accounts
- Comprehensive security audit fixes (migration 012)
- Enabled RLS on all tables missing policies

### Data Integrity

- Added missing FK constraint on `invoice_items.product_id`
- Added unique constraints for business rules (one active hospitalization per pet, etc.)
- Added CHECK constraints for valid data ranges
- Fixed race conditions in appointments, checkout, and inventory

### Performance

- Added `tenant_id` to child tables for direct RLS checks
- Added BRIN indexes for time-series data
- Added covering indexes for common queries
- Optimized RLS policies to eliminate subqueries
- Implemented session-based tenant context (100-500x faster for large result sets)

### Consistency

- Added soft delete columns to all relevant tables
- Fixed invoice totals calculation
- Fixed sequence generation race conditions

---

_Last updated: January 2026_
