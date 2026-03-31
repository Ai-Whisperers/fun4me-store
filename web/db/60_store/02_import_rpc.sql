-- =============================================================================
-- 02_IMPORT_RPC.SQL
-- =============================================================================
-- RPC function for bulk inventory import from Excel/Google Sheets.
-- Handles: New Products, Purchases, Sales, Adjustments, Price Updates.
-- Uses weighted average cost for inventory valuation.
-- =============================================================================

-- Drop if exists to allow updates
DROP FUNCTION IF EXISTS public.import_inventory_batch(TEXT, UUID, JSONB);

-- =============================================================================
-- IMPORT INVENTORY BATCH RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION public.import_inventory_batch(
    p_tenant_id TEXT,
    p_performer_id UUID,
    p_rows JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row JSONB;
    v_operation TEXT;
    v_sku TEXT;
    v_name TEXT;
    v_category TEXT;
    v_description TEXT;
    v_price NUMERIC;
    v_quantity NUMERIC;
    v_cost NUMERIC;
    v_min_stock NUMERIC;
    v_expiry_date DATE;
    v_batch_number TEXT;
    v_supplier_name TEXT;
    v_barcode TEXT;
    v_is_active BOOLEAN;

    v_product_id UUID;
    v_category_id UUID;
    v_current_stock NUMERIC;
    v_current_wac NUMERIC;
    v_new_wac NUMERIC;
    v_new_stock NUMERIC;

    v_success_count INTEGER := 0;
    v_errors TEXT[] := '{}';
    v_row_num INTEGER := 0;
BEGIN
    -- Iterate through each row
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_row_num := v_row_num + 1;

        BEGIN
            -- Extract values from row
            v_operation := LOWER(TRIM(COALESCE(v_row->>'operation', '')));
            v_sku := TRIM(COALESCE(v_row->>'sku', ''));
            v_name := TRIM(COALESCE(v_row->>'name', ''));
            v_category := TRIM(COALESCE(v_row->>'category', ''));
            v_description := TRIM(COALESCE(v_row->>'description', ''));
            v_price := COALESCE((v_row->>'price')::NUMERIC, 0);
            v_quantity := COALESCE((v_row->>'quantity')::NUMERIC, 0);
            v_cost := COALESCE((v_row->>'cost')::NUMERIC, 0);
            v_min_stock := COALESCE((v_row->>'min_stock_level')::NUMERIC, 0);
            v_barcode := NULLIF(TRIM(COALESCE(v_row->>'barcode', '')), '');
            v_batch_number := NULLIF(TRIM(COALESCE(v_row->>'batch_number', '')), '');
            v_supplier_name := NULLIF(TRIM(COALESCE(v_row->>'supplier_name', '')), '');
            v_is_active := COALESCE((v_row->>'is_active')::BOOLEAN, true);

            -- Parse expiry date
            IF v_row->>'expiry_date' IS NOT NULL AND TRIM(v_row->>'expiry_date') != '' THEN
                BEGIN
                    v_expiry_date := (v_row->>'expiry_date')::DATE;
                EXCEPTION WHEN OTHERS THEN
                    v_expiry_date := NULL;
                END;
            ELSE
                v_expiry_date := NULL;
            END IF;

            -- Skip empty rows
            IF v_operation = '' AND v_name = '' AND v_sku = '' THEN
                CONTINUE;
            END IF;

            -- ================================================================
            -- NEW PRODUCT
            -- ================================================================
            IF v_operation = 'new product' OR v_operation = 'nuevo producto' OR v_operation = 'new' THEN
                -- Validate required fields
                IF v_name = '' THEN
                    v_errors := array_append(v_errors, format('Fila %s: Nombre es requerido para nuevo producto', v_row_num));
                    CONTINUE;
                END IF;

                IF v_price <= 0 THEN
                    v_errors := array_append(v_errors, format('Fila %s: Precio de venta debe ser mayor a 0', v_row_num));
                    CONTINUE;
                END IF;

                -- Generate SKU if not provided
                IF v_sku = '' THEN
                    v_sku := 'SKU-' || UPPER(SUBSTRING(MD5(v_name || NOW()::TEXT) FROM 1 FOR 8));
                END IF;

                -- Check if SKU already exists
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NOT NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: SKU %s ya existe', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                -- Find or create category
                IF v_category != '' THEN
                    SELECT id INTO v_category_id
                    FROM public.store_categories
                    WHERE tenant_id = p_tenant_id
                      AND (LOWER(name) = LOWER(v_category) OR LOWER(slug) = LOWER(REPLACE(v_category, ' ', '-')));

                    IF v_category_id IS NULL THEN
                        -- Create new category
                        INSERT INTO public.store_categories (tenant_id, name, slug, level)
                        VALUES (p_tenant_id, v_category, LOWER(REPLACE(v_category, ' ', '-')), 1)
                        RETURNING id INTO v_category_id;
                    END IF;
                END IF;

                -- Insert product
                INSERT INTO public.store_products (
                    tenant_id, sku, barcode, name, description,
                    category_id, base_price, cost_price, is_active
                ) VALUES (
                    p_tenant_id, v_sku, v_barcode, v_name, v_description,
                    v_category_id, v_price, v_cost, v_is_active
                ) RETURNING id INTO v_product_id;

                -- Create inventory record
                INSERT INTO public.store_inventory (
                    tenant_id, product_id, stock_quantity,
                    min_stock_level, weighted_average_cost,
                    batch_number, expiry_date, supplier_name
                ) VALUES (
                    p_tenant_id, v_product_id, GREATEST(v_quantity, 0),
                    v_min_stock, v_cost,
                    v_batch_number, v_expiry_date, v_supplier_name
                );

                -- Create transaction if initial stock > 0
                IF v_quantity > 0 THEN
                    INSERT INTO public.store_inventory_transactions (
                        tenant_id, product_id, type, quantity,
                        unit_cost, notes, performed_by
                    ) VALUES (
                        p_tenant_id, v_product_id, 'purchase', v_quantity,
                        v_cost, 'Stock inicial', p_performer_id
                    );
                END IF;

                v_success_count := v_success_count + 1;

            -- ================================================================
            -- PURCHASE (Compra)
            -- ================================================================
            ELSIF v_operation = 'purchase' OR v_operation = 'compra' OR v_operation = 'buy' THEN
                -- Find product by SKU
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: Producto SKU %s no encontrado', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                IF v_quantity <= 0 THEN
                    v_errors := array_append(v_errors, format('Fila %s: Cantidad debe ser positiva para compra', v_row_num));
                    CONTINUE;
                END IF;

                IF v_cost <= 0 THEN
                    v_errors := array_append(v_errors, format('Fila %s: Costo unitario requerido para compra', v_row_num));
                    CONTINUE;
                END IF;

                -- Get current stock and WAC
                SELECT stock_quantity, COALESCE(weighted_average_cost, 0)
                INTO v_current_stock, v_current_wac
                FROM public.store_inventory
                WHERE product_id = v_product_id;

                IF v_current_stock IS NULL THEN
                    v_current_stock := 0;
                    v_current_wac := 0;
                END IF;

                -- Calculate new weighted average cost
                v_new_stock := v_current_stock + v_quantity;
                IF v_new_stock > 0 THEN
                    v_new_wac := ((v_current_stock * v_current_wac) + (v_quantity * v_cost)) / v_new_stock;
                ELSE
                    v_new_wac := v_cost;
                END IF;

                -- Update inventory
                INSERT INTO public.store_inventory (
                    tenant_id, product_id, stock_quantity, weighted_average_cost,
                    batch_number, expiry_date, supplier_name
                ) VALUES (
                    p_tenant_id, v_product_id, v_quantity, v_new_wac,
                    v_batch_number, v_expiry_date, v_supplier_name
                )
                ON CONFLICT (product_id) DO UPDATE SET
                    stock_quantity = public.store_inventory.stock_quantity + EXCLUDED.stock_quantity,
                    weighted_average_cost = v_new_wac,
                    batch_number = COALESCE(EXCLUDED.batch_number, public.store_inventory.batch_number),
                    expiry_date = COALESCE(EXCLUDED.expiry_date, public.store_inventory.expiry_date),
                    supplier_name = COALESCE(EXCLUDED.supplier_name, public.store_inventory.supplier_name),
                    updated_at = NOW();

                -- Create transaction
                INSERT INTO public.store_inventory_transactions (
                    tenant_id, product_id, type, quantity, unit_cost, performed_by
                ) VALUES (
                    p_tenant_id, v_product_id, 'purchase', v_quantity, v_cost, p_performer_id
                );

                v_success_count := v_success_count + 1;

            -- ================================================================
            -- SALE (Venta)
            -- ================================================================
            ELSIF v_operation = 'sale' OR v_operation = 'venta' OR v_operation = 'sell' THEN
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: Producto SKU %s no encontrado', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                -- Make quantity negative for sale
                v_quantity := -ABS(v_quantity);

                -- Get current stock
                SELECT stock_quantity, weighted_average_cost
                INTO v_current_stock, v_current_wac
                FROM public.store_inventory
                WHERE product_id = v_product_id;

                IF v_current_stock + v_quantity < 0 THEN
                    v_errors := array_append(v_errors, format('Fila %s: Stock insuficiente. Actual: %s, Solicitado: %s', v_row_num, v_current_stock, ABS(v_quantity)));
                    CONTINUE;
                END IF;

                -- Update inventory
                UPDATE public.store_inventory
                SET stock_quantity = stock_quantity + v_quantity,
                    updated_at = NOW()
                WHERE product_id = v_product_id;

                -- Create transaction
                INSERT INTO public.store_inventory_transactions (
                    tenant_id, product_id, type, quantity, unit_cost, performed_by
                ) VALUES (
                    p_tenant_id, v_product_id, 'sale', v_quantity, v_current_wac, p_performer_id
                );

                v_success_count := v_success_count + 1;

            -- ================================================================
            -- ADJUSTMENT (Ajuste)
            -- ================================================================
            ELSIF v_operation = 'adjustment' OR v_operation = 'ajuste' OR v_operation = 'adjust' THEN
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: Producto SKU %s no encontrado', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                -- Get current stock
                SELECT stock_quantity INTO v_current_stock
                FROM public.store_inventory
                WHERE product_id = v_product_id;

                IF v_current_stock IS NULL THEN v_current_stock := 0; END IF;

                -- Prevent negative stock
                IF v_current_stock + v_quantity < 0 THEN
                    v_quantity := -v_current_stock; -- Adjust to zero
                END IF;

                -- Update inventory
                UPDATE public.store_inventory
                SET stock_quantity = GREATEST(stock_quantity + v_quantity, 0),
                    updated_at = NOW()
                WHERE product_id = v_product_id;

                -- Create transaction
                INSERT INTO public.store_inventory_transactions (
                    tenant_id, product_id, type, quantity, performed_by
                ) VALUES (
                    p_tenant_id, v_product_id, 'adjustment', v_quantity, p_performer_id
                );

                v_success_count := v_success_count + 1;

            -- ================================================================
            -- DAMAGE / THEFT / EXPIRED
            -- ================================================================
            ELSIF v_operation IN ('damage', 'daño', 'theft', 'robo', 'expired', 'vencido', 'return', 'devolución') THEN
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: Producto SKU %s no encontrado', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                -- Make quantity negative
                v_quantity := -ABS(v_quantity);

                -- Map operation type
                DECLARE v_txn_type TEXT;
                BEGIN
                    v_txn_type := CASE
                        WHEN v_operation IN ('damage', 'daño') THEN 'damage'
                        WHEN v_operation IN ('theft', 'robo') THEN 'theft'
                        WHEN v_operation IN ('expired', 'vencido') THEN 'expired'
                        WHEN v_operation IN ('return', 'devolución') THEN 'return'
                        ELSE 'adjustment'
                    END;

                    -- Update inventory
                    UPDATE public.store_inventory
                    SET stock_quantity = GREATEST(stock_quantity + v_quantity, 0),
                        updated_at = NOW()
                    WHERE product_id = v_product_id;

                    -- Create transaction
                    INSERT INTO public.store_inventory_transactions (
                        tenant_id, product_id, type, quantity, performed_by
                    ) VALUES (
                        p_tenant_id, v_product_id, v_txn_type, v_quantity, p_performer_id
                    );
                END;

                v_success_count := v_success_count + 1;

            -- ================================================================
            -- PRICE UPDATE
            -- ================================================================
            ELSIF v_operation = 'price update' OR v_operation = 'precio' OR v_operation = 'actualizar precio' THEN
                SELECT id INTO v_product_id
                FROM public.store_products
                WHERE tenant_id = p_tenant_id AND sku = v_sku;

                IF v_product_id IS NULL THEN
                    v_errors := array_append(v_errors, format('Fila %s: Producto SKU %s no encontrado', v_row_num, v_sku));
                    CONTINUE;
                END IF;

                IF v_price <= 0 THEN
                    v_errors := array_append(v_errors, format('Fila %s: Precio debe ser mayor a 0', v_row_num));
                    CONTINUE;
                END IF;

                -- Update price
                UPDATE public.store_products
                SET base_price = v_price,
                    updated_at = NOW()
                WHERE id = v_product_id;

                v_success_count := v_success_count + 1;

            ELSE
                -- Unknown operation
                IF v_operation != '' THEN
                    v_errors := array_append(v_errors, format('Fila %s: Operación desconocida: %s', v_row_num, v_operation));
                END IF;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, format('Fila %s: %s', v_row_num, SQLERRM));
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success_count', v_success_count,
        'errors', v_errors
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.import_inventory_batch(TEXT, UUID, JSONB) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.import_inventory_batch IS 'Bulk import inventory from Excel/Sheets. Handles new products, purchases, sales, adjustments, and price updates.';
