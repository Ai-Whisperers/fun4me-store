-- =============================================================================
-- STORE COMMISSIONS - E-Commerce Commission Tracking
-- =============================================================================
-- Migration: 20260105210000_store_commissions.sql
--
-- Tracks commissions on e-commerce sales that clinics owe to Vetic platform.
-- Commission Rates:
--   - Initial (first 6 months): 3%
--   - Standard (after 6 months): 5%
--   - Enterprise (negotiated): 2%
-- =============================================================================

-- =============================================================================
-- STEP 1: Add ecommerce columns to tenants table
-- =============================================================================

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS ecommerce_start_date DATE;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS commission_tier TEXT
CHECK (commission_tier IS NULL OR commission_tier IN ('initial', 'standard', 'enterprise'));

COMMENT ON COLUMN public.tenants.ecommerce_start_date IS 'Date when clinic enabled e-commerce, used for commission rate calculation';
COMMENT ON COLUMN public.tenants.commission_tier IS 'Commission tier override: initial (3%), standard (5%), enterprise (2% negotiated)';

-- =============================================================================
-- STEP 2: Create commission invoices table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_commission_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_gmv NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_commission NUMERIC(14,2) NOT NULL DEFAULT 0,
    adjustments NUMERIC(14,2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(14,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'waived')),
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    paid_amount NUMERIC(14,2),
    payment_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_commission_invoice_number UNIQUE (invoice_number),
    CONSTRAINT unique_commission_tenant_period UNIQUE (tenant_id, period_start, period_end)
);

-- =============================================================================
-- STEP 3: Create commissions table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_total NUMERIC(14,2) NOT NULL,
    shipping_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    commissionable_amount NUMERIC(14,2) NOT NULL,
    commission_rate NUMERIC(5,4) NOT NULL,
    commission_amount NUMERIC(14,2) NOT NULL,
    rate_type TEXT NOT NULL CHECK (rate_type IN ('initial', 'standard', 'enterprise')),
    months_active INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'calculated'
        CHECK (status IN ('calculated', 'invoiced', 'paid', 'waived', 'adjusted')),
    original_commission NUMERIC(14,2),
    refund_amount NUMERIC(14,2) DEFAULT 0,
    refund_date TIMESTAMPTZ,
    refund_reason TEXT,
    adjustment_amount NUMERIC(14,2) DEFAULT 0,
    adjustment_reason TEXT,
    adjusted_by UUID REFERENCES auth.users(id),
    adjusted_at TIMESTAMPTZ,
    invoice_id UUID REFERENCES public.store_commission_invoices(id),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_order_commission UNIQUE (order_id)
);

-- =============================================================================
-- STEP 4: Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_commission_invoices_tenant ON public.store_commission_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_invoices_status ON public.store_commission_invoices(status);
CREATE INDEX IF NOT EXISTS idx_commission_invoices_period ON public.store_commission_invoices(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_commission_invoices_due_date ON public.store_commission_invoices(due_date) WHERE status IN ('sent', 'overdue');
CREATE INDEX IF NOT EXISTS idx_store_commissions_tenant ON public.store_commissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_commissions_status ON public.store_commissions(status);
CREATE INDEX IF NOT EXISTS idx_store_commissions_invoice ON public.store_commissions(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_commissions_calculated_at ON public.store_commissions(calculated_at);
CREATE INDEX IF NOT EXISTS idx_store_commissions_pending ON public.store_commissions(tenant_id, calculated_at) WHERE status = 'calculated';

-- =============================================================================
-- STEP 5: Row Level Security
-- =============================================================================

ALTER TABLE public.store_commission_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access commission invoices" ON public.store_commission_invoices;
CREATE POLICY "Service role full access commission invoices"
ON public.store_commission_invoices FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access commissions" ON public.store_commissions;
CREATE POLICY "Service role full access commissions"
ON public.store_commissions FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Clinic staff view own invoices" ON public.store_commission_invoices;
CREATE POLICY "Clinic staff view own invoices"
ON public.store_commission_invoices FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Clinic staff view own commissions" ON public.store_commissions;
CREATE POLICY "Clinic staff view own commissions"
ON public.store_commissions FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- =============================================================================
-- STEP 6: Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_commission_invoices;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_commission_invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_commissions;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_commissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- STEP 7: Functions
-- =============================================================================

CREATE OR REPLACE FUNCTION get_commission_rate(p_tenant_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_start_date DATE;
    v_tier TEXT;
    v_months INTEGER;
BEGIN
    SELECT ecommerce_start_date, commission_tier
    INTO v_start_date, v_tier
    FROM tenants WHERE id = p_tenant_id;

    IF v_tier = 'enterprise' THEN RETURN 0.02; END IF;
    IF v_tier = 'standard' THEN RETURN 0.05; END IF;
    IF v_tier = 'initial' THEN RETURN 0.03; END IF;
    IF v_start_date IS NULL THEN RETURN 0.03; END IF;

    v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_start_date)) +
                EXTRACT(YEAR FROM age(CURRENT_DATE, v_start_date)) * 12;

    IF v_months < 6 THEN RETURN 0.03; ELSE RETURN 0.05; END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_commission_rate_type(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_start_date DATE;
    v_tier TEXT;
    v_months INTEGER;
BEGIN
    SELECT ecommerce_start_date, commission_tier
    INTO v_start_date, v_tier
    FROM tenants WHERE id = p_tenant_id;

    IF v_tier IN ('enterprise', 'standard', 'initial') THEN RETURN v_tier; END IF;
    IF v_start_date IS NULL THEN RETURN 'initial'; END IF;

    v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_start_date)) +
                EXTRACT(YEAR FROM age(CURRENT_DATE, v_start_date)) * 12;

    IF v_months < 6 THEN RETURN 'initial'; ELSE RETURN 'standard'; END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION calculate_order_commission(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
    v_order RECORD;
    v_rate NUMERIC;
    v_rate_type TEXT;
    v_months INTEGER;
    v_commissionable NUMERIC;
    v_commission_id UUID;
BEGIN
    SELECT o.id, o.tenant_id, o.total,
           COALESCE(o.shipping_cost, 0) as shipping_cost,
           COALESCE(o.tax_amount, 0) as tax_amount,
           t.ecommerce_start_date, t.commission_tier
    INTO v_order
    FROM store_orders o
    JOIN tenants t ON t.id = o.tenant_id
    WHERE o.id = p_order_id AND o.payment_status = 'paid';

    IF NOT FOUND THEN RETURN NULL; END IF;
    IF EXISTS (SELECT 1 FROM store_commissions WHERE order_id = p_order_id) THEN
        RETURN (SELECT id FROM store_commissions WHERE order_id = p_order_id);
    END IF;

    v_rate := get_commission_rate(v_order.tenant_id);
    v_rate_type := get_commission_rate_type(v_order.tenant_id);

    IF v_order.ecommerce_start_date IS NULL THEN
        v_months := 0;
        UPDATE tenants SET ecommerce_start_date = CURRENT_DATE WHERE id = v_order.tenant_id;
    ELSE
        v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_order.ecommerce_start_date)) +
                    EXTRACT(YEAR FROM age(CURRENT_DATE, v_order.ecommerce_start_date)) * 12;
    END IF;

    v_commissionable := GREATEST(0, v_order.total - v_order.shipping_cost - v_order.tax_amount);

    INSERT INTO store_commissions (
        order_id, tenant_id, order_total, shipping_amount, tax_amount,
        commissionable_amount, commission_rate, commission_amount, rate_type, months_active
    ) VALUES (
        p_order_id, v_order.tenant_id, v_order.total, v_order.shipping_cost, v_order.tax_amount,
        v_commissionable, v_rate, ROUND(v_commissionable * v_rate, 2), v_rate_type, v_months
    ) RETURNING id INTO v_commission_id;

    RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION adjust_commission_for_refund(
    p_order_id UUID,
    p_refund_amount NUMERIC,
    p_reason TEXT DEFAULT 'Order refunded'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_commission RECORD;
    v_refund_ratio NUMERIC;
    v_commission_refund NUMERIC;
BEGIN
    SELECT * INTO v_commission FROM store_commissions WHERE order_id = p_order_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;

    IF v_commission.order_total > 0 THEN
        v_refund_ratio := p_refund_amount / v_commission.order_total;
    ELSE
        v_refund_ratio := 1;
    END IF;

    v_commission_refund := ROUND(v_commission.commission_amount * v_refund_ratio, 2);

    UPDATE store_commissions
    SET original_commission = COALESCE(original_commission, commission_amount),
        commission_amount = commission_amount - v_commission_refund,
        refund_amount = COALESCE(refund_amount, 0) + v_commission_refund,
        refund_date = NOW(),
        refund_reason = p_reason,
        status = CASE WHEN commission_amount - v_commission_refund <= 0 THEN 'adjusted' ELSE status END,
        updated_at = NOW()
    WHERE order_id = p_order_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
