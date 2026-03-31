-- =============================================================================
-- 024_ADD_TENANT_ID_TO_VACCINE_REACTIONS.SQL
-- =============================================================================
-- Adds tenant_id to vaccine_reactions table for:
-- 1. Better RLS performance (direct tenant check instead of JOIN via pets)
-- 2. Consistent multi-tenancy pattern across all clinical tables
--
-- This migration is IDEMPOTENT - safe to run multiple times.
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. ADD TENANT_ID COLUMN
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'vaccine_reactions'
        AND column_name = 'tenant_id'
    ) THEN
        -- Add column as nullable first for backfill
        ALTER TABLE public.vaccine_reactions
        ADD COLUMN tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE;

        RAISE NOTICE 'Added tenant_id column to vaccine_reactions';
    ELSE
        RAISE NOTICE 'tenant_id column already exists on vaccine_reactions';
    END IF;
END
$$;

-- =============================================================================
-- B. BACKFILL TENANT_ID FROM PETS TABLE
-- =============================================================================

UPDATE public.vaccine_reactions vr
SET tenant_id = (
    SELECT p.tenant_id
    FROM public.pets p
    WHERE p.id = vr.pet_id
)
WHERE vr.tenant_id IS NULL;

-- Log backfill results
DO $$
DECLARE
    updated_count INTEGER;
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM public.vaccine_reactions
    WHERE tenant_id IS NULL;

    IF null_count > 0 THEN
        RAISE WARNING 'Found % vaccine_reactions with NULL tenant_id after backfill (orphaned pet_ids)', null_count;
    ELSE
        RAISE NOTICE 'All vaccine_reactions have tenant_id populated';
    END IF;
END
$$;

-- =============================================================================
-- C. ADD NOT NULL CONSTRAINT (only if all rows have tenant_id)
-- =============================================================================

DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM public.vaccine_reactions
    WHERE tenant_id IS NULL;

    IF null_count = 0 THEN
        -- Make column NOT NULL
        ALTER TABLE public.vaccine_reactions
        ALTER COLUMN tenant_id SET NOT NULL;
        RAISE NOTICE 'Set tenant_id to NOT NULL on vaccine_reactions';
    ELSE
        RAISE WARNING 'Cannot set NOT NULL - % rows still have NULL tenant_id', null_count;
    END IF;
END
$$;

-- =============================================================================
-- D. ADD INDEX FOR TENANT_ID
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccine_reactions_tenant
ON public.vaccine_reactions(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccine_reactions_tenant_date
ON public.vaccine_reactions(tenant_id, reaction_date DESC);

-- =============================================================================
-- E. UPDATE RLS POLICIES TO USE DIRECT TENANT_ID CHECK
-- =============================================================================

-- Drop old expensive policies
DROP POLICY IF EXISTS "Staff manage reactions" ON public.vaccine_reactions;
DROP POLICY IF EXISTS "Owners view pet reactions" ON public.vaccine_reactions;
DROP POLICY IF EXISTS "Service role full access reactions" ON public.vaccine_reactions;

-- Recreate with optimized tenant_id checks

-- 1. Pet owners can view reactions for their pets (keep pet_id check for this)
CREATE POLICY "Owners view pet reactions" ON public.vaccine_reactions
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id));

-- 2. Staff can manage reactions in their clinic (NOW USES DIRECT TENANT_ID!)
CREATE POLICY "Staff manage reactions" ON public.vaccine_reactions
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id))
    WITH CHECK (public.is_staff_of(tenant_id));

-- 3. Service role full access
CREATE POLICY "Service role full access reactions" ON public.vaccine_reactions
    FOR ALL TO service_role
    USING (true);

-- =============================================================================
-- F. ADD TRIGGER TO AUTO-SET TENANT_ID ON INSERT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.vaccine_reactions_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set tenant_id if not provided
    IF NEW.tenant_id IS NULL AND NEW.pet_id IS NOT NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.pets
        WHERE id = NEW.pet_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS vaccine_reactions_auto_tenant ON public.vaccine_reactions;
CREATE TRIGGER vaccine_reactions_auto_tenant
    BEFORE INSERT ON public.vaccine_reactions
    FOR EACH ROW
    EXECUTE FUNCTION public.vaccine_reactions_set_tenant_id();

COMMENT ON FUNCTION public.vaccine_reactions_set_tenant_id() IS
    'Auto-populates tenant_id from pet when inserting vaccine reactions';

-- =============================================================================
-- G. ANALYZE TABLE
-- =============================================================================

ANALYZE public.vaccine_reactions;

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES (run manually to verify)
-- =============================================================================
--
-- -- Check all rows have tenant_id
-- SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant
-- FROM public.vaccine_reactions;
--
-- -- Check index was created
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'vaccine_reactions' AND indexname LIKE '%tenant%';
--
-- -- Check RLS policies
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'vaccine_reactions';
-- =============================================================================
