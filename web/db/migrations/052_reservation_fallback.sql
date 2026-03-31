-- Migration: 052_reservation_fallback.sql
-- Description: RACE-004 - Add fallback mechanisms for cart reservation release
-- Created: January 2026

-- =============================================================================
-- EFFECTIVE AVAILABLE STOCK FUNCTION
-- =============================================================================

/**
 * get_effective_available_stock - Get available stock considering only valid reservations
 *
 * This function calculates available stock by only counting reservations from
 * carts that have been updated within the last 30 minutes. Expired reservations
 * are treated as available stock, providing a fallback if the cron job fails.
 *
 * @param p_product_id UUID - The product to check
 * @returns INT - Available stock (total - valid reservations)
 */
CREATE OR REPLACE FUNCTION get_effective_available_stock(
  p_product_id UUID
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total_stock INT;
  v_valid_reservations INT;
BEGIN
  -- Get total stock from inventory
  SELECT COALESCE(stock_quantity, 0) INTO v_total_stock
  FROM store_inventory
  WHERE product_id = p_product_id;

  -- If product not found in inventory, return 0
  IF v_total_stock IS NULL THEN
    RETURN 0;
  END IF;

  -- Get only non-expired reservations (carts updated within 30 minutes)
  -- This treats abandoned carts as available stock
  SELECT COALESCE(SUM(
    (item->>'quantity')::INT
  ), 0) INTO v_valid_reservations
  FROM store_carts c
  CROSS JOIN LATERAL jsonb_array_elements(c.items) AS item
  WHERE (item->>'id')::UUID = p_product_id
    AND c.updated_at > NOW() - INTERVAL '30 minutes';

  -- Return available stock (never negative)
  RETURN GREATEST(0, v_total_stock - v_valid_reservations);
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_effective_available_stock(UUID) TO authenticated;

-- =============================================================================
-- RELEASE EXPIRED RESERVATIONS FUNCTION
-- =============================================================================

/**
 * release_expired_reservations - Release stock from expired cart reservations
 *
 * This function can be called from the cron job or as a fallback from checkout.
 * It finds all carts older than the cutoff time and releases their reservations.
 *
 * @param p_cutoff_time TIMESTAMPTZ - Release reservations for carts older than this
 * @returns JSON - Summary of released reservations
 */
CREATE OR REPLACE FUNCTION release_expired_reservations(
  p_cutoff_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 minutes'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_expired_carts INT := 0;
  v_released_items INT := 0;
  v_cart RECORD;
  v_item JSONB;
BEGIN
  -- Find and process expired carts
  FOR v_cart IN
    SELECT id, items
    FROM store_carts
    WHERE updated_at < p_cutoff_time
      AND items IS NOT NULL
      AND jsonb_array_length(items) > 0
    FOR UPDATE SKIP LOCKED  -- Skip locked rows to avoid deadlocks
  LOOP
    v_expired_carts := v_expired_carts + 1;

    -- Count items being released
    SELECT COUNT(*) INTO v_released_items
    FROM jsonb_array_elements(v_cart.items);

    v_released_items := v_released_items + COALESCE(
      (SELECT COUNT(*)::INT FROM jsonb_array_elements(v_cart.items)), 0
    );

    -- Clear the cart items
    UPDATE store_carts
    SET items = '[]'::JSONB,
        updated_at = NOW()
    WHERE id = v_cart.id;
  END LOOP;

  RETURN jsonb_build_object(
    'expired_carts_cleared', v_expired_carts,
    'items_released', v_released_items,
    'cutoff_time', p_cutoff_time,
    'processed_at', NOW()
  );
END;
$$;

-- Grant access (service role only for cron, but checkout may need it)
GRANT EXECUTE ON FUNCTION release_expired_reservations(TIMESTAMPTZ) TO authenticated;

-- =============================================================================
-- COUNT EXPIRED RESERVATIONS (for monitoring)
-- =============================================================================

/**
 * count_expired_reservations - Count carts with expired reservations
 *
 * Used for monitoring to detect if reservations are piling up.
 *
 * @returns INT - Number of carts with expired reservations
 */
CREATE OR REPLACE FUNCTION count_expired_reservations()
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INT
  FROM store_carts
  WHERE updated_at < NOW() - INTERVAL '30 minutes'
    AND items IS NOT NULL
    AND jsonb_array_length(items) > 0;
$$;

GRANT EXECUTE ON FUNCTION count_expired_reservations() TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION get_effective_available_stock(UUID) IS
'RACE-004: Get available stock treating expired reservations (>30min) as available.
Provides fallback if cron job fails to release reservations.';

COMMENT ON FUNCTION release_expired_reservations(TIMESTAMPTZ) IS
'RACE-004: Release stock from expired cart reservations.
Can be called from cron or as fallback from checkout.';

COMMENT ON FUNCTION count_expired_reservations() IS
'RACE-004: Count carts with expired reservations for monitoring.';
