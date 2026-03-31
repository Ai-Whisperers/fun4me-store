-- =============================================================================
-- SERVICE COMMISSIONS - Service/Appointment Commission Tracking
-- =============================================================================
-- Tracks commissions on veterinary services that clinics owe to Vetic platform.
-- Mirrors the store_commissions pattern but for appointment-based services.
--
-- Commission Rates (same as store):
--   - Initial (first 6 months): 3%
--   - Standard (after 6 months): 5%
--   - Enterprise (negotiated): 2%
--
-- Commission is calculated when:
--   1. Appointment is completed
--   2. Related invoice is marked as paid
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 40_clinical/01_appointments.sql, 50_finance/01_invoicing.sql
-- =============================================================================

-- =============================================================================
-- STEP 1: Create service commissions table (per-appointment tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.service_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- References
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,

    -- Service amounts
    service_total NUMERIC(14,2) NOT NULL,      -- Total invoiced for this service
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    commissionable_amount NUMERIC(14,2) NOT NULL, -- service_total minus tax

    -- Commission calculation
    commission_rate NUMERIC(5,4) NOT NULL,  -- e.g., 0.0300 = 3%
    commission_amount NUMERIC(14,2) NOT NULL,
    rate_type TEXT NOT NULL CHECK (rate_type IN ('initial', 'standard', 'enterprise')),
    months_active INTEGER NOT NULL DEFAULT 0, -- Months since clinic started

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'invoiced', 'paid', 'waived', 'adjusted')),

    -- Adjustments (for refunds, disputes, etc.)
    original_commission NUMERIC(14,2),
    adjustment_amount NUMERIC(14,2) DEFAULT 0,
    adjustment_reason TEXT,
    adjusted_by UUID REFERENCES auth.users(id),
    adjusted_at TIMESTAMPTZ,

    -- Platform invoice reference (unified billing)
    platform_invoice_id UUID, -- Will reference platform_invoices table

    -- Timestamps
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invoiced_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_appointment_commission UNIQUE (appointment_id)
);

COMMENT ON TABLE public.service_commissions IS 'Per-appointment commission tracking for veterinary services';
COMMENT ON COLUMN public.service_commissions.commission_rate IS 'Decimal rate (0.03 = 3%, 0.05 = 5%)';
COMMENT ON COLUMN public.service_commissions.commissionable_amount IS 'Service total minus tax';
COMMENT ON COLUMN public.service_commissions.rate_type IS 'Rate tier: initial (3%), standard (5%), enterprise (2%)';
COMMENT ON COLUMN public.service_commissions.months_active IS 'Number of months clinic has been active (for rate determination)';

-- =============================================================================
-- STEP 2: Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_service_commissions_tenant
ON public.service_commissions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_service_commissions_status
ON public.service_commissions(status);

CREATE INDEX IF NOT EXISTS idx_service_commissions_appointment
ON public.service_commissions(appointment_id);

CREATE INDEX IF NOT EXISTS idx_service_commissions_invoice
ON public.service_commissions(invoice_id) WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_commissions_platform_invoice
ON public.service_commissions(platform_invoice_id) WHERE platform_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_commissions_calculated_at
ON public.service_commissions(calculated_at);

-- Pending commissions for billing aggregation
CREATE INDEX IF NOT EXISTS idx_service_commissions_pending
ON public.service_commissions(tenant_id, calculated_at) WHERE status = 'pending';

-- =============================================================================
-- STEP 3: Row Level Security
-- =============================================================================

ALTER TABLE public.service_commissions ENABLE ROW LEVEL SECURITY;

-- Platform admin full access (service_role)
DROP POLICY IF EXISTS "Service role full access service commissions" ON public.service_commissions;
CREATE POLICY "Service role full access service commissions"
ON public.service_commissions FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Clinic admins can view their own commission data (read-only)
DROP POLICY IF EXISTS "Clinic admin view own service commissions" ON public.service_commissions;
CREATE POLICY "Clinic admin view own service commissions"
ON public.service_commissions FOR SELECT
USING (
    tenant_id IN (
        SELECT p.tenant_id FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'vet')
    )
);

-- =============================================================================
-- STEP 4: Trigger for updated_at
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.service_commissions;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.service_commissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
