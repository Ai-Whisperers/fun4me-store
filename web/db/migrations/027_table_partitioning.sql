-- =============================================================================
-- 027_TABLE_PARTITIONING.SQL
-- =============================================================================
-- Implements table partitioning for high-volume tables to support 5M+ tenants.
--
-- PARTITIONING STRATEGY:
-- - HASH partitioning by tenant_id for even distribution across partitions
-- - 64 partitions per table (scalable, good for most workloads)
-- - Audit logs use RANGE partitioning by created_at (time-based archival)
--
-- TABLES TO PARTITION:
-- 1. medical_records (500M+ rows at scale)
-- 2. invoices (200M+ rows at scale)
-- 3. appointments (300M+ rows at scale)
-- 4. store_orders (100M+ rows at scale)
-- 5. messages (500M+ rows at scale)
-- 6. audit_logs (1B+ rows at scale) - RANGE by month
--
-- IMPORTANT: This migration requires a maintenance window!
-- - Estimated time: 15-60 minutes depending on data volume
-- - Run during off-peak hours
-- - Take a backup before running
--
-- This migration is IDEMPOTENT - checks for existing partitioned tables.
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. HELPER FUNCTIONS FOR PARTITION MANAGEMENT
-- =============================================================================

-- Function to check if a table is already partitioned
CREATE OR REPLACE FUNCTION public.is_table_partitioned(table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_partitioned BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_partitioned_table pt
        JOIN pg_class c ON pt.partrelid = c.oid
        WHERE c.relname = table_name
        AND c.relnamespace = 'public'::regnamespace
    ) INTO is_partitioned;
    RETURN is_partitioned;
END;
$$ LANGUAGE plpgsql;

-- Function to create hash partitions for a table
CREATE OR REPLACE FUNCTION public.create_hash_partitions(
    parent_table TEXT,
    num_partitions INTEGER DEFAULT 64
)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
    partition_name TEXT;
BEGIN
    FOR i IN 0..(num_partitions - 1) LOOP
        partition_name := parent_table || '_p' || lpad(i::text, 3, '0');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I
             FOR VALUES WITH (MODULUS %s, REMAINDER %s)',
            partition_name, parent_table, num_partitions, i
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create monthly range partitions for audit_logs
CREATE OR REPLACE FUNCTION public.create_monthly_partitions(
    parent_table TEXT,
    start_date DATE,
    end_date DATE
)
RETURNS VOID AS $$
DECLARE
    current_date DATE := start_date;
    next_date DATE;
    partition_name TEXT;
BEGIN
    WHILE current_date < end_date LOOP
        next_date := current_date + INTERVAL '1 month';
        partition_name := parent_table || '_y' || to_char(current_date, 'YYYY') || 'm' || to_char(current_date, 'MM');

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, parent_table, current_date, next_date
        );

        current_date := next_date;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- B. PARTITION MEDICAL_RECORDS (IF NOT ALREADY PARTITIONED)
-- =============================================================================

DO $$
BEGIN
    -- Skip if already partitioned
    IF public.is_table_partitioned('medical_records') THEN
        RAISE NOTICE 'medical_records is already partitioned, skipping...';
        RETURN;
    END IF;

    -- Skip if table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_records' AND table_schema = 'public') THEN
        RAISE NOTICE 'medical_records table does not exist, skipping...';
        RETURN;
    END IF;

    RAISE NOTICE 'Creating partitioned medical_records table...';

    -- 1. Rename original table
    ALTER TABLE IF EXISTS public.medical_records RENAME TO medical_records_old;

    -- 2. Create new partitioned table with same structure
    CREATE TABLE public.medical_records (
        LIKE public.medical_records_old INCLUDING ALL
    ) PARTITION BY HASH (tenant_id);

    -- 3. Create 64 partitions
    PERFORM public.create_hash_partitions('medical_records', 64);

    -- 4. Copy data (this is the slow part)
    INSERT INTO public.medical_records SELECT * FROM public.medical_records_old;

    -- 5. Drop old table
    DROP TABLE public.medical_records_old CASCADE;

    RAISE NOTICE 'medical_records partitioning complete!';
END $$;

-- =============================================================================
-- C. PARTITION INVOICES (IF NOT ALREADY PARTITIONED)
-- =============================================================================

DO $$
BEGIN
    IF public.is_table_partitioned('invoices') THEN
        RAISE NOTICE 'invoices is already partitioned, skipping...';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
        RAISE NOTICE 'invoices table does not exist, skipping...';
        RETURN;
    END IF;

    RAISE NOTICE 'Creating partitioned invoices table...';

    ALTER TABLE IF EXISTS public.invoices RENAME TO invoices_old;

    CREATE TABLE public.invoices (
        LIKE public.invoices_old INCLUDING ALL
    ) PARTITION BY HASH (tenant_id);

    PERFORM public.create_hash_partitions('invoices', 64);

    INSERT INTO public.invoices SELECT * FROM public.invoices_old;

    DROP TABLE public.invoices_old CASCADE;

    RAISE NOTICE 'invoices partitioning complete!';
END $$;

-- =============================================================================
-- D. PARTITION APPOINTMENTS (IF NOT ALREADY PARTITIONED)
-- =============================================================================

DO $$
BEGIN
    IF public.is_table_partitioned('appointments') THEN
        RAISE NOTICE 'appointments is already partitioned, skipping...';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments' AND table_schema = 'public') THEN
        RAISE NOTICE 'appointments table does not exist, skipping...';
        RETURN;
    END IF;

    RAISE NOTICE 'Creating partitioned appointments table...';

    ALTER TABLE IF EXISTS public.appointments RENAME TO appointments_old;

    CREATE TABLE public.appointments (
        LIKE public.appointments_old INCLUDING ALL
    ) PARTITION BY HASH (tenant_id);

    PERFORM public.create_hash_partitions('appointments', 64);

    INSERT INTO public.appointments SELECT * FROM public.appointments_old;

    DROP TABLE public.appointments_old CASCADE;

    RAISE NOTICE 'appointments partitioning complete!';
END $$;

-- =============================================================================
-- E. PARTITION STORE_ORDERS (IF NOT ALREADY PARTITIONED)
-- =============================================================================

DO $$
BEGIN
    IF public.is_table_partitioned('store_orders') THEN
        RAISE NOTICE 'store_orders is already partitioned, skipping...';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_orders' AND table_schema = 'public') THEN
        RAISE NOTICE 'store_orders table does not exist, skipping...';
        RETURN;
    END IF;

    RAISE NOTICE 'Creating partitioned store_orders table...';

    ALTER TABLE IF EXISTS public.store_orders RENAME TO store_orders_old;

    CREATE TABLE public.store_orders (
        LIKE public.store_orders_old INCLUDING ALL
    ) PARTITION BY HASH (tenant_id);

    PERFORM public.create_hash_partitions('store_orders', 64);

    INSERT INTO public.store_orders SELECT * FROM public.store_orders_old;

    DROP TABLE public.store_orders_old CASCADE;

    RAISE NOTICE 'store_orders partitioning complete!';
END $$;

-- =============================================================================
-- F. PARTITION MESSAGES (IF NOT ALREADY PARTITIONED)
-- =============================================================================

DO $$
BEGIN
    IF public.is_table_partitioned('messages') THEN
        RAISE NOTICE 'messages is already partitioned, skipping...';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
        RAISE NOTICE 'messages table does not exist, skipping...';
        RETURN;
    END IF;

    RAISE NOTICE 'Creating partitioned messages table...';

    ALTER TABLE IF EXISTS public.messages RENAME TO messages_old;

    CREATE TABLE public.messages (
        LIKE public.messages_old INCLUDING ALL
    ) PARTITION BY HASH (tenant_id);

    PERFORM public.create_hash_partitions('messages', 64);

    INSERT INTO public.messages SELECT * FROM public.messages_old;

    DROP TABLE public.messages_old CASCADE;

    RAISE NOTICE 'messages partitioning complete!';
END $$;

-- =============================================================================
-- G. PARTITION AUDIT_LOGS BY TIME (IF NOT ALREADY PARTITIONED)
-- =============================================================================
-- Audit logs use RANGE partitioning by created_at for efficient archival.
-- Old partitions can be detached and moved to cold storage.

DO $$
BEGIN
    IF public.is_table_partitioned('audit_logs') THEN
        RAISE NOTICE 'audit_logs is already partitioned, skipping...';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
        RAISE NOTICE 'audit_logs table does not exist, skipping...';
        RETURN;
    END IF;

    RAISE NOTICE 'Creating partitioned audit_logs table...';

    ALTER TABLE IF EXISTS public.audit_logs RENAME TO audit_logs_old;

    CREATE TABLE public.audit_logs (
        LIKE public.audit_logs_old INCLUDING ALL
    ) PARTITION BY RANGE (created_at);

    -- Create monthly partitions for next 2 years
    PERFORM public.create_monthly_partitions(
        'audit_logs',
        date_trunc('month', CURRENT_DATE),
        date_trunc('month', CURRENT_DATE) + INTERVAL '2 years'
    );

    -- Create a default partition for historical data
    CREATE TABLE IF NOT EXISTS public.audit_logs_historical PARTITION OF public.audit_logs
        FOR VALUES FROM (MINVALUE) TO (date_trunc('month', CURRENT_DATE));

    INSERT INTO public.audit_logs SELECT * FROM public.audit_logs_old;

    DROP TABLE public.audit_logs_old CASCADE;

    RAISE NOTICE 'audit_logs partitioning complete!';
END $$;

-- =============================================================================
-- H. CREATE AUTOMATED PARTITION MAINTENANCE FUNCTION
-- =============================================================================
-- This function creates new monthly partitions for audit_logs
-- Schedule via pg_cron: SELECT cron.schedule('create-audit-partitions', '0 0 1 * *', $$SELECT public.maintain_audit_partitions()$$);

CREATE OR REPLACE FUNCTION public.maintain_audit_partitions()
RETURNS VOID AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    end_date DATE;
BEGIN
    -- Create partitions for the next 6 months
    partition_date := date_trunc('month', CURRENT_DATE);
    end_date := partition_date + INTERVAL '6 months';

    WHILE partition_date < end_date LOOP
        partition_name := 'audit_logs_y' || to_char(partition_date, 'YYYY') || 'm' || to_char(partition_date, 'MM');

        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = partition_name AND n.nspname = 'public'
        ) THEN
            EXECUTE format(
                'CREATE TABLE public.%I PARTITION OF public.audit_logs
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, partition_date, partition_date + INTERVAL '1 month'
            );
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;

        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.maintain_audit_partitions() IS
'Creates audit_logs partitions for the next 6 months. Schedule monthly via pg_cron.';

-- =============================================================================
-- I. RE-CREATE RLS POLICIES ON PARTITIONED TABLES
-- =============================================================================
-- RLS policies are inherited by partitions, but we need to ensure they're set up

-- Medical records RLS
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage medical records" ON public.medical_records;
CREATE POLICY "Staff manage medical records" ON public.medical_records
    FOR ALL TO authenticated
    USING (public.is_staff_of_fast(tenant_id) AND deleted_at IS NULL)
    WITH CHECK (public.is_staff_of_fast(tenant_id));

-- Invoices RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage invoices" ON public.invoices;
CREATE POLICY "Staff manage invoices" ON public.invoices
    FOR ALL TO authenticated
    USING (public.is_staff_of_fast(tenant_id) AND deleted_at IS NULL)
    WITH CHECK (public.is_staff_of_fast(tenant_id));

-- Appointments RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage appointments" ON public.appointments;
CREATE POLICY "Staff manage appointments" ON public.appointments
    FOR ALL TO authenticated
    USING (public.is_staff_of_fast(tenant_id) AND deleted_at IS NULL)
    WITH CHECK (public.is_staff_of_fast(tenant_id));

-- Messages RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage messages" ON public.messages;
CREATE POLICY "Staff manage messages" ON public.messages
    FOR ALL TO authenticated
    USING (public.is_staff_of_fast(tenant_id) AND deleted_at IS NULL)
    WITH CHECK (public.is_staff_of_fast(tenant_id));

-- Audit logs RLS (admin only)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin view audit logs" ON public.audit_logs;
CREATE POLICY "Admin view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND tenant_id = audit_logs.tenant_id
            AND role = 'admin'
            AND deleted_at IS NULL
        )
    );

-- =============================================================================
-- J. ANALYZE PARTITIONED TABLES
-- =============================================================================

ANALYZE public.medical_records;
ANALYZE public.invoices;
ANALYZE public.appointments;
ANALYZE public.store_orders;
ANALYZE public.messages;
ANALYZE public.audit_logs;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these after migration to verify partitioning:
--
-- Check partitioned tables:
-- SELECT
--     c.relname AS table_name,
--     pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
--     (SELECT count(*) FROM pg_inherits WHERE inhparent = c.oid) AS partition_count
-- FROM pg_class c
-- JOIN pg_partitioned_table pt ON c.oid = pt.partrelid
-- WHERE c.relnamespace = 'public'::regnamespace
-- ORDER BY c.relname;
--
-- Check partition sizes:
-- SELECT
--     parent.relname AS parent_table,
--     child.relname AS partition,
--     pg_size_pretty(pg_relation_size(child.oid)) AS size
-- FROM pg_inherits
-- JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
-- JOIN pg_class child ON pg_inherits.inhrelid = child.oid
-- WHERE parent.relnamespace = 'public'::regnamespace
-- ORDER BY parent.relname, child.relname;
-- =============================================================================
