-- =============================================================================
-- 013_ENABLE_MISSING_RLS.SQL
-- =============================================================================
-- Security fix: Enable RLS on tables that have policies but RLS is not enabled
--
-- Tables affected:
-- 1. consent_templates - Has policies defined but RLS not enabled
-- 2. vaccine_protocols - No RLS at all
--
-- DEPENDENCIES: 30_clinical/01_reference_data.sql
-- =============================================================================

-- SEC-FIX: Enable RLS on consent_templates
-- The table has policies defined but RLS was never enabled
ALTER TABLE public.consent_templates ENABLE ROW LEVEL SECURITY;

-- SEC-FIX: Enable RLS on vaccine_protocols
-- This table had NO RLS at all - major security gap
ALTER TABLE public.vaccine_protocols ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- VACCINE PROTOCOLS RLS POLICIES
-- =============================================================================
-- Vaccine protocols are reference data. All authenticated users can view them,
-- only admins can manage them.

-- View policy: All authenticated users can read vaccine protocols
DROP POLICY IF EXISTS "Authenticated users read vaccine protocols" ON public.vaccine_protocols;
CREATE POLICY "Authenticated users read vaccine protocols" ON public.vaccine_protocols
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

-- Admin management policy: Only admins can create/update/delete
DROP POLICY IF EXISTS "Admins manage vaccine protocols" ON public.vaccine_protocols;
CREATE POLICY "Admins manage vaccine protocols" ON public.vaccine_protocols
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Service role full access for backend operations
DROP POLICY IF EXISTS "Service role full access vaccine protocols" ON public.vaccine_protocols;
CREATE POLICY "Service role full access vaccine protocols" ON public.vaccine_protocols
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- VERIFICATION COMMENTS
-- =============================================================================
COMMENT ON TABLE public.consent_templates IS 'Templates for informed consent forms and legal documents. RLS enabled in migration 013.';
COMMENT ON TABLE public.vaccine_protocols IS 'Standard vaccination protocols by species and vaccine type. RLS enabled in migration 013.';
