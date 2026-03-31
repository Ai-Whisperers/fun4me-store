-- =============================================================================
-- 02_EXPENSES.SQL
-- =============================================================================
-- Expense tracking and loyalty points system.
--
-- DEPENDENCIES: 10_core/*, 50_finance/01_invoicing.sql
-- =============================================================================

-- =============================================================================
-- EXPENSES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Expense details
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'PYG',

    -- Categorization
    category TEXT NOT NULL
        CHECK (category IN (
            'supplies', 'utilities', 'payroll', 'rent', 'equipment',
            'marketing', 'insurance', 'taxes', 'travel', 'maintenance',
            'professional_services', 'training', 'other'
        )),
    subcategory TEXT,

    -- Dates
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_date DATE,

    -- Payment
    payment_method TEXT,
    reference_number TEXT,
    vendor_name TEXT,

    -- Documentation
    receipt_url TEXT,
    notes TEXT,

    -- Approval workflow
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),

    -- Created by
    created_by UUID REFERENCES public.profiles(id),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.expenses IS 'Clinic operating expenses for financial tracking and tax purposes';
COMMENT ON COLUMN public.expenses.category IS 'Expense category: supplies, utilities, payroll, rent, equipment, marketing, insurance, taxes, travel, maintenance, professional_services, training, other';
COMMENT ON COLUMN public.expenses.status IS 'Approval workflow: pending → approved → paid, or rejected';
COMMENT ON COLUMN public.expenses.receipt_url IS 'URL to uploaded receipt image for documentation';
COMMENT ON COLUMN public.expenses.approved_by IS 'Staff member who approved the expense';

-- =============================================================================
-- EXPENSE CATEGORIES (Custom per tenant)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Category info
    name TEXT NOT NULL,
    code TEXT,
    parent_id UUID REFERENCES public.expense_categories(id),

    -- Settings
    budget_monthly NUMERIC(12,2),
    is_active BOOLEAN DEFAULT true,

    -- Display
    display_order INTEGER DEFAULT 100,
    icon TEXT,
    color TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, name)
);

COMMENT ON TABLE public.expense_categories IS 'Custom expense categories per tenant with optional monthly budgets';
COMMENT ON COLUMN public.expense_categories.parent_id IS 'Parent category for hierarchical organization';
COMMENT ON COLUMN public.expense_categories.budget_monthly IS 'Monthly budget limit for this category';

-- =============================================================================
-- LOYALTY POINTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    client_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Points balance
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER DEFAULT 0,
    lifetime_redeemed INTEGER DEFAULT 0,

    -- Tier
    tier TEXT DEFAULT 'bronze'
        CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, client_id)
);

COMMENT ON TABLE public.loyalty_points IS 'Client loyalty point balances with tier status. Auto-updated via triggers.';
COMMENT ON COLUMN public.loyalty_points.balance IS 'Current available points balance';
COMMENT ON COLUMN public.loyalty_points.lifetime_earned IS 'Total points earned all-time (used for tier calculation)';
COMMENT ON COLUMN public.loyalty_points.tier IS 'Loyalty tier: bronze (0-499), silver (500-1999), gold (2000-4999), platinum (5000+)';

-- =============================================================================
-- LOYALTY TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    client_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Transaction
    type TEXT NOT NULL
        CHECK (type IN ('earn', 'redeem', 'expire', 'adjust', 'bonus')),
    points INTEGER NOT NULL,
    description TEXT,

    -- Reference
    invoice_id UUID REFERENCES public.invoices(id),
    order_id UUID,  -- FK to store orders

    -- Balance after
    balance_after INTEGER,

    -- Expiration
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.loyalty_transactions IS 'Point transaction history: earn, redeem, expire, adjust, bonus';
COMMENT ON COLUMN public.loyalty_transactions.type IS 'Transaction type: earn (purchase), redeem (use points), expire (time-based), adjust (manual), bonus (promotion)';
COMMENT ON COLUMN public.loyalty_transactions.balance_after IS 'Point balance after this transaction (auto-set by trigger)';
COMMENT ON COLUMN public.loyalty_transactions.expires_at IS 'When earned points expire (if applicable)';

-- =============================================================================
-- LOYALTY RULES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Rule info
    name TEXT NOT NULL,
    description TEXT,

    -- Earning rules
    points_per_currency NUMERIC(10,4) DEFAULT 0.01,  -- Points per unit of currency spent
    min_purchase_amount NUMERIC(12,2) DEFAULT 0,
    max_points_per_transaction INTEGER,

    -- Multipliers
    service_category_multipliers JSONB DEFAULT '{}',
    -- Structure: {"vaccination": 2.0, "grooming": 1.5}

    tier_multipliers JSONB DEFAULT '{"bronze": 1.0, "silver": 1.25, "gold": 1.5, "platinum": 2.0}',

    -- Redemption
    points_value NUMERIC(10,4) DEFAULT 100,  -- Points per currency unit redemption
    min_points_to_redeem INTEGER DEFAULT 100,
    max_redemption_percentage NUMERIC(5,2) DEFAULT 50,  -- Max % of invoice

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.loyalty_rules IS 'Configuration for loyalty program: earning rates, tier multipliers, redemption rules';
COMMENT ON COLUMN public.loyalty_rules.points_per_currency IS 'Points earned per currency unit spent (e.g., 0.01 = 1 point per 100 PYG)';
COMMENT ON COLUMN public.loyalty_rules.tier_multipliers IS 'JSON object with tier multipliers: {"bronze": 1.0, "silver": 1.25, "gold": 1.5, "platinum": 2.0}';
COMMENT ON COLUMN public.loyalty_rules.points_value IS 'Currency value per point when redeeming (e.g., 100 = 100 PYG per point)';
COMMENT ON COLUMN public.loyalty_rules.max_redemption_percentage IS 'Maximum percentage of invoice that can be paid with points';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rules ENABLE ROW LEVEL SECURITY;

-- Expenses: Staff only
DROP POLICY IF EXISTS "Staff manage expenses" ON public.expenses;
CREATE POLICY "Staff manage expenses" ON public.expenses
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access expenses" ON public.expenses;
CREATE POLICY "Service role full access expenses" ON public.expenses
    FOR ALL TO service_role USING (true);

-- Expense categories: Staff only
DROP POLICY IF EXISTS "Staff manage expense categories" ON public.expense_categories;
CREATE POLICY "Staff manage expense categories" ON public.expense_categories
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access expense categories" ON public.expense_categories;
CREATE POLICY "Service role full access expense categories" ON public.expense_categories
    FOR ALL TO service_role USING (true);

-- Loyalty points: Staff manage, clients view own
DROP POLICY IF EXISTS "Staff manage loyalty points" ON public.loyalty_points;
CREATE POLICY "Staff manage loyalty points" ON public.loyalty_points
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own points" ON public.loyalty_points;
CREATE POLICY "Clients view own points" ON public.loyalty_points
    FOR SELECT TO authenticated
    USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access loyalty points" ON public.loyalty_points;
CREATE POLICY "Service role full access loyalty points" ON public.loyalty_points
    FOR ALL TO service_role USING (true);

-- Loyalty transactions: Staff manage, clients view own
DROP POLICY IF EXISTS "Staff manage loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Staff manage loyalty transactions" ON public.loyalty_transactions
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Clients view own transactions" ON public.loyalty_transactions;
CREATE POLICY "Clients view own transactions" ON public.loyalty_transactions
    FOR SELECT TO authenticated
    USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Service role full access loyalty transactions" ON public.loyalty_transactions
    FOR ALL TO service_role USING (true);

-- Loyalty rules: Staff only
DROP POLICY IF EXISTS "Staff manage loyalty rules" ON public.loyalty_rules;
CREATE POLICY "Staff manage loyalty rules" ON public.loyalty_rules
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access loyalty rules" ON public.loyalty_rules;
CREATE POLICY "Service role full access loyalty rules" ON public.loyalty_rules
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date_brin ON public.expenses
    USING BRIN(expense_date) WITH (pages_per_range = 32);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status)
    WHERE deleted_at IS NULL;

-- Covering index for expense report
CREATE INDEX IF NOT EXISTS idx_expenses_report ON public.expenses(tenant_id, expense_date)
    INCLUDE (category, amount, status, vendor_name)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant ON public.expense_categories(tenant_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_tenant ON public.loyalty_points(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_client ON public.loyalty_points(client_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant ON public.loyalty_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_client ON public.loyalty_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_date_brin ON public.loyalty_transactions
    USING BRIN(created_at) WITH (pages_per_range = 32);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON public.loyalty_transactions(type);

CREATE INDEX IF NOT EXISTS idx_loyalty_rules_tenant ON public.loyalty_rules(tenant_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.expenses;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.loyalty_points;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.loyalty_points
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.loyalty_rules;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.loyalty_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Calculate loyalty tier based on lifetime points earned
-- Tier thresholds (configurable per tenant in future):
--   Bronze:   0 - 499 points
--   Silver:   500 - 1999 points
--   Gold:     2000 - 4999 points
--   Platinum: 5000+ points
CREATE OR REPLACE FUNCTION public.calculate_loyalty_tier(p_lifetime_earned INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN p_lifetime_earned >= 5000 THEN 'platinum'
        WHEN p_lifetime_earned >= 2000 THEN 'gold'
        WHEN p_lifetime_earned >= 500 THEN 'silver'
        ELSE 'bronze'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_loyalty_tier IS 'Calculate loyalty tier based on lifetime points earned';

-- Update loyalty balance on transaction
CREATE OR REPLACE FUNCTION public.update_loyalty_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_new_balance INTEGER;
    v_new_lifetime_earned INTEGER;
    v_new_tier TEXT;
BEGIN
    -- Calculate new balance
    SELECT COALESCE(SUM(
        CASE
            WHEN type IN ('earn', 'bonus', 'adjust') THEN points
            WHEN type IN ('redeem', 'expire') THEN -ABS(points)
            ELSE 0
        END
    ), 0)
    INTO v_new_balance
    FROM public.loyalty_transactions
    WHERE client_id = NEW.client_id
      AND tenant_id = NEW.tenant_id;

    -- Ensure non-negative
    v_new_balance := GREATEST(0, v_new_balance);

    -- Calculate new lifetime earned for tier calculation
    SELECT COALESCE(lifetime_earned, 0) +
           CASE WHEN NEW.type IN ('earn', 'bonus') THEN NEW.points ELSE 0 END
    INTO v_new_lifetime_earned
    FROM public.loyalty_points
    WHERE tenant_id = NEW.tenant_id AND client_id = NEW.client_id;

    -- Default for new clients
    IF v_new_lifetime_earned IS NULL THEN
        v_new_lifetime_earned := CASE WHEN NEW.type IN ('earn', 'bonus') THEN NEW.points ELSE 0 END;
    END IF;

    -- Calculate tier based on new lifetime total
    v_new_tier := public.calculate_loyalty_tier(v_new_lifetime_earned);

    -- Update or insert loyalty points with auto-calculated tier
    INSERT INTO public.loyalty_points (tenant_id, client_id, balance, lifetime_earned, lifetime_redeemed, tier)
    VALUES (
        NEW.tenant_id,
        NEW.client_id,
        v_new_balance,
        CASE WHEN NEW.type IN ('earn', 'bonus') THEN NEW.points ELSE 0 END,
        CASE WHEN NEW.type = 'redeem' THEN ABS(NEW.points) ELSE 0 END,
        v_new_tier
    )
    ON CONFLICT (tenant_id, client_id) DO UPDATE SET
        balance = v_new_balance,
        lifetime_earned = public.loyalty_points.lifetime_earned +
            CASE WHEN NEW.type IN ('earn', 'bonus') THEN NEW.points ELSE 0 END,
        lifetime_redeemed = public.loyalty_points.lifetime_redeemed +
            CASE WHEN NEW.type = 'redeem' THEN ABS(NEW.points) ELSE 0 END,
        tier = v_new_tier,
        updated_at = NOW();

    -- Set balance_after on the transaction
    NEW.balance_after := v_new_balance;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loyalty_transaction_update_balance ON public.loyalty_transactions;
CREATE TRIGGER loyalty_transaction_update_balance
    BEFORE INSERT ON public.loyalty_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_loyalty_balance();

-- Calculate points for purchase
CREATE OR REPLACE FUNCTION public.calculate_loyalty_points(
    p_tenant_id TEXT,
    p_amount NUMERIC,
    p_client_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_rule public.loyalty_rules%ROWTYPE;
    v_loyalty public.loyalty_points%ROWTYPE;
    v_base_points INTEGER;
    v_multiplier NUMERIC;
BEGIN
    -- Get active rule
    SELECT * INTO v_rule
    FROM public.loyalty_rules
    WHERE tenant_id = p_tenant_id AND is_active = true
    LIMIT 1;

    IF v_rule IS NULL THEN
        RETURN 0;
    END IF;

    -- Check minimum purchase
    IF p_amount < v_rule.min_purchase_amount THEN
        RETURN 0;
    END IF;

    -- Calculate base points
    v_base_points := FLOOR(p_amount * v_rule.points_per_currency);

    -- Apply tier multiplier
    SELECT * INTO v_loyalty
    FROM public.loyalty_points
    WHERE tenant_id = p_tenant_id AND client_id = p_client_id;

    IF v_loyalty IS NOT NULL AND v_rule.tier_multipliers IS NOT NULL THEN
        v_multiplier := COALESCE(
            (v_rule.tier_multipliers->>v_loyalty.tier)::NUMERIC,
            1.0
        );
        v_base_points := FLOOR(v_base_points * v_multiplier);
    END IF;

    -- Apply max points limit
    IF v_rule.max_points_per_transaction IS NOT NULL THEN
        v_base_points := LEAST(v_base_points, v_rule.max_points_per_transaction);
    END IF;

    RETURN v_base_points;
END;
$$ LANGUAGE plpgsql;

-- Get expense summary
CREATE OR REPLACE FUNCTION public.get_expense_summary(
    p_tenant_id TEXT,
    p_start_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    category TEXT,
    total_amount NUMERIC,
    transaction_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.category,
        SUM(e.amount)::NUMERIC,
        COUNT(*)::INTEGER
    FROM public.expenses e
    WHERE e.tenant_id = p_tenant_id
      AND e.expense_date BETWEEN p_start_date AND p_end_date
      AND e.status != 'rejected'
      AND e.deleted_at IS NULL
    GROUP BY e.category
    ORDER BY SUM(e.amount) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

