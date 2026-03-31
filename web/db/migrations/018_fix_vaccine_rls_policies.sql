-- =============================================================================
-- 018_FIX_VACCINE_RLS_POLICIES.SQL
-- =============================================================================
-- Security fix: Re-enable staff management policies for vaccines and reactions
--
-- ISSUE: Original policies were commented out due to syntax errors and
--        vaccine_reactions policy relied on nullable vaccine_id
--
-- FIX: Use pet relationship (pet_id is NOT NULL) for reliable access control
--
-- DEPENDENCIES: 20_pets/02_vaccines.sql, 20_pets/01_pets.sql
-- =============================================================================

-- =============================================================================
-- VACCINES STAFF POLICY
-- =============================================================================
-- Staff can manage vaccines for pets in their clinic
-- Using pet.tenant_id instead of administered_by_clinic for reliability

DROP POLICY IF EXISTS "Staff manage vaccines" ON public.vaccines;
CREATE POLICY "Staff manage vaccines" ON public.vaccines
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pets p
            WHERE p.id = vaccines.pet_id
            AND public.is_staff_of(p.tenant_id)
        )
        AND deleted_at IS NULL
    );

-- =============================================================================
-- VACCINE REACTIONS STAFF POLICY
-- =============================================================================
-- Staff can manage reactions for pets in their clinic
-- Uses pet relationship instead of vaccine relationship for reliability
-- (vaccine_id can be NULL, pet_id cannot)

DROP POLICY IF EXISTS "Staff manage reactions" ON public.vaccine_reactions;
CREATE POLICY "Staff manage reactions" ON public.vaccine_reactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pets p
            WHERE p.id = vaccine_reactions.pet_id
            AND public.is_staff_of(p.tenant_id)
        )
    );

-- =============================================================================
-- VERIFICATION COMMENTS
-- =============================================================================
COMMENT ON POLICY "Staff manage vaccines" ON public.vaccines IS
    'Staff can manage vaccines for pets in their clinic. Uses pet.tenant_id for reliable access control.';

COMMENT ON POLICY "Staff manage reactions" ON public.vaccine_reactions IS
    'Staff can manage reactions for pets in their clinic. Uses pet_id (NOT NULL) instead of nullable vaccine_id.';

-- =============================================================================
-- VERIFICATION QUERY (run to confirm policies are active)
-- =============================================================================
-- SELECT policyname, cmd, qual FROM pg_policies
-- WHERE tablename IN ('vaccines', 'vaccine_reactions');
