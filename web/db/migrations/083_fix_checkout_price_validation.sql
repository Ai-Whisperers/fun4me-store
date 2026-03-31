-- =============================================================================
-- 069_FIX_CHECKOUT_PRICE_VALIDATION.SQL
-- =============================================================================
-- SEC-024: Fixes CRITICAL price manipulation vulnerability in checkout.
--
-- PROBLEM: The process_checkout function accepted client-supplied prices
-- without validation. An attacker could modify the checkout request to
-- purchase items at arbitrary prices (e.g., paying ₲1 for a ₲50,000 product).
--
-- SOLUTION: Server-side price lookup from database tables:
-- - Products: store_products.base_price or sale_price (with clinic overrides)
-- - Services: services.base_price
--
-- The client-supplied price is now IGNORED and only used for mismatch logging.
-- =============================================================================

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
    v_item_id UUID;
    v_quantity INTEGER;
    v_client_price NUMERIC;      -- Price sent by client (for mismatch logging only)
    v_actual_price NUMERIC;      -- SEC-024: Actual price from database
    v_type TEXT;
    v_item_name TEXT;
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
    v_price_mismatches JSONB := '[]'::JSONB;
BEGIN
    -- =========================================================================
    -- STEP 1: Validate Stock and Lookup ACTUAL Prices (SEC-024 fix)
    -- =========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_type := v_item->>'type';
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_item_id := (v_item->>'id')::UUID;
        v_item_name := v_item->>'name';
        v_client_price := (v_item->>'price')::NUMERIC;  -- Only for logging
        v_requires_prescription := COALESCE((v_item->>'requires_prescription')::BOOLEAN, false);
        v_prescription_file := v_item->>'prescription_file_url';

        -- SEC-024: Get ACTUAL price from database based on item type
        IF v_type = 'product' THEN
            -- For products: Check clinic-specific price first, then product base price
            SELECT COALESCE(
                -- 1. Clinic-specific price (for global catalog products)
                (SELECT cpa.sale_price
                 FROM clinic_product_assignments cpa
                 WHERE cpa.catalog_product_id = v_item_id
                   AND cpa.tenant_id = p_tenant_id
                   AND cpa.is_active = true),
                -- 2. Product sale price (if set and product belongs to tenant or is global)
                (SELECT COALESCE(sp.sale_price, sp.base_price)
                 FROM store_products sp
                 WHERE sp.id = v_item_id
                   AND (sp.tenant_id = p_tenant_id OR sp.tenant_id IS NULL)
                   AND sp.is_active = true
                   AND sp.deleted_at IS NULL)
            ) INTO v_actual_price;

            -- Also get the product name from database (don't trust client)
            SELECT name INTO v_item_name
            FROM store_products
            WHERE id = v_item_id
              AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
              AND is_active = true
              AND deleted_at IS NULL;

            IF v_actual_price IS NULL THEN
                -- Product not found or not available
                v_stock_errors := v_stock_errors || jsonb_build_object(
                    'id', v_item_id,
                    'name', COALESCE(v_item_name, v_item->>'name'),
                    'requested', v_quantity,
                    'available', 0,
                    'error', 'Producto no disponible'
                );
                CONTINUE;
            END IF;

            -- Log price mismatch (potential attack attempt or stale cart)
            IF v_client_price IS NOT NULL AND v_client_price != v_actual_price THEN
                v_price_mismatches := v_price_mismatches || jsonb_build_object(
                    'id', v_item_id,
                    'name', v_item_name,
                    'client_price', v_client_price,
                    'actual_price', v_actual_price,
                    'difference', v_client_price - v_actual_price
                );
            END IF;

            -- Check stock with row lock
            SELECT stock_quantity INTO v_current_stock
            FROM store_inventory
            WHERE product_id = v_item_id
              AND tenant_id = p_tenant_id
            FOR UPDATE NOWAIT;

            IF v_current_stock IS NULL THEN
                v_stock_errors := v_stock_errors || jsonb_build_object(
                    'id', v_item_id,
                    'name', v_item_name,
                    'requested', v_quantity,
                    'available', 0
                );
            ELSIF v_current_stock < v_quantity THEN
                v_stock_errors := v_stock_errors || jsonb_build_object(
                    'id', v_item_id,
                    'name', v_item_name,
                    'requested', v_quantity,
                    'available', v_current_stock::INTEGER
                );
            END IF;

            -- Check prescription requirement
            IF v_requires_prescription AND (v_prescription_file IS NULL OR v_prescription_file = '') THEN
                v_prescription_errors := v_prescription_errors || jsonb_build_object(
                    'id', v_item_id,
                    'name', v_item_name,
                    'error', 'Requiere receta médica'
                );
            END IF;

        ELSIF v_type = 'service' THEN
            -- For services: Lookup from services table
            SELECT s.base_price, s.name INTO v_actual_price, v_item_name
            FROM services s
            WHERE s.id = v_item_id
              AND s.tenant_id = p_tenant_id
              AND s.is_active = true
              AND s.deleted_at IS NULL;

            IF v_actual_price IS NULL THEN
                v_stock_errors := v_stock_errors || jsonb_build_object(
                    'id', v_item_id,
                    'name', COALESCE(v_item_name, v_item->>'name'),
                    'error', 'Servicio no disponible'
                );
                CONTINUE;
            END IF;

            -- Log price mismatch for services too
            IF v_client_price IS NOT NULL AND v_client_price != v_actual_price THEN
                v_price_mismatches := v_price_mismatches || jsonb_build_object(
                    'id', v_item_id,
                    'name', v_item_name,
                    'client_price', v_client_price,
                    'actual_price', v_actual_price,
                    'difference', v_client_price - v_actual_price
                );
            END IF;
        ELSE
            -- Unknown item type
            v_stock_errors := v_stock_errors || jsonb_build_object(
                'id', v_item_id,
                'name', v_item->>'name',
                'error', 'Tipo de item desconocido: ' || v_type
            );
            CONTINUE;
        END IF;

        -- Accumulate total using ACTUAL price from database
        v_total := v_total + (v_actual_price * v_quantity);
    END LOOP;

    -- Log price mismatches to audit (potential attack attempts)
    IF jsonb_array_length(v_price_mismatches) > 0 THEN
        INSERT INTO financial_audit_logs (
            tenant_id,
            entity_type,
            entity_id,
            action,
            actor_id,
            actor_type,
            previous_state,
            new_state
        ) VALUES (
            p_tenant_id,
            'checkout_price_mismatch',
            gen_random_uuid(),  -- No entity yet
            'price_mismatch_detected',
            p_user_id,
            'user',
            jsonb_build_object('client_prices', v_price_mismatches),
            jsonb_build_object('corrected', true, 'total_items', jsonb_array_length(v_price_mismatches))
        );
    END IF;

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
            'error', 'Stock insuficiente o productos no disponibles',
            'stock_errors', v_stock_errors
        );
    END IF;

    -- =========================================================================
    -- STEP 2: Generate Invoice Number and Create Invoice
    -- =========================================================================
    SELECT 'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           LPAD(nextval('invoice_number_seq')::TEXT, 6, '0')
    INTO v_invoice_number;

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
    -- Uses ACTUAL prices from database (SEC-024)
    -- =========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_type := v_item->>'type';
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_item_id := (v_item->>'id')::UUID;
        v_requires_prescription := COALESCE((v_item->>'requires_prescription')::BOOLEAN, false);
        v_prescription_file := v_item->>'prescription_file_url';

        -- SEC-024: Lookup actual price again (defense in depth)
        IF v_type = 'product' THEN
            SELECT COALESCE(
                (SELECT cpa.sale_price
                 FROM clinic_product_assignments cpa
                 WHERE cpa.catalog_product_id = v_item_id
                   AND cpa.tenant_id = p_tenant_id
                   AND cpa.is_active = true),
                (SELECT COALESCE(sp.sale_price, sp.base_price)
                 FROM store_products sp
                 WHERE sp.id = v_item_id
                   AND (sp.tenant_id = p_tenant_id OR sp.tenant_id IS NULL)
                   AND sp.is_active = true)
            ),
            (SELECT name FROM store_products WHERE id = v_item_id)
            INTO v_actual_price, v_item_name;
        ELSIF v_type = 'service' THEN
            SELECT s.base_price, s.name
            INTO v_actual_price, v_item_name
            FROM services s
            WHERE s.id = v_item_id AND s.tenant_id = p_tenant_id;
        END IF;

        -- Skip if price lookup failed (shouldn't happen after validation)
        IF v_actual_price IS NULL THEN
            CONTINUE;
        END IF;

        v_item_total := v_actual_price * v_quantity;

        -- Create Invoice Item with ACTUAL price
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
            v_item_name,
            v_quantity,
            v_actual_price,  -- SEC-024: Using actual database price
            v_item_total,
            v_type,
            v_item_id,
            v_requires_prescription,
            v_prescription_file
        );

        -- Decrement Stock (only for products)
        IF v_type = 'product' THEN
            UPDATE store_inventory
            SET stock_quantity = stock_quantity - v_quantity,
                updated_at = NOW()
            WHERE product_id = v_item_id
              AND tenant_id = p_tenant_id;

            -- Create inventory transaction record
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
                v_item_id,
                'sale',
                -v_quantity,
                v_actual_price,  -- SEC-024: Using actual database price
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
    SELECT id INTO v_cart_id
    FROM store_carts
    WHERE customer_id = p_user_id
      AND tenant_id = p_tenant_id;

    IF v_cart_id IS NOT NULL THEN
        -- Convert reservations to sales
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
        ),
        'price_corrections', CASE
            WHEN jsonb_array_length(v_price_mismatches) > 0
            THEN v_price_mismatches
            ELSE NULL
        END
    );

EXCEPTION
    WHEN lock_not_available THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Otro usuario está procesando un pedido similar. Por favor intenta de nuevo.'
        );
    WHEN check_violation THEN
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
'SEC-024: Atomic checkout with server-side price validation. Client-supplied prices are IGNORED.
Validates stock, looks up actual prices from database, creates invoice, decrements inventory, clears cart.';

-- =============================================================================
-- Ensure financial_audit_logs table exists for price mismatch logging
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'financial_audit_logs'
    ) THEN
        CREATE TABLE public.financial_audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
            entity_type TEXT NOT NULL,
            entity_id UUID NOT NULL,
            action TEXT NOT NULL,
            actor_id UUID REFERENCES public.profiles(id),
            actor_type TEXT,
            previous_state JSONB,
            new_state JSONB,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Staff view audit logs" ON public.financial_audit_logs
            FOR SELECT TO authenticated
            USING (public.is_staff_of(tenant_id));

        CREATE POLICY "Service role full access" ON public.financial_audit_logs
            FOR ALL TO service_role
            USING (true);

        CREATE INDEX idx_financial_audit_tenant_date
            ON public.financial_audit_logs(tenant_id, created_at DESC);
        CREATE INDEX idx_financial_audit_entity
            ON public.financial_audit_logs(entity_type, entity_id);
    END IF;
END
$$;
