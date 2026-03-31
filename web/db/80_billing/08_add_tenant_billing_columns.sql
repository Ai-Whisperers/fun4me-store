-- =============================================================================
-- ADD TENANT BILLING COLUMNS - Stripe & Billing Infrastructure
-- =============================================================================
-- Adds additional columns to tenants table for platform billing integration.
-- These columns support Stripe integration, billing details, and invoice scheduling.
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 80_billing/01_subscription_tiers.sql
-- =============================================================================

-- =============================================================================
-- STEP 1: Stripe Integration Columns
-- =============================================================================

-- Stripe customer ID (created when adding payment method)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.tenants.stripe_customer_id IS 'Stripe customer ID for payment processing';

-- =============================================================================
-- STEP 2: Billing Contact Information
-- =============================================================================

-- Billing email (may differ from general contact email)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- Billing contact name (for invoices)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS billing_name TEXT;

-- Billing RUC (may differ from general RUC for tax purposes)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS billing_ruc TEXT;

-- Billing address (for invoices)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- Billing city (for invoices)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS billing_city TEXT;

COMMENT ON COLUMN public.tenants.billing_email IS 'Email for billing notifications (falls back to general email)';
COMMENT ON COLUMN public.tenants.billing_name IS 'Name to appear on invoices';
COMMENT ON COLUMN public.tenants.billing_ruc IS 'RUC for tax invoices (falls back to general RUC)';
COMMENT ON COLUMN public.tenants.billing_address IS 'Address for billing purposes';
COMMENT ON COLUMN public.tenants.billing_city IS 'City for billing purposes';

-- =============================================================================
-- STEP 3: Invoice Scheduling Columns
-- =============================================================================

-- Next invoice generation date (set by cron after invoice generated)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS next_invoice_date DATE;

-- Last invoice generation date
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS last_invoice_date DATE;

-- Current grace period (AI-evaluated, can be overridden)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS current_grace_period_days INTEGER DEFAULT 30
CHECK (current_grace_period_days IN (30, 60, 90));

COMMENT ON COLUMN public.tenants.next_invoice_date IS 'Date when next platform invoice will be generated';
COMMENT ON COLUMN public.tenants.last_invoice_date IS 'Date when last platform invoice was generated';
COMMENT ON COLUMN public.tenants.current_grace_period_days IS 'AI-evaluated grace period: 30, 60, or 90 days';

-- =============================================================================
-- STEP 4: Payment Status Columns
-- =============================================================================

-- Outstanding balance (denormalized for quick access)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(14,2) DEFAULT 0;

-- Days overdue (0 if current, calculated by cron)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0;

-- Payment status flag
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'current'
CHECK (payment_status IN ('current', 'pending', 'overdue', 'grace_period', 'suspended'));

COMMENT ON COLUMN public.tenants.outstanding_balance IS 'Total unpaid platform invoice amount (PYG)';
COMMENT ON COLUMN public.tenants.days_overdue IS 'Days since oldest unpaid invoice was due (0 if current)';
COMMENT ON COLUMN public.tenants.payment_status IS 'Overall payment status: current, pending, overdue, grace_period, suspended';

-- =============================================================================
-- STEP 5: Auto-Payment Settings
-- =============================================================================

-- Whether to auto-charge default payment method
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS auto_pay_enabled BOOLEAN DEFAULT FALSE;

-- Default payment method ID (FK to tenant_payment_methods)
-- Note: Can't add FK here since table might not exist yet
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS default_payment_method_id UUID;

COMMENT ON COLUMN public.tenants.auto_pay_enabled IS 'Whether to automatically charge invoices on due date';
COMMENT ON COLUMN public.tenants.default_payment_method_id IS 'Default payment method for auto-pay (FK to tenant_payment_methods)';

-- =============================================================================
-- STEP 6: Service Commission Tracking (mirrors store ecommerce columns)
-- =============================================================================

-- Date when clinic first had a completed appointment
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS services_start_date DATE;

COMMENT ON COLUMN public.tenants.services_start_date IS 'Date of first completed appointment (for commission rate calculation)';

-- =============================================================================
-- STEP 7: Indexes
-- =============================================================================

-- Index for Stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer
ON public.tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Index for billing cron jobs
CREATE INDEX IF NOT EXISTS idx_tenants_next_invoice
ON public.tenants(next_invoice_date) WHERE next_invoice_date IS NOT NULL AND is_active = true;

-- Index for overdue tenants
CREATE INDEX IF NOT EXISTS idx_tenants_overdue
ON public.tenants(payment_status, days_overdue) WHERE payment_status = 'overdue' AND is_active = true;

-- Index for auto-pay enabled tenants
CREATE INDEX IF NOT EXISTS idx_tenants_auto_pay
ON public.tenants(id) WHERE auto_pay_enabled = true AND is_active = true;

-- =============================================================================
-- STEP 8: Add FK to tenant_payment_methods (after it exists)
-- =============================================================================

DO $$
BEGIN
    -- Only add FK if payment_methods table exists and FK doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_payment_methods') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_tenants_default_payment_method'
        ) THEN
            ALTER TABLE public.tenants
            ADD CONSTRAINT fk_tenants_default_payment_method
            FOREIGN KEY (default_payment_method_id)
            REFERENCES public.tenant_payment_methods(id)
            ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- =============================================================================
-- STEP 9: Helper Functions
-- =============================================================================

-- Get billing email (with fallback)
CREATE OR REPLACE FUNCTION get_billing_email(p_tenant_id TEXT)
RETURNS TEXT AS $$
    SELECT COALESCE(billing_email, email)
    FROM tenants
    WHERE id = p_tenant_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_billing_email IS 'Returns billing email, falling back to general email if not set';

-- Get billing RUC (with fallback)
CREATE OR REPLACE FUNCTION get_billing_ruc(p_tenant_id TEXT)
RETURNS TEXT AS $$
    SELECT COALESCE(billing_ruc, ruc)
    FROM tenants
    WHERE id = p_tenant_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_billing_ruc IS 'Returns billing RUC, falling back to general RUC if not set';

-- Update tenant payment status (called by cron)
CREATE OR REPLACE FUNCTION update_tenant_payment_status(p_tenant_id TEXT)
RETURNS void AS $$
DECLARE
    v_oldest_due DATE;
    v_total_unpaid NUMERIC;
    v_grace_days INTEGER;
BEGIN
    -- Get oldest unpaid invoice due date and total
    SELECT MIN(due_date), COALESCE(SUM(total), 0)
    INTO v_oldest_due, v_total_unpaid
    FROM platform_invoices
    WHERE tenant_id = p_tenant_id
      AND status NOT IN ('paid', 'void', 'waived');

    -- Get current grace period
    SELECT current_grace_period_days
    INTO v_grace_days
    FROM tenants
    WHERE id = p_tenant_id;

    v_grace_days := COALESCE(v_grace_days, 30);

    -- Update tenant status
    UPDATE tenants
    SET
        outstanding_balance = v_total_unpaid,
        days_overdue = CASE
            WHEN v_oldest_due IS NULL THEN 0
            WHEN v_oldest_due >= CURRENT_DATE THEN 0
            ELSE (CURRENT_DATE - v_oldest_due)::INTEGER
        END,
        payment_status = CASE
            WHEN v_total_unpaid = 0 THEN 'current'
            WHEN v_oldest_due IS NULL THEN 'current'
            WHEN v_oldest_due > CURRENT_DATE THEN 'pending'
            WHEN (CURRENT_DATE - v_oldest_due) <= v_grace_days THEN 'grace_period'
            ELSE 'overdue'
        END,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_tenant_payment_status IS 'Updates tenant payment status based on unpaid invoices. Called by billing cron.';
