-- SEC-005: Atomic Lab Order Creation
-- Creates lab orders with items and panels in a single transaction
-- Prevents orphaned records if any part fails

CREATE OR REPLACE FUNCTION create_lab_order_atomic(
  p_tenant_id TEXT,
  p_pet_id UUID,
  p_order_number TEXT,
  p_ordered_by UUID,
  p_priority TEXT DEFAULT 'routine',
  p_lab_type TEXT DEFAULT 'in_house',
  p_fasting_status TEXT DEFAULT NULL,
  p_clinical_notes TEXT DEFAULT NULL,
  p_test_ids UUID[] DEFAULT '{}',
  p_panel_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_test_id UUID;
  v_panel_id UUID;
  v_result JSONB;
BEGIN
  -- Validate inputs
  IF array_length(p_test_ids, 1) IS NULL OR array_length(p_test_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_TESTS',
      'message', 'Se requiere al menos una prueba'
    );
  END IF;

  -- Create the lab order
  INSERT INTO lab_orders (
    tenant_id,
    pet_id,
    order_number,
    ordered_by,
    ordered_at,
    status,
    priority,
    lab_type,
    fasting_status,
    clinical_notes,
    has_critical_values
  ) VALUES (
    p_tenant_id,
    p_pet_id,
    p_order_number,
    p_ordered_by,
    NOW(),
    'ordered',
    COALESCE(p_priority, 'routine'),
    COALESCE(p_lab_type, 'in_house'),
    p_fasting_status,
    p_clinical_notes,
    false
  )
  RETURNING id INTO v_order_id;

  -- Insert order items for each test
  FOREACH v_test_id IN ARRAY p_test_ids
  LOOP
    INSERT INTO lab_order_items (order_id, test_id)
    VALUES (v_order_id, v_test_id);
  END LOOP;

  -- Insert panels if provided
  IF array_length(p_panel_ids, 1) IS NOT NULL AND array_length(p_panel_ids, 1) > 0 THEN
    FOREACH v_panel_id IN ARRAY p_panel_ids
    LOOP
      INSERT INTO lab_order_panels (order_id, panel_id)
      VALUES (v_order_id, v_panel_id);
    END LOOP;
  END IF;

  -- Build success result
  v_result := jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', p_order_number,
    'test_count', array_length(p_test_ids, 1),
    'panel_count', COALESCE(array_length(p_panel_ids, 1), 0)
  );

  RETURN v_result;

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DUPLICATE_ORDER',
      'message', 'El número de orden ya existe'
    );
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_REFERENCE',
      'message', 'Prueba o panel no encontrado'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_lab_order_atomic TO authenticated;

COMMENT ON FUNCTION create_lab_order_atomic IS
'SEC-005: Atomically creates a lab order with its items and panels in a single transaction';
