-- Migration: 061_ambassador_program.sql
-- Description: Ambassador program for student/assistant referrers
--
-- Ambassadors are individuals (not clinics) who refer clinics in exchange for:
-- - Lifetime Professional plan access
-- - Cash commission per converted referral (30-50% based on tier)
--
-- Tiers:
-- - embajador: 1+ referral, 30% commission
-- - promotor: 5+ referrals, 40% commission + Gs 50K bonus
-- - super: 10+ referrals, 50% commission + priority features

-- =============================================================================
-- AMBASSADORS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ambassadors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Personal info
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,

    -- Authentication (can login to ambassador portal)
    user_id UUID REFERENCES auth.users(id),

    -- Ambassador details
    type TEXT NOT NULL DEFAULT 'student' CHECK (type IN ('student', 'assistant', 'teacher', 'other')),
    university TEXT,
    institution TEXT,

    -- Program status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
    tier TEXT NOT NULL DEFAULT 'embajador' CHECK (tier IN ('embajador', 'promotor', 'super')),

    -- Referral tracking
    referral_code TEXT NOT NULL UNIQUE,
    referrals_count INTEGER NOT NULL DEFAULT 0,
    conversions_count INTEGER NOT NULL DEFAULT 0,

    -- Commission tracking (in Guaraníes)
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 30.00,  -- 30% default
    total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    pending_payout NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Bank details for payouts
    bank_name TEXT,
    bank_account TEXT,
    bank_holder_name TEXT,

    -- Metadata
    notes TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ambassadors IS 'Individual ambassadors who refer clinics for cash commission';
COMMENT ON COLUMN public.ambassadors.tier IS 'embajador=1+ referrals 30%, promotor=5+ 40%, super=10+ 50%';
COMMENT ON COLUMN public.ambassadors.commission_rate IS 'Commission percentage on first year subscription';

-- =============================================================================
-- AMBASSADOR REFERRALS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ambassador_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ambassador_id UUID NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'trial_started', 'converted', 'expired', 'cancelled')),

    -- Timeline
    referred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_started_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,

    -- Commission details (calculated on conversion)
    subscription_amount NUMERIC(12,2),  -- First year subscription amount
    commission_rate NUMERIC(5,2),       -- Rate at time of conversion
    commission_amount NUMERIC(12,2),    -- Actual commission earned

    -- Payout status
    payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'scheduled', 'paid')),
    payout_id UUID,
    paid_at TIMESTAMPTZ,

    -- Attribution
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id)  -- Each clinic can only be referred by one ambassador
);

COMMENT ON TABLE public.ambassador_referrals IS 'Tracks clinics referred by ambassadors';

-- =============================================================================
-- AMBASSADOR PAYOUTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ambassador_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ambassador_id UUID NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,

    -- Payout details
    amount NUMERIC(12,2) NOT NULL,
    referral_ids UUID[] NOT NULL,  -- Array of ambassador_referral IDs included

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed')),

    -- Bank transfer details
    bank_name TEXT,
    bank_account TEXT,
    bank_holder_name TEXT,
    transfer_reference TEXT,

    -- Processing
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Notes
    notes TEXT,
    failure_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ambassador_payouts IS 'Payment records for ambassador commissions';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_payouts ENABLE ROW LEVEL SECURITY;

-- Ambassadors can view their own record
CREATE POLICY "Ambassador view own" ON public.ambassadors
    FOR SELECT USING (user_id = auth.uid());

-- Ambassadors can update their own profile (limited fields)
CREATE POLICY "Ambassador update own" ON public.ambassadors
    FOR UPDATE USING (user_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access ambassadors" ON public.ambassadors
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Ambassador referrals
CREATE POLICY "Ambassador view own referrals" ON public.ambassador_referrals
    FOR SELECT USING (
        ambassador_id IN (SELECT id FROM ambassadors WHERE user_id = auth.uid())
    );

CREATE POLICY "Service role full access ambassador_referrals" ON public.ambassador_referrals
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Ambassador payouts
CREATE POLICY "Ambassador view own payouts" ON public.ambassador_payouts
    FOR SELECT USING (
        ambassador_id IN (SELECT id FROM ambassadors WHERE user_id = auth.uid())
    );

CREATE POLICY "Service role full access ambassador_payouts" ON public.ambassador_payouts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_ambassadors_email ON public.ambassadors(email);
CREATE INDEX IF NOT EXISTS idx_ambassadors_user ON public.ambassadors(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ambassadors_code ON public.ambassadors(referral_code);
CREATE INDEX IF NOT EXISTS idx_ambassadors_status ON public.ambassadors(status);
CREATE INDEX IF NOT EXISTS idx_ambassadors_tier ON public.ambassadors(tier);

CREATE INDEX IF NOT EXISTS idx_ambassador_referrals_ambassador ON public.ambassador_referrals(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_referrals_tenant ON public.ambassador_referrals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_referrals_status ON public.ambassador_referrals(status);
CREATE INDEX IF NOT EXISTS idx_ambassador_referrals_converted ON public.ambassador_referrals(ambassador_id, converted_at)
    WHERE status = 'converted';

CREATE INDEX IF NOT EXISTS idx_ambassador_payouts_ambassador ON public.ambassador_payouts(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_payouts_status ON public.ambassador_payouts(status);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.ambassadors
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.ambassador_referrals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.ambassador_payouts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate unique ambassador referral code
CREATE OR REPLACE FUNCTION generate_ambassador_code(p_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_base_code TEXT;
    v_code TEXT;
    v_suffix INTEGER := 1;
BEGIN
    -- Create base code (first 4 chars of name + random 4 digits)
    v_base_code := UPPER(LEFT(REGEXP_REPLACE(p_name, '[^A-Za-z]', '', 'g'), 4));
    v_code := v_base_code || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM ambassadors WHERE referral_code = v_code) LOOP
        v_code := v_base_code || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END LOOP;

    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Update ambassador tier based on conversions
CREATE OR REPLACE FUNCTION update_ambassador_tier()
RETURNS TRIGGER AS $$
DECLARE
    v_conversions INTEGER;
    v_new_tier TEXT;
    v_new_rate NUMERIC;
BEGIN
    -- Count conversions
    SELECT conversions_count INTO v_conversions FROM ambassadors WHERE id = NEW.ambassador_id;

    -- Determine tier
    IF v_conversions >= 10 THEN
        v_new_tier := 'super';
        v_new_rate := 50.00;
    ELSIF v_conversions >= 5 THEN
        v_new_tier := 'promotor';
        v_new_rate := 40.00;
    ELSE
        v_new_tier := 'embajador';
        v_new_rate := 30.00;
    END IF;

    -- Update ambassador
    UPDATE ambassadors
    SET tier = v_new_tier, commission_rate = v_new_rate, updated_at = NOW()
    WHERE id = NEW.ambassador_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update tier on conversion
CREATE TRIGGER update_tier_on_conversion
    AFTER UPDATE OF status ON public.ambassador_referrals
    FOR EACH ROW
    WHEN (NEW.status = 'converted' AND OLD.status != 'converted')
    EXECUTE FUNCTION update_ambassador_tier();

-- Process ambassador referral (called when clinic signs up with ambassador code)
CREATE OR REPLACE FUNCTION process_ambassador_referral(
    p_ambassador_code TEXT,
    p_tenant_id TEXT,
    p_utm_source TEXT DEFAULT NULL,
    p_utm_medium TEXT DEFAULT NULL,
    p_utm_campaign TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_ambassador RECORD;
    v_referral_id UUID;
BEGIN
    -- Find ambassador by code
    SELECT * INTO v_ambassador
    FROM ambassadors
    WHERE referral_code = UPPER(p_ambassador_code)
    AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or inactive ambassador code';
    END IF;

    -- Check if tenant already referred
    IF EXISTS (SELECT 1 FROM ambassador_referrals WHERE tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'This clinic has already been referred';
    END IF;

    -- Create referral record
    INSERT INTO ambassador_referrals (
        ambassador_id,
        tenant_id,
        status,
        utm_source,
        utm_medium,
        utm_campaign
    ) VALUES (
        v_ambassador.id,
        p_tenant_id,
        'pending',
        p_utm_source,
        p_utm_medium,
        p_utm_campaign
    ) RETURNING id INTO v_referral_id;

    -- Update ambassador's referral count
    UPDATE ambassadors
    SET referrals_count = referrals_count + 1, updated_at = NOW()
    WHERE id = v_ambassador.id;

    -- Mark tenant as referred by ambassador
    UPDATE tenants
    SET
        referred_by_ambassador_id = v_ambassador.id,
        updated_at = NOW()
    WHERE id = p_tenant_id;

    RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql;

-- Convert ambassador referral (called when clinic becomes paying)
CREATE OR REPLACE FUNCTION convert_ambassador_referral(
    p_referral_id UUID,
    p_subscription_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
    v_referral RECORD;
    v_commission NUMERIC;
BEGIN
    -- Get referral details
    SELECT ar.*, a.commission_rate
    INTO v_referral
    FROM ambassador_referrals ar
    JOIN ambassadors a ON a.id = ar.ambassador_id
    WHERE ar.id = p_referral_id
    AND ar.status IN ('pending', 'trial_started');

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Calculate commission
    v_commission := p_subscription_amount * (v_referral.commission_rate / 100);

    -- Update referral
    UPDATE ambassador_referrals
    SET
        status = 'converted',
        converted_at = NOW(),
        subscription_amount = p_subscription_amount,
        commission_rate = v_referral.commission_rate,
        commission_amount = v_commission,
        updated_at = NOW()
    WHERE id = p_referral_id;

    -- Update ambassador stats
    UPDATE ambassadors
    SET
        conversions_count = conversions_count + 1,
        total_earned = total_earned + v_commission,
        pending_payout = pending_payout + v_commission,
        updated_at = NOW()
    WHERE id = v_referral.ambassador_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Get ambassador statistics
CREATE OR REPLACE FUNCTION get_ambassador_stats(p_ambassador_id UUID)
RETURNS TABLE (
    total_referrals INTEGER,
    pending_referrals INTEGER,
    converted_referrals INTEGER,
    total_earned NUMERIC,
    pending_payout NUMERIC,
    tier TEXT,
    commission_rate NUMERIC,
    next_tier TEXT,
    referrals_to_next_tier INTEGER
) AS $$
DECLARE
    v_ambassador RECORD;
    v_next_tier TEXT;
    v_to_next INTEGER;
BEGIN
    SELECT * INTO v_ambassador FROM ambassadors WHERE id = p_ambassador_id;

    -- Calculate next tier
    IF v_ambassador.conversions_count < 5 THEN
        v_next_tier := 'promotor';
        v_to_next := 5 - v_ambassador.conversions_count;
    ELSIF v_ambassador.conversions_count < 10 THEN
        v_next_tier := 'super';
        v_to_next := 10 - v_ambassador.conversions_count;
    ELSE
        v_next_tier := NULL;
        v_to_next := 0;
    END IF;

    RETURN QUERY
    SELECT
        v_ambassador.referrals_count as total_referrals,
        (SELECT COUNT(*)::INTEGER FROM ambassador_referrals ar WHERE ar.ambassador_id = p_ambassador_id AND ar.status IN ('pending', 'trial_started')) as pending_referrals,
        v_ambassador.conversions_count as converted_referrals,
        v_ambassador.total_earned,
        v_ambassador.pending_payout,
        v_ambassador.tier,
        v_ambassador.commission_rate,
        v_next_tier as next_tier,
        v_to_next as referrals_to_next_tier;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- ADD REFERENCE TO TENANTS
-- =============================================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS referred_by_ambassador_id UUID REFERENCES public.ambassadors(id);

COMMENT ON COLUMN public.tenants.referred_by_ambassador_id IS 'Ambassador who referred this clinic';

CREATE INDEX IF NOT EXISTS idx_tenants_ambassador ON public.tenants(referred_by_ambassador_id)
    WHERE referred_by_ambassador_id IS NOT NULL;
