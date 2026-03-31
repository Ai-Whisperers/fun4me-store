-- =============================================================================
-- 021_FIX_CHECKOUT_AND_INVENTORY_RACE_CONDITIONS.SQL
-- =============================================================================
-- Fixes the store checkout race condition and inventory overselling issues:
-- 1. Corrects column name mismatch (stock → stock_quantity)
-- 2. Combines checkout + cart clearing into single atomic operation
-- 3. Adds proper FOR UPDATE NOWAIT for better concurrent handling
-- 4. Creates inventory transaction records for audit trail
--
-- PROBLEM: The process_checkout function used wrong column names and didn't
-- handle post-checkout operations atomically.
--
-- SOLUTION: Rewrite checkout function with correct column names and include
-- cart clearing in the same transaction.
-- =============================================================================

-- =============================================================================
-- IMPROVED ATOMIC CHECKOUT FUNCTION
-- =============================================================================
-- This function handles the entire checkout process atomically:
-- 1. Validates stock with FOR UPDATE locks
-- 2. Creates invoice and items
-- 3. Decrements inventory
-- 4. Creates inventory transaction records
-- 5. Clears the user's cart
-- All in a single transaction with proper error handling

CREATE OR REPLACE FUNCTION public.process_checkout(
    p_tenant_id TEXT,
    p_user_id UUID,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
    v_price NUMERIC;
    v_type TEXT;
    v_product_name TEXT;
    v_current_stock NUMERIC;
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_total NUMERIC := 0;
    v_stock_errors JSONB := '[]'::JSONB;
    v_prescription_errors JSONB := '[]'::JSONB;
    v_item_total NUMERIC;
    v_requires_prescription BOOLEAN;
    v_prescription_file TEXT;
    v_cart_id UUID;
BEGIN
    -- =========================================================================
    -- STEP 1: Validate Stock for all products (Fail fast, with row locks)
    -- =========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_type := v_item->>'type';
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_product_id := (v_item->>'id')::UUID;
        v_product_name := v_item->>'name';
        v_price := (v_item->>'price')::NUMERIC;
        v_requires_prescription := COALESCE((v_item->>'requires_prescription')::BOOLEAN, false);
        v_prescription_file := v_item->>'prescription_file';

        -- Accumulate total
        v_total := v_total + (v_price * v_quantity);

        IF v_type = 'product' THEN
            -- Check stock with row lock (prevents concurrent modifications)
            SELECT stock_quantity INTO v_current_stock
            FROM store_inventory
            WHERE product_id = v_product_id
              AND tenant_id = p_tenant_id
            FOR UPDATE NOWAIT;  -- NOWAIT fails immediately if row is locked

            IF v_current_stock IS NULL THEN
                -- Product not in inventory
                v_stock_errors := v_stock_errors || jsonb_build_object(
                    'id', v_product_id,
                    'name', v_product_name,
                    'requested', v_quantity,
                    'available', 0
                );
            ELSIF v_current_stock < v_quantity THEN
                -- Insufficient stock
                v_stock_errors := v_stock_errors || jsonb_build_object(
                    'id', v_product_id,
                    'name', v_product_name,
                    'requested', v_quantity,
                    'available', v_current_stock::INTEGER
                );
            END IF;

            -- Check prescription requirement
            IF v_requires_prescription AND (v_prescription_file IS NULL OR v_prescription_file = '') THEN
                v_prescription_errors := v_prescription_errors || jsonb_build_object(
                    'id', v_product_id,
                    'name', v_product_name,
                    'error', 'Requiere receta médica'
                );
            END IF;
        END IF;
    END LOOP;

    -- Return immediately if there are prescription errors
    IF jsonb_array_length(v_prescription_errors) > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Falta receta médica para algunos productos',
            'prescription_errors', v_prescription_errors
        );
    END IF;

    -- Return immediately if there are stock errors
    IF jsonb_array_length(v_stock_errors) > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Stock insuficiente',
            'stock_errors', v_stock_errors
        );
    END IF;

    -- =========================================================================
    -- STEP 2: Generate Invoice Number and Create Invoice
    -- =========================================================================
    -- Generate unique invoice number using sequence
    SELECT 'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           LPAD(nextval('invoice_number_seq')::TEXT, 6, '0')
    INTO v_invoice_number;

    -- Handle case where sequence doesn't exist
    IF v_invoice_number IS NULL THEN
        v_invoice_number := 'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
                           LPAD(FLOOR(random() * 1000000)::TEXT, 6, '0');
    END IF;

    INSERT INTO invoices (
        tenant_id,
        customer_id,
        invoice_number,
        date,
        due_date,
        status,
        total_amount,
        notes
    ) VALUES (
        p_tenant_id,
        p_user_id,
        v_invoice_number,
        NOW(),
        NOW() + INTERVAL '30 days',
        'pending',
        v_total,
        COALESCE(p_notes, 'Pedido desde tienda online')
    ) RETURNING id INTO v_invoice_id;

    -- =========================================================================
    -- STEP 3: Process Items - Create Invoice Items & Decrement Stock
    -- =========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_type := v_item->>'type';
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_product_id := (v_item->>'id')::UUID;
        v_product_name := v_item->>'name';
        v_price := (v_item->>'price')::NUMERIC;
        v_item_total := v_price * v_quantity;
        v_requires_prescription := COALESCE((v_item->>'requires_prescription')::BOOLEAN, false);
        v_prescription_file := v_item->>'prescription_file';

        -- Create Invoice Item
        INSERT INTO invoice_items (
            tenant_id,
            invoice_id,
            description,
            quantity,
            unit_price,
            total_price,
            item_type,
            item_reference_id,
            requires_prescription,
            prescription_file_url
        ) VALUES (
            p_tenant_id,
            v_invoice_id,
            v_product_name,
            v_quantity,
            v_price,
            v_item_total,
            v_type,
            v_product_id,
            v_requires_prescription,
            v_prescription_file
        );

        -- Decrement Stock (only for products)
        IF v_type = 'product' THEN
            UPDATE store_inventory
            SET stock_quantity = stock_quantity - v_quantity,
                updated_at = NOW()
            WHERE product_id = v_product_id
              AND tenant_id = p_tenant_id;

            -- Create inventory transaction record for audit
            INSERT INTO store_inventory_transactions (
                tenant_id,
                product_id,
                type,
                quantity,
                unit_cost,
                reference_type,
                reference_id,
                notes,
                performed_by
            ) VALUES (
                p_tenant_id,
                v_product_id,
                'sale',
                -v_quantity,  -- Negative for sales
                v_price,
                'invoice',
                v_invoice_id,
                'Venta online - ' || v_invoice_number,
                p_user_id
            );
        END IF;
    END LOOP;

    -- =========================================================================
    -- STEP 4: Clear User's Cart (same transaction)
    -- =========================================================================
    -- Get cart ID for reservation conversion
    SELECT id INTO v_cart_id
    FROM store_carts
    WHERE customer_id = p_user_id
      AND tenant_id = p_tenant_id;

    IF v_cart_id IS NOT NULL THEN
        -- Convert reservations to sales (if reservation system is active)
        UPDATE store_inventory_reservations
        SET status = 'completed',
            completed_at = NOW(),
            order_id = v_invoice_id
        WHERE cart_id = v_cart_id
          AND status = 'pending';

        -- Delete the cart
        DELETE FROM store_carts WHERE id = v_cart_id;
    END IF;

    -- =========================================================================
    -- STEP 5: Return Success
    -- =========================================================================
    RETURN jsonb_build_object(
        'success', true,
        'invoice', jsonb_build_object(
            'id', v_invoice_id,
            'invoice_number', v_invoice_number,
            'total', v_total,
            'status', 'pending'
        )
    );

EXCEPTION
    WHEN lock_not_available THEN
        -- NOWAIT lock failed - another transaction is modifying the same products
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Otro usuario está procesando un pedido similar. Por favor intenta de nuevo.'
        );
    WHEN check_violation THEN
        -- Stock went negative (shouldn't happen with proper locking, but safety net)
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Stock insuficiente - otro pedido se procesó primero'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.process_checkout(TEXT, UUID, JSONB, TEXT) IS
'Atomic checkout: validates stock, creates invoice, decrements inventory, clears cart. All in single transaction.';

-- =============================================================================
-- SAFE INVENTORY DECREMENT FUNCTION
-- =============================================================================
-- For use outside checkout (e.g., manual adjustments) with proper locking

CREATE OR REPLACE FUNCTION public.decrement_inventory_safe(
    p_tenant_id TEXT,
    p_product_id UUID,
    p_quantity NUMERIC,
    p_reference_type TEXT DEFAULT 'adjustment',
    p_reference_id UUID DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_stock NUMERIC;
    v_product_name TEXT;
BEGIN
    -- Lock and get current stock
    SELECT i.stock_quantity, p.name
    INTO v_current_stock, v_product_name
    FROM store_inventory i
    JOIN store_products p ON p.id = i.product_id
    WHERE i.product_id = p_product_id
      AND i.tenant_id = p_tenant_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Producto no encontrado en inventario'
        );
    END IF;

    IF v_current_stock < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Stock insuficiente',
            'available', v_current_stock,
            'requested', p_quantity
        );
    END IF;

    -- Decrement stock
    UPDATE store_inventory
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW()
    WHERE product_id = p_product_id
      AND tenant_id = p_tenant_id;

    -- Record transaction
    INSERT INTO store_inventory_transactions (
        tenant_id,
        product_id,
        type,
        quantity,
        reference_type,
        reference_id,
        notes,
        performed_by
    ) VALUES (
        p_tenant_id,
        p_product_id,
        p_reference_type,
        -p_quantity,
        p_reference_type,
        p_reference_id,
        p_notes,
        p_performed_by
    );

    RETURN jsonb_build_object(
        'success', true,
        'product', v_product_name,
        'previous_stock', v_current_stock,
        'new_stock', v_current_stock - p_quantity
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.decrement_inventory_safe(TEXT, UUID, NUMERIC, TEXT, UUID, UUID, TEXT) IS
'Safely decrements inventory with proper locking and audit trail';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.decrement_inventory_safe(TEXT, UUID, NUMERIC, TEXT, UUID, UUID, TEXT) TO authenticated;

-- =============================================================================
-- CREATE INVOICE NUMBER SEQUENCE (if not exists)
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'invoice_number_seq') THEN
        CREATE SEQUENCE public.invoice_number_seq START WITH 1;
    END IF;
END
$$;

-- =============================================================================
-- ENSURE CHECK CONSTRAINT EXISTS
-- =============================================================================
-- Double-check the non-negative stock constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'store_inventory_stock_non_negative'
    ) THEN
        ALTER TABLE public.store_inventory
        ADD CONSTRAINT store_inventory_stock_non_negative
        CHECK (stock_quantity >= 0);
    END IF;
END
$$;

-- =============================================================================
-- ADD tenant_id TO invoice_items IF MISSING
-- =============================================================================
-- Ensures proper RLS on invoice items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoice_items'
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.invoice_items
        ADD COLUMN tenant_id TEXT REFERENCES public.tenants(id);

        -- Backfill from parent invoice
        UPDATE public.invoice_items ii
        SET tenant_id = i.tenant_id
        FROM public.invoices i
        WHERE ii.invoice_id = i.id
        AND ii.tenant_id IS NULL;

        -- Make it NOT NULL after backfill
        ALTER TABLE public.invoice_items
        ALTER COLUMN tenant_id SET NOT NULL;

        -- Create index
        CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant
        ON public.invoice_items(tenant_id, invoice_id);
    END IF;
END
$$;

-- =============================================================================
-- ADD prescription fields to invoice_items IF MISSING
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoice_items'
        AND column_name = 'requires_prescription'
    ) THEN
        ALTER TABLE public.invoice_items
        ADD COLUMN requires_prescription BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoice_items'
        AND column_name = 'prescription_file_url'
    ) THEN
        ALTER TABLE public.invoice_items
        ADD COLUMN prescription_file_url TEXT;
    END IF;
END
$$;
