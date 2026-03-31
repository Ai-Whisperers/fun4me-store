-- =============================================================================
-- 074_FIX_CHECKOUT_COMPOSITE_SERVICE_IDS.SQL
-- =============================================================================
-- Fixes the process_checkout function to handle composite service IDs.
-- Cart items for services use composite IDs: `serviceId-petId-variant`
-- The function needs to extract the actual service UUID from these composite IDs.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.process_checkout(
    p_tenant_id TEXT,
    p_user_id UUID,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_item_id TEXT;              -- Changed to TEXT to handle composite IDs
    v_service_uuid UUID;         -- Extracted service UUID
    v_product_uuid UUID;         -- Product UUID
    v_quantity INTEGER;
    v_client_price NUMERIC;
    v_actual_price NUMERIC;
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
    v_uuid_pattern TEXT := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
BEGIN
    -- =========================================================================
    -- STEP 1: Validate Stock and Lookup ACTUAL Prices
    -- =========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_type := v_item->>'type';
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_item_id := v_item->>'id';  -- Keep as TEXT
        v_item_name := v_item->>'name';
        v_client_price := (v_item->>'price')::NUMERIC;
        v_requires_prescription := COALESCE((v_item->>'requires_prescription')::BOOLEAN, false);
        v_prescription_file := v_item->>'prescription_file_url';

        IF v_type = 'product' THEN
            -- Products: ID should be a UUID
            BEGIN
                v_product_uuid := v_item_id::UUID;
            EXCEPTION WHEN invalid_text_representation THEN
                v_stock_errors := v_stock_errors || jsonb_build_object(
                    'id', v_item_id,
                    'name', v_item_name,
                    'error', 'ID de producto inválido'
                );
                CONTINUE;
            END;

            -- Get actual price from database
            SELECT COALESCE(
                (SELECT cpa.sale_price
                 FROM clinic_product_assignments cpa
                 WHERE cpa.catalog_product_id = v_product_uuid
                   AND cpa.tenant_id = p_tenant_id
                   AND cpa.is_active = true),
                (SELECT COALESCE(sp.sale_price, sp.base_price)
                 FROM store_products sp
                 WHERE sp.id = v_product_uuid
                   AND (sp.tenant_id = p_tenant_id OR sp.tenant_id IS NULL)
                   AND sp.is_active = true
                   AND sp.deleted_at IS NULL)
            ) INTO v_actual_price;

            -- Get product name from database
            SELECT name INTO v_item_name
            FROM store_products
            WHERE id = v_product_uuid
              AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
              AND is_active = true
              AND deleted_at IS NULL;

            IF v_actual_price IS NULL THEN
                v_stock_errors := v_stock_errors || jsonb_build_object(
                    'id', v_item_id,
                    'name', COALESCE(v_item_name, v_item->>'name'),
                    'requested', v_quantity,
                    'available', 0,
                    'error', 'Producto no disponible'
                );
                CONTINUE;
            END IF;

            -- Log price mismatch
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
            WHERE product_id = v_product_uuid
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
            -- Services: ID may be composite (serviceId-petId-variant)
            -- Extract the service UUID from the beginning of the composite ID
            BEGIN
                -- First try: check if the entire ID is a valid UUID
                IF v_item_id ~ v_uuid_pattern THEN
                    -- Extract just the UUID portion (first 36 characters if it's composite)
                    v_service_uuid := (substring(v_item_id from v_uuid_pattern))::UUID;
                ELSE
                    -- Not a valid UUID format at all
                    RAISE EXCEPTION 'Invalid UUID';
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_stock_errors := v_stock_errors || jsonb_build_object(
                    'id', v_item_id,
                    'name', v_item_name,
                    'error', 'ID de servicio inválido'
                );
                CONTINUE;
            END;

            -- Get service price and name from database
            SELECT s.base_price, s.name INTO v_actual_price, v_item_name
            FROM services s
            WHERE s.id = v_service_uuid
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

            -- Log price mismatch for services
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

        -- Accumulate total using ACTUAL price
        v_total := v_total + (v_actual_price * v_quantity);
    END LOOP;

    -- Log price mismatches to audit
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
            gen_random_uuid(),
            'price_mismatch_detected',
            p_user_id,
            'user',
            jsonb_build_object('client_prices', v_price_mismatches),
            jsonb_build_object('corrected', true, 'total_items', jsonb_array_length(v_price_mismatches))
        );
    END IF;

    -- Return if prescription errors
    IF jsonb_array_length(v_prescription_errors) > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Falta receta médica para algunos productos',
            'prescription_errors', v_prescription_errors
        );
    END IF;

    -- Return if stock errors
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
        notes,
        idempotency_key
    ) VALUES (
        p_tenant_id,
        p_user_id,
        v_invoice_number,
        NOW(),
        NOW() + INTERVAL '30 days',
        'pending',
        v_total,
        COALESCE(p_notes, 'Pedido desde tienda online'),
        p_idempotency_key
    ) RETURNING id INTO v_invoice_id;

    -- =========================================================================
    -- STEP 3: Process Items - Create Invoice Items & Decrement Stock
    -- =========================================================================
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_type := v_item->>'type';
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_item_id := v_item->>'id';
        v_requires_prescription := COALESCE((v_item->>'requires_prescription')::BOOLEAN, false);
        v_prescription_file := v_item->>'prescription_file_url';

        IF v_type = 'product' THEN
            v_product_uuid := v_item_id::UUID;

            SELECT COALESCE(
                (SELECT cpa.sale_price
                 FROM clinic_product_assignments cpa
                 WHERE cpa.catalog_product_id = v_product_uuid
                   AND cpa.tenant_id = p_tenant_id
                   AND cpa.is_active = true),
                (SELECT COALESCE(sp.sale_price, sp.base_price)
                 FROM store_products sp
                 WHERE sp.id = v_product_uuid
                   AND (sp.tenant_id = p_tenant_id OR sp.tenant_id IS NULL)
                   AND sp.is_active = true)
            ),
            (SELECT name FROM store_products WHERE id = v_product_uuid)
            INTO v_actual_price, v_item_name;

        ELSIF v_type = 'service' THEN
            v_service_uuid := (substring(v_item_id from v_uuid_pattern))::UUID;

            SELECT s.base_price, s.name
            INTO v_actual_price, v_item_name
            FROM services s
            WHERE s.id = v_service_uuid AND s.tenant_id = p_tenant_id;
        END IF;

        IF v_actual_price IS NULL THEN
            CONTINUE;
        END IF;

        v_item_total := v_actual_price * v_quantity;

        -- Create Invoice Item using reference ID based on type
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
            v_actual_price,
            v_item_total,
            v_type,
            CASE v_type
                WHEN 'product' THEN v_product_uuid
                WHEN 'service' THEN v_service_uuid
            END,
            v_requires_prescription,
            v_prescription_file
        );

        -- Decrement Stock (only for products)
        IF v_type = 'product' THEN
            UPDATE store_inventory
            SET stock_quantity = stock_quantity - v_quantity,
                updated_at = NOW()
            WHERE product_id = v_product_uuid
              AND tenant_id = p_tenant_id;

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
                v_product_uuid,
                'sale',
                -v_quantity,
                v_actual_price,
                'invoice',
                v_invoice_id,
                'Venta online - ' || v_invoice_number,
                p_user_id
            );
        END IF;
    END LOOP;

    -- =========================================================================
    -- STEP 4: Clear User's Cart
    -- =========================================================================
    SELECT id INTO v_cart_id
    FROM store_carts
    WHERE customer_id = p_user_id
      AND tenant_id = p_tenant_id;

    IF v_cart_id IS NOT NULL THEN
        UPDATE store_inventory_reservations
        SET status = 'completed',
            completed_at = NOW(),
            order_id = v_invoice_id
        WHERE cart_id = v_cart_id
          AND status = 'pending';

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
    WHEN unique_violation THEN
        IF SQLERRM LIKE '%idx_invoices_idempotency%' OR SQLERRM LIKE '%idempotency%' THEN
            SELECT id, invoice_number, total_amount, status
            INTO v_invoice_id, v_invoice_number, v_total
            FROM invoices
            WHERE tenant_id = p_tenant_id
              AND idempotency_key = p_idempotency_key;

            IF v_invoice_id IS NOT NULL THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'invoice', jsonb_build_object(
                        'id', v_invoice_id,
                        'invoice_number', v_invoice_number,
                        'total', v_total,
                        'status', 'pending'
                    ),
                    'idempotent', true
                );
            END IF;
        END IF;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Error de duplicado: ' || SQLERRM
        );
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

COMMENT ON FUNCTION public.process_checkout(TEXT, UUID, JSONB, TEXT, TEXT) IS
'SEC-024 + AUDIT-106 + FIX-074: Atomic checkout with composite service ID support.
Handles cart items where service IDs may be composite (serviceId-petId-variant).
Extracts UUID from composite IDs for proper database lookups.';
