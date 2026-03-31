-- Migration: Atomic Order Creation with Stock Decrement
-- Purpose: Fix race condition where order is created but stock decrement fails
-- Issue: DB-C3 - Overselling, inventory corruption
-- Created: 2026-01-06

-- Create type for order item input
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_item_input') THEN
    CREATE TYPE order_item_input AS (
      product_id UUID,
      variant_id UUID,
      product_name TEXT,
      variant_name TEXT,
      quantity INT,
      unit_price NUMERIC,
      discount_amount NUMERIC,
      line_total NUMERIC,
      requires_prescription BOOLEAN
    );
  END IF;
END $$;

-- Create function for atomic order creation with stock validation
CREATE OR REPLACE FUNCTION create_order_atomic(
  p_tenant_id TEXT,
  p_user_id UUID,
  p_order_number TEXT,
  p_status TEXT,
  p_subtotal NUMERIC,
  p_discount_amount NUMERIC,
  p_coupon_id UUID,
  p_coupon_code TEXT,
  p_shipping_cost NUMERIC,
  p_tax_rate NUMERIC,
  p_tax_amount NUMERIC,
  p_total NUMERIC,
  p_shipping_address JSONB,
  p_billing_address JSONB,
  p_shipping_method TEXT,
  p_payment_method TEXT,
  p_notes TEXT,
  p_requires_prescription_review BOOLEAN,
  p_items JSONB -- Array of {product_id, variant_id, product_name, variant_name, quantity, unit_price, discount_amount, line_total, requires_prescription}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INT;
  v_current_stock INT;
  v_product_name TEXT;
  v_insufficient_stock JSONB := '[]'::JSONB;
BEGIN
  -- Step 1: Check and lock all stock rows (SELECT FOR UPDATE prevents race conditions)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INT;

    -- Lock the inventory row and get current stock
    SELECT si.stock_quantity INTO v_current_stock
    FROM store_inventory si
    WHERE si.product_id = v_product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      -- No inventory record exists
      v_insufficient_stock := v_insufficient_stock || jsonb_build_object(
        'product_id', v_product_id,
        'product_name', v_item->>'product_name',
        'requested', v_quantity,
        'available', 0,
        'error', 'no_inventory_record'
      );
    ELSIF v_current_stock < v_quantity THEN
      -- Insufficient stock
      v_insufficient_stock := v_insufficient_stock || jsonb_build_object(
        'product_id', v_product_id,
        'product_name', v_item->>'product_name',
        'requested', v_quantity,
        'available', v_current_stock
      );
    END IF;
  END LOOP;

  -- If any stock is insufficient, abort the entire transaction
  IF jsonb_array_length(v_insufficient_stock) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_STOCK',
      'details', v_insufficient_stock
    );
  END IF;

  -- Step 2: Decrement all stock (already locked, so this is safe)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INT;

    UPDATE store_inventory
    SET stock_quantity = stock_quantity - v_quantity,
        updated_at = NOW()
    WHERE product_id = v_product_id;
  END LOOP;

  -- Step 3: Create the order
  INSERT INTO store_orders (
    tenant_id,
    user_id,
    order_number,
    status,
    subtotal,
    discount_amount,
    coupon_id,
    coupon_code,
    shipping_cost,
    tax_rate,
    tax_amount,
    total,
    shipping_address,
    billing_address,
    shipping_method,
    payment_method,
    notes,
    requires_prescription_review,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_user_id,
    p_order_number,
    p_status,
    p_subtotal,
    p_discount_amount,
    p_coupon_id,
    p_coupon_code,
    p_shipping_cost,
    p_tax_rate,
    p_tax_amount,
    p_total,
    p_shipping_address,
    p_billing_address,
    p_shipping_method,
    p_payment_method,
    p_notes,
    p_requires_prescription_review,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_order_id;

  -- Step 4: Create order items
  INSERT INTO store_order_items (
    order_id,
    tenant_id,
    product_id,
    variant_id,
    product_name,
    variant_name,
    quantity,
    unit_price,
    discount_amount,
    line_total,
    requires_prescription,
    created_at
  )
  SELECT
    v_order_id,
    p_tenant_id,
    (item->>'product_id')::UUID,
    NULLIF(item->>'variant_id', '')::UUID,
    item->>'product_name',
    NULLIF(item->>'variant_name', ''),
    (item->>'quantity')::INT,
    (item->>'unit_price')::NUMERIC,
    COALESCE((item->>'discount_amount')::NUMERIC, 0),
    (item->>'line_total')::NUMERIC,
    COALESCE((item->>'requires_prescription')::BOOLEAN, false),
    NOW()
  FROM jsonb_array_elements(p_items) AS item;

  -- Return success with order ID
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Any error will cause automatic rollback of the entire transaction
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_order_atomic TO authenticated;

COMMENT ON FUNCTION create_order_atomic IS 'Atomically creates an order with stock decrement. All stock is locked and validated before any changes are made. If any product has insufficient stock, the entire operation is aborted.';
