-- Function to process checkout atomically
-- Returns JSON with success/error status

CREATE OR REPLACE FUNCTION process_checkout(
  p_tenant_id TEXT,
  p_user_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_price NUMERIC;
  v_type TEXT;
  v_product_name TEXT;
  v_current_stock INTEGER;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_total NUMERIC := 0;
  v_stock_errors JSONB := '[]'::JSONB;
  v_item_total NUMERIC;
BEGIN
  -- 1. Validate Stock for all products first (Fail fast)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_type := v_item->>'type';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_product_id := (v_item->>'id')::UUID;
    v_product_name := v_item->>'name';
    v_price := (v_item->>'price')::NUMERIC;
    
    -- Accumulate total
    v_total := v_total + (v_price * v_quantity);

    IF v_type = 'product' THEN
      -- Check stock
      SELECT stock INTO v_current_stock
      FROM store_inventory
      WHERE product_id = v_product_id AND tenant_id = p_tenant_id
      FOR UPDATE; -- Lock the row

      IF v_current_stock IS NULL THEN
        -- Product not in inventory, treat as 0 stock? Or ignore if allow_backorder?
        -- For now, assume strict inventory.
         v_stock_errors := v_stock_errors || jsonb_build_object(
          'id', v_product_id,
          'name', v_product_name,
          'requested', v_quantity,
          'available', 0
        );
      ELSIF v_current_stock < v_quantity THEN
        v_stock_errors := v_stock_errors || jsonb_build_object(
          'id', v_product_id,
          'name', v_product_name,
          'requested', v_quantity,
          'available', v_current_stock
        );
      END IF;
    END IF;
  END LOOP;

  -- If any stock errors, return immediately
  IF jsonb_array_length(v_stock_errors) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Stock insuficiente',
      'stock_errors', v_stock_errors
    );
  END IF;

  -- 2. Create Invoice
  -- Generate invoice number (simple implementation, real one would use a sequence/function)
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 6);
  
  INSERT INTO invoices (
    tenant_id,
    customer_id,
    invoice_number,
    date,
    due_date,
    status,
    total_amount,
    notes,
    created_items -- Assuming this is JSONB or we insert invoice_items separately
  ) VALUES (
    p_tenant_id,
    p_user_id, -- Assuming customer_id links to profile/user
    v_invoice_number,
    now(),
    now(),
    'paid', -- Assuming immediate payment for online store? Or 'pending'? Let's say 'pending' or 'paid' depending on logic. Plan says 'invoice record', let's assume 'pending'.
    v_total,
    p_notes,
    p_items -- Storing raw items for reference if needed
  ) RETURNING id INTO v_invoice_id;

  -- 3. Process Items: Decrement Stock & Create Invoice Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_type := v_item->>'type';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_product_id := (v_item->>'id')::UUID;
    v_price := (v_item->>'price')::NUMERIC;
    v_item_total := v_price * v_quantity;

    -- Decrement Stock (only for products)
    IF v_type = 'product' THEN
      UPDATE store_inventory
      SET stock = stock - v_quantity,
          updated_at = now()
      WHERE product_id = v_product_id AND tenant_id = p_tenant_id;
    END IF;

    -- Create Invoice Item
    INSERT INTO invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      total_price,
      item_type,
      item_reference_id
    ) VALUES (
      v_invoice_id,
      v_item->>'name',
      v_quantity,
      v_price,
      v_item_total,
      v_type,
      v_product_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'invoice', jsonb_build_object(
      'id', v_invoice_id,
      'invoice_number', v_invoice_number,
      'total', v_total,
      'status', 'pending'
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
