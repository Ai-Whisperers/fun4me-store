-- =============================================================================
-- 01_UNIFIED_INVENTORY.SQL
-- =============================================================================
-- Creates a unified view combining own products and catalog assigned products
-- for simplified inventory querying in the dashboard.
--
-- DEPENDENCIES: 60_store/products/01_products.sql, 60_store/inventory/01_inventory.sql,
--               60_store/procurement/01_procurement.sql
-- =============================================================================

-- =============================================================================
-- UNIFIED CLINIC INVENTORY VIEW
-- =============================================================================
-- Combines two sources of products into a single queryable view:
-- 1. Own products: store_products where tenant_id matches the clinic
-- 2. Catalog products: global products assigned via clinic_product_assignments
--
-- This simplifies the dashboard API by eliminating complex source-switching logic.

DROP VIEW IF EXISTS public.unified_clinic_inventory;

CREATE OR REPLACE VIEW public.unified_clinic_inventory AS

-- =============================================================================
-- OWN PRODUCTS (tenant_id = clinic's tenant_id)
-- =============================================================================
SELECT
    'own'::TEXT AS source,
    p.id AS product_id,
    p.sku,
    p.barcode,
    p.name,
    p.description,
    p.short_description,
    p.category_id,
    cat.name AS category_name,
    p.brand_id,
    br.name AS brand_name,
    p.image_url,
    p.purchase_unit,
    p.sale_unit,
    p.conversion_factor,
    p.purchase_price,
    p.unit_cost,
    p.base_price,
    p.sale_price,
    p.target_species,
    p.requires_prescription,
    p.is_active AS product_active,
    p.is_featured,
    p.default_supplier_id,
    p.tenant_id,
    COALESCE(i.stock_quantity, 0) AS stock_quantity,
    COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
    COALESCE(i.available_quantity, 0) AS available_quantity,
    COALESCE(i.min_stock_level, 0) AS min_stock_level,
    i.reorder_point,
    i.reorder_quantity,
    i.weighted_average_cost,
    i.location,
    i.batch_number,
    i.expiry_date,
    -- Computed stock status
    CASE
        WHEN COALESCE(i.stock_quantity, 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(i.stock_quantity, 0) <= COALESCE(i.min_stock_level, 0) THEN 'low_stock'
        ELSE 'in_stock'
    END AS stock_status,
    -- Combined active status
    p.is_active AND COALESCE(i.stock_quantity, 0) >= 0 AS is_available,
    p.created_at,
    p.updated_at,
    COALESCE(i.updated_at, p.updated_at) AS inventory_updated_at

FROM public.store_products p
LEFT JOIN public.store_categories cat ON cat.id = p.category_id
LEFT JOIN public.store_brands br ON br.id = p.brand_id
LEFT JOIN public.store_inventory i ON i.product_id = p.id AND i.tenant_id = p.tenant_id
WHERE p.tenant_id IS NOT NULL  -- Exclude global catalog products

UNION ALL

-- =============================================================================
-- CATALOG PRODUCTS (via clinic_product_assignments)
-- =============================================================================
SELECT
    'catalog'::TEXT AS source,
    p.id AS product_id,
    p.sku,
    p.barcode,
    p.name,
    p.description,
    p.short_description,
    p.category_id,
    cat.name AS category_name,
    p.brand_id,
    br.name AS brand_name,
    p.image_url,
    p.purchase_unit,
    p.sale_unit,
    p.conversion_factor,
    p.purchase_price,
    p.unit_cost,
    -- Use clinic-specific price if set, otherwise base_price
    COALESCE(cpa.sale_price, p.base_price) AS base_price,
    p.sale_price,
    p.target_species,
    -- Use clinic override if set, otherwise product default
    COALESCE(cpa.requires_prescription, p.requires_prescription) AS requires_prescription,
    p.is_active AND cpa.is_active AS product_active,
    p.is_featured,
    p.default_supplier_id,
    cpa.tenant_id,
    COALESCE(i.stock_quantity, 0) AS stock_quantity,
    COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
    COALESCE(i.available_quantity, 0) AS available_quantity,
    COALESCE(cpa.min_stock_level, i.min_stock_level, 0) AS min_stock_level,
    i.reorder_point,
    i.reorder_quantity,
    i.weighted_average_cost,
    COALESCE(cpa.location, i.location) AS location,
    i.batch_number,
    i.expiry_date,
    -- Computed stock status
    CASE
        WHEN COALESCE(i.stock_quantity, 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(i.stock_quantity, 0) <= COALESCE(cpa.min_stock_level, i.min_stock_level, 0) THEN 'low_stock'
        ELSE 'in_stock'
    END AS stock_status,
    -- Combined active status
    p.is_active AND cpa.is_active AND COALESCE(i.stock_quantity, 0) >= 0 AS is_available,
    cpa.created_at,
    cpa.updated_at,
    COALESCE(i.updated_at, cpa.updated_at) AS inventory_updated_at

FROM public.clinic_product_assignments cpa
JOIN public.store_products p ON p.id = cpa.catalog_product_id
LEFT JOIN public.store_categories cat ON cat.id = p.category_id
LEFT JOIN public.store_brands br ON br.id = p.brand_id
LEFT JOIN public.store_inventory i ON i.product_id = p.id AND i.tenant_id = cpa.tenant_id
WHERE p.is_global_catalog = true OR p.tenant_id IS NULL;

COMMENT ON VIEW public.unified_clinic_inventory IS 'Unified view of clinic inventory combining own products and catalog assigned products';


-- =============================================================================
-- HELPER FUNCTION: Get unified inventory for a tenant
-- =============================================================================
-- More efficient than querying the view directly with WHERE tenant_id = ?
-- because it can use set-returning function optimizations.

CREATE OR REPLACE FUNCTION get_clinic_inventory(
    p_tenant_id TEXT,
    p_source TEXT DEFAULT NULL,         -- 'own', 'catalog', or NULL for all
    p_category_id UUID DEFAULT NULL,
    p_stock_status TEXT DEFAULT NULL,   -- 'in_stock', 'low_stock', 'out_of_stock'
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.unified_clinic_inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.unified_clinic_inventory u
    WHERE u.tenant_id = p_tenant_id
      AND (p_source IS NULL OR u.source = p_source)
      AND (p_category_id IS NULL OR u.category_id = p_category_id)
      AND (p_stock_status IS NULL OR u.stock_status = p_stock_status)
      AND (p_search IS NULL OR u.name ILIKE '%' || p_search || '%' OR u.sku ILIKE '%' || p_search || '%')
      AND u.product_active = true
    ORDER BY u.name
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_clinic_inventory IS 'Get unified inventory for a tenant with optional filters';


-- =============================================================================
-- HELPER FUNCTION: Get inventory stats for a tenant
-- =============================================================================
CREATE OR REPLACE FUNCTION get_inventory_stats(p_tenant_id TEXT)
RETURNS TABLE (
    total_products BIGINT,
    total_stock NUMERIC,
    low_stock_count BIGINT,
    out_of_stock_count BIGINT,
    expiring_soon_count BIGINT,
    total_value NUMERIC,
    own_products_count BIGINT,
    catalog_products_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_products,
        COALESCE(SUM(u.stock_quantity), 0)::NUMERIC AS total_stock,
        COUNT(*) FILTER (WHERE u.stock_status = 'low_stock')::BIGINT AS low_stock_count,
        COUNT(*) FILTER (WHERE u.stock_status = 'out_of_stock')::BIGINT AS out_of_stock_count,
        COUNT(*) FILTER (WHERE u.expiry_date IS NOT NULL AND u.expiry_date <= CURRENT_DATE + INTERVAL '30 days')::BIGINT AS expiring_soon_count,
        COALESCE(SUM(u.stock_quantity * COALESCE(u.weighted_average_cost, u.unit_cost, 0)), 0)::NUMERIC AS total_value,
        COUNT(*) FILTER (WHERE u.source = 'own')::BIGINT AS own_products_count,
        COUNT(*) FILTER (WHERE u.source = 'catalog')::BIGINT AS catalog_products_count
    FROM public.unified_clinic_inventory u
    WHERE u.tenant_id = p_tenant_id
      AND u.product_active = true;
END;
$$;

COMMENT ON FUNCTION get_inventory_stats IS 'Get summary statistics for a clinic inventory';


-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================
-- The view inherits RLS from underlying tables, but we need to grant SELECT

GRANT SELECT ON public.unified_clinic_inventory TO authenticated;
GRANT SELECT ON public.unified_clinic_inventory TO service_role;

GRANT EXECUTE ON FUNCTION get_clinic_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION get_clinic_inventory TO service_role;

GRANT EXECUTE ON FUNCTION get_inventory_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_stats TO service_role;
