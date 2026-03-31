-- =============================================================================
-- 010_ADD_SOFT_DELETE.SQL
-- =============================================================================
-- Adds soft delete columns (deleted_at, deleted_by) to tables that are
-- missing them for consistency and data recovery capabilities.
--
-- Tables to add soft delete:
--   - vaccine_templates
--   - diagnosis_codes
--   - drug_dosages
--   - growth_standards
--   - kennels
--   - message_templates
--   - store_categories
--   - store_brands
--   - store_campaigns
--   - store_coupons
--   - payment_methods
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. HELPER FUNCTION: Add Soft Delete Columns
-- =============================================================================

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

-- =============================================================================
-- B. ADD SOFT DELETE TO TABLES
-- =============================================================================

SELECT public.add_soft_delete_columns('vaccine_templates');
SELECT public.add_soft_delete_columns('diagnosis_codes');
SELECT public.add_soft_delete_columns('drug_dosages');
SELECT public.add_soft_delete_columns('growth_standards');
SELECT public.add_soft_delete_columns('kennels');
SELECT public.add_soft_delete_columns('message_templates');
SELECT public.add_soft_delete_columns('store_categories');
SELECT public.add_soft_delete_columns('store_brands');
SELECT public.add_soft_delete_columns('store_campaigns');
SELECT public.add_soft_delete_columns('store_coupons');
SELECT public.add_soft_delete_columns('payment_methods');
SELECT public.add_soft_delete_columns('store_products');
SELECT public.add_soft_delete_columns('store_inventory');
SELECT public.add_soft_delete_columns('conversations');
SELECT public.add_soft_delete_columns('reminders');
SELECT public.add_soft_delete_columns('client_credits');
SELECT public.add_soft_delete_columns('reproductive_cycles');
SELECT public.add_soft_delete_columns('euthanasia_assessments');

-- =============================================================================
-- C. UPDATE RLS POLICIES TO RESPECT SOFT DELETE
-- =============================================================================

-- vaccine_templates
DROP POLICY IF EXISTS "Public read global templates" ON public.vaccine_templates;
CREATE POLICY "Public read global templates" ON public.vaccine_templates
    FOR SELECT USING (tenant_id IS NULL AND is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage clinic templates" ON public.vaccine_templates;
CREATE POLICY "Staff manage clinic templates" ON public.vaccine_templates
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

-- kennels
DROP POLICY IF EXISTS "Staff manage kennels" ON public.kennels;
CREATE POLICY "Staff manage kennels" ON public.kennels
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

-- message_templates
DROP POLICY IF EXISTS "Read templates" ON public.message_templates;
CREATE POLICY "Read templates" ON public.message_templates
    FOR SELECT TO authenticated
    USING ((tenant_id IS NULL OR public.is_staff_of(tenant_id)) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage templates" ON public.message_templates;
CREATE POLICY "Staff manage templates" ON public.message_templates
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

-- store_categories
DROP POLICY IF EXISTS "Public read categories" ON public.store_categories;
CREATE POLICY "Public read categories" ON public.store_categories
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage categories" ON public.store_categories;
CREATE POLICY "Staff manage categories" ON public.store_categories
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));  -- Allow managing deleted for restore

-- store_brands
DROP POLICY IF EXISTS "Public read brands" ON public.store_brands;
CREATE POLICY "Public read brands" ON public.store_brands
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage brands" ON public.store_brands;
CREATE POLICY "Staff manage brands" ON public.store_brands
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- store_products
DROP POLICY IF EXISTS "Public read products" ON public.store_products;
CREATE POLICY "Public read products" ON public.store_products
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage products" ON public.store_products;
CREATE POLICY "Staff manage products" ON public.store_products
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- store_campaigns
DROP POLICY IF EXISTS "Public read campaigns" ON public.store_campaigns;
CREATE POLICY "Public read campaigns" ON public.store_campaigns
    FOR SELECT USING (
        is_active = true
        AND deleted_at IS NULL
        AND start_date <= NOW()
        AND end_date >= NOW()
    );

DROP POLICY IF EXISTS "Staff manage campaigns" ON public.store_campaigns;
CREATE POLICY "Staff manage campaigns" ON public.store_campaigns
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- store_coupons
DROP POLICY IF EXISTS "Staff manage coupons" ON public.store_coupons;
CREATE POLICY "Staff manage coupons" ON public.store_coupons
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- payment_methods
DROP POLICY IF EXISTS "Staff manage payment methods" ON public.payment_methods;
CREATE POLICY "Staff manage payment methods" ON public.payment_methods
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- client_credits
DROP POLICY IF EXISTS "Staff manage credits" ON public.client_credits;
CREATE POLICY "Staff manage credits" ON public.client_credits
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Clients view own credits" ON public.client_credits;
CREATE POLICY "Clients view own credits" ON public.client_credits
    FOR SELECT TO authenticated
    USING (client_id = auth.uid() AND deleted_at IS NULL);

-- =============================================================================
-- D. IMPROVED SOFT DELETE FUNCTION
-- =============================================================================
-- Updates the generic soft_delete function to handle tables without deleted_by

CREATE OR REPLACE FUNCTION public.soft_delete(
    table_name TEXT,
    record_id UUID,
    deleted_by_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
    has_deleted_by BOOLEAN;
BEGIN
    -- Check if table has deleted_by column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = soft_delete.table_name
        AND column_name = 'deleted_by'
    ) INTO has_deleted_by;

    IF has_deleted_by THEN
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
            table_name
        ) USING COALESCE(deleted_by_id, auth.uid()), record_id;
    ELSE
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
            table_name
        ) USING record_id;
    END IF;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- E. BATCH SOFT DELETE FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_batch(
    table_name TEXT,
    record_ids UUID[],
    deleted_by_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
    has_deleted_by BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = soft_delete_batch.table_name
        AND column_name = 'deleted_by'
    ) INTO has_deleted_by;

    IF has_deleted_by THEN
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NOW(), deleted_by = $1 WHERE id = ANY($2) AND deleted_at IS NULL',
            table_name
        ) USING COALESCE(deleted_by_id, auth.uid()), record_ids;
    ELSE
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NOW() WHERE id = ANY($1) AND deleted_at IS NULL',
            table_name
        ) USING record_ids;
    END IF;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- F. RESTORE WITH AUDIT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.restore_deleted(
    table_name TEXT,
    record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
    has_deleted_by BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = restore_deleted.table_name
        AND column_name = 'deleted_by'
    ) INTO has_deleted_by;

    IF has_deleted_by THEN
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
            table_name
        ) USING record_id;
    ELSE
        EXECUTE format(
            'UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
            table_name
        ) USING record_id;
    END IF;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- G. CLEANUP HELPER FUNCTION
-- =============================================================================
-- Permanently delete soft-deleted records older than specified days

CREATE OR REPLACE FUNCTION public.purge_deleted_records(
    table_name TEXT,
    older_than_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    EXECUTE format(
        'DELETE FROM public.%I WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL ''%s days''',
        table_name, older_than_days
    );

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================
--
-- Soft delete a record:
--   SELECT soft_delete('pets', 'pet-uuid-here');
--
-- Soft delete with specific user:
--   SELECT soft_delete('pets', 'pet-uuid-here', 'user-uuid-here');
--
-- Batch soft delete:
--   SELECT soft_delete_batch('vaccines', ARRAY['uuid1', 'uuid2', 'uuid3']::UUID[]);
--
-- Restore a deleted record:
--   SELECT restore_deleted('pets', 'pet-uuid-here');
--
-- Purge old deleted records:
--   SELECT purge_deleted_records('audit_logs', 365);  -- Delete after 1 year
