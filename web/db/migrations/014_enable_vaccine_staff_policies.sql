-- =============================================================================
-- 014_ENABLE_VACCINE_STAFF_POLICIES.SQL
-- =============================================================================
-- Security fix: Enable staff management policies for vaccines and reactions
-- These were commented out due to syntax issues (missing parentheses)
--
-- Original issue:
--   USING (administered_by_clinic IS NULL OR public.is_staff_of(administered_by_clinic)) AND deleted_at IS NULL;
-- Fixed:
--   USING ((administered_by_clinic IS NULL OR public.is_staff_of(administered_by_clinic)) AND deleted_at IS NULL);
--
-- DEPENDENCIES: 20_pets/02_vaccines.sql
-- =============================================================================

-- =============================================================================
-- VACCINES STAFF POLICY
-- =============================================================================
-- Staff can manage vaccines for their clinic or vaccines without a clinic assigned

DROP POLICY IF EXISTS "Staff manage vaccines" ON public.vaccines;
CREATE POLICY "Staff manage vaccines" ON public.vaccines
    FOR ALL TO authenticated
    USING (
        (administered_by_clinic IS NULL OR public.is_staff_of(administered_by_clinic))
        AND deleted_at IS NULL
    );

-- =============================================================================
-- VACCINE REACTIONS STAFF POLICY
-- =============================================================================
-- Staff can manage reactions for vaccines in their clinic

DROP POLICY IF EXISTS "Staff manage reactions" ON public.vaccine_reactions;
CREATE POLICY "Staff manage reactions" ON public.vaccine_reactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vaccines v
            WHERE v.id = vaccine_id
            AND (v.administered_by_clinic IS NULL OR public.is_staff_of(v.administered_by_clinic))
        )
    );

-- =============================================================================
-- VERIFICATION COMMENTS
-- =============================================================================
COMMENT ON POLICY "Staff manage vaccines" ON public.vaccines IS
    'Staff can manage vaccines for their clinic. Fixed syntax from migration 014.';
COMMENT ON POLICY "Staff manage reactions" ON public.vaccine_reactions IS
    'Staff can manage reactions for vaccines in their clinic. Enabled in migration 014.';
