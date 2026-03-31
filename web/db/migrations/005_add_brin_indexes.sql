-- =============================================================================
-- 005_ADD_BRIN_INDEXES.SQL
-- =============================================================================
-- Adds BRIN (Block Range INdex) indexes to time-series tables for efficient
-- range queries on timestamp columns. BRIN indexes are much smaller than
-- B-tree indexes and work well for naturally ordered data like timestamps.
--
-- Best for tables where:
--   - Data is inserted in roughly chronological order
--   - Queries filter by time ranges
--   - Table is large (millions of rows)
--
-- Tables affected:
--   - audit_logs
--   - messages
--   - notification_queue
--   - store_inventory_transactions
--   - qr_tag_scans
--   - hospitalization_vitals
--   - hospitalization_medications
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. AUDIT_LOGS - High volume, time-series
-- =============================================================================

-- Drop existing B-tree index if it exists and replace with BRIN
DROP INDEX IF EXISTS idx_audit_logs_created;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_brin
ON public.audit_logs USING brin(created_at)
WITH (pages_per_range = 32);

-- Composite BRIN for tenant + time queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_brin
ON public.audit_logs USING brin(tenant_id, created_at)
WITH (pages_per_range = 64);

-- =============================================================================
-- B. MESSAGES - Chat history, naturally ordered
-- =============================================================================

DROP INDEX IF EXISTS idx_messages_created;

CREATE INDEX IF NOT EXISTS idx_messages_created_brin
ON public.messages USING brin(created_at)
WITH (pages_per_range = 32);

-- =============================================================================
-- C. NOTIFICATION_QUEUE - Processing queue
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_notification_queue_created_brin
ON public.notification_queue USING brin(created_at)
WITH (pages_per_range = 32);

-- =============================================================================
-- D. STORE_INVENTORY_TRANSACTIONS - Inventory history
-- =============================================================================

DROP INDEX IF EXISTS idx_store_inventory_txn_date;

CREATE INDEX IF NOT EXISTS idx_store_inventory_txn_date_brin
ON public.store_inventory_transactions USING brin(created_at)
WITH (pages_per_range = 32);

-- =============================================================================
-- E. QR_TAG_SCANS - Scan logs
-- =============================================================================

DROP INDEX IF EXISTS idx_qr_tag_scans_date;

CREATE INDEX IF NOT EXISTS idx_qr_tag_scans_date_brin
ON public.qr_tag_scans USING brin(scanned_at)
WITH (pages_per_range = 32);

-- =============================================================================
-- F. HOSPITALIZATION_VITALS - Time-series medical data
-- =============================================================================

DROP INDEX IF EXISTS idx_hospitalization_vitals_recorded;

CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_recorded_brin
ON public.hospitalization_vitals USING brin(recorded_at)
WITH (pages_per_range = 32);

-- =============================================================================
-- G. HOSPITALIZATION_MEDICATIONS - Scheduled/administered times
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_hospitalization_meds_scheduled_brin
ON public.hospitalization_medications USING brin(scheduled_at)
WITH (pages_per_range = 32)
WHERE scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hospitalization_meds_administered_brin
ON public.hospitalization_medications USING brin(administered_at)
WITH (pages_per_range = 32)
WHERE administered_at IS NOT NULL;

-- =============================================================================
-- H. DISEASE_REPORTS - Epidemiology time-series
-- =============================================================================

DROP INDEX IF EXISTS idx_disease_reports_date;

CREATE INDEX IF NOT EXISTS idx_disease_reports_date_brin
ON public.disease_reports USING brin(case_date)
WITH (pages_per_range = 32);

-- =============================================================================
-- I. REMINDERS - Scheduled notifications
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_brin
ON public.reminders USING brin(scheduled_at)
WITH (pages_per_range = 32);

-- =============================================================================
-- J. PAYMENTS - Financial history
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_date_brin
ON public.payments USING brin(payment_date)
WITH (pages_per_range = 32);

-- =============================================================================
-- K. APPOINTMENTS - Scheduling data
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_appointments_start_brin
ON public.appointments USING brin(start_time)
WITH (pages_per_range = 64);

-- =============================================================================
-- L. STORE_PRICE_HISTORY - Price change audit
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_store_price_history_date_brin
ON public.store_price_history USING brin(created_at)
WITH (pages_per_range = 32);

COMMIT;

-- =============================================================================
-- NOTES ON BRIN INDEXES
-- =============================================================================
--
-- pages_per_range:
--   - Lower value = more precise but larger index
--   - Higher value = smaller index but less precise
--   - 32-64 is good for most time-series data
--
-- When to use BRIN vs B-tree:
--   - BRIN: Large tables, naturally ordered data, range queries
--   - B-tree: Point lookups, ORDER BY with LIMIT, smaller tables
--
-- BRIN indexes require VACUUM to maintain accuracy.
-- Consider setting autovacuum more aggressively for these tables:
--
-- ALTER TABLE audit_logs SET (autovacuum_vacuum_scale_factor = 0.01);
-- ALTER TABLE messages SET (autovacuum_vacuum_scale_factor = 0.01);
