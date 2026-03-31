-- =============================================================================
-- 03_EXPIRY_ALERTS.SQL
-- =============================================================================
-- Enhanced expiry tracking with multi-day warnings
--
-- DEPENDENCIES: 60_store/inventory/01_inventory.sql
-- =============================================================================

-- =============================================================================
-- EXPIRING PRODUCTS FUNCTION (with configurable threshold)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_expiring_products(
    p_tenant_id TEXT,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    id UUID,
    tenant_id TEXT,
    name TEXT,
    sku TEXT,
    image_url TEXT,
    stock_quantity INTEGER,
    expiry_date DATE,
    batch_number TEXT,
    category_name TEXT,
    days_until_expiry INTEGER,
    urgency_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.tenant_id,
        p.name,
        p.sku,
        p.image_url,
        i.stock_quantity,
        i.expiry_date,
        i.batch_number,
        c.name AS category_name,
        (i.expiry_date - CURRENT_DATE)::INTEGER AS days_until_expiry,
        CASE
            WHEN i.expiry_date < CURRENT_DATE THEN 'expired'
            WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
            WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'high'
            WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'medium'
            ELSE 'low'
        END AS urgency_level
    FROM public.store_products p
    INNER JOIN public.store_inventory i ON p.id = i.product_id
    LEFT JOIN public.store_categories c ON p.category_id = c.id
    WHERE p.tenant_id = p_tenant_id
      AND i.expiry_date IS NOT NULL
      AND i.expiry_date <= CURRENT_DATE + (p_days || ' days')::INTERVAL
      AND i.stock_quantity > 0
      AND p.is_active = TRUE
      AND p.deleted_at IS NULL
    ORDER BY i.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_expiring_products IS 'Get products expiring within specified days with urgency level';

-- =============================================================================
-- EXPIRED PRODUCTS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.expired_products AS
SELECT
    p.id,
    p.tenant_id,
    p.name,
    p.sku,
    p.image_url,
    i.stock_quantity,
    i.expiry_date,
    i.batch_number,
    c.name AS category_name,
    (CURRENT_DATE - i.expiry_date) AS days_expired
FROM public.store_products p
INNER JOIN public.store_inventory i ON p.id = i.product_id
LEFT JOIN public.store_categories c ON p.category_id = c.id
WHERE i.expiry_date IS NOT NULL
  AND i.expiry_date < CURRENT_DATE
  AND i.stock_quantity > 0
  AND p.is_active = TRUE
  AND p.deleted_at IS NULL
ORDER BY i.expiry_date ASC;

COMMENT ON VIEW public.expired_products IS 'Products that have already expired but still have stock';

-- =============================================================================
-- EXPIRY SUMMARY FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION get_expiry_summary(p_tenant_id TEXT)
RETURNS TABLE (
    urgency_level TEXT,
    product_count BIGINT,
    total_units BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN i.expiry_date < CURRENT_DATE THEN 'expired'
            WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
            WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'high'
            WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'medium'
            WHEN i.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'low'
            ELSE 'safe'
        END AS urgency_level,
        COUNT(DISTINCT p.id) AS product_count,
        SUM(i.stock_quantity) AS total_units
    FROM public.store_products p
    INNER JOIN public.store_inventory i ON p.id = i.product_id
    WHERE p.tenant_id = p_tenant_id
      AND i.expiry_date IS NOT NULL
      AND i.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
      AND i.stock_quantity > 0
      AND p.is_active = TRUE
      AND p.deleted_at IS NULL
    GROUP BY urgency_level
    ORDER BY
        CASE urgency_level
            WHEN 'expired' THEN 1
            WHEN 'critical' THEN 2
            WHEN 'high' THEN 3
            WHEN 'medium' THEN 4
            WHEN 'low' THEN 5
            ELSE 6
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_expiry_summary IS 'Get summary of products by expiry urgency level';

-- =============================================================================
-- EXPIRY ALERT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.expiry_alert_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('30_days', '14_days', '7_days', 'expired')),
    alerted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_profiles UUID[] DEFAULT '{}'::UUID[],

    -- Prevent duplicate alerts for same product/type
    CONSTRAINT expiry_alert_unique UNIQUE(product_id, alert_type)
);

COMMENT ON TABLE public.expiry_alert_log IS 'Track which expiry alerts have been sent to avoid duplicates';

CREATE INDEX IF NOT EXISTS idx_expiry_alert_log_tenant
    ON public.expiry_alert_log(tenant_id);

CREATE INDEX IF NOT EXISTS idx_expiry_alert_log_product
    ON public.expiry_alert_log(product_id);

ALTER TABLE public.expiry_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view tenant alerts" ON public.expiry_alert_log
    FOR SELECT
    USING (is_staff_of(tenant_id));

CREATE POLICY "System insert alerts" ON public.expiry_alert_log
    FOR INSERT
    WITH CHECK (true);
