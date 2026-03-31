-- =============================================================================
-- REFERRAL PROGRAM - Database Schema
-- =============================================================================
-- Tracks referrals between clinics with stackable discounts.
--
-- Features:
-- - Unique referral codes per tenant
-- - Stackable 30% discount per successful referral
-- - Max 100% discount (free months)
-- - Loyalty points rewards for both referrer and referred
-- - Tracking of referral status and conversions
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 80_billing/01_subscription_tiers.sql
-- =============================================================================

-- =============================================================================
-- REFERRAL CODES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Code details
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Usage tracking
    times_used INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER, -- NULL = unlimited

    -- Rewards configuration (can override defaults)
    referrer_discount_percent NUMERIC(5,2) DEFAULT 30.00, -- 30% per referral
    referred_trial_bonus_days INTEGER DEFAULT 60, -- +2 months trial
    referrer_loyalty_points INTEGER DEFAULT 1000,
    referred_loyalty_points INTEGER DEFAULT 500,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL = never expires
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.referral_codes IS 'Referral codes for the clinic referral program';
COMMENT ON COLUMN public.referral_codes.code IS 'Unique referral code (e.g., ADRIS2026, PETLIFE123)';
COMMENT ON COLUMN public.referral_codes.referrer_discount_percent IS 'Discount percentage given to referrer per successful referral (stackable)';
COMMENT ON COLUMN public.referral_codes.referred_trial_bonus_days IS 'Extra trial days given to referred clinic';

-- =============================================================================
-- REFERRALS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referral relationship
    referrer_tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    referred_tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'trial_started', 'converted', 'expired', 'cancelled')),

    -- Conversion tracking
    trial_started_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ, -- When referred clinic became paying customer
    first_payment_amount NUMERIC(12,2),

    -- Rewards issued
    referrer_discount_applied BOOLEAN DEFAULT false,
    referrer_discount_percent NUMERIC(5,2),
    referrer_points_issued BOOLEAN DEFAULT false,
    referrer_points_amount INTEGER,
    referred_points_issued BOOLEAN DEFAULT false,
    referred_points_amount INTEGER,
    referred_trial_bonus_applied BOOLEAN DEFAULT false,
    referred_trial_bonus_days INTEGER,

    -- Attribution
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(referred_tenant_id), -- A clinic can only be referred once
    CONSTRAINT different_tenants CHECK (referrer_tenant_id != referred_tenant_id)
);

COMMENT ON TABLE public.referrals IS 'Tracks referral relationships and reward status';
COMMENT ON COLUMN public.referrals.status IS 'pending=awaiting trial, trial_started=in trial, converted=became paying, expired=trial ended without converting';

-- =============================================================================
-- REFERRAL REWARDS LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Reward details
    reward_type TEXT NOT NULL CHECK (reward_type IN ('discount', 'trial_extension', 'loyalty_points', 'free_month')),
    reward_value NUMERIC(12,2) NOT NULL, -- Amount, days, or points depending on type
    description TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired', 'cancelled')),
    applied_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.referral_rewards IS 'Log of all rewards issued through the referral program';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Referral codes: Tenant can see their own codes
CREATE POLICY "Tenant view own referral codes" ON public.referral_codes
    FOR SELECT USING (is_staff_of(tenant_id));

CREATE POLICY "Tenant create referral codes" ON public.referral_codes
    FOR INSERT WITH CHECK (is_staff_of(tenant_id));

-- Public can validate any code (for referral signup flow)
CREATE POLICY "Anyone can validate active codes" ON public.referral_codes
    FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Referrals: Tenants can see referrals they're involved in
CREATE POLICY "Tenant view own referrals" ON public.referrals
    FOR SELECT USING (
        is_staff_of(referrer_tenant_id) OR is_staff_of(referred_tenant_id)
    );

-- Rewards: Tenants can see their own rewards
CREATE POLICY "Tenant view own rewards" ON public.referral_rewards
    FOR SELECT USING (is_staff_of(tenant_id));

-- Service role full access
CREATE POLICY "Service role full access referral_codes" ON public.referral_codes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access referrals" ON public.referrals
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access referral_rewards" ON public.referral_rewards
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_referral_codes_tenant ON public.referral_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON public.referral_codes(tenant_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_converted ON public.referrals(referrer_tenant_id, converted_at)
    WHERE status = 'converted';

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral ON public.referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_tenant ON public.referral_rewards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_pending ON public.referral_rewards(tenant_id, status)
    WHERE status = 'pending';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.referral_codes;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.referral_codes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.referrals;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate unique referral code for a tenant
CREATE OR REPLACE FUNCTION generate_referral_code(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_tenant_name TEXT;
    v_base_code TEXT;
    v_code TEXT;
    v_suffix INTEGER := 1;
BEGIN
    -- Get tenant name
    SELECT UPPER(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'))
    INTO v_tenant_name
    FROM tenants WHERE id = p_tenant_id;

    -- Create base code (first 6 chars of name + year)
    v_base_code := LEFT(v_tenant_name, 6) || TO_CHAR(NOW(), 'YY');
    v_code := v_base_code;

    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code) LOOP
        v_code := v_base_code || v_suffix;
        v_suffix := v_suffix + 1;
    END LOOP;

    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Create referral code for tenant (if doesn't exist)
CREATE OR REPLACE FUNCTION ensure_referral_code(p_tenant_id TEXT)
RETURNS UUID AS $$
DECLARE
    v_code_id UUID;
    v_code TEXT;
BEGIN
    -- Check for existing active code
    SELECT id INTO v_code_id
    FROM referral_codes
    WHERE tenant_id = p_tenant_id AND is_active = true
    LIMIT 1;

    IF v_code_id IS NOT NULL THEN
        RETURN v_code_id;
    END IF;

    -- Generate new code
    v_code := generate_referral_code(p_tenant_id);

    INSERT INTO referral_codes (tenant_id, code)
    VALUES (p_tenant_id, v_code)
    RETURNING id INTO v_code_id;

    RETURN v_code_id;
END;
$$ LANGUAGE plpgsql;

-- Process referral signup
CREATE OR REPLACE FUNCTION process_referral_signup(
    p_referral_code TEXT,
    p_new_tenant_id TEXT,
    p_utm_source TEXT DEFAULT NULL,
    p_utm_medium TEXT DEFAULT NULL,
    p_utm_campaign TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_code RECORD;
    v_referral_id UUID;
BEGIN
    -- Validate referral code
    SELECT rc.*, t.id as referrer_id
    INTO v_code
    FROM referral_codes rc
    JOIN tenants t ON t.id = rc.tenant_id
    WHERE rc.code = UPPER(p_referral_code)
    AND rc.is_active = true
    AND (rc.expires_at IS NULL OR rc.expires_at > NOW())
    AND (rc.max_uses IS NULL OR rc.times_used < rc.max_uses);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired referral code';
    END IF;

    -- Check if new tenant already has a referral
    IF EXISTS (SELECT 1 FROM referrals WHERE referred_tenant_id = p_new_tenant_id) THEN
        RAISE EXCEPTION 'This clinic has already been referred';
    END IF;

    -- Can't refer yourself
    IF v_code.referrer_id = p_new_tenant_id THEN
        RAISE EXCEPTION 'Cannot refer yourself';
    END IF;

    -- Create referral record
    INSERT INTO referrals (
        referrer_tenant_id,
        referred_tenant_id,
        referral_code_id,
        status,
        referrer_discount_percent,
        referrer_points_amount,
        referred_points_amount,
        referred_trial_bonus_days,
        utm_source,
        utm_medium,
        utm_campaign
    ) VALUES (
        v_code.tenant_id,
        p_new_tenant_id,
        v_code.id,
        'pending',
        v_code.referrer_discount_percent,
        v_code.referrer_loyalty_points,
        v_code.referred_loyalty_points,
        v_code.referred_trial_bonus_days,
        p_utm_source,
        p_utm_medium,
        p_utm_campaign
    ) RETURNING id INTO v_referral_id;

    -- Update code usage count
    UPDATE referral_codes
    SET times_used = times_used + 1, updated_at = NOW()
    WHERE id = v_code.id;

    -- Update referred tenant's referral info
    UPDATE tenants
    SET
        referred_by_tenant_id = v_code.tenant_id,
        updated_at = NOW()
    WHERE id = p_new_tenant_id;

    -- Create pending rewards
    -- Referred clinic: trial extension
    INSERT INTO referral_rewards (referral_id, tenant_id, reward_type, reward_value, description)
    VALUES (
        v_referral_id,
        p_new_tenant_id,
        'trial_extension',
        v_code.referred_trial_bonus_days,
        'Extensión de prueba por referido'
    );

    -- Referred clinic: loyalty points
    INSERT INTO referral_rewards (referral_id, tenant_id, reward_type, reward_value, description)
    VALUES (
        v_referral_id,
        p_new_tenant_id,
        'loyalty_points',
        v_code.referred_loyalty_points,
        'Puntos de bienvenida por referido'
    );

    RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql;

-- Mark referral as trial started (when referred clinic starts trial)
CREATE OR REPLACE FUNCTION referral_trial_started(p_referral_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_referral RECORD;
BEGIN
    SELECT * INTO v_referral FROM referrals WHERE id = p_referral_id;

    IF NOT FOUND OR v_referral.status != 'pending' THEN
        RETURN false;
    END IF;

    UPDATE referrals
    SET
        status = 'trial_started',
        trial_started_at = NOW(),
        updated_at = NOW()
    WHERE id = p_referral_id;

    -- Apply trial extension to referred tenant
    UPDATE tenants
    SET
        trial_end_date = COALESCE(trial_end_date, CURRENT_DATE + 90) + v_referral.referred_trial_bonus_days,
        updated_at = NOW()
    WHERE id = v_referral.referred_tenant_id;

    -- Mark trial extension reward as applied
    UPDATE referral_rewards
    SET status = 'applied', applied_at = NOW()
    WHERE referral_id = p_referral_id
    AND tenant_id = v_referral.referred_tenant_id
    AND reward_type = 'trial_extension';

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Mark referral as converted (when referred clinic becomes paying)
CREATE OR REPLACE FUNCTION referral_converted(
    p_referral_id UUID,
    p_payment_amount NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_referral RECORD;
    v_current_discount NUMERIC;
    v_new_discount NUMERIC;
BEGIN
    SELECT * INTO v_referral FROM referrals WHERE id = p_referral_id;

    IF NOT FOUND OR v_referral.status NOT IN ('pending', 'trial_started') THEN
        RETURN false;
    END IF;

    -- Update referral status
    UPDATE referrals
    SET
        status = 'converted',
        converted_at = NOW(),
        first_payment_amount = p_payment_amount,
        updated_at = NOW()
    WHERE id = p_referral_id;

    -- Apply discount to referrer (stackable, max 100%)
    SELECT COALESCE(referral_discount_percent, 0)
    INTO v_current_discount
    FROM tenants WHERE id = v_referral.referrer_tenant_id;

    v_new_discount := LEAST(100, v_current_discount + v_referral.referrer_discount_percent);

    UPDATE tenants
    SET
        referral_discount_percent = v_new_discount,
        updated_at = NOW()
    WHERE id = v_referral.referrer_tenant_id;

    -- Mark referrer discount as applied
    UPDATE referrals
    SET
        referrer_discount_applied = true,
        updated_at = NOW()
    WHERE id = p_referral_id;

    -- Create discount reward record
    INSERT INTO referral_rewards (referral_id, tenant_id, reward_type, reward_value, description, status, applied_at)
    VALUES (
        p_referral_id,
        v_referral.referrer_tenant_id,
        'discount',
        v_referral.referrer_discount_percent,
        'Descuento por referido convertido',
        'applied',
        NOW()
    );

    -- Issue loyalty points to both parties
    -- Note: This would integrate with the loyalty points system
    -- For now, just mark as issued

    UPDATE referrals
    SET
        referrer_points_issued = true,
        referred_points_issued = true,
        updated_at = NOW()
    WHERE id = p_referral_id;

    -- Mark points rewards as applied
    UPDATE referral_rewards
    SET status = 'applied', applied_at = NOW()
    WHERE referral_id = p_referral_id AND reward_type = 'loyalty_points';

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Get referral statistics for a tenant
CREATE OR REPLACE FUNCTION get_referral_stats(p_tenant_id TEXT)
RETURNS TABLE (
    total_referrals INTEGER,
    pending_referrals INTEGER,
    converted_referrals INTEGER,
    total_discount_earned NUMERIC,
    total_points_earned INTEGER,
    referral_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(r.id)::INTEGER as total_referrals,
        COUNT(CASE WHEN r.status IN ('pending', 'trial_started') THEN 1 END)::INTEGER as pending_referrals,
        COUNT(CASE WHEN r.status = 'converted' THEN 1 END)::INTEGER as converted_referrals,
        COALESCE(SUM(CASE WHEN r.status = 'converted' THEN r.referrer_discount_percent ELSE 0 END), 0)::NUMERIC as total_discount_earned,
        COALESCE(SUM(CASE WHEN r.referrer_points_issued THEN r.referrer_points_amount ELSE 0 END), 0)::INTEGER as total_points_earned,
        (SELECT rc.code FROM referral_codes rc WHERE rc.tenant_id = p_tenant_id AND rc.is_active = true LIMIT 1) as referral_code
    FROM referrals r
    WHERE r.referrer_tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Referral leaderboard (top referrers)
CREATE OR REPLACE VIEW public.referral_leaderboard AS
SELECT
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(r.id) as total_referrals,
    COUNT(CASE WHEN r.status = 'converted' THEN 1 END) as converted_referrals,
    COALESCE(t.referral_discount_percent, 0) as current_discount,
    rc.code as referral_code
FROM tenants t
LEFT JOIN referrals r ON r.referrer_tenant_id = t.id
LEFT JOIN referral_codes rc ON rc.tenant_id = t.id AND rc.is_active = true
WHERE t.is_active = true
GROUP BY t.id, t.name, t.referral_discount_percent, rc.code
ORDER BY converted_referrals DESC, total_referrals DESC;

COMMENT ON VIEW public.referral_leaderboard IS 'Top referrers by conversion count';
