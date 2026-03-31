-- =============================================================================
-- 028_DATA_ARCHIVING.SQL
-- =============================================================================
-- Implements data archiving strategy for long-term storage management.
--
-- ARCHIVING RULES (based on legal requirements and data lifecycle):
-- - Medical records: Archive after 10 years (legal requirement)
-- - Invoices: Archive after 10 years (tax requirement)
-- - Audit logs: Archive after 7 years (compliance requirement)
-- - Messages: Archive after 3 years
-- - Appointments: Archive completed ones after 5 years
-- - Notifications: Delete after 1 year (no archive needed)
--
-- ARCHIVING APPROACH:
-- 1. Create archive tables in a separate schema
-- 2. Create functions to move old data
-- 3. Schedule via pg_cron
-- 4. Archive tables can be exported to cold storage (S3, etc.)
--
-- This migration is IDEMPOTENT - safe to run multiple times.
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. CREATE ARCHIVE SCHEMA
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS archive;

COMMENT ON SCHEMA archive IS 'Cold storage for historical data older than retention period';

-- Grant access to archive schema
GRANT USAGE ON SCHEMA archive TO authenticated;
GRANT USAGE ON SCHEMA archive TO service_role;

-- =============================================================================
-- B. CREATE ARCHIVE TABLES
-- =============================================================================

-- Medical Records Archive (10+ years old)
CREATE TABLE IF NOT EXISTS archive.medical_records (
    LIKE public.medical_records INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE archive.medical_records IS 'Medical records older than 10 years';

-- Invoices Archive (10+ years old)
CREATE TABLE IF NOT EXISTS archive.invoices (
    LIKE public.invoices INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE archive.invoices IS 'Invoices older than 10 years';

-- Invoice Items Archive
CREATE TABLE IF NOT EXISTS archive.invoice_items (
    LIKE public.invoice_items INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments Archive
CREATE TABLE IF NOT EXISTS archive.payments (
    LIKE public.payments INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs Archive (7+ years old)
CREATE TABLE IF NOT EXISTS archive.audit_logs (
    LIKE public.audit_logs INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE archive.audit_logs IS 'Audit logs older than 7 years';

-- Messages Archive (3+ years old)
CREATE TABLE IF NOT EXISTS archive.messages (
    LIKE public.messages INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE archive.messages IS 'Messages older than 3 years';

-- Conversations Archive
CREATE TABLE IF NOT EXISTS archive.conversations (
    LIKE public.conversations INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments Archive (5+ years old, completed only)
CREATE TABLE IF NOT EXISTS archive.appointments (
    LIKE public.appointments INCLUDING ALL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE archive.appointments IS 'Completed appointments older than 5 years';

-- =============================================================================
-- C. CREATE ARCHIVING FUNCTIONS
-- =============================================================================

-- Archive old medical records
CREATE OR REPLACE FUNCTION archive.archive_medical_records(
    retention_years INTEGER DEFAULT 10,
    batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE(archived_count BIGINT, deleted_count BIGINT) AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    v_archived BIGINT := 0;
    v_deleted BIGINT := 0;
BEGIN
    cutoff_date := NOW() - (retention_years || ' years')::INTERVAL;

    -- Archive in batches to avoid long locks
    LOOP
        WITH to_archive AS (
            SELECT * FROM public.medical_records
            WHERE visit_date < cutoff_date
            AND deleted_at IS NOT NULL  -- Only archive soft-deleted records
            LIMIT batch_size
            FOR UPDATE SKIP LOCKED
        ),
        inserted AS (
            INSERT INTO archive.medical_records
            SELECT *, NOW() AS archived_at FROM to_archive
            RETURNING 1
        )
        SELECT count(*) INTO v_archived FROM inserted;

        EXIT WHEN v_archived = 0;

        -- Delete archived records from main table
        DELETE FROM public.medical_records
        WHERE id IN (
            SELECT id FROM public.medical_records
            WHERE visit_date < cutoff_date
            AND deleted_at IS NOT NULL
            LIMIT batch_size
        );

        GET DIAGNOSTICS v_deleted = ROW_COUNT;

        COMMIT;
    END LOOP;

    RETURN QUERY SELECT v_archived, v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Archive old invoices (and related items/payments)
CREATE OR REPLACE FUNCTION archive.archive_invoices(
    retention_years INTEGER DEFAULT 10,
    batch_size INTEGER DEFAULT 5000
)
RETURNS TABLE(invoices_archived BIGINT, items_archived BIGINT, payments_archived BIGINT) AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    v_invoices BIGINT := 0;
    v_items BIGINT := 0;
    v_payments BIGINT := 0;
    invoice_ids UUID[];
BEGIN
    cutoff_date := NOW() - (retention_years || ' years')::INTERVAL;

    -- Get invoice IDs to archive
    SELECT ARRAY_AGG(id) INTO invoice_ids
    FROM public.invoices
    WHERE invoice_date < cutoff_date
    AND status IN ('paid', 'cancelled', 'void')  -- Only archive settled invoices
    LIMIT batch_size;

    IF invoice_ids IS NULL OR array_length(invoice_ids, 1) = 0 THEN
        RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    -- Archive invoice items first
    WITH items_to_archive AS (
        INSERT INTO archive.invoice_items
        SELECT ii.*, NOW() AS archived_at
        FROM public.invoice_items ii
        WHERE ii.invoice_id = ANY(invoice_ids)
        RETURNING 1
    )
    SELECT count(*) INTO v_items FROM items_to_archive;

    -- Archive payments
    WITH payments_to_archive AS (
        INSERT INTO archive.payments
        SELECT p.*, NOW() AS archived_at
        FROM public.payments p
        WHERE p.invoice_id = ANY(invoice_ids)
        RETURNING 1
    )
    SELECT count(*) INTO v_payments FROM payments_to_archive;

    -- Archive invoices
    WITH invoices_to_archive AS (
        INSERT INTO archive.invoices
        SELECT i.*, NOW() AS archived_at
        FROM public.invoices i
        WHERE i.id = ANY(invoice_ids)
        RETURNING 1
    )
    SELECT count(*) INTO v_invoices FROM invoices_to_archive;

    -- Delete from main tables (in reverse order due to FK constraints)
    DELETE FROM public.payments WHERE invoice_id = ANY(invoice_ids);
    DELETE FROM public.invoice_items WHERE invoice_id = ANY(invoice_ids);
    DELETE FROM public.invoices WHERE id = ANY(invoice_ids);

    RETURN QUERY SELECT v_invoices, v_items, v_payments;
END;
$$ LANGUAGE plpgsql;

-- Archive old audit logs
CREATE OR REPLACE FUNCTION archive.archive_audit_logs(
    retention_years INTEGER DEFAULT 7,
    batch_size INTEGER DEFAULT 50000
)
RETURNS BIGINT AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    archived_count BIGINT := 0;
    batch_count BIGINT;
BEGIN
    cutoff_date := NOW() - (retention_years || ' years')::INTERVAL;

    LOOP
        -- Archive batch
        WITH to_archive AS (
            SELECT * FROM public.audit_logs
            WHERE created_at < cutoff_date
            LIMIT batch_size
        ),
        inserted AS (
            INSERT INTO archive.audit_logs
            SELECT *, NOW() AS archived_at FROM to_archive
            RETURNING 1
        )
        SELECT count(*) INTO batch_count FROM inserted;

        EXIT WHEN batch_count = 0;

        archived_count := archived_count + batch_count;

        -- Delete archived records
        DELETE FROM public.audit_logs
        WHERE created_at < cutoff_date
        LIMIT batch_size;

        -- Commit each batch
        COMMIT;

        -- Small delay to reduce load
        PERFORM pg_sleep(0.1);
    END LOOP;

    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Archive old messages
CREATE OR REPLACE FUNCTION archive.archive_messages(
    retention_years INTEGER DEFAULT 3,
    batch_size INTEGER DEFAULT 20000
)
RETURNS BIGINT AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    archived_count BIGINT := 0;
    batch_count BIGINT;
BEGIN
    cutoff_date := NOW() - (retention_years || ' years')::INTERVAL;

    LOOP
        WITH to_archive AS (
            SELECT * FROM public.messages
            WHERE created_at < cutoff_date
            LIMIT batch_size
        ),
        inserted AS (
            INSERT INTO archive.messages
            SELECT *, NOW() AS archived_at FROM to_archive
            RETURNING 1
        )
        SELECT count(*) INTO batch_count FROM inserted;

        EXIT WHEN batch_count = 0;

        archived_count := archived_count + batch_count;

        DELETE FROM public.messages
        WHERE created_at < cutoff_date
        LIMIT batch_size;

        COMMIT;
        PERFORM pg_sleep(0.1);
    END LOOP;

    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Archive old appointments
CREATE OR REPLACE FUNCTION archive.archive_appointments(
    retention_years INTEGER DEFAULT 5,
    batch_size INTEGER DEFAULT 10000
)
RETURNS BIGINT AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    archived_count BIGINT := 0;
    batch_count BIGINT;
BEGIN
    cutoff_date := NOW() - (retention_years || ' years')::INTERVAL;

    LOOP
        WITH to_archive AS (
            SELECT * FROM public.appointments
            WHERE start_time < cutoff_date
            AND status IN ('completed', 'cancelled', 'no_show')  -- Only archive finished appointments
            LIMIT batch_size
        ),
        inserted AS (
            INSERT INTO archive.appointments
            SELECT *, NOW() AS archived_at FROM to_archive
            RETURNING 1
        )
        SELECT count(*) INTO batch_count FROM inserted;

        EXIT WHEN batch_count = 0;

        archived_count := archived_count + batch_count;

        DELETE FROM public.appointments
        WHERE start_time < cutoff_date
        AND status IN ('completed', 'cancelled', 'no_show')
        LIMIT batch_size;

        COMMIT;
        PERFORM pg_sleep(0.1);
    END LOOP;

    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Delete old notifications (no archive needed)
CREATE OR REPLACE FUNCTION archive.cleanup_notifications(
    retention_days INTEGER DEFAULT 365,
    batch_size INTEGER DEFAULT 10000
)
RETURNS BIGINT AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    deleted_count BIGINT := 0;
    batch_count BIGINT;
BEGIN
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

    LOOP
        DELETE FROM public.notifications
        WHERE created_at < cutoff_date
        AND read_at IS NOT NULL  -- Only delete read notifications
        LIMIT batch_size;

        GET DIAGNOSTICS batch_count = ROW_COUNT;

        EXIT WHEN batch_count = 0;

        deleted_count := deleted_count + batch_count;

        COMMIT;
    END LOOP;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- D. CREATE MASTER ARCHIVING FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION archive.run_all_archiving()
RETURNS TABLE(
    table_name TEXT,
    records_processed BIGINT,
    completed_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Archive medical records
    RETURN QUERY
    SELECT 'medical_records'::TEXT,
           (archive.archive_medical_records()).archived_count,
           NOW();

    -- Archive invoices
    RETURN QUERY
    SELECT 'invoices'::TEXT,
           (archive.archive_invoices()).invoices_archived,
           NOW();

    -- Archive audit logs
    RETURN QUERY
    SELECT 'audit_logs'::TEXT,
           archive.archive_audit_logs(),
           NOW();

    -- Archive messages
    RETURN QUERY
    SELECT 'messages'::TEXT,
           archive.archive_messages(),
           NOW();

    -- Archive appointments
    RETURN QUERY
    SELECT 'appointments'::TEXT,
           archive.archive_appointments(),
           NOW();

    -- Cleanup notifications
    RETURN QUERY
    SELECT 'notifications'::TEXT,
           archive.cleanup_notifications(),
           NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive.run_all_archiving() IS
'Runs all archiving jobs. Schedule monthly: SELECT cron.schedule(''monthly-archive'', ''0 3 1 * *'', $$SELECT * FROM archive.run_all_archiving()$$)';

-- =============================================================================
-- E. CREATE ARCHIVING LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS archive.archiving_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    records_archived BIGINT NOT NULL,
    archive_date DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_archiving_log_date ON archive.archiving_log(archive_date DESC);

-- Logged version of archiving
CREATE OR REPLACE FUNCTION archive.run_all_archiving_logged()
RETURNS VOID AS $$
DECLARE
    result RECORD;
    start_time TIMESTAMPTZ;
BEGIN
    FOR result IN SELECT * FROM archive.run_all_archiving() LOOP
        INSERT INTO archive.archiving_log (table_name, records_archived, started_at, completed_at)
        VALUES (result.table_name, result.records_processed, start_time, result.completed_at);
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO archive.archiving_log (table_name, records_archived, started_at, completed_at, error_message)
    VALUES ('ERROR', 0, start_time, NOW(), SQLERRM);
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- F. CREATE VIEWS FOR ARCHIVE ACCESS
-- =============================================================================

-- View to query both current and archived medical records
CREATE OR REPLACE VIEW public.all_medical_records AS
SELECT *, FALSE AS is_archived FROM public.medical_records
UNION ALL
SELECT id, tenant_id, pet_id, vet_id, record_type, diagnosis_code, visit_date,
       chief_complaint, examination_notes, assessment, treatment_plan, weight_kg,
       temperature_c, heart_rate, respiratory_rate, follow_up_date, is_followup,
       parent_record_id, created_at, updated_at, deleted_at, deleted_by,
       TRUE AS is_archived
FROM archive.medical_records;

COMMENT ON VIEW public.all_medical_records IS 'Combined view of current and archived medical records';

-- View to query both current and archived invoices
CREATE OR REPLACE VIEW public.all_invoices AS
SELECT *, FALSE AS is_archived FROM public.invoices
UNION ALL
SELECT id, tenant_id, client_id, invoice_number, invoice_date, due_date, status,
       subtotal, discount_amount, discount_type, discount_value, tax_amount, total,
       amount_paid, notes, payment_terms, created_at, updated_at, sent_at, paid_at,
       cancelled_at, void_reason, deleted_at, deleted_by,
       TRUE AS is_archived
FROM archive.invoices;

COMMENT ON VIEW public.all_invoices IS 'Combined view of current and archived invoices';

-- =============================================================================
-- G. GRANTS FOR ARCHIVE SCHEMA
-- =============================================================================

-- Service role can archive
GRANT ALL ON SCHEMA archive TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA archive TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA archive TO service_role;

-- Authenticated users can read archives (for historical lookups)
GRANT SELECT ON archive.medical_records TO authenticated;
GRANT SELECT ON archive.invoices TO authenticated;
GRANT SELECT ON archive.invoice_items TO authenticated;
GRANT SELECT ON archive.payments TO authenticated;

COMMIT;

-- =============================================================================
-- CRON SCHEDULE SETUP (run manually after migration)
-- =============================================================================
-- To enable automatic archiving, run:
--
-- SELECT cron.schedule(
--     'monthly-archiving',
--     '0 3 1 * *',  -- 3 AM on the 1st of each month
--     $$SELECT archive.run_all_archiving_logged()$$
-- );
--
-- To view scheduled jobs:
-- SELECT * FROM cron.job;
--
-- To view job history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- =============================================================================

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Check archive table sizes:
-- SELECT
--     schemaname || '.' || tablename AS table_name,
--     pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
--     n_live_tup AS row_count
-- FROM pg_stat_user_tables
-- WHERE schemaname = 'archive'
-- ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
--
-- Check archiving log:
-- SELECT * FROM archive.archiving_log ORDER BY completed_at DESC LIMIT 20;
--
-- Estimate archive candidates:
-- SELECT
--     'medical_records' AS table_name,
--     count(*) AS records_to_archive
-- FROM public.medical_records
-- WHERE visit_date < NOW() - INTERVAL '10 years' AND deleted_at IS NOT NULL
-- UNION ALL
-- SELECT
--     'invoices',
--     count(*)
-- FROM public.invoices
-- WHERE invoice_date < NOW() - INTERVAL '10 years' AND status IN ('paid', 'cancelled', 'void');
-- =============================================================================
