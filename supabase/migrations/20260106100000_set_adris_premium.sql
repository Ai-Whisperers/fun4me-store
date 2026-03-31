-- =============================================================================
-- Set Adris as Premium Tenant (Professional Tier)
-- =============================================================================
-- Updates Veterinaria Adris to professional tier with full premium features.
-- This removes ads and enables all professional features.
-- =============================================================================

UPDATE public.tenants
SET
    subscription_tier = 'profesional',
    is_trial = false,
    subscription_started_at = '2024-01-01',
    subscription_expires_at = '2030-12-31',
    billing_cycle = 'annual',
    updated_at = NOW()
WHERE id = 'adris';
