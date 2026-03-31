-- =============================================================================
-- 043_CUSTOMER_ANALYTICS_FUNCTION.SQL
-- =============================================================================
-- Moves customer analytics computation from TypeScript to PostgreSQL for
-- significantly better performance on large datasets.
--
-- PROBLEM: Current analytics endpoint fetches ALL orders + ALL profiles into
-- memory and computes metrics in TypeScript (O(n^2) for large clinics).
--
-- SOLUTION: Use database aggregation with window functions.
-- Expected improvement: 10-100x faster, no memory issues.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_customer_analytics(
    p_tenant_id TEXT,
    p_period_days INTEGER DEFAULT 90
)
RETURNS JSONB AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_now TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    v_now := NOW();
    v_start_date := v_now - (p_period_days || ' days')::INTERVAL;

    WITH order_stats AS (
        SELECT
            o.user_id,
            COUNT(*)::INTEGER as total_orders,
            SUM(o.total)::NUMERIC as total_spent,
            AVG(o.total)::NUMERIC as avg_order_value,
            MIN(o.created_at) as first_order_date,
            MAX(o.created_at) as last_order_date,
            COUNT(*) FILTER (WHERE o.created_at >= v_start_date)::INTEGER as orders_in_period
        FROM store_orders o
        WHERE o.tenant_id = p_tenant_id
        AND o.status IN ('delivered', 'shipped', 'confirmed', 'processing', 'pending')
        AND o.user_id IS NOT NULL
        GROUP BY o.user_id
    ),
    customer_metrics AS (
        SELECT
            os.user_id,
            COALESCE(p.full_name, 'Sin nombre') as name,
            COALESCE(p.email, '') as email,
            os.total_orders,
            os.total_spent,
            ROUND(os.avg_order_value)::INTEGER as avg_order_value,
            os.first_order_date,
            os.last_order_date,
            EXTRACT(EPOCH FROM (v_now - os.last_order_date)) / 86400 as days_since_last_order,
            COALESCE(lp.balance, 0)::INTEGER as loyalty_points,
            CASE
                WHEN os.total_spent >= 2000000 OR os.total_orders >= 10 THEN 'vip'
                WHEN EXTRACT(EPOCH FROM (v_now - os.last_order_date)) / 86400 > 120 THEN 'dormant'
                WHEN EXTRACT(EPOCH FROM (v_now - os.last_order_date)) / 86400 > 60 THEN 'at_risk'
                WHEN os.total_orders = 1 AND EXTRACT(EPOCH FROM (v_now - os.last_order_date)) / 86400 <= 30 THEN 'new'
                ELSE 'regular'
            END as segment,
            os.orders_in_period,
            CASE
                WHEN os.total_orders < 2 THEN 'single'
                WHEN EXTRACT(EPOCH FROM (os.last_order_date - os.first_order_date)) / 86400 / NULLIF(os.total_orders - 1, 0) <= 7 THEN 'weekly'
                WHEN EXTRACT(EPOCH FROM (os.last_order_date - os.first_order_date)) / 86400 / NULLIF(os.total_orders - 1, 0) <= 14 THEN 'biweekly'
                WHEN EXTRACT(EPOCH FROM (os.last_order_date - os.first_order_date)) / 86400 / NULLIF(os.total_orders - 1, 0) <= 30 THEN 'monthly'
                WHEN EXTRACT(EPOCH FROM (os.last_order_date - os.first_order_date)) / 86400 / NULLIF(os.total_orders - 1, 0) <= 90 THEN 'quarterly'
                WHEN EXTRACT(EPOCH FROM (os.last_order_date - os.first_order_date)) / 86400 / NULLIF(os.total_orders - 1, 0) <= 365 THEN 'yearly'
                ELSE 'infrequent'
            END as frequency_bucket
        FROM order_stats os
        JOIN profiles p ON p.id = os.user_id
        LEFT JOIN loyalty_points lp ON lp.client_id = os.user_id AND lp.tenant_id = p_tenant_id
    ),
    segment_agg AS (
        SELECT
            segment,
            COUNT(*)::INTEGER as count,
            SUM(total_spent)::NUMERIC as total_revenue,
            ROUND(AVG(avg_order_value))::INTEGER as avg_order_value
        FROM customer_metrics
        GROUP BY segment
    ),
    frequency_agg AS (
        SELECT
            frequency_bucket,
            COUNT(*)::INTEGER as count
        FROM customer_metrics
        WHERE total_orders >= 2
        GROUP BY frequency_bucket
    ),
    summary_stats AS (
        SELECT
            COUNT(*)::INTEGER as total_customers,
            COUNT(*) FILTER (WHERE orders_in_period > 0)::INTEGER as active_customers,
            COUNT(*) FILTER (WHERE first_order_date >= v_start_date)::INTEGER as new_customers_period,
            ROUND(100.0 * COUNT(*) FILTER (WHERE total_orders > 1) / NULLIF(COUNT(*), 0))::INTEGER as repeat_purchase_rate,
            ROUND(SUM(total_spent) / NULLIF(COUNT(*), 0))::INTEGER as avg_customer_lifetime_value,
            ROUND(10.0 * SUM(total_orders) / NULLIF(COUNT(*), 0)) / 10 as avg_orders_per_customer,
            ROUND(SUM(total_spent) / NULLIF(SUM(total_orders), 0))::INTEGER as avg_basket_size
        FROM customer_metrics
    )
    SELECT jsonb_build_object(
        'summary', (
            SELECT jsonb_build_object(
                'total_customers', total_customers,
                'active_customers', active_customers,
                'new_customers_period', new_customers_period,
                'repeat_purchase_rate', repeat_purchase_rate,
                'avg_customer_lifetime_value', avg_customer_lifetime_value,
                'avg_orders_per_customer', avg_orders_per_customer,
                'avg_basket_size', avg_basket_size
            )
            FROM summary_stats
        ),
        'segments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'segment', segment,
                    'count', count,
                    'total_revenue', total_revenue,
                    'avg_order_value', avg_order_value,
                    'percentage', ROUND(100.0 * count / NULLIF((SELECT total_customers FROM summary_stats), 0))::INTEGER
                )
            ), '[]'::jsonb)
            FROM segment_agg
        ),
        'topCustomers', (
            SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.total_spent DESC), '[]'::jsonb)
            FROM (
                SELECT
                    user_id as id,
                    name,
                    email,
                    segment,
                    total_orders,
                    total_spent,
                    avg_order_value,
                    first_order_date,
                    last_order_date,
                    ROUND(days_since_last_order)::INTEGER as days_since_last_order,
                    loyalty_points
                FROM customer_metrics
                ORDER BY total_spent DESC
                LIMIT 20
            ) t
        ),
        'atRiskCustomers', (
            SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.total_spent DESC), '[]'::jsonb)
            FROM (
                SELECT
                    user_id as id,
                    name,
                    email,
                    segment,
                    total_orders,
                    total_spent,
                    avg_order_value,
                    first_order_date,
                    last_order_date,
                    ROUND(days_since_last_order)::INTEGER as days_since_last_order,
                    loyalty_points
                FROM customer_metrics
                WHERE segment IN ('at_risk', 'dormant')
                ORDER BY total_spent DESC
                LIMIT 20
            ) t
        ),
        'generatedAt', v_now
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_customer_analytics(TEXT, INTEGER) IS
'Efficiently computes customer analytics and segmentation using database aggregation.
Returns: summary, segments, topCustomers, atRiskCustomers, generatedAt';

GRANT EXECUTE ON FUNCTION public.get_customer_analytics(TEXT, INTEGER) TO authenticated;
