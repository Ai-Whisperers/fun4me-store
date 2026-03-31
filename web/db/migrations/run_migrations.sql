-- =============================================================================
-- RUN_MIGRATIONS.SQL
-- =============================================================================
-- Master script to run all migrations in order.
-- Can be executed via psql: \i run_migrations.sql
--
-- IMPORTANT: Always backup your database before running migrations!
-- =============================================================================

-- Enable timing to see how long each migration takes
\timing on

-- Set verbose error output
\set ON_ERROR_STOP on
\set VERBOSITY verbose

-- =============================================================================
-- PRE-MIGRATION: Verify database connection
-- =============================================================================
SELECT current_database() as database, current_user as user, now() as migration_start;

-- =============================================================================
-- MIGRATION 001: Add tenant_id to child tables
-- =============================================================================
\echo '>>> Running migration 001: Add tenant_id to child tables...'
\i 001_add_tenant_id_to_child_tables.sql
\echo '>>> Migration 001 complete.'

-- =============================================================================
-- MIGRATION 002: Add missing foreign keys
-- =============================================================================
\echo '>>> Running migration 002: Add missing foreign keys...'
\i 002_add_missing_foreign_keys.sql
\echo '>>> Migration 002 complete.'

-- =============================================================================
-- MIGRATION 003: Fix sequence generation
-- =============================================================================
\echo '>>> Running migration 003: Fix sequence generation...'
\i 003_fix_sequence_generation.sql
\echo '>>> Migration 003 complete.'

-- =============================================================================
-- MIGRATION 004: Fix handle_new_user
-- =============================================================================
\echo '>>> Running migration 004: Fix handle_new_user...'
\i 004_fix_handle_new_user.sql
\echo '>>> Migration 004 complete.'

-- =============================================================================
-- MIGRATION 005: Add BRIN indexes
-- =============================================================================
\echo '>>> Running migration 005: Add BRIN indexes...'
\i 005_add_brin_indexes.sql
\echo '>>> Migration 005 complete.'

-- =============================================================================
-- MIGRATION 006: Add constraints
-- =============================================================================
\echo '>>> Running migration 006: Add constraints...'
\i 006_add_constraints.sql
\echo '>>> Migration 006 complete.'

-- =============================================================================
-- MIGRATION 007: Optimize RLS policies
-- =============================================================================
\echo '>>> Running migration 007: Optimize RLS policies...'
\i 007_optimize_rls_policies.sql
\echo '>>> Migration 007 complete.'

-- =============================================================================
-- MIGRATION 008: Add covering indexes
-- =============================================================================
\echo '>>> Running migration 008: Add covering indexes...'
\i 008_add_covering_indexes.sql
\echo '>>> Migration 008 complete.'

-- =============================================================================
-- MIGRATION 009: Fix invoice totals
-- =============================================================================
\echo '>>> Running migration 009: Fix invoice totals...'
\i 009_fix_invoice_totals.sql
\echo '>>> Migration 009 complete.'

-- =============================================================================
-- MIGRATION 010: Add soft delete
-- =============================================================================
\echo '>>> Running migration 010: Add soft delete...'
\i 010_add_soft_delete.sql
\echo '>>> Migration 010 complete.'

-- =============================================================================
-- POST-MIGRATION: Analyze tables for query optimizer
-- =============================================================================
\echo '>>> Running ANALYZE on affected tables...'

ANALYZE public.vaccines;
ANALYZE public.vaccine_reactions;
ANALYZE public.hospitalization_vitals;
ANALYZE public.hospitalization_medications;
ANALYZE public.hospitalization_treatments;
ANALYZE public.hospitalization_feedings;
ANALYZE public.hospitalization_notes;
ANALYZE public.invoice_items;
ANALYZE public.store_campaign_items;
ANALYZE public.qr_tag_scans;
ANALYZE public.appointments;
ANALYZE public.invoices;
ANALYZE public.pets;
ANALYZE public.profiles;
ANALYZE public.messages;
ANALYZE public.audit_logs;

\echo '>>> ANALYZE complete.'

-- =============================================================================
-- POST-MIGRATION: Summary
-- =============================================================================
\echo ''
\echo '=========================================='
\echo 'MIGRATION SUMMARY'
\echo '=========================================='

SELECT now() as migration_end;

-- Count of tables with tenant_id
SELECT 'Tables with tenant_id' as metric,
       COUNT(*)::text as value
FROM information_schema.columns
WHERE column_name = 'tenant_id'
AND table_schema = 'public';

-- Count of constraints
SELECT 'Total constraints' as metric,
       COUNT(*)::text as value
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace;

-- Count of indexes
SELECT 'Total indexes' as metric,
       COUNT(*)::text as value
FROM pg_indexes
WHERE schemaname = 'public';

\echo ''
\echo '>>> All migrations completed successfully!'
\echo ''
