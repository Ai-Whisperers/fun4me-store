-- =============================================================================
-- PLATFORM INVOICES - Unified Billing from Vetic to Clinics
-- =============================================================================
-- Monthly invoices that combine:
--   - Subscription fee (based on tier)
--   - Store commissions (from e-commerce sales)
--   - Service commissions (from appointments)
--   - Any adjustments, credits, or late fees
--
-- Invoice Workflow:
--   draft → sent → paid/overdue → (paid|void|waived)
--
-- Grace Period:
--   AI-evaluated grace period (30/60/90 days) tracked per invoice
--
-- DEPENDENCIES: 10_core/01_tenants.sql
-- =============================================================================

-- =============================================================================
-- STEP 1: Create platform invoices table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Invoice identification
    invoice_number TEXT NOT NULL,  -- Format: VETIC-YYYY-NNNNNN

    -- Billing period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amount breakdown (denormalized for quick access)
    subscription_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    store_commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    service_commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0,

    -- Totals
    subtotal NUMERIC(14,2) NOT NULL,
    tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,  -- 10% IVA Paraguay
    tax_amount NUMERIC(14,2) NOT NULL,
    total NUMERIC(14,2) NOT NULL,

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void', 'waived')),

    -- Important dates
    issued_at TIMESTAMPTZ,          -- When invoice was sent
    due_date DATE NOT NULL,          -- Payment due date
    paid_at TIMESTAMPTZ,             -- When payment confirmed

    -- Payment information
    payment_method TEXT,             -- card, bank_transfer, mercadopago, paypal
    payment_reference TEXT,          -- Transaction ID or reference
    payment_amount NUMERIC(14,2),    -- Amount actually paid

    -- Grace period tracking
    grace_period_days INTEGER,       -- AI-evaluated: 30, 60, or 90
    grace_reason TEXT,               -- Human-readable explanation
    grace_evaluation_id UUID,        -- Link to grace_period_evaluations

    -- Reminders tracking
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,

    -- Administrative
    notes TEXT,                      -- Internal notes

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_platform_invoice_number UNIQUE (invoice_number),
    CONSTRAINT unique_platform_tenant_period UNIQUE (tenant_id, period_start, period_end)
);

COMMENT ON TABLE public.platform_invoices IS 'Monthly unified invoices from Vetic platform to clinics';
COMMENT ON COLUMN public.platform_invoices.invoice_number IS 'Format: VETIC-YYYY-NNNNNN';
COMMENT ON COLUMN public.platform_invoices.tax_rate IS 'IVA rate as decimal (0.10 = 10%)';
COMMENT ON COLUMN public.platform_invoices.grace_period_days IS 'AI-evaluated grace period: 30, 60, or 90 days';

-- =============================================================================
-- STEP 2: Create platform invoice items table (line items)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_invoice_id UUID NOT NULL REFERENCES public.platform_invoices(id) ON DELETE CASCADE,

    -- Item type categorization
    item_type TEXT NOT NULL CHECK (item_type IN (
        'subscription',        -- Monthly subscription fee
        'store_commission',    -- Commission from store orders
        'service_commission',  -- Commission from appointments
        'adjustment',          -- Manual adjustment
        'credit',              -- Credit applied
        'late_fee',            -- Late payment fee
        'discount'             -- Promotional discount
    )),

    -- Item details
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(14,2) NOT NULL,
    total NUMERIC(14,2) NOT NULL,

    -- Reference to original record (for audit trail)
    reference_type TEXT,   -- 'store_commission', 'service_commission', 'subscription', etc.
    reference_id UUID,     -- ID of the referenced record

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.platform_invoice_items IS 'Line items for platform invoices';
COMMENT ON COLUMN public.platform_invoice_items.item_type IS 'Type of charge: subscription, commission, adjustment, etc.';
COMMENT ON COLUMN public.platform_invoice_items.reference_type IS 'Type of source record for audit trail';
COMMENT ON COLUMN public.platform_invoice_items.reference_id IS 'ID of source record (commission, etc.)';

-- =============================================================================
-- STEP 3: Indexes
-- =============================================================================

-- Platform invoices indexes
CREATE INDEX IF NOT EXISTS idx_platform_invoices_tenant
ON public.platform_invoices(tenant_id);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_status
ON public.platform_invoices(status);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_period
ON public.platform_invoices(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_due_date
ON public.platform_invoices(due_date) WHERE status IN ('sent', 'overdue');

CREATE INDEX IF NOT EXISTS idx_platform_invoices_unpaid
ON public.platform_invoices(tenant_id, due_date) WHERE status NOT IN ('paid', 'void', 'waived');

-- Platform invoice items indexes
CREATE INDEX IF NOT EXISTS idx_platform_invoice_items_invoice
ON public.platform_invoice_items(platform_invoice_id);

CREATE INDEX IF NOT EXISTS idx_platform_invoice_items_type
ON public.platform_invoice_items(item_type);

CREATE INDEX IF NOT EXISTS idx_platform_invoice_items_reference
ON public.platform_invoice_items(reference_type, reference_id) WHERE reference_id IS NOT NULL;

-- =============================================================================
-- STEP 4: Row Level Security
-- =============================================================================

ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_invoice_items ENABLE ROW LEVEL SECURITY;

-- Platform admin full access (service_role)
DROP POLICY IF EXISTS "Service role full access platform invoices" ON public.platform_invoices;
CREATE POLICY "Service role full access platform invoices"
ON public.platform_invoices FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access invoice items" ON public.platform_invoice_items;
CREATE POLICY "Service role full access invoice items"
ON public.platform_invoice_items FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Clinic admins can view their own invoices (read-only)
DROP POLICY IF EXISTS "Clinic admin view own platform invoices" ON public.platform_invoices;
CREATE POLICY "Clinic admin view own platform invoices"
ON public.platform_invoices FOR SELECT
USING (
    tenant_id IN (
        SELECT p.tenant_id FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin')
    )
);

DROP POLICY IF EXISTS "Clinic admin view own invoice items" ON public.platform_invoice_items;
CREATE POLICY "Clinic admin view own invoice items"
ON public.platform_invoice_items FOR SELECT
USING (
    platform_invoice_id IN (
        SELECT pi.id FROM platform_invoices pi
        JOIN profiles p ON p.tenant_id = pi.tenant_id
        WHERE p.id = auth.uid() AND p.role IN ('admin')
    )
);

-- =============================================================================
-- STEP 5: Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.platform_invoices;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.platform_invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- STEP 6: Add foreign key from service_commissions to platform_invoices
-- =============================================================================
-- (Done after platform_invoices exists)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_service_comm_platform_invoice'
    ) THEN
        ALTER TABLE public.service_commissions
        ADD CONSTRAINT fk_service_comm_platform_invoice
        FOREIGN KEY (platform_invoice_id) REFERENCES public.platform_invoices(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================================================
-- STEP 7: Update store_commissions to link to platform_invoices
-- =============================================================================

-- Add platform_invoice_id to store_commissions if not exists
ALTER TABLE public.store_commissions
ADD COLUMN IF NOT EXISTS platform_invoice_id UUID REFERENCES public.platform_invoices(id) ON DELETE SET NULL;

-- Index for joining
CREATE INDEX IF NOT EXISTS idx_store_commissions_platform_invoice
ON public.store_commissions(platform_invoice_id) WHERE platform_invoice_id IS NOT NULL;
