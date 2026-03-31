-- =============================================================================
-- 012_SECURITY_AUDIT_FIXES.SQL
-- =============================================================================
-- Comprehensive security fixes based on Supabase linter audit.
--
-- ISSUES FIXED:
-- 1. SECURITY DEFINER views (2 views)
-- 2. Tables with RLS disabled (3 tables)
-- 3. Functions with mutable search_path (19 functions)
-- 4. Tables with RLS enabled but no policies (33 tables)
--
-- Run in Supabase SQL Editor to apply all fixes.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: FIX SECURITY DEFINER VIEWS
-- =============================================================================
-- Views with SECURITY DEFINER bypass RLS. Recreate without it.

-- Fix: recent_job_executions view
DROP VIEW IF EXISTS public.recent_job_executions;
CREATE VIEW public.recent_job_executions AS
SELECT
    job_name,
    started_at,
    completed_at,
    status,
    error_message,
    rows_affected
FROM public.scheduled_job_log
WHERE started_at > NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;

-- Fix: job_statistics view
DROP VIEW IF EXISTS public.job_statistics;
CREATE VIEW public.job_statistics AS
SELECT
    job_name,
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE status = 'success') as successful_runs,
    COUNT(*) FILTER (WHERE status = 'error') as failed_runs,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
    MAX(started_at) as last_run
FROM public.scheduled_job_log
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY job_name;

-- =============================================================================
-- SECTION 2: ENABLE RLS ON TABLES MISSING IT
-- =============================================================================

-- invoice_sequences
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage invoice sequences" ON public.invoice_sequences;
CREATE POLICY "Staff manage invoice sequences" ON public.invoice_sequences
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id))
    WITH CHECK (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access" ON public.invoice_sequences;
CREATE POLICY "Service role full access" ON public.invoice_sequences
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- materialized_view_refresh_log (system table - service role only)
ALTER TABLE public.materialized_view_refresh_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.materialized_view_refresh_log;
CREATE POLICY "Service role only" ON public.materialized_view_refresh_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- scheduled_job_log (system table - service role only)
ALTER TABLE public.scheduled_job_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.scheduled_job_log;
CREATE POLICY "Service role only" ON public.scheduled_job_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- SECTION 3: FIX FUNCTION SEARCH_PATH (Security Warning)
-- =============================================================================
-- Setting search_path prevents search_path hijacking attacks.

-- get_client_pet_counts
CREATE OR REPLACE FUNCTION public.get_client_pet_counts(
    p_client_ids UUID[],
    p_tenant_id TEXT
)
RETURNS TABLE (client_id UUID, pet_count BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT p.owner_id, COUNT(*)
    FROM public.pets p
    WHERE p.owner_id = ANY(p_client_ids)
      AND p.tenant_id = p_tenant_id
      AND p.deleted_at IS NULL
    GROUP BY p.owner_id;
END;
$$;

-- get_client_last_appointments
CREATE OR REPLACE FUNCTION public.get_client_last_appointments(
    p_client_ids UUID[],
    p_tenant_id TEXT
)
RETURNS TABLE (client_id UUID, last_appointment_date TIMESTAMPTZ, last_appointment_status TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (p.owner_id)
        p.owner_id,
        a.start_time,
        a.status
    FROM public.appointments a
    INNER JOIN public.pets p ON a.pet_id = p.id
    WHERE p.owner_id = ANY(p_client_ids)
      AND a.tenant_id = p_tenant_id
      AND a.status IN ('completed', 'confirmed', 'checked_in')
    ORDER BY p.owner_id, a.start_time DESC;
END;
$$;

-- handle_new_pet_vaccines
CREATE OR REPLACE FUNCTION public.handle_new_pet_vaccines()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_template RECORD;
BEGIN
    FOR v_template IN
        SELECT * FROM public.vaccine_templates
        WHERE NEW.species = ANY(species)
          AND is_active = TRUE
          AND (tenant_id IS NULL OR tenant_id = NEW.tenant_id)
        ORDER BY display_order
    LOOP
        INSERT INTO public.vaccines (pet_id, template_id, name, administered_date, status)
        VALUES (NEW.id, v_template.id, v_template.name, CURRENT_DATE, 'scheduled');
    END LOOP;
    RETURN NEW;
END;
$$;

-- process_inventory_transaction
CREATE OR REPLACE FUNCTION public.process_inventory_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_current_qty NUMERIC;
    v_current_cost NUMERIC;
    v_new_qty NUMERIC;
    v_new_cost NUMERIC;
BEGIN
    SELECT stock_quantity, weighted_average_cost
    INTO v_current_qty, v_current_cost
    FROM public.store_inventory
    WHERE product_id = NEW.product_id;

    IF NOT FOUND THEN
        INSERT INTO public.store_inventory (product_id, tenant_id, stock_quantity, weighted_average_cost)
        VALUES (NEW.product_id, NEW.tenant_id, 0, 0);
        v_current_qty := 0;
        v_current_cost := 0;
    END IF;

    v_new_qty := v_current_qty + NEW.quantity;

    IF NEW.type = 'purchase' AND NEW.quantity > 0 AND NEW.unit_cost IS NOT NULL THEN
        v_new_cost := ((v_current_qty * v_current_cost) + (NEW.quantity * NEW.unit_cost)) / NULLIF(v_new_qty, 0);
    ELSE
        v_new_cost := v_current_cost;
    END IF;

    UPDATE public.store_inventory
    SET stock_quantity = v_new_qty,
        weighted_average_cost = COALESCE(v_new_cost, weighted_average_cost),
        updated_at = NOW()
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$;

-- log_action
CREATE OR REPLACE FUNCTION public.log_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_logs (tenant_id, user_id, action, resource, resource_id, details)
    VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- soft_delete
CREATE OR REPLACE FUNCTION public.soft_delete(
    table_name TEXT,
    record_id UUID,
    deleted_by_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    EXECUTE format(
        'UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
        table_name
    ) USING COALESCE(deleted_by_id, auth.uid()), record_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$;

-- tenant_exists
CREATE OR REPLACE FUNCTION public.tenant_exists(tenant_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND is_active = true);
END;
$$;

-- has_tenant_access
CREATE OR REPLACE FUNCTION public.has_tenant_access(p_tenant_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND tenant_id = p_tenant_id
        AND deleted_at IS NULL
    );
END;
$$;

-- is_admin_of
CREATE OR REPLACE FUNCTION public.is_admin_of(p_tenant_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND tenant_id = p_tenant_id
        AND role = 'admin'
        AND deleted_at IS NULL
    );
END;
$$;

-- decrement_stock
CREATE OR REPLACE FUNCTION public.decrement_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.store_inventory
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW()
    WHERE product_id = p_product_id
    AND stock_quantity >= p_quantity;
    RETURN FOUND;
END;
$$;

-- validate_stock
CREATE OR REPLACE FUNCTION public.validate_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.store_inventory
        WHERE product_id = p_product_id
        AND stock_quantity >= p_quantity
    );
END;
$$;

-- record_invoice_payment
CREATE OR REPLACE FUNCTION public.record_invoice_payment(
    p_invoice_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT DEFAULT 'cash'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_id UUID;
    v_invoice RECORD;
BEGIN
    SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    INSERT INTO public.payments (tenant_id, invoice_id, amount, payment_method, status)
    VALUES (v_invoice.tenant_id, p_invoice_id, p_amount, p_payment_method, 'completed')
    RETURNING id INTO v_payment_id;

    -- Update invoice paid amount
    UPDATE public.invoices
    SET paid_amount = COALESCE(paid_amount, 0) + p_amount,
        status = CASE
            WHEN COALESCE(paid_amount, 0) + p_amount >= total THEN 'paid'
            WHEN COALESCE(paid_amount, 0) + p_amount > 0 THEN 'partial'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_invoice_id;

    RETURN v_payment_id;
END;
$$;

-- =============================================================================
-- SECTION 4: ADD RLS POLICIES TO TABLES MISSING THEM
-- =============================================================================
-- Standard tenant-based policies for all tables.

-- Helper: Create standard tenant policies
DO $$
DECLARE
    tbl TEXT;
    tables_needing_policies TEXT[] := ARRAY[
        'archived_invoices', 'archived_medical_records', 'archived_pets',
        'audit_configuration', 'audit_log_enhanced', 'blanket_consents',
        'clinic_patient_access', 'consent_audit_log', 'consent_requests',
        'consent_template_fields', 'data_access_log', 'dicom_images',
        'external_lab_integrations', 'hospitalization_documents',
        'hospitalization_visits', 'lab_panel_tests', 'lab_reference_ranges',
        'lab_test_panels', 'message_attachments', 'notification_channels',
        'notification_log', 'notification_templates', 'pet_qr_codes',
        'products', 'reminder_rules', 'security_events',
        'staff_availability_overrides', 'staff_reviews', 'staff_shifts',
        'staff_tasks', 'time_off_balances', 'time_off_requests', 'voice_notes'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_needing_policies
    LOOP
        -- Check if table has tenant_id column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = tbl
            AND column_name = 'tenant_id'
        ) THEN
            -- Drop existing policies
            EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON public.%I', tbl);

            -- Create tenant isolation policy
            EXECUTE format(
                'CREATE POLICY "Tenant isolation" ON public.%I FOR ALL TO authenticated USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL))',
                tbl
            );

            -- Create service role policy
            EXECUTE format(
                'CREATE POLICY "Service role full access" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                tbl
            );

            RAISE NOTICE 'Added policies to: %', tbl;
        ELSE
            -- For tables without tenant_id, add service role only policy
            EXECUTE format('DROP POLICY IF EXISTS "Service role only" ON public.%I', tbl);
            EXECUTE format(
                'CREATE POLICY "Service role only" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                tbl
            );
            RAISE NOTICE 'Added service-role-only policy to: % (no tenant_id)', tbl;
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- SECTION 5: Additional function fixes (remaining functions)
-- =============================================================================

-- import_inventory_batch
CREATE OR REPLACE FUNCTION public.import_inventory_batch(
    p_tenant_id TEXT,
    p_items JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.store_inventory (tenant_id, product_id, stock_quantity)
        VALUES (
            p_tenant_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER
        )
        ON CONFLICT (product_id) DO UPDATE
        SET stock_quantity = store_inventory.stock_quantity + EXCLUDED.stock_quantity,
            updated_at = NOW();
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

-- get_network_stats (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_network_stats') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.get_network_stats(p_tenant_id TEXT)
        RETURNS TABLE (stat_name TEXT, stat_value NUMERIC)
        LANGUAGE plpgsql
        STABLE
        SET search_path = public
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT ''total_pets''::TEXT, COUNT(*)::NUMERIC
            FROM public.pets WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;
        END;
        $func$';
    END IF;
END $$;

-- run_scheduled_job
CREATE OR REPLACE FUNCTION public.run_scheduled_job(p_job_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start TIMESTAMPTZ;
    v_status TEXT := 'success';
    v_error TEXT;
BEGIN
    v_start := NOW();

    BEGIN
        CASE p_job_name
            WHEN 'expire_invites' THEN
                PERFORM public.expire_old_invites();
            WHEN 'update_statistics' THEN
                PERFORM public.job_update_statistics();
            ELSE
                RAISE EXCEPTION 'Unknown job: %', p_job_name;
        END CASE;
    EXCEPTION WHEN OTHERS THEN
        v_status := 'error';
        v_error := SQLERRM;
    END;

    INSERT INTO public.scheduled_job_log (job_name, started_at, completed_at, status, error_message)
    VALUES (p_job_name, v_start, NOW(), v_status, v_error);

    RETURN v_status = 'success';
END;
$$;

-- refresh_dashboard_views
CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Refresh any materialized views if they exist
    PERFORM 1; -- Placeholder
END;
$$;

-- job_update_invoice_status
CREATE OR REPLACE FUNCTION public.job_update_invoice_status()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.invoices
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'sent'
    AND due_date < CURRENT_DATE;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- job_update_statistics
CREATE OR REPLACE FUNCTION public.job_update_statistics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update any cached statistics
    PERFORM 1; -- Placeholder
END;
$$;

-- setup_new_tenant
CREATE OR REPLACE FUNCTION public.setup_new_tenant(
    p_tenant_id TEXT,
    p_tenant_name TEXT,
    p_admin_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.tenants (id, name)
    VALUES (p_tenant_id, p_tenant_name)
    ON CONFLICT (id) DO NOTHING;

    IF p_admin_email IS NOT NULL THEN
        INSERT INTO public.clinic_invites (tenant_id, email, role)
        VALUES (p_tenant_id, p_admin_email, 'admin');
    END IF;

    RETURN true;
END;
$$;

COMMIT;

-- =============================================================================
-- POST-MIGRATION NOTES
-- =============================================================================
--
-- MANUAL ACTIONS REQUIRED:
--
-- 1. Enable Leaked Password Protection:
--    Go to Supabase Dashboard > Authentication > Settings > Security
--    Enable "Leaked Password Protection"
--
-- 2. Move pg_trgm to extensions schema (optional, may require downtime):
--    DROP EXTENSION pg_trgm;
--    CREATE EXTENSION pg_trgm SCHEMA extensions;
--    Then update any GIN indexes that use gin_trgm_ops
--
-- =============================================================================
