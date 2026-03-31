-- =============================================================================
-- 016_PRODUCT_BARCODES.SQL
-- =============================================================================
-- Add barcode field to store_products for scanner support
-- Supports EAN-13, UPC-A, Code128 and other standard barcode formats
--
-- DEPENDENCIES: 60_store/01_schema.sql (store_products table)
-- =============================================================================

-- =============================================================================
-- ADD BARCODE COLUMN
-- =============================================================================
-- Add barcode column to store_products if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'store_products'
        AND column_name = 'barcode'
    ) THEN
        ALTER TABLE public.store_products ADD COLUMN barcode TEXT;
    END IF;
END
$$;

-- =============================================================================
-- INDEX FOR BARCODE LOOKUPS
-- =============================================================================
-- Create partial index for fast barcode lookups (only non-null barcodes)
DROP INDEX IF EXISTS idx_store_products_barcode;
CREATE INDEX idx_store_products_barcode
    ON public.store_products(barcode)
    WHERE barcode IS NOT NULL AND deleted_at IS NULL;

-- Unique constraint per tenant to prevent duplicate barcodes within a clinic
-- (different clinics can have the same barcode)
DROP INDEX IF EXISTS idx_store_products_barcode_unique_per_tenant;
CREATE UNIQUE INDEX idx_store_products_barcode_unique_per_tenant
    ON public.store_products(tenant_id, barcode)
    WHERE barcode IS NOT NULL AND barcode != '' AND deleted_at IS NULL;

-- =============================================================================
-- HELPER FUNCTION FOR BARCODE LOOKUP
-- =============================================================================
-- Function to find a product by barcode within a tenant
CREATE OR REPLACE FUNCTION public.find_product_by_barcode(
    p_tenant_id TEXT,
    p_barcode TEXT
)
RETURNS TABLE (
    id UUID,
    sku TEXT,
    name TEXT,
    base_price NUMERIC,
    stock_quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.sku,
        p.name,
        p.base_price,
        COALESCE(i.stock_quantity, 0)::INTEGER as stock_quantity
    FROM public.store_products p
    LEFT JOIN public.store_inventory i ON i.product_id = p.id
    WHERE p.tenant_id = p_tenant_id
      AND p.barcode = p_barcode
      AND p.deleted_at IS NULL
      AND p.is_active = true
    LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.find_product_by_barcode(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON COLUMN public.store_products.barcode IS
    'Product barcode (EAN-13, UPC-A, Code128, etc.) for scanner support. Added in migration 016.';
COMMENT ON FUNCTION public.find_product_by_barcode(TEXT, TEXT) IS
    'Find a product by barcode within a specific tenant. Returns product info with current stock.';
