-- =============================================================================
-- SUBSCRIPTION TIERS - Update Plan Column to Match New Tier Structure
-- =============================================================================
-- Updates the tenants.plan column to use new tier IDs:
-- gratis, basico, crecimiento, profesional, empresarial
--
-- Also adds subscription tracking fields for trial and billing.
--
-- DEPENDENCIES: 10_core/01_tenants.sql
-- =============================================================================

-- =============================================================================
-- STEP 1: Create new subscription tiers enum type
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
        CREATE TYPE subscription_tier AS ENUM (
            'gratis',
            'basico',
            'crecimiento',
            'profesional',
            'empresarial'
        );
    END IF;
END
$$;

COMMENT ON TYPE subscription_tier IS 'Vetic subscription tier identifiers';

-- =============================================================================
-- STEP 2: Add new columns to tenants table
-- =============================================================================

-- Subscription tier (new column, will migrate from 'plan')
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier DEFAULT 'gratis';

-- Trial information
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS trial_start_date DATE;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS trial_end_date DATE;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;

-- Billing information
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')) DEFAULT 'monthly';

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS subscription_started_at DATE;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS subscription_expires_at DATE;

-- Referral tracking
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS referred_by_tenant_id TEXT REFERENCES public.tenants(id);

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS referral_discount_percent NUMERIC(5,2) DEFAULT 0;

-- Feature overrides (for custom enterprise configurations)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS feature_overrides JSONB DEFAULT '{}'::jsonb;

-- Comments
COMMENT ON COLUMN public.tenants.subscription_tier IS 'Current subscription tier: gratis, basico, crecimiento, profesional, empresarial';
COMMENT ON COLUMN public.tenants.trial_start_date IS 'Date when trial period started';
COMMENT ON COLUMN public.tenants.trial_end_date IS 'Date when trial period ends';
COMMENT ON COLUMN public.tenants.is_trial IS 'Whether tenant is currently in trial period';
COMMENT ON COLUMN public.tenants.billing_cycle IS 'Billing frequency: monthly or annual';
COMMENT ON COLUMN public.tenants.subscription_started_at IS 'Date when paid subscription started';
COMMENT ON COLUMN public.tenants.subscription_expires_at IS 'Date when current subscription period ends';
COMMENT ON COLUMN public.tenants.referred_by_tenant_id IS 'Tenant ID that referred this clinic';
COMMENT ON COLUMN public.tenants.referral_discount_percent IS 'Current referral discount percentage (stackable, max 100%)';
COMMENT ON COLUMN public.tenants.feature_overrides IS 'Custom feature flags that override tier defaults: { "laboratory": true, "hospitalization": false }';

-- =============================================================================
-- STEP 3: Migrate existing plan data to new subscription_tier
-- =============================================================================

UPDATE public.tenants
SET subscription_tier = CASE plan
    WHEN 'free' THEN 'gratis'::subscription_tier
    WHEN 'starter' THEN 'basico'::subscription_tier
    WHEN 'professional' THEN 'profesional'::subscription_tier
    WHEN 'enterprise' THEN 'empresarial'::subscription_tier
    ELSE 'gratis'::subscription_tier
END
WHERE subscription_tier IS NULL OR subscription_tier = 'gratis';

-- =============================================================================
-- STEP 4: Create indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_tenants_subscription_tier
ON public.tenants(subscription_tier) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenants_trial
ON public.tenants(trial_end_date) WHERE is_trial = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenants_subscription_expires
ON public.tenants(subscription_expires_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenants_referral
ON public.tenants(referred_by_tenant_id) WHERE referred_by_tenant_id IS NOT NULL;

-- =============================================================================
-- STEP 5: Helper Functions
-- =============================================================================

-- Get effective tier (considers trial)
CREATE OR REPLACE FUNCTION get_effective_tier(p_tenant_id TEXT)
RETURNS subscription_tier AS $$
DECLARE
    v_tenant RECORD;
BEGIN
    SELECT
        subscription_tier,
        is_trial,
        trial_end_date,
        subscription_expires_at
    INTO v_tenant
    FROM tenants
    WHERE id = p_tenant_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN 'gratis'::subscription_tier;
    END IF;

    -- Check if trial is still valid
    IF v_tenant.is_trial AND v_tenant.trial_end_date >= CURRENT_DATE THEN
        RETURN 'profesional'::subscription_tier; -- Trial gets profesional tier
    END IF;

    -- Check if subscription is still valid
    IF v_tenant.subscription_expires_at IS NOT NULL AND v_tenant.subscription_expires_at < CURRENT_DATE THEN
        RETURN 'gratis'::subscription_tier; -- Expired = gratis
    END IF;

    RETURN v_tenant.subscription_tier;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_effective_tier IS 'Returns the effective subscription tier considering trial status and expiration';

-- Check if tenant has a specific feature
CREATE OR REPLACE FUNCTION tenant_has_feature(p_tenant_id TEXT, p_feature TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_tenant RECORD;
    v_tier subscription_tier;
    v_override BOOLEAN;
BEGIN
    SELECT feature_overrides
    INTO v_tenant
    FROM tenants
    WHERE id = p_tenant_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check for explicit override
    IF v_tenant.feature_overrides ? p_feature THEN
        v_override := (v_tenant.feature_overrides ->> p_feature)::BOOLEAN;
        RETURN COALESCE(v_override, false);
    END IF;

    -- Get effective tier and check feature matrix
    v_tier := get_effective_tier(p_tenant_id);

    -- Feature matrix (matches tiers.ts)
    RETURN CASE p_feature
        -- Core features (all tiers)
        WHEN 'website' THEN true
        WHEN 'petPortal' THEN true
        WHEN 'appointments' THEN true
        WHEN 'medicalRecords' THEN true
        WHEN 'vaccineTracking' THEN true
        WHEN 'clinicalTools' THEN true

        -- Premium features
        WHEN 'adFree' THEN v_tier != 'gratis'
        WHEN 'ecommerce' THEN v_tier IN ('crecimiento', 'profesional', 'empresarial')
        WHEN 'qrTags' THEN v_tier IN ('crecimiento', 'profesional', 'empresarial')
        WHEN 'bulkOrdering' THEN v_tier IN ('crecimiento', 'profesional', 'empresarial')
        WHEN 'analyticsBasic' THEN v_tier IN ('crecimiento', 'profesional', 'empresarial')
        WHEN 'analyticsAdvanced' THEN v_tier IN ('profesional', 'empresarial')
        WHEN 'analyticsAI' THEN v_tier = 'empresarial'
        WHEN 'whatsappApi' THEN v_tier IN ('profesional', 'empresarial')
        WHEN 'hospitalization' THEN v_tier IN ('profesional', 'empresarial')
        WHEN 'laboratory' THEN v_tier IN ('profesional', 'empresarial')

        -- Enterprise features
        WHEN 'multiLocation' THEN v_tier = 'empresarial'
        WHEN 'apiAccess' THEN v_tier = 'empresarial'
        WHEN 'slaGuarantee' THEN v_tier = 'empresarial'
        WHEN 'dedicatedSupport' THEN v_tier = 'empresarial'

        ELSE false
    END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION tenant_has_feature IS 'Check if a tenant has access to a specific feature based on their tier and overrides';

-- Update trial status (run daily via cron)
CREATE OR REPLACE FUNCTION update_expired_trials()
RETURNS INTEGER AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    WITH expired AS (
        UPDATE tenants
        SET
            is_trial = false,
            updated_at = NOW()
        WHERE
            is_trial = true
            AND trial_end_date < CURRENT_DATE
            AND is_active = true
        RETURNING id
    )
    SELECT COUNT(*) INTO v_updated FROM expired;

    RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_expired_trials IS 'Marks trials as expired when past end date. Returns count of updated tenants.';
