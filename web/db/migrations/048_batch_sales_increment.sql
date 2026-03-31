-- =============================================================================
-- MIGRATION 048: Batch Sales Increment Function
-- =============================================================================
-- PERF-003: Replace N individual RPC calls with single batch operation
--
-- Performance improvement: 10 items = ~450ms saved
-- =============================================================================

-- Drop existing single-item function if it exists (we'll keep it for backward compatibility)
-- CREATE OR REPLACE handles this gracefully

-- =============================================================================
-- BATCH INCREMENT FUNCTION
-- =============================================================================
-- Accepts JSONB array of {product_id, quantity} objects
-- Updates all products in a single UPDATE statement
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_product_sales_batch(
  p_items JSONB  -- Array of {product_id, quantity}
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Exit early if empty array
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN;
  END IF;

  -- Single UPDATE statement for all products
  UPDATE store_products
  SET
    sales_count = COALESCE(sales_count, 0) + (item->>'quantity')::INT,
    updated_at = NOW()
  FROM jsonb_array_elements(p_items) AS item
  WHERE id = (item->>'product_id')::UUID;
END;
$$;

COMMENT ON FUNCTION public.increment_product_sales_batch(JSONB) IS
  'PERF-003: Batch update product sales counts in single DB operation';

-- =============================================================================
-- ENSURE SINGLE-ITEM FUNCTION EXISTS (backwards compatibility)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_product_sales(
  p_product_id UUID,
  p_quantity INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE store_products
  SET
    sales_count = COALESCE(sales_count, 0) + p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$;

COMMENT ON FUNCTION public.increment_product_sales(UUID, INT) IS
  'Increment sales count for single product. Prefer batch function for multiple items.';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.increment_product_sales_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_sales_batch(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_product_sales(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_sales(UUID, INT) TO service_role;

-- =============================================================================
-- ADD sales_count COLUMN IF NOT EXISTS
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'store_products'
    AND column_name = 'sales_count'
  ) THEN
    ALTER TABLE public.store_products ADD COLUMN sales_count INT DEFAULT 0;
    COMMENT ON COLUMN public.store_products.sales_count IS 'Number of units sold (for popularity sorting)';
  END IF;
END $$;

-- Index for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_store_products_sales_count
  ON public.store_products(sales_count DESC NULLS LAST)
  WHERE is_active = true AND deleted_at IS NULL;
