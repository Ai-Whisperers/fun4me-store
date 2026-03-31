-- =============================================================================
-- COMMISSION CALCULATION FUNCTIONS
-- =============================================================================
-- PostgreSQL functions for commission rate calculation and order processing.
--
-- DEPENDENCIES: 60_store/commissions/01_commissions.sql
-- =============================================================================

-- =============================================================================
-- GET COMMISSION RATE
-- =============================================================================
-- Returns the commission rate for a tenant based on their tier and months active.
-- Rates:
--   - Initial (first 6 months): 3%
--   - Standard (after 6 months): 5%
--   - Enterprise (negotiated): 2%

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

    -- No start date = new store, use initial rate
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

COMMENT ON FUNCTION get_commission_rate IS 'Returns commission rate for a tenant: 3% (initial/first 6mo), 5% (standard), 2% (enterprise)';

-- =============================================================================
-- GET RATE TYPE
-- =============================================================================
-- Returns the rate type string based on tenant's tier and months active.

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

    -- Explicit tier overrides
    IF v_tier IN ('enterprise', 'standard', 'initial') THEN
        RETURN v_tier;
    END IF;

    -- No start date = new store
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

COMMENT ON FUNCTION get_commission_rate_type IS 'Returns rate type string: initial, standard, or enterprise';

-- =============================================================================
-- CALCULATE ORDER COMMISSION
-- =============================================================================
-- Calculates and records commission for a paid order.
-- Should be called after order payment is confirmed.

CREATE OR REPLACE FUNCTION calculate_order_commission(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
    v_order RECORD;
    v_rate NUMERIC;
    v_rate_type TEXT;
    v_months INTEGER;
    v_commissionable NUMERIC;
    v_commission_id UUID;
    v_start_date DATE;
BEGIN
    -- Get order details with tenant info
    SELECT
        o.id,
        o.tenant_id,
        o.total,
        COALESCE(o.shipping_cost, 0) as shipping_cost,
        COALESCE(o.tax_amount, 0) as tax_amount,
        t.ecommerce_start_date,
        t.commission_tier
    INTO v_order
    FROM store_orders o
    JOIN tenants t ON t.id = o.tenant_id
    WHERE o.id = p_order_id AND o.payment_status = 'paid';

    IF NOT FOUND THEN
        RETURN NULL; -- Order not found or not paid
    END IF;

    -- Check if already calculated
    IF EXISTS (SELECT 1 FROM store_commissions WHERE order_id = p_order_id) THEN
        RETURN (SELECT id FROM store_commissions WHERE order_id = p_order_id);
    END IF;

    -- Calculate rate and type
    v_rate := get_commission_rate(v_order.tenant_id);
    v_rate_type := get_commission_rate_type(v_order.tenant_id);

    -- Calculate months active
    IF v_order.ecommerce_start_date IS NULL THEN
        v_months := 0;
        -- Set start date on first order
        UPDATE tenants SET ecommerce_start_date = CURRENT_DATE WHERE id = v_order.tenant_id;
    ELSE
        v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_order.ecommerce_start_date)) +
                    EXTRACT(YEAR FROM age(CURRENT_DATE, v_order.ecommerce_start_date)) * 12;
    END IF;

    -- Calculate commissionable amount (total - shipping - tax)
    v_commissionable := GREATEST(0, v_order.total - v_order.shipping_cost - v_order.tax_amount);

    -- Insert commission record
    INSERT INTO store_commissions (
        order_id,
        tenant_id,
        order_total,
        shipping_amount,
        tax_amount,
        commissionable_amount,
        commission_rate,
        commission_amount,
        rate_type,
        months_active
    ) VALUES (
        p_order_id,
        v_order.tenant_id,
        v_order.total,
        v_order.shipping_cost,
        v_order.tax_amount,
        v_commissionable,
        v_rate,
        ROUND(v_commissionable * v_rate, 2),
        v_rate_type,
        v_months
    ) RETURNING id INTO v_commission_id;

    RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_order_commission IS 'Calculates and records commission for a paid order. Returns commission ID or NULL if order not valid.';

-- =============================================================================
-- ADJUST COMMISSION FOR REFUND
-- =============================================================================
-- Adjusts commission when an order is refunded (fully or partially).

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

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Calculate proportional commission refund
    IF v_commission.order_total > 0 THEN
        v_refund_ratio := p_refund_amount / v_commission.order_total;
    ELSE
        v_refund_ratio := 1;
    END IF;

    v_commission_refund := ROUND(v_commission.commission_amount * v_refund_ratio, 2);

    UPDATE store_commissions
    SET
        original_commission = COALESCE(original_commission, commission_amount),
        commission_amount = commission_amount - v_commission_refund,
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

COMMENT ON FUNCTION adjust_commission_for_refund IS 'Adjusts commission proportionally when order is refunded. Returns TRUE on success.';

-- =============================================================================
-- GET TENANT COMMISSION SUMMARY
-- =============================================================================
-- Returns commission summary for a tenant in a given period.

CREATE OR REPLACE FUNCTION get_commission_summary(
    p_tenant_id TEXT,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
    total_orders BIGINT,
    total_gmv NUMERIC,
    total_commissionable NUMERIC,
    total_commission NUMERIC,
    total_refunds NUMERIC,
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
        COUNT(*)::BIGINT as total_orders,
        COALESCE(SUM(order_total), 0)::NUMERIC as total_gmv,
        COALESCE(SUM(commissionable_amount), 0)::NUMERIC as total_commissionable,
        COALESCE(SUM(COALESCE(original_commission, commission_amount)), 0)::NUMERIC as total_commission,
        COALESCE(SUM(refund_amount), 0)::NUMERIC as total_refunds,
        COALESCE(SUM(commission_amount), 0)::NUMERIC as net_commission,
        CASE
            WHEN SUM(commissionable_amount) > 0
            THEN ROUND(SUM(commission_amount) / SUM(commissionable_amount), 4)
            ELSE 0
        END::NUMERIC as avg_rate
    FROM store_commissions
    WHERE tenant_id = p_tenant_id
    AND calculated_at::DATE BETWEEN p_period_start AND p_period_end
    AND status != 'waived';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_commission_summary IS 'Returns commission summary for a tenant in the specified period';

-- =============================================================================
-- GET PLATFORM COMMISSION SUMMARY
-- =============================================================================
-- Returns platform-wide commission summary (for Vetic admin dashboard).

CREATE OR REPLACE FUNCTION get_platform_commission_summary(
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
    total_clinics BIGINT,
    total_orders BIGINT,
    total_gmv NUMERIC,
    total_commission NUMERIC,
    total_refunds NUMERIC,
    net_commission NUMERIC,
    pending_invoiced NUMERIC,
    paid_collected NUMERIC
) AS $$
BEGIN
    -- Default to current month
    IF p_period_start IS NULL THEN
        p_period_start := date_trunc('month', CURRENT_DATE)::DATE;
    END IF;
    IF p_period_end IS NULL THEN
        p_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;
    END IF;

    RETURN QUERY
    SELECT
        COUNT(DISTINCT sc.tenant_id)::BIGINT as total_clinics,
        COUNT(*)::BIGINT as total_orders,
        COALESCE(SUM(sc.order_total), 0)::NUMERIC as total_gmv,
        COALESCE(SUM(COALESCE(sc.original_commission, sc.commission_amount)), 0)::NUMERIC as total_commission,
        COALESCE(SUM(sc.refund_amount), 0)::NUMERIC as total_refunds,
        COALESCE(SUM(sc.commission_amount), 0)::NUMERIC as net_commission,
        COALESCE(SUM(CASE WHEN sc.status IN ('calculated', 'invoiced') THEN sc.commission_amount ELSE 0 END), 0)::NUMERIC as pending_invoiced,
        COALESCE(SUM(CASE WHEN sc.status = 'paid' THEN sc.commission_amount ELSE 0 END), 0)::NUMERIC as paid_collected
    FROM store_commissions sc
    WHERE sc.calculated_at::DATE BETWEEN p_period_start AND p_period_end
    AND sc.status != 'waived';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_platform_commission_summary IS 'Returns platform-wide commission summary for admin dashboard';

-- =============================================================================
-- GENERATE COMMISSION INVOICE
-- =============================================================================
-- Generates a monthly commission invoice for a tenant.
-- Aggregates all calculated commissions for the period.

CREATE OR REPLACE FUNCTION generate_commission_invoice(
    p_tenant_id TEXT,
    p_period_start DATE,
    p_period_end DATE
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_summary RECORD;
    v_year INTEGER;
    v_month INTEGER;
BEGIN
    -- Get period info
    v_year := EXTRACT(YEAR FROM p_period_start);
    v_month := EXTRACT(MONTH FROM p_period_start);

    -- Generate invoice number: COM-TENANTID-YYYYMM-SEQ
    v_invoice_number := 'COM-' || UPPER(LEFT(p_tenant_id, 8)) || '-' ||
                        v_year::TEXT || LPAD(v_month::TEXT, 2, '0');

    -- Check if invoice already exists for this period
    IF EXISTS (
        SELECT 1 FROM store_commission_invoices
        WHERE tenant_id = p_tenant_id
        AND period_start = p_period_start
        AND period_end = p_period_end
    ) THEN
        RETURN (
            SELECT id FROM store_commission_invoices
            WHERE tenant_id = p_tenant_id
            AND period_start = p_period_start
            AND period_end = p_period_end
        );
    END IF;

    -- Get summary for the period
    SELECT * INTO v_summary
    FROM get_commission_summary(p_tenant_id, p_period_start, p_period_end);

    -- Skip if no commissions
    IF v_summary.total_orders = 0 OR v_summary.net_commission <= 0 THEN
        RETURN NULL;
    END IF;

    -- Create invoice
    INSERT INTO store_commission_invoices (
        tenant_id,
        invoice_number,
        period_start,
        period_end,
        total_orders,
        total_gmv,
        total_commission,
        adjustments,
        amount_due,
        status,
        due_date
    ) VALUES (
        p_tenant_id,
        v_invoice_number,
        p_period_start,
        p_period_end,
        v_summary.total_orders::INTEGER,
        v_summary.total_gmv,
        v_summary.total_commission,
        -v_summary.total_refunds, -- Refunds reduce commission (negative adjustment)
        v_summary.net_commission,
        'draft',
        p_period_end + interval '15 days' -- Due 15 days after period end
    ) RETURNING id INTO v_invoice_id;

    -- Link commissions to invoice
    UPDATE store_commissions
    SET
        invoice_id = v_invoice_id,
        status = 'invoiced',
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id
    AND calculated_at::DATE BETWEEN p_period_start AND p_period_end
    AND status = 'calculated';

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_commission_invoice IS 'Generates monthly commission invoice for a tenant, linking all calculated commissions';
