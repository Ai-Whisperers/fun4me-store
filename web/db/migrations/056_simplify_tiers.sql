-- =============================================================================
-- 046: Simplify Pricing Tiers to 2 Tiers
-- =============================================================================
-- Migrates from 5-tier system to 2-tier system:
--
-- Old tiers: gratis, basico, crecimiento, profesional, empresarial
-- New tiers: gratis, profesional
--
-- Migration mapping:
--   gratis -> gratis (free tier stays free)
--   basico -> profesional (was paid, upgrade to profesional)
--   crecimiento -> profesional (merge into profesional)
--   profesional -> profesional (no change)
--   empresarial -> profesional (merge into profesional)
--
-- New pricing:
--   - Gratis: Free, website + WhatsApp booking only, shows ads
--   - Profesional: 250,000 Gs/month, all features, 3% commission
-- =============================================================================

-- Step 1: Update all tenants with old tier values to new tier values
UPDATE public.tenants
SET
    subscription_tier = 'profesional',
    updated_at = NOW()
WHERE subscription_tier IN ('basico', 'crecimiento', 'empresarial');

-- Log how many were migrated
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Count remaining legacy tiers (should be 0)
    SELECT COUNT(*) INTO v_count
    FROM tenants
    WHERE subscription_tier NOT IN ('gratis', 'profesional');

    IF v_count > 0 THEN
        RAISE EXCEPTION 'Migration incomplete: % tenants still have legacy tiers', v_count;
    END IF;

    RAISE NOTICE 'Successfully migrated all tenants to 2-tier system (gratis, profesional)';
END $$;

-- Step 2: Verify the distribution
DO $$
DECLARE
    v_gratis INTEGER;
    v_profesional INTEGER;
    v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_gratis FROM tenants WHERE subscription_tier = 'gratis';
    SELECT COUNT(*) INTO v_profesional FROM tenants WHERE subscription_tier = 'profesional';
    SELECT COUNT(*) INTO v_total FROM tenants;

    RAISE NOTICE 'Tier distribution after migration:';
    RAISE NOTICE '  - gratis: % tenants', v_gratis;
    RAISE NOTICE '  - profesional: % tenants', v_profesional;
    RAISE NOTICE '  - total: % tenants', v_total;
END $$;

-- Step 3: Add a CHECK constraint to prevent invalid tiers (optional, if desired)
-- This ensures only valid tier values can be inserted going forward
-- ALTER TABLE public.tenants
--   ADD CONSTRAINT chk_subscription_tier_valid
--   CHECK (subscription_tier IN ('gratis', 'profesional'));

-- Note: The above constraint is commented out because:
-- 1. Existing application code might try to insert old tier values during transition
-- 2. You may want to enable this after verifying all application code is updated
-- To enable, run the ALTER TABLE statement manually after verification.

-- =============================================================================
-- ROLLBACK SCRIPT (if needed):
-- =============================================================================
-- To rollback this migration, you would need to:
-- 1. Restore tenant data from backup
-- 2. Re-deploy the old application code
--
-- There is no automatic rollback since we don't know which old tier each
-- tenant had before migration (basico, crecimiento, or empresarial).
-- =============================================================================
