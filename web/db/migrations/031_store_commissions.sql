-- =============================================================================
-- 031_STORE_COMMISSIONS.SQL
-- =============================================================================
-- E-commerce commission tracking for Vetic platform revenue
-- Tracks commissions on store orders, supports rate progression, and invoicing
--
-- Commission Rates:
--   - Initial: 3% (first 6 months)
--   - Standard: 5% (after 6 months)
--   - Enterprise: 2% (negotiated)
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 60_store/orders/01_orders.sql
-- =============================================================================

-- =============================================================================
-- 1. TENANT EXTENSION - Add e-commerce tracking columns
-- =============================================================================

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS ecommerce_start_date DATE;

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS commission_tier TEXT DEFAULT 'standard';

-- Add constraint for commission_tier
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tenants_commission_tier_check'
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_commission_tier_check
            CHECK (commission_tier IN ('initial', 'standard', 'enterprise'));
    END IF;
END $$;

COMMENT ON COLUMN public.tenants.ecommerce_start_date IS 'Date when clinic enabled e-commerce, used for commission rate calculation';
COMMENT ON COLUMN public.tenants.commission_tier IS 'Commission tier override: initial (3%), standard (5%), enterprise (2%)';

-- =============================================================================
-- 1b. STORE ORDERS EXTENSION - Add confirmation tracking columns
-- =============================================================================

ALTER TABLE public.store_orders
    ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.store_orders.confirmed_by IS 'Staff member who confirmed the order payment';

-- =============================================================================
-- 2. COMMISSION INVOICES TABLE (must be created first for FK reference)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_commission_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Invoice details
    invoice_number TEXT NOT NULL UNIQUE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amounts (all in PYG)
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_gmv NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_commission NUMERIC(12,2) NOT NULL DEFAULT 0,
    adjustments NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(12,2) NOT NULL,

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'waived')),

    -- Payment tracking
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    paid_amount NUMERIC(12,2),
    payment_reference TEXT,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_commission_invoices IS 'Monthly commission invoices from Vetic to clinics';
COMMENT ON COLUMN public.store_commission_invoices.invoice_number IS 'Unique invoice number (e.g., COM-2026-001)';
COMMENT ON COLUMN public.store_commission_invoices.total_gmv IS 'Gross Merchandise Value - total order value for the period';
COMMENT ON COLUMN public.store_commission_invoices.amount_due IS 'Final amount = total_commission + adjustments';

-- =============================================================================
-- 3. STORE COMMISSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Order amounts (snapshot at time of calculation)
    order_total NUMERIC(12,2) NOT NULL,
    shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    commissionable_amount NUMERIC(12,2) NOT NULL,

    -- Commission calculation
    commission_rate NUMERIC(5,4) NOT NULL,  -- e.g., 0.0300 = 3%
    commission_amount NUMERIC(12,2) NOT NULL,
    rate_type TEXT NOT NULL CHECK (rate_type IN ('initial', 'standard', 'enterprise')),
    months_active INTEGER NOT NULL DEFAULT 0,

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'calculated'
        CHECK (status IN ('calculated', 'invoiced', 'paid', 'waived', 'adjusted')),

    -- Refund tracking
    original_commission NUMERIC(12,2),
    refund_amount NUMERIC(12,2) DEFAULT 0,
    refund_date TIMESTAMPTZ,
    refund_reason TEXT,

    -- Manual adjustments
    adjustment_amount NUMERIC(12,2) DEFAULT 0,
    adjustment_reason TEXT,
    adjusted_by UUID REFERENCES auth.users(id),
    adjusted_at TIMESTAMPTZ,

    -- Invoice reference (when aggregated into monthly invoice)
    invoice_id UUID REFERENCES public.store_commission_invoices(id),

    -- Timestamps
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One commission record per order
    UNIQUE(order_id)
);

COMMENT ON TABLE public.store_commissions IS 'Commission records for e-commerce orders';
COMMENT ON COLUMN public.store_commissions.commission_rate IS 'Rate as decimal: 0.03 = 3%, 0.05 = 5%';
COMMENT ON COLUMN public.store_commissions.commissionable_amount IS 'order_total - shipping - tax';
COMMENT ON COLUMN public.store_commissions.original_commission IS 'Original commission before any refund adjustments';

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.store_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_commission_invoices ENABLE ROW LEVEL SECURITY;

-- Platform admin role check (staff with platform_admin in their profile)
-- Note: In real implementation, you may have a platform_admins table or role flag

-- Clinic staff can VIEW their own commissions (read-only transparency)
DROP POLICY IF EXISTS "Clinic staff view own commissions" ON public.store_commissions;
CREATE POLICY "Clinic staff view own commissions" ON public.store_commissions
    FOR SELECT USING (is_staff_of(tenant_id));

-- Service role full access (for platform admin operations)
DROP POLICY IF EXISTS "Service role full access commissions" ON public.store_commissions;
CREATE POLICY "Service role full access commissions" ON public.store_commissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Commission invoices - clinic staff view only
DROP POLICY IF EXISTS "Clinic staff view own commission invoices" ON public.store_commission_invoices;
CREATE POLICY "Clinic staff view own commission invoices" ON public.store_commission_invoices
    FOR SELECT USING (is_staff_of(tenant_id));

-- Service role full access for invoices
DROP POLICY IF EXISTS "Service role full access commission invoices" ON public.store_commission_invoices;
CREATE POLICY "Service role full access commission invoices" ON public.store_commission_invoices
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 5. INDEXES
-- =============================================================================

-- Store commissions indexes
CREATE INDEX IF NOT EXISTS idx_store_commissions_tenant
    ON public.store_commissions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_store_commissions_status
    ON public.store_commissions(status);

CREATE INDEX IF NOT EXISTS idx_store_commissions_invoice
    ON public.store_commissions(invoice_id)
    WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_commissions_calculated_at
    ON public.store_commissions(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_commissions_pending
    ON public.store_commissions(tenant_id, calculated_at)
    WHERE status = 'calculated';

-- Commission invoices indexes
CREATE INDEX IF NOT EXISTS idx_commission_invoices_tenant
    ON public.store_commission_invoices(tenant_id);

CREATE INDEX IF NOT EXISTS idx_commission_invoices_status
    ON public.store_commission_invoices(status);

CREATE INDEX IF NOT EXISTS idx_commission_invoices_period
    ON public.store_commission_invoices(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_commission_invoices_due
    ON public.store_commission_invoices(due_date)
    WHERE status IN ('sent', 'overdue');

-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_commissions;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_commissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_commission_invoices;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_commission_invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 7. FUNCTIONS
-- =============================================================================

-- Get commission rate for a tenant based on e-commerce tenure
CREATE OR REPLACE FUNCTION public.get_commission_rate(p_tenant_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_start_date DATE;
    v_tier TEXT;
    v_months INTEGER;
BEGIN
    SELECT ecommerce_start_date, COALESCE(commission_tier, 'standard')
    INTO v_start_date, v_tier
    FROM public.tenants WHERE id = p_tenant_id;

    -- Enterprise tier override (negotiated rate)
    IF v_tier = 'enterprise' THEN
        RETURN 0.02; -- 2%
    END IF;

    -- No start date = new clinic, use initial rate
    IF v_start_date IS NULL THEN
        RETURN 0.03; -- 3%
    END IF;

    -- Calculate months active
    v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_start_date)) +
                EXTRACT(YEAR FROM age(CURRENT_DATE, v_start_date)) * 12;

    -- Initial rate for first 6 months
    IF v_months < 6 THEN
        RETURN 0.03; -- 3%
    ELSE
        RETURN 0.05; -- 5% standard
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_commission_rate IS 'Returns commission rate for tenant: 3% initial (6mo), 5% standard, 2% enterprise';


-- Calculate and record commission for an order
CREATE OR REPLACE FUNCTION public.calculate_order_commission(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
    v_order RECORD;
    v_rate NUMERIC;
    v_rate_type TEXT;
    v_months INTEGER;
    v_commissionable NUMERIC;
    v_commission_id UUID;
BEGIN
    -- Get order details with tenant info
    SELECT
        o.id, o.tenant_id, o.total, o.shipping_cost, o.tax_amount, o.payment_status,
        t.ecommerce_start_date, COALESCE(t.commission_tier, 'standard') as commission_tier
    INTO v_order
    FROM public.store_orders o
    JOIN public.tenants t ON t.id = o.tenant_id
    WHERE o.id = p_order_id AND o.payment_status = 'paid';

    -- Order not found or not paid
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Check if commission already exists
    SELECT id INTO v_commission_id FROM public.store_commissions WHERE order_id = p_order_id;
    IF FOUND THEN
        RETURN v_commission_id;
    END IF;

    -- Get commission rate
    v_rate := public.get_commission_rate(v_order.tenant_id);

    -- Determine rate type and months active
    IF v_order.commission_tier = 'enterprise' THEN
        v_rate_type := 'enterprise';
        v_months := 0;
    ELSIF v_order.ecommerce_start_date IS NULL THEN
        v_rate_type := 'initial';
        v_months := 0;
        -- Set start date on first paid order
        UPDATE public.tenants
        SET ecommerce_start_date = CURRENT_DATE
        WHERE id = v_order.tenant_id AND ecommerce_start_date IS NULL;
    ELSE
        v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_order.ecommerce_start_date)) +
                    EXTRACT(YEAR FROM age(CURRENT_DATE, v_order.ecommerce_start_date)) * 12;
        v_rate_type := CASE WHEN v_months < 6 THEN 'initial' ELSE 'standard' END;
    END IF;

    -- Calculate commissionable amount (exclude shipping and tax)
    v_commissionable := GREATEST(0,
        v_order.total - COALESCE(v_order.shipping_cost, 0) - COALESCE(v_order.tax_amount, 0)
    );

    -- Insert commission record
    INSERT INTO public.store_commissions (
        order_id, tenant_id,
        order_total, shipping_amount, tax_amount, commissionable_amount,
        commission_rate, commission_amount, rate_type, months_active
    ) VALUES (
        p_order_id, v_order.tenant_id,
        v_order.total,
        COALESCE(v_order.shipping_cost, 0),
        COALESCE(v_order.tax_amount, 0),
        v_commissionable,
        v_rate,
        ROUND(v_commissionable * v_rate, 2),
        v_rate_type,
        v_months
    ) RETURNING id INTO v_commission_id;

    RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_order_commission IS 'Calculates and records commission for a paid order. Returns commission ID or NULL.';


-- Adjust commission when order is refunded
CREATE OR REPLACE FUNCTION public.adjust_commission_for_refund(
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
    -- Get existing commission
    SELECT * INTO v_commission
    FROM public.store_commissions
    WHERE order_id = p_order_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Prevent adjustments on already invoiced/paid commissions
    IF v_commission.status IN ('paid', 'waived') THEN
        RAISE EXCEPTION 'Cannot adjust commission with status: %', v_commission.status;
    END IF;

    -- Calculate proportional commission refund
    v_refund_ratio := LEAST(1.0, p_refund_amount / NULLIF(v_commission.order_total, 0));
    v_commission_refund := ROUND(v_commission.commission_amount * v_refund_ratio, 2);

    -- Update commission record
    UPDATE public.store_commissions
    SET
        original_commission = COALESCE(original_commission, commission_amount),
        commission_amount = GREATEST(0, commission_amount - v_commission_refund),
        refund_amount = COALESCE(refund_amount, 0) + v_commission_refund,
        refund_date = NOW(),
        refund_reason = p_reason,
        status = CASE
            WHEN commission_amount - v_commission_refund <= 0 THEN 'adjusted'
            ELSE status
        END,
        updated_at = NOW()
    WHERE order_id = p_order_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.adjust_commission_for_refund IS 'Reduces commission proportionally when order is refunded';


-- Generate next commission invoice number
CREATE OR REPLACE FUNCTION public.get_next_commission_invoice_number()
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER;
    v_sequence INTEGER;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Get next sequence with advisory lock to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('commission_invoice_' || v_year::text));

    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(invoice_number, '^COM-\d{4}-', ''), '')::INTEGER
    ), 0) + 1
    INTO v_sequence
    FROM public.store_commission_invoices
    WHERE invoice_number LIKE 'COM-' || v_year || '-%';

    RETURN 'COM-' || v_year || '-' || LPAD(v_sequence::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_next_commission_invoice_number IS 'Generates sequential invoice number: COM-YYYY-NNNN';


-- Generate monthly commission invoice for a tenant
CREATE OR REPLACE FUNCTION public.generate_commission_invoice(
    p_tenant_id TEXT,
    p_period_start DATE,
    p_period_end DATE,
    p_due_days INTEGER DEFAULT 15
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_totals RECORD;
BEGIN
    -- Check for existing invoice for this period
    SELECT id INTO v_invoice_id
    FROM public.store_commission_invoices
    WHERE tenant_id = p_tenant_id
      AND period_start = p_period_start
      AND period_end = p_period_end;

    IF FOUND THEN
        RETURN v_invoice_id;
    END IF;

    -- Calculate totals from pending commissions
    SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(order_total), 0) as total_gmv,
        COALESCE(SUM(commission_amount), 0) as total_commission
    INTO v_totals
    FROM public.store_commissions
    WHERE tenant_id = p_tenant_id
      AND status = 'calculated'
      AND calculated_at >= p_period_start
      AND calculated_at < p_period_end + INTERVAL '1 day';

    -- Don't create invoice if no commissions
    IF v_totals.order_count = 0 THEN
        RETURN NULL;
    END IF;

    -- Get next invoice number
    v_invoice_number := public.get_next_commission_invoice_number();

    -- Create invoice
    INSERT INTO public.store_commission_invoices (
        tenant_id, invoice_number, period_start, period_end,
        total_orders, total_gmv, total_commission, adjustments, amount_due,
        due_date, status
    ) VALUES (
        p_tenant_id, v_invoice_number, p_period_start, p_period_end,
        v_totals.order_count, v_totals.total_gmv, v_totals.total_commission, 0, v_totals.total_commission,
        p_period_end + p_due_days,
        'draft'
    ) RETURNING id INTO v_invoice_id;

    -- Link commissions to invoice
    UPDATE public.store_commissions
    SET
        invoice_id = v_invoice_id,
        status = 'invoiced',
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id
      AND status = 'calculated'
      AND calculated_at >= p_period_start
      AND calculated_at < p_period_end + INTERVAL '1 day';

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_commission_invoice IS 'Creates monthly commission invoice and links pending commissions';

-- =============================================================================
-- 8. VIEWS
-- =============================================================================

-- Commission summary view for clinic dashboard
CREATE OR REPLACE VIEW public.store_commission_summary AS
SELECT
    tenant_id,
    COUNT(*) FILTER (WHERE status = 'calculated') as pending_count,
    COALESCE(SUM(commission_amount) FILTER (WHERE status = 'calculated'), 0) as pending_amount,
    COUNT(*) FILTER (WHERE status = 'invoiced') as invoiced_count,
    COALESCE(SUM(commission_amount) FILTER (WHERE status = 'invoiced'), 0) as invoiced_amount,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
    COALESCE(SUM(commission_amount) FILTER (WHERE status = 'paid'), 0) as paid_amount,
    COUNT(*) as total_count,
    COALESCE(SUM(commission_amount), 0) as total_amount,
    MAX(calculated_at) as last_commission_date
FROM public.store_commissions
GROUP BY tenant_id;

COMMENT ON VIEW public.store_commission_summary IS 'Aggregated commission stats per tenant';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
