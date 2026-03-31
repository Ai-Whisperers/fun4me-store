-- Migration: 045_atomic_stock_decrement_subscription.sql
-- Description: Fix race condition in subscription processing (RACE-001)
-- The stock check and decrement are separate operations, allowing overselling
-- This migration creates an atomic function that uses FOR UPDATE locking

-- 1. Create atomic stock decrement function with row-level locking
CREATE OR REPLACE FUNCTION public.decrement_stock_if_available(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT stock_quantity INTO v_current_stock
    FROM public.store_inventory
    WHERE product_id = p_product_id
    FOR UPDATE;

    -- Product not found in inventory
    IF v_current_stock IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'product_not_found',
            'product_id', p_product_id
        );
    END IF;

    -- Insufficient stock - block entirely (per user decision)
    IF v_current_stock < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'insufficient_stock',
            'available', v_current_stock,
            'requested', p_quantity,
            'product_id', p_product_id
        );
    END IF;

    -- Calculate new stock
    v_new_stock := v_current_stock - p_quantity;

    -- Perform the atomic decrement
    UPDATE public.store_inventory
    SET stock_quantity = v_new_stock,
        updated_at = NOW()
    WHERE product_id = p_product_id;

    -- Return success with details
    RETURN jsonb_build_object(
        'success', true,
        'previous_stock', v_current_stock,
        'new_stock', v_new_stock,
        'decremented', p_quantity,
        'product_id', p_product_id
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.decrement_stock_if_available(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock_if_available(UUID, INTEGER) TO service_role;

-- 2. Add CHECK constraint to prevent negative stock (defense in depth)
-- First check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_non_negative_stock'
        AND conrelid = 'public.store_inventory'::regclass
    ) THEN
        ALTER TABLE public.store_inventory
        ADD CONSTRAINT check_non_negative_stock
        CHECK (stock_quantity >= 0);
    END IF;
END $$;

-- 3. Add index for faster lookups on product_id if not exists
CREATE INDEX IF NOT EXISTS idx_store_inventory_product_id
ON public.store_inventory(product_id);

-- Comment for documentation
COMMENT ON FUNCTION public.decrement_stock_if_available(UUID, INTEGER) IS
'Atomically decrements stock with row-level locking. Returns JSONB with success status.
Used by subscription processing to prevent overselling race conditions.
Blocks entirely if insufficient stock (does not allow partial fulfillment).';

-- 4. Create increment_stock function for rollback scenarios
CREATE OR REPLACE FUNCTION public.increment_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.store_inventory
    SET stock_quantity = stock_quantity + p_quantity,
        updated_at = NOW()
    WHERE product_id = p_product_id;

    RETURN FOUND;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_stock(UUID, INTEGER) TO service_role;

COMMENT ON FUNCTION public.increment_stock(UUID, INTEGER) IS
'Increments stock quantity. Used for rollback scenarios when order creation fails
after stock was already decremented.';
