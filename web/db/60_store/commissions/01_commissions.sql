-- =============================================================================
-- STORE COMMISSIONS - E-Commerce Commission Tracking
-- =============================================================================
-- Tracks commissions on e-commerce sales that clinics owe to Vetic platform.
--
-- Commission Rates:
--   - Initial (first 6 months): 3%
--   - Standard (after 6 months): 5%
--   - Enterprise (negotiated): 2%
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 60_store/01_inventory.sql
-- =============================================================================

-- =============================================================================
-- STEP 1: Add ecommerce columns to tenants table
-- =============================================================================

-- Date when clinic first enabled e-commerce (used for rate calculation)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS ecommerce_start_date DATE;

-- Commission tier override (NULL = calculate based on months)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS commission_tier TEXT
CHECK (commission_tier IS NULL OR commission_tier IN ('initial', 'standard', 'enterprise'));

COMMENT ON COLUMN public.tenants.ecommerce_start_date IS 'Date when clinic enabled e-commerce, used for commission rate calculation';
COMMENT ON COLUMN public.tenants.commission_tier IS 'Commission tier override: initial (3%), standard (5%), enterprise (2% negotiated)';

-- =============================================================================
-- STEP 2: Create commission invoices table (Platform → Clinic bills)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_commission_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Invoice details
    invoice_number TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amounts
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_gmv NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_commission NUMERIC(14,2) NOT NULL DEFAULT 0,
    adjustments NUMERIC(14,2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(14,2) NOT NULL,

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'waived')),

    -- Payment tracking
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    paid_amount NUMERIC(14,2),
    payment_reference TEXT,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_commission_invoice_number UNIQUE (invoice_number),
    CONSTRAINT unique_commission_tenant_period UNIQUE (tenant_id, period_start, period_end)
);

COMMENT ON TABLE public.store_commission_invoices IS 'Monthly commission invoices from Vetic platform to clinics';
COMMENT ON COLUMN public.store_commission_invoices.total_gmv IS 'Gross Merchandise Value (total sales before commissions)';
COMMENT ON COLUMN public.store_commission_invoices.amount_due IS 'Final amount due after adjustments';

-- =============================================================================
-- STEP 3: Create commissions table (per-order tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Order amounts
    order_total NUMERIC(14,2) NOT NULL,
    shipping_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    commissionable_amount NUMERIC(14,2) NOT NULL,

    -- Commission calculation
    commission_rate NUMERIC(5,4) NOT NULL,  -- e.g., 0.0300 = 3%
    commission_amount NUMERIC(14,2) NOT NULL,
    rate_type TEXT NOT NULL CHECK (rate_type IN ('initial', 'standard', 'enterprise')),
    months_active INTEGER NOT NULL DEFAULT 0,

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'calculated'
        CHECK (status IN ('calculated', 'invoiced', 'paid', 'waived', 'adjusted')),

    -- Refund tracking
    original_commission NUMERIC(14,2),
    refund_amount NUMERIC(14,2) DEFAULT 0,
    refund_date TIMESTAMPTZ,
    refund_reason TEXT,

    -- Adjustments
    adjustment_amount NUMERIC(14,2) DEFAULT 0,
    adjustment_reason TEXT,
    adjusted_by UUID REFERENCES auth.users(id),
    adjusted_at TIMESTAMPTZ,

    -- Invoice reference
    invoice_id UUID REFERENCES public.store_commission_invoices(id),

    -- Timestamps
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_order_commission UNIQUE (order_id)
);

COMMENT ON TABLE public.store_commissions IS 'Per-order commission tracking for e-commerce sales';
COMMENT ON COLUMN public.store_commissions.commission_rate IS 'Decimal rate (0.03 = 3%, 0.05 = 5%)';
COMMENT ON COLUMN public.store_commissions.commissionable_amount IS 'Order total minus shipping and tax';
COMMENT ON COLUMN public.store_commissions.rate_type IS 'Rate tier: initial (3%), standard (5%), enterprise (2%)';

-- =============================================================================
-- STEP 4: Indexes
-- =============================================================================

-- Commission invoices indexes
CREATE INDEX IF NOT EXISTS idx_commission_invoices_tenant
ON public.store_commission_invoices(tenant_id);

CREATE INDEX IF NOT EXISTS idx_commission_invoices_status
ON public.store_commission_invoices(status);

CREATE INDEX IF NOT EXISTS idx_commission_invoices_period
ON public.store_commission_invoices(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_commission_invoices_due_date
ON public.store_commission_invoices(due_date) WHERE status IN ('sent', 'overdue');

-- Store commissions indexes
CREATE INDEX IF NOT EXISTS idx_store_commissions_tenant
ON public.store_commissions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_store_commissions_status
ON public.store_commissions(status);

CREATE INDEX IF NOT EXISTS idx_store_commissions_invoice
ON public.store_commissions(invoice_id) WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_commissions_calculated_at
ON public.store_commissions(calculated_at);

CREATE INDEX IF NOT EXISTS idx_store_commissions_pending
ON public.store_commissions(tenant_id, calculated_at) WHERE status = 'calculated';

-- =============================================================================
-- STEP 5: Row Level Security
-- =============================================================================

ALTER TABLE public.store_commission_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_commissions ENABLE ROW LEVEL SECURITY;

-- Platform admin full access (service_role)
DROP POLICY IF EXISTS "Service role full access commission invoices" ON public.store_commission_invoices;
CREATE POLICY "Service role full access commission invoices"
ON public.store_commission_invoices FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access commissions" ON public.store_commissions;
CREATE POLICY "Service role full access commissions"
ON public.store_commissions FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Clinic staff can view their own commission data (read-only)
DROP POLICY IF EXISTS "Clinic staff view own invoices" ON public.store_commission_invoices;
CREATE POLICY "Clinic staff view own invoices"
ON public.store_commission_invoices FOR SELECT
USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Clinic staff view own commissions" ON public.store_commissions;
CREATE POLICY "Clinic staff view own commissions"
ON public.store_commissions FOR SELECT
USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
));

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
