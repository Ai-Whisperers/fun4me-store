-- =============================================================================
-- TENANT PAYMENT METHODS - Payment Method Storage for Clinics
-- =============================================================================
-- Stores payment methods that clinics use to pay platform invoices.
-- Supports multiple payment types:
--   - Credit/Debit cards (via Stripe)
--   - Bank transfers (Paraguay bank alias)
--   - MercadoPago (Phase 2)
--   - PayPal (Phase 2)
--
-- Security:
--   - Card details stored by Stripe (PCI compliant)
--   - Only masked info (last 4 digits, brand) stored in our DB
--
-- DEPENDENCIES: 10_core/01_tenants.sql
-- =============================================================================

-- =============================================================================
-- STEP 1: Create tenant payment methods table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Method type
    method_type TEXT NOT NULL CHECK (method_type IN (
        'card',           -- Credit/debit card via Stripe
        'bank_transfer',  -- Bank transfer (Paraguay alias)
        'mercadopago',    -- MercadoPago (Phase 2)
        'paypal'          -- PayPal (Phase 2)
    )),

    -- Display name (user-friendly)
    display_name TEXT NOT NULL,  -- e.g., "Visa terminada en 4242"

    -- =========================================================================
    -- Card-specific fields (Stripe integration)
    -- =========================================================================
    stripe_customer_id TEXT,
    stripe_payment_method_id TEXT,

    -- Masked card info (safe to store)
    card_brand TEXT,       -- visa, mastercard, amex, etc.
    card_last_four TEXT,   -- Last 4 digits
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    card_funding TEXT,     -- credit, debit, prepaid

    -- =========================================================================
    -- Bank transfer fields (Paraguay)
    -- =========================================================================
    bank_name TEXT,         -- e.g., "Banco Itau"
    bank_alias TEXT,        -- e.g., "vetic.pagos"
    bank_account_type TEXT, -- corriente, ahorro
    bank_account_holder TEXT,
    bank_account_number_masked TEXT, -- Last 4 digits only

    -- =========================================================================
    -- MercadoPago fields (Phase 2)
    -- =========================================================================
    mercadopago_account_id TEXT,
    mercadopago_email TEXT,

    -- =========================================================================
    -- PayPal fields (Phase 2)
    -- =========================================================================
    paypal_email TEXT,
    paypal_payer_id TEXT,

    -- =========================================================================
    -- Status and preferences
    -- =========================================================================
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Verification tracking
    verified_at TIMESTAMPTZ,
    verification_method TEXT,  -- 'micro_deposit', 'instant', 'manual'

    -- Last usage
    last_used_at TIMESTAMPTZ,
    use_count INTEGER DEFAULT 0,

    -- Billing address (required for some payment methods)
    billing_name TEXT,
    billing_address TEXT,
    billing_city TEXT,
    billing_country TEXT DEFAULT 'PY',
    billing_postal_code TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_stripe_payment_method UNIQUE (stripe_payment_method_id),
    CONSTRAINT card_must_have_stripe CHECK (
        method_type != 'card' OR (stripe_customer_id IS NOT NULL AND stripe_payment_method_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.tenant_payment_methods IS 'Payment methods used by clinics to pay platform invoices';
COMMENT ON COLUMN public.tenant_payment_methods.display_name IS 'User-friendly display name like "Visa terminada en 4242"';
COMMENT ON COLUMN public.tenant_payment_methods.card_brand IS 'Card network: visa, mastercard, amex, etc.';
COMMENT ON COLUMN public.tenant_payment_methods.is_default IS 'Whether this is the default payment method for auto-charge';
COMMENT ON COLUMN public.tenant_payment_methods.is_verified IS 'Whether the payment method has been verified';

-- =============================================================================
-- STEP 2: Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_payment_methods_tenant
ON public.tenant_payment_methods(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_payment_methods_type
ON public.tenant_payment_methods(method_type);

CREATE INDEX IF NOT EXISTS idx_tenant_payment_methods_active
ON public.tenant_payment_methods(tenant_id, is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_tenant_payment_methods_stripe_customer
ON public.tenant_payment_methods(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Ensure only one default per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_payment_methods_default
ON public.tenant_payment_methods(tenant_id) WHERE is_default = TRUE AND is_active = TRUE;

-- =============================================================================
-- STEP 3: Row Level Security
-- =============================================================================

ALTER TABLE public.tenant_payment_methods ENABLE ROW LEVEL SECURITY;

-- Platform admin full access (service_role)
DROP POLICY IF EXISTS "Service role full access payment methods" ON public.tenant_payment_methods;
CREATE POLICY "Service role full access payment methods"
ON public.tenant_payment_methods FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Clinic admins can manage their own payment methods
DROP POLICY IF EXISTS "Clinic admin manage own payment methods" ON public.tenant_payment_methods;
CREATE POLICY "Clinic admin manage own payment methods"
ON public.tenant_payment_methods FOR ALL
USING (
    tenant_id IN (
        SELECT p.tenant_id FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
)
WITH CHECK (
    tenant_id IN (
        SELECT p.tenant_id FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- =============================================================================
-- STEP 4: Trigger for updated_at
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.tenant_payment_methods;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.tenant_payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- STEP 5: Function to ensure only one default payment method
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this method as default, unset other defaults
    IF NEW.is_default = TRUE AND NEW.is_active = TRUE THEN
        UPDATE public.tenant_payment_methods
        SET is_default = FALSE, updated_at = NOW()
        WHERE tenant_id = NEW.tenant_id
          AND id != NEW.id
          AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default ON public.tenant_payment_methods;
CREATE TRIGGER ensure_single_default
    BEFORE INSERT OR UPDATE OF is_default ON public.tenant_payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_payment_method();
