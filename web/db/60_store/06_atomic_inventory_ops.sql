-- =============================================================================
-- 06_ATOMIC_INVENTORY_OPS.SQL
-- =============================================================================
-- Atomic inventory operations to prevent race conditions.
-- Uses row-level locking for consistency.
--
-- DEPENDENCIES: 60_store/01_store_tables.sql, 60_store/03_checkout_rpc.sql
-- =============================================================================

-- =============================================================================
-- ATOMIC INVENTORY ADJUSTMENT
-- =============================================================================
-- Used for physical counts, damage, theft, expired, returns, corrections

CREATE OR REPLACE FUNCTION public.adjust_inventory_atomic(
    p_tenant_id TEXT,
    p_product_id UUID,
    p_new_quantity NUMERIC,
    p_reason TEXT,
    p_notes TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_inventory_id UUID;
    v_old_quantity NUMERIC;
    v_difference NUMERIC;
    v_wac NUMERIC;
    v_product_name TEXT;
    v_transaction_type TEXT;
BEGIN
    -- Map reason to transaction type
    v_transaction_type := CASE p_reason
        WHEN 'physical_count' THEN 'adjustment'
        WHEN 'damage' THEN 'damage'
        WHEN 'theft' THEN 'theft'
        WHEN 'expired' THEN 'expired'
        WHEN 'return' THEN 'return'
        WHEN 'correction' THEN 'adjustment'
        ELSE 'adjustment'
    END;

    -- Lock and get current inventory
    SELECT i.id, i.stock_quantity, i.weighted_average_cost, p.name
    INTO v_inventory_id, v_old_quantity, v_wac, v_product_name
    FROM store_inventory i
    JOIN store_products p ON p.id = i.product_id
    WHERE i.product_id = p_product_id
      AND i.tenant_id = p_tenant_id
    FOR UPDATE;

    IF v_inventory_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Inventario no encontrado para este producto',
            'error_code', 'not_found'
        );
    END IF;

    -- Validate new quantity
    IF p_new_quantity < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La cantidad no puede ser negativa',
            'error_code', 'invalid_quantity'
        );
    END IF;

    -- Calculate difference
    v_difference := p_new_quantity - v_old_quantity;

    -- No change needed
    IF v_difference = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Stock ya coincide',
            'old_stock', v_old_quantity,
            'new_stock', p_new_quantity,
            'difference', 0
        );
    END IF;

    -- Update inventory (safe now - we hold the lock)
    UPDATE store_inventory
    SET stock_quantity = p_new_quantity,
        updated_at = NOW()
    WHERE id = v_inventory_id;

    -- Create transaction record for audit
    INSERT INTO store_inventory_transactions (
        tenant_id,
        product_id,
        type,
        quantity,
        unit_cost,
        notes,
        reference_type,
        performed_by
    ) VALUES (
        p_tenant_id,
        p_product_id,
        v_transaction_type,
        v_difference,
        v_wac,
        COALESCE(p_notes, 'Ajuste de inventario - ' || p_reason),
        'adjustment_' || p_reason,
        p_performed_by
    );

    RETURN jsonb_build_object(
        'success', true,
        'product_name', v_product_name,
        'old_stock', v_old_quantity,
        'new_stock', p_new_quantity,
        'difference', v_difference,
        'type', v_transaction_type
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.adjust_inventory_atomic(TEXT, UUID, NUMERIC, TEXT, TEXT, UUID) IS
'Atomically adjust inventory with proper locking and audit trail';

GRANT EXECUTE ON FUNCTION public.adjust_inventory_atomic(TEXT, UUID, NUMERIC, TEXT, TEXT, UUID) TO authenticated;


-- =============================================================================
-- ATOMIC INVENTORY RECEIVE
-- =============================================================================
-- Used for receiving new stock with WAC calculation

CREATE OR REPLACE FUNCTION public.receive_inventory_atomic(
    p_tenant_id TEXT,
    p_product_id UUID,
    p_quantity NUMERIC,
    p_unit_cost NUMERIC DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_batch_number TEXT DEFAULT NULL,
    p_expiry_date DATE DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_inventory_id UUID;
    v_old_quantity NUMERIC;
    v_old_wac NUMERIC;
    v_new_quantity NUMERIC;
    v_new_wac NUMERIC;
    v_cost_per_unit NUMERIC;
    v_product_name TEXT;
BEGIN
    -- Validate quantity
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La cantidad debe ser mayor a 0',
            'error_code', 'invalid_quantity'
        );
    END IF;

    -- Lock and get current inventory
    SELECT i.id, i.stock_quantity, i.weighted_average_cost, p.name
    INTO v_inventory_id, v_old_quantity, v_old_wac, v_product_name
    FROM store_inventory i
    JOIN store_products p ON p.id = i.product_id
    WHERE i.product_id = p_product_id
      AND i.tenant_id = p_tenant_id
    FOR UPDATE;

    IF v_inventory_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Inventario no encontrado para este producto',
            'error_code', 'not_found'
        );
    END IF;

    -- Calculate new quantities
    v_new_quantity := v_old_quantity + p_quantity;
    v_old_wac := COALESCE(v_old_wac, 0);
    v_cost_per_unit := COALESCE(p_unit_cost, v_old_wac);

    -- Calculate new WAC if unit_cost provided
    IF p_unit_cost IS NOT NULL AND p_unit_cost > 0 THEN
        IF v_new_quantity > 0 THEN
            v_new_wac := ((v_old_quantity * v_old_wac) + (p_quantity * p_unit_cost)) / v_new_quantity;
        ELSE
            v_new_wac := p_unit_cost;
        END IF;
    ELSE
        v_new_wac := v_old_wac;
    END IF;

    -- Update inventory (safe now - we hold the lock)
    UPDATE store_inventory
    SET stock_quantity = v_new_quantity,
        weighted_average_cost = v_new_wac,
        batch_number = COALESCE(p_batch_number, batch_number),
        expiry_date = COALESCE(p_expiry_date, expiry_date),
        updated_at = NOW()
    WHERE id = v_inventory_id;

    -- Create transaction record for audit
    INSERT INTO store_inventory_transactions (
        tenant_id,
        product_id,
        type,
        quantity,
        unit_cost,
        notes,
        reference_type,
        performed_by
    ) VALUES (
        p_tenant_id,
        p_product_id,
        'purchase',
        p_quantity,
        v_cost_per_unit,
        COALESCE(p_notes, 'Recepción de stock'),
        'receive',
        p_performed_by
    );

    RETURN jsonb_build_object(
        'success', true,
        'product_name', v_product_name,
        'old_stock', v_old_quantity,
        'new_stock', v_new_quantity,
        'old_wac', v_old_wac,
        'new_wac', v_new_wac
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.receive_inventory_atomic(TEXT, UUID, NUMERIC, NUMERIC, TEXT, TEXT, DATE, UUID) IS
'Atomically receive inventory with WAC calculation, proper locking, and audit trail';

GRANT EXECUTE ON FUNCTION public.receive_inventory_atomic(TEXT, UUID, NUMERIC, NUMERIC, TEXT, TEXT, DATE, UUID) TO authenticated;
