-- Migration: 051_atomic_cart_merge.sql
-- Description: PERF-006 - Atomic cart merge function for efficient cart operations
-- Created: January 2026

-- =============================================================================
-- CART MERGE FUNCTION
-- =============================================================================

/**
 * merge_cart_items - Atomically merge local cart items into an existing cart
 *
 * Merges items from a local (anonymous) cart into an authenticated user's cart.
 * Items with the same id (product id) and type (service/product) take the higher quantity.
 * Uses FOR UPDATE to prevent race conditions.
 *
 * @param p_cart_id UUID - The existing cart to merge into
 * @param p_local_items JSONB - Array of local cart items to merge
 * @returns JSONB - The merged items array
 *
 * Item structure expected:
 * {
 *   "id": "uuid",         -- Product or service ID
 *   "type": "product" | "service",
 *   "name": "string",
 *   "price": number,
 *   "quantity": number,
 *   "image_url": string | null,
 *   "variant_id": string | null,
 *   "variant_name": string | null,
 *   "sku": string | null,
 *   "stock": number | null
 * }
 */
CREATE OR REPLACE FUNCTION merge_cart_items(
  p_cart_id UUID,
  p_local_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_items JSONB;
  v_merged JSONB;
BEGIN
  -- Return existing if no local items
  IF p_local_items IS NULL OR jsonb_array_length(p_local_items) = 0 THEN
    SELECT items INTO v_existing_items
    FROM store_carts
    WHERE id = p_cart_id;
    RETURN COALESCE(v_existing_items, '[]'::JSONB);
  END IF;

  -- Lock the cart row for update to prevent concurrent modifications
  SELECT items INTO v_existing_items
  FROM store_carts
  WHERE id = p_cart_id
  FOR UPDATE;

  -- Handle case where cart doesn't exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cart not found: %', p_cart_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Merge using JSONB operations
  -- Key is id + type, takes higher quantity (matching current behavior)
  WITH existing AS (
    SELECT
      elem->>'id' AS item_id,
      elem->>'type' AS item_type,
      (elem->>'quantity')::INT AS quantity,
      elem AS full_item
    FROM jsonb_array_elements(COALESCE(v_existing_items, '[]'::JSONB)) elem
  ),
  local AS (
    SELECT
      elem->>'id' AS item_id,
      elem->>'type' AS item_type,
      (elem->>'quantity')::INT AS quantity,
      elem AS full_item
    FROM jsonb_array_elements(p_local_items) elem
  ),
  merged AS (
    SELECT
      COALESCE(e.item_id, l.item_id) AS item_id,
      COALESCE(e.item_type, l.item_type) AS item_type,
      -- Take higher quantity (matching current JS behavior)
      GREATEST(COALESCE(e.quantity, 0), COALESCE(l.quantity, 0)) AS quantity,
      -- Prefer existing item data, fall back to local
      COALESCE(e.full_item, l.full_item) AS base_item
    FROM existing e
    FULL OUTER JOIN local l
      ON e.item_id = l.item_id AND e.item_type = l.item_type
  )
  SELECT COALESCE(
    jsonb_agg(
      -- Update the quantity in the base item
      jsonb_set(base_item, '{quantity}', to_jsonb(quantity))
    ),
    '[]'::JSONB
  ) INTO v_merged
  FROM merged
  WHERE quantity > 0;  -- Filter out zero-quantity items

  -- Update the cart with merged items
  UPDATE store_carts
  SET
    items = v_merged,
    updated_at = NOW()
  WHERE id = p_cart_id;

  RETURN v_merged;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION merge_cart_items(UUID, JSONB) TO authenticated;

-- =============================================================================
-- HELPER: Clear cart items
-- =============================================================================

/**
 * clear_cart_items - Atomically clear all items from a cart
 *
 * @param p_cart_id UUID - The cart to clear
 * @returns BOOLEAN - True if successful
 */
CREATE OR REPLACE FUNCTION clear_cart_items(p_cart_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE store_carts
  SET
    items = '[]'::JSONB,
    updated_at = NOW()
  WHERE id = p_cart_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION clear_cart_items(UUID) TO authenticated;

-- =============================================================================
-- HELPER: Update single cart item quantity
-- =============================================================================

/**
 * update_cart_item_quantity - Atomically update quantity of a single item
 *
 * @param p_cart_id UUID - The cart
 * @param p_product_id TEXT - The product ID
 * @param p_variant_id TEXT - The variant ID (or null)
 * @param p_quantity INT - New quantity (0 removes the item)
 * @returns JSONB - Updated items array
 */
CREATE OR REPLACE FUNCTION update_cart_item_quantity(
  p_cart_id UUID,
  p_product_id TEXT,
  p_variant_id TEXT,
  p_quantity INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_items JSONB;
  v_updated JSONB;
BEGIN
  -- Lock the cart row
  SELECT items INTO v_items
  FROM store_carts
  WHERE id = p_cart_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cart not found: %', p_cart_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Update or remove the item
  IF p_quantity <= 0 THEN
    -- Remove the item
    SELECT COALESCE(
      jsonb_agg(elem),
      '[]'::JSONB
    ) INTO v_updated
    FROM jsonb_array_elements(COALESCE(v_items, '[]'::JSONB)) elem
    WHERE NOT (
      elem->>'product_id' = p_product_id
      AND (elem->>'variant_id' = p_variant_id OR (elem->>'variant_id' IS NULL AND p_variant_id IS NULL))
    );
  ELSE
    -- Update the quantity
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN elem->>'product_id' = p_product_id
               AND (elem->>'variant_id' = p_variant_id OR (elem->>'variant_id' IS NULL AND p_variant_id IS NULL))
          THEN elem || jsonb_build_object('quantity', p_quantity)
          ELSE elem
        END
      ),
      '[]'::JSONB
    ) INTO v_updated
    FROM jsonb_array_elements(COALESCE(v_items, '[]'::JSONB)) elem;
  END IF;

  -- Save the updated items
  UPDATE store_carts
  SET
    items = v_updated,
    updated_at = NOW()
  WHERE id = p_cart_id;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION update_cart_item_quantity(UUID, TEXT, TEXT, INT) TO authenticated;

-- =============================================================================
-- Add helpful comments
-- =============================================================================

COMMENT ON FUNCTION merge_cart_items(UUID, JSONB) IS
'PERF-006: Atomically merge local cart items into an existing cart.
Combines items with same product_id+variant_id by summing quantities.
Uses FOR UPDATE to prevent race conditions.';

COMMENT ON FUNCTION clear_cart_items(UUID) IS
'Clear all items from a cart atomically.';

COMMENT ON FUNCTION update_cart_item_quantity(UUID, TEXT, TEXT, INT) IS
'Update or remove a single cart item atomically.
Set quantity to 0 to remove the item.';
