-- =============================================================================
-- 007_OPTIMIZE_RLS_POLICIES.SQL
-- =============================================================================
-- Optimizes RLS policies to use direct tenant_id checks instead of subqueries
-- now that child tables have tenant_id columns.
--
-- Also adds a performance-optimized index for is_staff_of() function.
--
-- Prerequisites: Run 001_add_tenant_id_to_child_tables.sql first
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. OPTIMIZE is_staff_of() WITH DEDICATED INDEX
-- =============================================================================

-- Create optimized index for staff lookups
CREATE INDEX IF NOT EXISTS idx_profiles_staff_lookup
ON public.profiles(id, tenant_id, role)
WHERE role IN ('vet', 'admin') AND deleted_at IS NULL;

-- =============================================================================
-- B. OPTIMIZE VACCINES RLS POLICIES
-- =============================================================================
-- Now uses direct tenant_id instead of subquery through pets

DROP POLICY IF EXISTS "Staff manage vaccines" ON public.vaccines;
CREATE POLICY "Staff manage vaccines" ON public.vaccines
    FOR ALL TO authenticated
    USING (
        public.is_staff_of(tenant_id)
        AND deleted_at IS NULL
    );

-- =============================================================================
-- C. OPTIMIZE VACCINE_REACTIONS RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Staff manage reactions" ON public.vaccine_reactions;
CREATE POLICY "Staff manage reactions" ON public.vaccine_reactions
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view pet reactions" ON public.vaccine_reactions;
CREATE POLICY "Owners view pet reactions" ON public.vaccine_reactions
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id));

-- =============================================================================
-- D. OPTIMIZE HOSPITALIZATION_VITALS RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Staff manage vitals" ON public.hospitalization_vitals;
CREATE POLICY "Staff manage vitals" ON public.hospitalization_vitals
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view vitals" ON public.hospitalization_vitals;
CREATE POLICY "Owners view vitals" ON public.hospitalization_vitals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.hospitalizations h
            WHERE h.id = hospitalization_vitals.hospitalization_id
            AND public.is_owner_of_pet(h.pet_id)
        )
    );

-- =============================================================================
-- E. OPTIMIZE HOSPITALIZATION_MEDICATIONS RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Staff manage medications" ON public.hospitalization_medications;
CREATE POLICY "Staff manage medications" ON public.hospitalization_medications
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- =============================================================================
-- F. OPTIMIZE HOSPITALIZATION_TREATMENTS RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Staff manage treatments" ON public.hospitalization_treatments;
CREATE POLICY "Staff manage treatments" ON public.hospitalization_treatments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- =============================================================================
-- G. OPTIMIZE HOSPITALIZATION_FEEDINGS RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Staff manage feedings" ON public.hospitalization_feedings;
CREATE POLICY "Staff manage feedings" ON public.hospitalization_feedings
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- =============================================================================
-- H. OPTIMIZE HOSPITALIZATION_NOTES RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Staff manage notes" ON public.hospitalization_notes;
CREATE POLICY "Staff manage notes" ON public.hospitalization_notes
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- =============================================================================
-- I. OPTIMIZE INVOICE_ITEMS RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Staff manage invoice items" ON public.invoice_items;
CREATE POLICY "Staff manage invoice items" ON public.invoice_items
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view invoice items" ON public.invoice_items;
CREATE POLICY "Clients view invoice items" ON public.invoice_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices i
            WHERE i.id = invoice_items.invoice_id
            AND i.client_id = auth.uid()
        )
    );

-- =============================================================================
-- J. OPTIMIZE STORE_CAMPAIGN_ITEMS RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Staff manage campaign items" ON public.store_campaign_items;
CREATE POLICY "Staff manage campaign items" ON public.store_campaign_items
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Public read policy remains subquery-based (needs campaign active check)

-- =============================================================================
-- K. OPTIMIZE QR_TAG_SCANS RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Staff view scans" ON public.qr_tag_scans;
CREATE POLICY "Staff view scans" ON public.qr_tag_scans
    FOR SELECT TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

-- Public insert policy remains unchanged

-- =============================================================================
-- L. ADD SERVICE ROLE POLICIES (Missing from some tables)
-- =============================================================================

-- Ensure service role has full access to all tables for admin operations
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'vaccines',
        'vaccine_reactions',
        'hospitalization_vitals',
        'hospitalization_medications',
        'hospitalization_treatments',
        'hospitalization_feedings',
        'hospitalization_notes',
        'invoice_items',
        'store_campaign_items',
        'qr_tag_scans'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS "Service role full access" ON public.%I',
            tbl
        );
        EXECUTE format(
            'CREATE POLICY "Service role full access" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
            tbl
        );
    END LOOP;
END $$;

-- =============================================================================
-- M. OPTIMIZE is_owner_of_pet() FUNCTION
-- =============================================================================
-- Add index to support faster pet ownership lookups

CREATE INDEX IF NOT EXISTS idx_pets_owner_lookup
ON public.pets(id, owner_id)
WHERE deleted_at IS NULL;

COMMIT;

-- =============================================================================
-- PERFORMANCE NOTES
-- =============================================================================
--
-- Before optimization:
--   RLS policies used EXISTS subqueries that joined through parent tables
--   Example: vaccines -> pets -> is_staff_of(pets.tenant_id)
--
-- After optimization:
--   RLS policies use direct tenant_id checks
--   Example: vaccines -> is_staff_of(vaccines.tenant_id)
--
-- Expected improvements:
--   - Fewer table joins per query
--   - Better use of indexes
--   - Reduced query planning time
--   - Lower memory usage for RLS checks
--
-- To verify improvements, run EXPLAIN ANALYZE on common queries:
--   EXPLAIN ANALYZE SELECT * FROM vaccines WHERE pet_id = 'uuid';
