-- =============================================================================
-- BILLING PAYMENT TRANSACTIONS - Payment Records
-- =============================================================================
-- Records all payment transactions for platform invoices.
-- Supports multiple payment providers and methods.
--
-- Transaction workflow:
--   pending → processing → succeeded/failed → (refunded)
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 80_billing/04_platform_invoices.sql,
--               80_billing/05_tenant_payment_methods.sql
-- =============================================================================

-- =============================================================================
-- STEP 1: Create billing payment transactions table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.billing_payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    platform_invoice_id UUID REFERENCES public.platform_invoices(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES public.tenant_payment_methods(id) ON DELETE SET NULL,

    -- Transaction details
    amount NUMERIC(14,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PYG',

    -- Payment method info (denormalized for audit)
    payment_method_type TEXT NOT NULL,  -- card, bank_transfer, mercadopago, paypal
    payment_method_display TEXT,        -- "Visa •••• 4242"

    -- =========================================================================
    -- Stripe-specific fields
    -- =========================================================================
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    stripe_client_secret TEXT,         -- For frontend confirmation
    stripe_receipt_url TEXT,

    -- =========================================================================
    -- MercadoPago-specific fields (Phase 2)
    -- =========================================================================
    mercadopago_payment_id TEXT,
    mercadopago_preference_id TEXT,

    -- =========================================================================
    -- PayPal-specific fields (Phase 2)
    -- =========================================================================
    paypal_order_id TEXT,
    paypal_capture_id TEXT,

    -- =========================================================================
    -- Bank transfer-specific fields
    -- =========================================================================
    bank_transfer_reference TEXT,      -- Reference number from bank
    bank_transfer_date DATE,           -- Date of transfer
    bank_transfer_proof_url TEXT,      -- Uploaded receipt/proof

    -- =========================================================================
    -- Status tracking
    -- =========================================================================
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',     -- Transaction initiated
            'processing',  -- Being processed by provider
            'succeeded',   -- Payment confirmed
            'failed',      -- Payment failed
            'cancelled',   -- Cancelled before processing
            'refunded',    -- Full refund processed
            'partial_refund' -- Partial refund processed
        )),

    -- Error handling
    failure_code TEXT,
    failure_message TEXT,

    -- Refund tracking
    refund_amount NUMERIC(14,2),
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,

    -- =========================================================================
    -- Metadata
    -- =========================================================================
    metadata JSONB,                    -- Additional provider-specific data
    ip_address TEXT,                   -- IP address of transaction
    user_agent TEXT,                   -- Browser info

    -- =========================================================================
    -- Audit
    -- =========================================================================
    initiated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.billing_payment_transactions IS 'All payment transactions for platform invoices';
COMMENT ON COLUMN public.billing_payment_transactions.payment_method_type IS 'Type: card, bank_transfer, mercadopago, paypal';
COMMENT ON COLUMN public.billing_payment_transactions.status IS 'Transaction status: pending → processing → succeeded/failed';
COMMENT ON COLUMN public.billing_payment_transactions.failure_code IS 'Provider-specific error code';

-- =============================================================================
-- STEP 2: Create billing reminders table (soft enforcement)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.billing_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    platform_invoice_id UUID REFERENCES public.platform_invoices(id) ON DELETE CASCADE,

    -- Reminder type
    reminder_type TEXT NOT NULL CHECK (reminder_type IN (
        'upcoming_invoice',       -- 7 days before due date
        'invoice_due',            -- On due date
        'overdue_gentle',         -- 7 days overdue
        'overdue_reminder',       -- 14 days overdue
        'overdue_urgent',         -- 30 days overdue
        'grace_period_starting',  -- Grace period approved
        'grace_period_warning',   -- Grace period ending soon
        'grace_period_expired',   -- Grace period ended
        'payment_confirmation',   -- Payment received
        'payment_failed',         -- Payment attempt failed
        'payment_method_expiring' -- Card expiring soon
    )),

    -- Delivery channel
    channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'in_app', 'whatsapp')),

    -- Recipient
    recipient_email TEXT,
    recipient_phone TEXT,
    recipient_user_id UUID REFERENCES auth.users(id),

    -- Content
    subject TEXT,
    content TEXT,
    template_id TEXT,          -- Reference to email template

    -- =========================================================================
    -- Status tracking
    -- =========================================================================
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),

    scheduled_for TIMESTAMPTZ,  -- When to send (for scheduled reminders)
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,

    -- Engagement tracking
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,

    -- Provider tracking
    provider TEXT,             -- sendgrid, resend, twilio, etc.
    provider_message_id TEXT,

    -- =========================================================================
    -- Audit
    -- =========================================================================
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.billing_reminders IS 'Billing reminders sent to clinics (soft enforcement)';
COMMENT ON COLUMN public.billing_reminders.reminder_type IS 'Type of reminder: upcoming, due, overdue, grace period, etc.';
COMMENT ON COLUMN public.billing_reminders.channel IS 'Delivery channel: email, sms, in_app, whatsapp';

-- =============================================================================
-- STEP 3: Indexes
-- =============================================================================

-- Payment transactions indexes
CREATE INDEX IF NOT EXISTS idx_billing_transactions_tenant
ON public.billing_payment_transactions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_invoice
ON public.billing_payment_transactions(platform_invoice_id) WHERE platform_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_transactions_status
ON public.billing_payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_stripe_intent
ON public.billing_payment_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_transactions_stripe_charge
ON public.billing_payment_transactions(stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_transactions_created
ON public.billing_payment_transactions(created_at DESC);

-- Billing reminders indexes
CREATE INDEX IF NOT EXISTS idx_billing_reminders_tenant
ON public.billing_reminders(tenant_id);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_invoice
ON public.billing_reminders(platform_invoice_id) WHERE platform_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_reminders_type
ON public.billing_reminders(reminder_type);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_status
ON public.billing_reminders(status);

CREATE INDEX IF NOT EXISTS idx_billing_reminders_scheduled
ON public.billing_reminders(scheduled_for) WHERE status = 'pending' AND scheduled_for IS NOT NULL;

-- =============================================================================
-- STEP 4: Row Level Security
-- =============================================================================

ALTER TABLE public.billing_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_reminders ENABLE ROW LEVEL SECURITY;

-- Platform admin full access (service_role)
DROP POLICY IF EXISTS "Service role full access transactions" ON public.billing_payment_transactions;
CREATE POLICY "Service role full access transactions"
ON public.billing_payment_transactions FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access reminders" ON public.billing_reminders;
CREATE POLICY "Service role full access reminders"
ON public.billing_reminders FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Clinic admins can view their own transactions
DROP POLICY IF EXISTS "Clinic admin view own transactions" ON public.billing_payment_transactions;
CREATE POLICY "Clinic admin view own transactions"
ON public.billing_payment_transactions FOR SELECT
USING (
    tenant_id IN (
        SELECT p.tenant_id FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- Clinic admins can view their own reminders
DROP POLICY IF EXISTS "Clinic admin view own reminders" ON public.billing_reminders;
CREATE POLICY "Clinic admin view own reminders"
ON public.billing_reminders FOR SELECT
USING (
    tenant_id IN (
        SELECT p.tenant_id FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- =============================================================================
-- STEP 5: Trigger for updated_at
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.billing_payment_transactions;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.billing_payment_transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
