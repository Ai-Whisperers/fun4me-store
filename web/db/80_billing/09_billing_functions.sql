-- =============================================================================
-- BILLING FUNCTIONS - Service Commissions & Platform Invoices
-- =============================================================================
-- Core functions for:
--   - Service commission calculation (mirrors store commission pattern)
--   - Platform invoice generation (subscription + all commissions)
--   - Commission summaries for transparency
--
-- DEPENDENCIES:
--   80_billing/03_service_commissions.sql
--   80_billing/04_platform_invoices.sql
--   60_store/commissions/02_functions.sql (for get_commission_rate)
-- =============================================================================

-- =============================================================================
-- SERVICE COMMISSION RATE (uses same rate as store)
-- =============================================================================
-- Service commissions use the same rate structure as store commissions.
-- This function calculates based on services_start_date (analogous to ecommerce_start_date)

CREATE OR REPLACE FUNCTION get_service_commission_rate(p_tenant_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_start_date DATE;
    v_tier TEXT;
    v_months INTEGER;
BEGIN
    SELECT services_start_date, commission_tier
    INTO v_start_date, v_tier
    FROM tenants WHERE id = p_tenant_id;

    -- Enterprise override (negotiated rate)
    IF v_tier = 'enterprise' THEN
        RETURN 0.02; -- 2%
    END IF;

    -- Standard tier override
    IF v_tier = 'standard' THEN
        RETURN 0.05; -- 5%
    END IF;

    -- Initial tier override
    IF v_tier = 'initial' THEN
        RETURN 0.03; -- 3%
    END IF;

    -- No start date = new clinic, use initial rate
    IF v_start_date IS NULL THEN
        RETURN 0.03; -- 3%
    END IF;

    -- Calculate months active
    v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_start_date)) +
                EXTRACT(YEAR FROM age(CURRENT_DATE, v_start_date)) * 12;

    IF v_months < 6 THEN
        RETURN 0.03; -- 3% initial rate
    ELSE
        RETURN 0.05; -- 5% standard rate
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_service_commission_rate IS 'Returns service commission rate for a tenant: 3% (initial/first 6mo), 5% (standard), 2% (enterprise)';

-- =============================================================================
-- GET SERVICE COMMISSION RATE TYPE
-- =============================================================================

CREATE OR REPLACE FUNCTION get_service_commission_rate_type(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_start_date DATE;
    v_tier TEXT;
    v_months INTEGER;
BEGIN
    SELECT services_start_date, commission_tier
    INTO v_start_date, v_tier
    FROM tenants WHERE id = p_tenant_id;

    -- Explicit tier overrides
    IF v_tier IN ('enterprise', 'standard', 'initial') THEN
        RETURN v_tier;
    END IF;

    -- No start date = new clinic
    IF v_start_date IS NULL THEN
        RETURN 'initial';
    END IF;

    -- Calculate months active
    v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_start_date)) +
                EXTRACT(YEAR FROM age(CURRENT_DATE, v_start_date)) * 12;

    IF v_months < 6 THEN
        RETURN 'initial';
    ELSE
        RETURN 'standard';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_service_commission_rate_type IS 'Returns service rate type string: initial, standard, or enterprise';

-- =============================================================================
-- CALCULATE SERVICE COMMISSION
-- =============================================================================
-- Calculates and records commission for a completed appointment with paid invoice.
-- Should be called when invoice status changes to 'paid'.

CREATE OR REPLACE FUNCTION calculate_service_commission(p_appointment_id UUID)
RETURNS UUID AS $$
DECLARE
    v_appointment RECORD;
    v_invoice RECORD;
    v_rate NUMERIC;
    v_rate_type TEXT;
    v_months INTEGER;
    v_commissionable NUMERIC;
    v_commission_id UUID;
    v_start_date DATE;
BEGIN
    -- Get appointment with tenant info
    SELECT
        a.id,
        a.tenant_id,
        a.status as appointment_status,
        t.services_start_date,
        t.commission_tier
    INTO v_appointment
    FROM appointments a
    JOIN tenants t ON t.id = a.tenant_id
    WHERE a.id = p_appointment_id;

    IF NOT FOUND THEN
        RETURN NULL; -- Appointment not found
    END IF;

    -- Check if appointment is completed
    IF v_appointment.appointment_status != 'completed' THEN
        RETURN NULL;
    END IF;

    -- Get paid invoice for this appointment
    SELECT
        i.id,
        i.total,
        COALESCE(i.tax_amount, 0) as tax_amount
    INTO v_invoice
    FROM invoices i
    WHERE i.appointment_id = p_appointment_id
      AND i.status = 'paid'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL; -- No paid invoice
    END IF;

    -- Check if already calculated
    IF EXISTS (SELECT 1 FROM service_commissions WHERE appointment_id = p_appointment_id) THEN
        RETURN (SELECT id FROM service_commissions WHERE appointment_id = p_appointment_id);
    END IF;

    -- Calculate rate and type
    v_rate := get_service_commission_rate(v_appointment.tenant_id);
    v_rate_type := get_service_commission_rate_type(v_appointment.tenant_id);

    -- Calculate months active
    IF v_appointment.services_start_date IS NULL THEN
        v_months := 0;
        -- Set start date on first commission
        UPDATE tenants SET services_start_date = CURRENT_DATE WHERE id = v_appointment.tenant_id;
    ELSE
        v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_appointment.services_start_date)) +
                    EXTRACT(YEAR FROM age(CURRENT_DATE, v_appointment.services_start_date)) * 12;
    END IF;

    -- Calculate commissionable amount (total - tax)
    v_commissionable := GREATEST(0, v_invoice.total - v_invoice.tax_amount);

    -- Insert commission record
    INSERT INTO service_commissions (
        tenant_id,
        appointment_id,
        invoice_id,
        service_total,
        tax_amount,
        commissionable_amount,
        commission_rate,
        commission_amount,
        rate_type,
        months_active
    ) VALUES (
        v_appointment.tenant_id,
        p_appointment_id,
        v_invoice.id,
        v_invoice.total,
        v_invoice.tax_amount,
        v_commissionable,
        v_rate,
        ROUND(v_commissionable * v_rate, 2),
        v_rate_type,
        v_months
    ) RETURNING id INTO v_commission_id;

    RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_service_commission IS 'Calculates and records commission for a completed appointment with paid invoice. Returns commission ID or NULL.';

-- =============================================================================
-- GET SERVICE COMMISSION SUMMARY
-- =============================================================================
-- Returns service commission summary for a tenant in a given period.

CREATE OR REPLACE FUNCTION get_service_commission_summary(
    p_tenant_id TEXT,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
    total_appointments BIGINT,
    total_revenue NUMERIC,
    total_commissionable NUMERIC,
    total_commission NUMERIC,
    net_commission NUMERIC,
    avg_rate NUMERIC
) AS $$
BEGIN
    -- Default to current month if no period specified
    IF p_period_start IS NULL THEN
        p_period_start := date_trunc('month', CURRENT_DATE)::DATE;
    END IF;
    IF p_period_end IS NULL THEN
        p_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_appointments,
        COALESCE(SUM(service_total), 0)::NUMERIC as total_revenue,
        COALESCE(SUM(commissionable_amount), 0)::NUMERIC as total_commissionable,
        COALESCE(SUM(COALESCE(original_commission, commission_amount)), 0)::NUMERIC as total_commission,
        COALESCE(SUM(commission_amount), 0)::NUMERIC as net_commission,
        CASE
            WHEN SUM(commissionable_amount) > 0
            THEN ROUND(SUM(commission_amount) / SUM(commissionable_amount), 4)
            ELSE 0
        END::NUMERIC as avg_rate
    FROM service_commissions
    WHERE tenant_id = p_tenant_id
    AND calculated_at::DATE BETWEEN p_period_start AND p_period_end
    AND status != 'waived';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_service_commission_summary IS 'Returns service commission summary for a tenant in the specified period';

-- =============================================================================
-- GET SUBSCRIPTION AMOUNT
-- =============================================================================
-- Returns monthly subscription amount for a tenant based on tier.

CREATE OR REPLACE FUNCTION get_subscription_amount(p_tenant_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_tier subscription_tier;
    v_is_trial BOOLEAN;
    v_trial_end DATE;
BEGIN
    SELECT subscription_tier, is_trial, trial_end_date
    INTO v_tier, v_is_trial, v_trial_end
    FROM tenants
    WHERE id = p_tenant_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Free during trial
    IF v_is_trial AND v_trial_end >= CURRENT_DATE THEN
        RETURN 0;
    END IF;

    -- Subscription amounts (PYG) - matches tiers.ts
    RETURN CASE v_tier
        WHEN 'gratis' THEN 0
        WHEN 'basico' THEN 199000
        WHEN 'crecimiento' THEN 349000
        WHEN 'profesional' THEN 549000
        WHEN 'empresarial' THEN 899000
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_subscription_amount IS 'Returns monthly subscription amount in PYG for a tenant (0 if trial or free tier)';

-- =============================================================================
-- GENERATE PLATFORM INVOICE NUMBER
-- =============================================================================
-- Thread-safe invoice number generation.

CREATE OR REPLACE FUNCTION generate_platform_invoice_number()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_seq INTEGER;
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');

    -- Get and increment sequence with locking
    INSERT INTO document_sequences (tenant_id, document_type, year, prefix, current_sequence)
    VALUES ('_platform', 'platform_invoice', v_year::INTEGER, 'VETIC', 0)
    ON CONFLICT (tenant_id, document_type, year)
    DO UPDATE SET current_sequence = document_sequences.current_sequence + 1, updated_at = NOW()
    RETURNING current_sequence INTO v_seq;

    RETURN 'VETIC-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_platform_invoice_number IS 'Generates unique platform invoice number: VETIC-YYYY-NNNNNN';

-- =============================================================================
-- GENERATE PLATFORM INVOICE
-- =============================================================================
-- Generates a monthly platform invoice combining:
--   - Subscription fee
--   - Store commissions
--   - Service commissions

CREATE OR REPLACE FUNCTION generate_platform_invoice(
    p_tenant_id TEXT,
    p_period_start DATE,
    p_period_end DATE
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_subscription NUMERIC;
    v_store_summary RECORD;
    v_service_summary RECORD;
    v_subtotal NUMERIC;
    v_tax_rate NUMERIC := 0.10; -- 10% IVA
    v_tax NUMERIC;
    v_total NUMERIC;
    v_tier subscription_tier;
BEGIN
    -- Check if invoice already exists
    IF EXISTS (
        SELECT 1 FROM platform_invoices
        WHERE tenant_id = p_tenant_id
        AND period_start = p_period_start
        AND period_end = p_period_end
    ) THEN
        RETURN (
            SELECT id FROM platform_invoices
            WHERE tenant_id = p_tenant_id
            AND period_start = p_period_start
            AND period_end = p_period_end
        );
    END IF;

    -- Get subscription tier
    SELECT subscription_tier INTO v_tier FROM tenants WHERE id = p_tenant_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Skip if free tier (no subscription)
    -- Still generate if there are commissions
    v_subscription := get_subscription_amount(p_tenant_id);

    -- Get store commission summary
    SELECT * INTO v_store_summary
    FROM get_commission_summary(p_tenant_id, p_period_start, p_period_end);

    -- Get service commission summary
    SELECT * INTO v_service_summary
    FROM get_service_commission_summary(p_tenant_id, p_period_start, p_period_end);

    -- Calculate totals
    v_subtotal := v_subscription +
                  COALESCE(v_store_summary.net_commission, 0) +
                  COALESCE(v_service_summary.net_commission, 0);

    -- Skip if nothing to invoice
    IF v_subtotal <= 0 THEN
        RETURN NULL;
    END IF;

    v_tax := ROUND(v_subtotal * v_tax_rate, 2);
    v_total := v_subtotal + v_tax;

    -- Generate invoice number
    v_invoice_number := generate_platform_invoice_number();

    -- Create invoice
    INSERT INTO platform_invoices (
        tenant_id,
        invoice_number,
        period_start,
        period_end,
        subscription_amount,
        store_commission_amount,
        service_commission_amount,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        status,
        due_date
    ) VALUES (
        p_tenant_id,
        v_invoice_number,
        p_period_start,
        p_period_end,
        v_subscription,
        COALESCE(v_store_summary.net_commission, 0),
        COALESCE(v_service_summary.net_commission, 0),
        v_subtotal,
        v_tax_rate,
        v_tax,
        v_total,
        'draft',
        p_period_end + interval '15 days' -- Due 15 days after period end
    ) RETURNING id INTO v_invoice_id;

    -- Create line items

    -- Subscription line item
    IF v_subscription > 0 THEN
        INSERT INTO platform_invoice_items (
            platform_invoice_id,
            item_type,
            description,
            unit_price,
            total
        ) VALUES (
            v_invoice_id,
            'subscription',
            'Suscripcion ' || v_tier || ' - ' || TO_CHAR(p_period_start, 'TMMonth YYYY'),
            v_subscription,
            v_subscription
        );
    END IF;

    -- Store commission line item
    IF COALESCE(v_store_summary.net_commission, 0) > 0 THEN
        INSERT INTO platform_invoice_items (
            platform_invoice_id,
            item_type,
            description,
            quantity,
            unit_price,
            total
        ) VALUES (
            v_invoice_id,
            'store_commission',
            'Comision tienda online (' || v_store_summary.total_orders || ' ordenes)',
            v_store_summary.total_orders::INTEGER,
            v_store_summary.net_commission / GREATEST(v_store_summary.total_orders, 1),
            v_store_summary.net_commission
        );
    END IF;

    -- Service commission line item
    IF COALESCE(v_service_summary.net_commission, 0) > 0 THEN
        INSERT INTO platform_invoice_items (
            platform_invoice_id,
            item_type,
            description,
            quantity,
            unit_price,
            total
        ) VALUES (
            v_invoice_id,
            'service_commission',
            'Comision servicios (' || v_service_summary.total_appointments || ' citas)',
            v_service_summary.total_appointments::INTEGER,
            v_service_summary.net_commission / GREATEST(v_service_summary.total_appointments, 1),
            v_service_summary.net_commission
        );
    END IF;

    -- Link store commissions to platform invoice
    UPDATE store_commissions
    SET
        platform_invoice_id = v_invoice_id,
        status = 'invoiced',
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id
    AND calculated_at::DATE BETWEEN p_period_start AND p_period_end
    AND status IN ('calculated', 'pending');

    -- Link service commissions to platform invoice
    UPDATE service_commissions
    SET
        platform_invoice_id = v_invoice_id,
        status = 'invoiced',
        invoiced_at = NOW(),
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id
    AND calculated_at::DATE BETWEEN p_period_start AND p_period_end
    AND status = 'pending';

    -- Update tenant next invoice date
    UPDATE tenants
    SET
        last_invoice_date = p_period_end,
        next_invoice_date = (p_period_end + interval '1 month')::DATE,
        updated_at = NOW()
    WHERE id = p_tenant_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_platform_invoice IS 'Generates monthly platform invoice combining subscription and all commissions. Returns invoice ID.';

-- =============================================================================
-- MARK PLATFORM INVOICE PAID
-- =============================================================================
-- Marks a platform invoice as paid and updates all linked commissions.

CREATE OR REPLACE FUNCTION mark_platform_invoice_paid(
    p_invoice_id UUID,
    p_payment_method TEXT,
    p_payment_reference TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update invoice
    UPDATE platform_invoices
    SET
        status = 'paid',
        paid_at = NOW(),
        payment_method = p_payment_method,
        payment_reference = p_payment_reference,
        payment_amount = total,
        updated_at = NOW()
    WHERE id = p_invoice_id AND status NOT IN ('paid', 'void', 'waived');

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Update linked store commissions
    UPDATE store_commissions
    SET status = 'paid', updated_at = NOW()
    WHERE platform_invoice_id = p_invoice_id AND status = 'invoiced';

    -- Update linked service commissions
    UPDATE service_commissions
    SET status = 'paid', paid_at = NOW(), updated_at = NOW()
    WHERE platform_invoice_id = p_invoice_id AND status = 'invoiced';

    -- Update tenant payment status
    PERFORM update_tenant_payment_status((
        SELECT tenant_id FROM platform_invoices WHERE id = p_invoice_id
    ));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_platform_invoice_paid IS 'Marks platform invoice as paid and updates all linked commissions. Returns TRUE on success.';

-- =============================================================================
-- GET COMBINED COMMISSION SUMMARY
-- =============================================================================
-- Returns combined store + service commission summary for a tenant.

CREATE OR REPLACE FUNCTION get_combined_commission_summary(
    p_tenant_id TEXT,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
    store_orders BIGINT,
    store_commission NUMERIC,
    service_appointments BIGINT,
    service_commission NUMERIC,
    total_commission NUMERIC,
    subscription_amount NUMERIC,
    estimated_total NUMERIC,
    estimated_tax NUMERIC,
    estimated_invoice_total NUMERIC
) AS $$
DECLARE
    v_store RECORD;
    v_service RECORD;
    v_subscription NUMERIC;
    v_total NUMERIC;
    v_tax NUMERIC;
BEGIN
    -- Default to current month
    IF p_period_start IS NULL THEN
        p_period_start := date_trunc('month', CURRENT_DATE)::DATE;
    END IF;
    IF p_period_end IS NULL THEN
        p_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;
    END IF;

    -- Get store commissions
    SELECT * INTO v_store FROM get_commission_summary(p_tenant_id, p_period_start, p_period_end);

    -- Get service commissions
    SELECT * INTO v_service FROM get_service_commission_summary(p_tenant_id, p_period_start, p_period_end);

    -- Get subscription
    v_subscription := get_subscription_amount(p_tenant_id);

    -- Calculate totals
    v_total := v_subscription + COALESCE(v_store.net_commission, 0) + COALESCE(v_service.net_commission, 0);
    v_tax := ROUND(v_total * 0.10, 2);

    RETURN QUERY SELECT
        COALESCE(v_store.total_orders, 0)::BIGINT,
        COALESCE(v_store.net_commission, 0)::NUMERIC,
        COALESCE(v_service.total_appointments, 0)::BIGINT,
        COALESCE(v_service.net_commission, 0)::NUMERIC,
        (COALESCE(v_store.net_commission, 0) + COALESCE(v_service.net_commission, 0))::NUMERIC,
        v_subscription::NUMERIC,
        v_total::NUMERIC,
        v_tax::NUMERIC,
        (v_total + v_tax)::NUMERIC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_combined_commission_summary IS 'Returns combined store + service commission summary with estimated invoice total';

-- =============================================================================
-- TRIGGER: CALCULATE SERVICE COMMISSION ON INVOICE PAYMENT
-- =============================================================================
-- Automatically calculates service commission when an invoice with an
-- appointment_id is marked as 'paid'.

CREATE OR REPLACE FUNCTION calculate_service_commission_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status changes TO 'paid'
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        -- Only for invoices with an appointment
        IF NEW.appointment_id IS NOT NULL THEN
            -- Calculate the commission (function handles duplicate check)
            PERFORM calculate_service_commission(NEW.appointment_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_service_commission_on_payment IS 'Trigger function to auto-calculate service commission when invoice is paid';

-- Create the trigger on invoices table
DROP TRIGGER IF EXISTS invoice_paid_calc_service_commission ON public.invoices;
CREATE TRIGGER invoice_paid_calc_service_commission
    AFTER UPDATE ON public.invoices
    FOR EACH ROW
    WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid')
    EXECUTE FUNCTION calculate_service_commission_on_payment();

-- Also handle INSERT with status='paid' (rare but possible)
DROP TRIGGER IF EXISTS invoice_insert_calc_service_commission ON public.invoices;
CREATE TRIGGER invoice_insert_calc_service_commission
    AFTER INSERT ON public.invoices
    FOR EACH ROW
    WHEN (NEW.status = 'paid' AND NEW.appointment_id IS NOT NULL)
    EXECUTE FUNCTION calculate_service_commission_on_payment();
