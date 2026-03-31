-- =============================================================================
-- 063: Add Subscription Tier Columns to Tenants
-- =============================================================================
-- Adds columns required by the feature access system in lib/features/server.ts
-- =============================================================================

-- Add subscription_tier column
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'gratis';

-- Add trial tracking columns
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS trial_end_date DATE;

-- Add subscription expiration
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS subscription_expires_at DATE;

-- Add feature overrides for custom configurations
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS feature_overrides JSONB DEFAULT '{}'::jsonb;

-- Add referral discount tracking
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS referral_discount_percent NUMERIC(5,2) DEFAULT 0;

-- Set all tenants to profesional for development
UPDATE public.tenants
SET subscription_tier = 'profesional'
WHERE subscription_tier IS NULL OR subscription_tier = 'gratis';

-- Add index for subscription tier lookups
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_tier
ON public.tenants(subscription_tier) WHERE is_active = true;

-- Log result
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.tenants WHERE subscription_tier = 'profesional';
    RAISE NOTICE 'Migration complete: % tenants set to profesional tier', v_count;
END $$;
