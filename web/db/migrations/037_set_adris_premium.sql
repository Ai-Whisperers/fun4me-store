-- =============================================================================
-- 037: Set Adris as Premium Tenant
-- =============================================================================
-- Updates Veterinaria Adris to professional tier with full premium features.
-- This removes ads and enables all professional features.
--
-- Tier: profesional (includes adFree, ecommerce, hospitalization, laboratory, etc.)
-- =============================================================================

-- Update Adris to professional tier
UPDATE public.tenants
SET
    subscription_tier = 'profesional',
    is_trial = false,
    subscription_started_at = '2024-01-01',  -- Backdated for early adopter
    subscription_expires_at = '2030-12-31',  -- Long-term subscription
    billing_cycle = 'annual',
    updated_at = NOW()
WHERE id = 'adris';

-- Verify the update
DO $$
DECLARE
    v_tier TEXT;
BEGIN
    SELECT subscription_tier::TEXT INTO v_tier
    FROM tenants
    WHERE id = 'adris';

    IF v_tier != 'profesional' THEN
        RAISE EXCEPTION 'Failed to update Adris tier. Current tier: %', v_tier;
    END IF;

    RAISE NOTICE 'Adris successfully updated to professional tier';
END $$;
