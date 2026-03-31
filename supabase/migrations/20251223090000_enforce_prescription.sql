-- Migration: Enforce Prescription Checks
-- Date: 2025-12-23 09:00:00
-- Description: Updates process_checkout RPC to fail if a prescription-required product is missing a file link.

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
  v_requires_prescription BOOLEAN;
  v_prescription_file TEXT;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_total NUMERIC := 0;
  v_stock_errors JSONB := '[]'::JSONB;
  v_prescription_errors JSONB := '[]'::JSONB;
  v_item_total NUMERIC;
BEGIN
  -- 1. Validate Stock AND Prescriptions for all products first (Fail fast)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_type := v_item->>'type';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_product_id := (v_item->>'id')::UUID;
    v_product_name := v_item->>'name';
    v_price := (v_item->>'price')::NUMERIC;
    v_prescription_file := v_item->>'prescription_file'; -- Expecting file URL or ID here
    
    -- Accumulate total
    v_total := v_total + (v_price * v_quantity);

    IF v_type = 'product' THEN
      -- Get stock and prescription flag
      SELECT stock_quantity, p.requires_prescription 
      INTO v_current_stock, v_requires_prescription
      FROM store_inventory i
      JOIN store_products p ON i.product_id = p.id
      WHERE i.product_id = v_product_id AND i.tenant_id = p_tenant_id
      FOR UPDATE OF i; -- Lock the inventory row

      -- Check Stock
      IF v_current_stock IS NULL THEN
         v_stock_errors := v_stock_errors || jsonb_build_object('id', v_product_id, 'name', v_product_name, 'available', 0);
      ELSIF v_current_stock < v_quantity THEN
         v_stock_errors := v_stock_errors || jsonb_build_object('id', v_product_id, 'name', v_product_name, 'available', v_current_stock);
      END IF;

      -- Check Prescription
      IF v_requires_prescription AND (v_prescription_file IS NULL OR v_prescription_file = '') THEN
         v_prescription_errors := v_prescription_errors || jsonb_build_object('id', v_product_id, 'name', v_product_name, 'error', 'Missing prescription');
      END IF;
    END IF;
  END LOOP;

  -- Return errors if any
  IF jsonb_array_length(v_stock_errors) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente', 'stock_errors', v_stock_errors);
  END IF;

  IF jsonb_array_length(v_prescription_errors) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Falta receta médica', 'prescription_errors', v_prescription_errors);
  END IF;

  -- 2. Create Invoice
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substring(md5(random()::text) from 1 for 6);
  
  INSERT INTO invoices (
    tenant_id, customer_id, invoice_number, date, due_date, status, total_amount, notes, created_items
  ) VALUES (
    p_tenant_id, p_user_id, v_invoice_number, now(), now(), 'pending', v_total, p_notes, p_items
  ) RETURNING id INTO v_invoice_id;

  -- 3. Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_type := v_item->>'type';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_product_id := (v_item->>'id')::UUID;
    v_price := (v_item->>'price')::NUMERIC;
    v_item_total := v_price * v_quantity;

    IF v_type = 'product' THEN
      UPDATE store_inventory SET stock_quantity = stock_quantity - v_quantity, updated_at = now()
      WHERE product_id = v_product_id AND tenant_id = p_tenant_id;
    END IF;

    INSERT INTO invoice_items (
      invoice_id, description, quantity, unit_price, total_price, item_type, item_reference_id
    ) VALUES (
      v_invoice_id, v_item->>'name', v_quantity, v_price, v_item_total, v_type, v_product_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'invoice', jsonb_build_object('id', v_invoice_id, 'invoice_number', v_invoice_number, 'total', v_total, 'status', 'pending')
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
