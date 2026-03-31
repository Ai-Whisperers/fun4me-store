-- =============================================================================
-- 026_AUTOVACUUM_AND_COMPOSITE_INDEXES.SQL
-- =============================================================================
-- Configures autovacuum for high-volume tables and adds composite indexes
-- for common tenant + time-series query patterns.
--
-- CONTEXT:
-- High-volume tables like audit_logs, messages, and medical_records can
-- accumulate dead tuples quickly. Default autovacuum settings may not be
-- aggressive enough, leading to table bloat and degraded query performance.
--
-- This migration:
-- 1. Configures aggressive autovacuum for high-write tables
-- 2. Adds composite (tenant_id, created_at) indexes for time-series queries
-- 3. Adds composite indexes for common dashboard queries
--
-- This migration is IDEMPOTENT - safe to run multiple times.
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. AUTOVACUUM CONFIGURATION FOR HIGH-VOLUME TABLES
-- =============================================================================
-- Default scale_factor is 0.2 (vacuum when 20% of rows are dead)
-- For high-volume tables, we use 0.01 (vacuum when 1% of rows are dead)
--
-- autovacuum_vacuum_scale_factor: Fraction of table to trigger vacuum
-- autovacuum_analyze_scale_factor: Fraction of table to trigger analyze
-- autovacuum_vacuum_cost_delay: Delay between vacuum operations (ms)

-- Audit logs: Very high write volume, rarely updated/deleted
ALTER TABLE IF EXISTS public.audit_logs SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_vacuum_cost_delay = 10
);

-- Messages: High write volume in active clinics
ALTER TABLE IF EXISTS public.messages SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_vacuum_cost_delay = 10
);

-- Medical records: Core clinical data, frequent inserts
ALTER TABLE IF EXISTS public.medical_records SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.01
);

-- Appointments: High churn (created, updated, cancelled)
ALTER TABLE IF EXISTS public.appointments SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.01
);

-- Invoices: Frequent status updates
ALTER TABLE IF EXISTS public.invoices SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.01
);

-- Store orders: E-commerce activity
ALTER TABLE IF EXISTS public.store_orders SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.01
);

-- Inventory transactions: Very high volume for stock movements
ALTER TABLE IF EXISTS public.store_inventory_transactions SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005
);

-- Notifications: High volume, frequently marked as read
ALTER TABLE IF EXISTS public.notifications SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.01
);

-- =============================================================================
-- B. COMPOSITE INDEXES FOR TENANT + TIME-SERIES QUERIES
-- =============================================================================
-- These indexes optimize dashboard queries that filter by tenant and sort by date.
-- Pattern: "Show me recent X for clinic Y"

-- Medical records: Recent visits per clinic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_records_tenant_date
ON public.medical_records(tenant_id, visit_date DESC)
WHERE deleted_at IS NULL;

-- Invoices: Recent invoices per clinic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_date
ON public.invoices(tenant_id, invoice_date DESC)
WHERE deleted_at IS NULL;

-- Appointments: Upcoming appointments per clinic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_tenant_start
ON public.appointments(tenant_id, start_time DESC)
WHERE deleted_at IS NULL;

-- Messages: Recent messages per clinic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_tenant_created
ON public.messages(tenant_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Audit logs: Recent activity per clinic (for admin dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_created
ON public.audit_logs(tenant_id, created_at DESC);

-- Store orders: Recent orders per clinic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_orders_tenant_created
ON public.store_orders(tenant_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Payments: Recent payments per clinic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tenant_date
ON public.payments(tenant_id, payment_date DESC)
WHERE deleted_at IS NULL;

-- =============================================================================
-- C. COMPOSITE INDEXES FOR COMMON DASHBOARD QUERIES
-- =============================================================================

-- Appointments by status: "Show pending appointments for today"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_tenant_status_date
ON public.appointments(tenant_id, status, start_time)
WHERE deleted_at IS NULL AND status IN ('scheduled', 'confirmed', 'checked_in');

-- Invoices by status: "Show unpaid invoices"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_status
ON public.invoices(tenant_id, status)
WHERE deleted_at IS NULL AND status IN ('sent', 'partially_paid', 'overdue');

-- Hospitalizations: Active patients in clinic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitalizations_tenant_active
ON public.hospitalizations(tenant_id, admitted_at DESC)
WHERE deleted_at IS NULL AND status = 'active';

-- Low stock alerts: Products needing reorder
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock
ON public.store_inventory(product_id)
WHERE stock_quantity <= reorder_point;

-- =============================================================================
-- D. STATISTICS TARGETS FOR FREQUENTLY QUERIED COLUMNS
-- =============================================================================
-- Increase statistics targets for columns used in complex queries.
-- Default is 100; increase for better query plans on skewed data.

ALTER TABLE public.appointments ALTER COLUMN status SET STATISTICS 500;
ALTER TABLE public.invoices ALTER COLUMN status SET STATISTICS 500;
ALTER TABLE public.pets ALTER COLUMN species SET STATISTICS 200;
ALTER TABLE public.store_orders ALTER COLUMN status SET STATISTICS 500;

-- =============================================================================
-- E. ANALYZE TABLES TO UPDATE STATISTICS
-- =============================================================================
-- Run ANALYZE on modified tables to ensure query planner has fresh stats

ANALYZE public.audit_logs;
ANALYZE public.messages;
ANALYZE public.medical_records;
ANALYZE public.appointments;
ANALYZE public.invoices;
ANALYZE public.store_orders;
ANALYZE public.payments;
ANALYZE public.hospitalizations;
ANALYZE public.store_inventory;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these after migration to verify settings:
--
-- Check autovacuum settings:
-- SELECT relname, reloptions
-- FROM pg_class
-- WHERE relname IN ('audit_logs', 'messages', 'medical_records', 'appointments')
-- AND reloptions IS NOT NULL;
--
-- Check new indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND indexname LIKE '%tenant%'
-- ORDER BY indexname;
--
-- Check statistics targets:
-- SELECT attname, attstattarget
-- FROM pg_attribute
-- WHERE attrelid = 'appointments'::regclass
-- AND attstattarget > 0;
-- =============================================================================
