-- =============================================================================
-- 090_ATOMIC_CART_MERGE.SQL
-- =============================================================================
-- Fixes cart merge race condition (TOCTOU vulnerability).
--
-- PROBLEM:
--   Thread A: Read cart → Merge items → Write cart
--   Thread B: Read cart → Merge items → Write cart
--   RESULT: Thread B overwrites Thread A's changes (lost cart items)
--
-- SOLUTION:
--   Atomic function that reads, merges, and writes cart in single transaction
--   using row-level locks (FOR UPDATE) to prevent concurrent updates
--
-- CRITICAL: Prevents lost cart items when user logs in on multiple devices
-- =============================================================================

CREATE OR REPLACE FUNCTION public.merge_cart_atomic(
    p_customer_id UUID,
    p_tenant_id TEXT,
    p_new_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_items JSONB;
    v_merged_items JSONB;
    v_item_map JSONB := '{}'::JSONB;
    v_new_item JSONB;
    v_existing_item JSONB;
    v_item_key TEXT;
    v_max_quantity INTEGER;
BEGIN
    -- =================================================================
    -- STEP 1: Lock and read existing cart
    -- =================================================================
    -- FOR UPDATE locks the row until transaction commits
    -- Other transactions will WAIT here (no race condition)
    
    SELECT items INTO v_existing_items
    FROM store_carts
    WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id
    FOR UPDATE;  -- 🔒 ROW LOCK - Prevents race condition

    -- Initialize with empty array if no existing cart
    IF v_existing_items IS NULL THEN
        v_existing_items := '[]'::JSONB;
    END IF;

    -- =================================================================
    -- STEP 2: Merge logic - prefer higher quantity for duplicates
    -- =================================================================
    
    -- Build map of existing items (key = id-type)
    FOR v_existing_item IN SELECT * FROM jsonb_array_elements(v_existing_items)
    LOOP
        v_item_key := (v_existing_item->>'id') || '-' || (v_existing_item->>'type');
        v_item_map := jsonb_set(v_item_map, ARRAY[v_item_key], v_existing_item);
    END LOOP;

    -- Merge new items into map
    FOR v_new_item IN SELECT * FROM jsonb_array_elements(p_new_items)
    LOOP
        v_item_key := (v_new_item->>'id') || '-' || (v_new_item->>'type');
        
        IF v_item_map ? v_item_key THEN
            -- Item exists - take maximum quantity
            v_max_quantity := GREATEST(
                (v_item_map->v_item_key->>'quantity')::INTEGER,
                (v_new_item->>'quantity')::INTEGER
            );
            
            -- Update quantity in map
            v_item_map := jsonb_set(
                v_item_map,
                ARRAY[v_item_key, 'quantity'],
                to_jsonb(v_max_quantity)
            );
        ELSE
            -- New item - add to map
            v_item_map := jsonb_set(v_item_map, ARRAY[v_item_key], v_new_item);
        END IF;
    END LOOP;

    -- Convert map back to array
    v_merged_items := '[]'::JSONB;
    FOR v_item_key IN SELECT jsonb_object_keys(v_item_map)
    LOOP
        v_merged_items := v_merged_items || jsonb_build_array(v_item_map->v_item_key);
    END LOOP;

    -- =================================================================
    -- STEP 3: Atomic upsert of merged cart
    -- =================================================================
    
    INSERT INTO store_carts (customer_id, tenant_id, items, updated_at)
    VALUES (p_customer_id, p_tenant_id, v_merged_items, NOW())
    ON CONFLICT (customer_id, tenant_id)
    DO UPDATE SET 
        items = v_merged_items,
        updated_at = NOW();

    -- =================================================================
    -- STEP 4: Return merged items
    -- =================================================================
    
    RETURN jsonb_build_object(
        'success', true,
        'items', v_merged_items,
        'item_count', jsonb_array_length(v_merged_items)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNEXPECTED_ERROR',
            'message', 'Error inesperado al fusionar carrito',
            'details', SQLERRM
        );
END;
$$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION merge_cart_atomic TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION merge_cart_atomic IS
'Atomically merges localStorage cart with database cart. Uses row-level locks to prevent race condition where simultaneous logins lose cart items.';

-- =============================================================================
-- VERIFY MIGRATION
-- =============================================================================

DO $$
BEGIN
    -- Test function exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = 'merge_cart_atomic'
    ) THEN
        RAISE EXCEPTION 'Migration failed: merge_cart_atomic function not created';
    END IF;

    RAISE NOTICE 'Atomic cart merge migration complete';
END $$;
