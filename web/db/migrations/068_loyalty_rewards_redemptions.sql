-- =============================================================================
-- 068_LOYALTY_REWARDS_REDEMPTIONS.SQL
-- =============================================================================
-- Creates loyalty rewards catalog and redemption tracking tables.
-- These tables are required by the redeem_loyalty_reward function (041).
--
-- FEAT-022: Loyalty Points Redemption System
-- Created: January 2026
-- =============================================================================

-- =============================================================================
-- LOYALTY REWARDS CATALOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Reward info
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN (
        'discount', 'service', 'product', 'experience', 'general'
    )),

    -- Cost and value
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    reward_type TEXT NOT NULL DEFAULT 'discount_percentage' CHECK (reward_type IN (
        'discount_percentage', 'discount_fixed', 'free_service', 'free_product', 'custom'
    )),
    reward_value DECIMAL(10,2),  -- Percentage or fixed amount

    -- Applicability
    applicable_to TEXT DEFAULT 'all' CHECK (applicable_to IN ('all', 'services', 'products')),
    applicable_item_ids UUID[],  -- Specific service/product IDs if limited

    -- Stock and limits
    stock INTEGER,  -- NULL = unlimited
    max_per_user INTEGER,  -- NULL = unlimited

    -- Validity period
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    -- Image
    image_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_rewards_tenant ON public.loyalty_rewards(tenant_id);
CREATE INDEX idx_loyalty_rewards_active ON public.loyalty_rewards(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_loyalty_rewards_category ON public.loyalty_rewards(tenant_id, category);
CREATE INDEX idx_loyalty_rewards_points ON public.loyalty_rewards(points_cost);

COMMENT ON TABLE public.loyalty_rewards IS 'Catalog of rewards that can be redeemed with loyalty points';
COMMENT ON COLUMN public.loyalty_rewards.points_cost IS 'Number of points required to redeem this reward';
COMMENT ON COLUMN public.loyalty_rewards.reward_type IS 'Type: discount_percentage, discount_fixed, free_service, free_product, custom';
COMMENT ON COLUMN public.loyalty_rewards.stock IS 'Available quantity, NULL for unlimited';
COMMENT ON COLUMN public.loyalty_rewards.max_per_user IS 'Maximum redemptions per user, NULL for unlimited';

-- =============================================================================
-- LOYALTY REDEMPTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,

    -- Redemption details
    points_spent INTEGER NOT NULL CHECK (points_spent > 0),
    redemption_code TEXT UNIQUE NOT NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN (
        'pending', 'approved', 'used', 'expired', 'cancelled'
    )),

    -- Usage tracking
    used_at TIMESTAMPTZ,
    used_on_invoice_id UUID REFERENCES public.invoices(id),
    used_on_order_id UUID,
    discount_applied DECIMAL(10,2),

    -- Validity
    expires_at TIMESTAMPTZ NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_redemptions_tenant ON public.loyalty_redemptions(tenant_id);
CREATE INDEX idx_loyalty_redemptions_user ON public.loyalty_redemptions(user_id);
CREATE INDEX idx_loyalty_redemptions_reward ON public.loyalty_redemptions(reward_id);
CREATE INDEX idx_loyalty_redemptions_code ON public.loyalty_redemptions(redemption_code);
CREATE INDEX idx_loyalty_redemptions_status ON public.loyalty_redemptions(tenant_id, status);
CREATE INDEX idx_loyalty_redemptions_expires ON public.loyalty_redemptions(expires_at) WHERE status IN ('pending', 'approved');

COMMENT ON TABLE public.loyalty_redemptions IS 'Tracks all reward redemptions with status and usage';
COMMENT ON COLUMN public.loyalty_redemptions.redemption_code IS 'Unique code shown to user and used at POS';
COMMENT ON COLUMN public.loyalty_redemptions.status IS 'pending, approved (ready to use), used, expired, cancelled';
COMMENT ON COLUMN public.loyalty_redemptions.expires_at IS 'When the redemption code expires if not used';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Rewards: Staff can manage, customers can view active
DROP POLICY IF EXISTS "Staff manage loyalty rewards" ON public.loyalty_rewards;
CREATE POLICY "Staff manage loyalty rewards" ON public.loyalty_rewards
    FOR ALL USING (is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Customers view active rewards" ON public.loyalty_rewards;
CREATE POLICY "Customers view active rewards" ON public.loyalty_rewards
    FOR SELECT USING (
        is_active = true
        AND tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Redemptions: Staff can manage all, customers can view/manage own
DROP POLICY IF EXISTS "Staff manage loyalty redemptions" ON public.loyalty_redemptions;
CREATE POLICY "Staff manage loyalty redemptions" ON public.loyalty_redemptions
    FOR ALL USING (is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Customers view own redemptions" ON public.loyalty_redemptions;
CREATE POLICY "Customers view own redemptions" ON public.loyalty_redemptions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers create redemptions" ON public.loyalty_redemptions;
CREATE POLICY "Customers create redemptions" ON public.loyalty_redemptions
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger for rewards
CREATE TRIGGER handle_loyalty_rewards_updated_at
    BEFORE UPDATE ON public.loyalty_rewards
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Generate unique redemption code
CREATE OR REPLACE FUNCTION generate_redemption_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

        -- Check uniqueness
        SELECT EXISTS(
            SELECT 1 FROM loyalty_redemptions WHERE redemption_code = v_code
        ) INTO v_exists;

        EXIT WHEN NOT v_exists;
    END LOOP;

    RETURN v_code;
END;
$$;

-- Get user's available points (across all their pets)
CREATE OR REPLACE FUNCTION get_user_loyalty_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT COALESCE(SUM(lt.points), 0) INTO v_balance
    FROM loyalty_transactions lt
    JOIN pets p ON lt.pet_id = p.id
    WHERE p.owner_id = p_user_id;

    RETURN v_balance;
END;
$$;

-- Check if user can afford a reward
CREATE OR REPLACE FUNCTION can_afford_reward(p_user_id UUID, p_reward_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_balance INTEGER;
    v_cost INTEGER;
BEGIN
    v_balance := get_user_loyalty_balance(p_user_id);

    SELECT points_cost INTO v_cost
    FROM loyalty_rewards
    WHERE id = p_reward_id AND is_active = true;

    IF v_cost IS NULL THEN
        RETURN false;
    END IF;

    RETURN v_balance >= v_cost;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_redemption_code() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_loyalty_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_afford_reward(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION generate_redemption_code IS 'Generates unique 8-character redemption codes';
COMMENT ON FUNCTION get_user_loyalty_balance IS 'Gets total loyalty points across all user pets';
COMMENT ON FUNCTION can_afford_reward IS 'Checks if user has enough points for a reward';
