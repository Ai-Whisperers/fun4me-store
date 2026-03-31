-- RACE-003: Atomic Appointment Status Update
-- Prevents TOCTOU race conditions in appointment status transitions
-- Validates and updates in a single atomic operation

CREATE OR REPLACE FUNCTION update_appointment_status_atomic(
  p_appointment_id UUID,
  p_new_status TEXT,
  p_user_id UUID,
  p_is_staff BOOLEAN DEFAULT FALSE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_allowed_transitions TEXT[];
  v_result JSONB;
BEGIN
  -- Lock the row and get current status in one operation
  SELECT status INTO v_current_status
  FROM appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_FOUND',
      'message', 'Cita no encontrada'
    );
  END IF;

  -- If no change needed, return success
  IF v_current_status = p_new_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_current_status,
      'message', 'Estado sin cambios'
    );
  END IF;

  -- Define valid transitions
  v_allowed_transitions := CASE v_current_status
    WHEN 'scheduled' THEN ARRAY['confirmed', 'cancelled']
    WHEN 'pending' THEN ARRAY['confirmed', 'cancelled']
    WHEN 'confirmed' THEN ARRAY['checked_in', 'cancelled', 'no_show']
    WHEN 'checked_in' THEN ARRAY['in_progress', 'no_show']
    WHEN 'in_progress' THEN ARRAY['completed', 'no_show']
    WHEN 'completed' THEN ARRAY[]::TEXT[]
    WHEN 'cancelled' THEN ARRAY[]::TEXT[]
    WHEN 'no_show' THEN ARRAY[]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;

  -- Check if transition is valid
  IF NOT (p_new_status = ANY(v_allowed_transitions)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_TRANSITION',
      'message', format('No se puede cambiar de "%s" a "%s"', v_current_status, p_new_status),
      'current_status', v_current_status,
      'requested_status', p_new_status
    );
  END IF;

  -- Non-staff can only cancel
  IF NOT p_is_staff AND p_new_status != 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OWNER_CANCEL_ONLY',
      'message', 'Solo puedes cancelar tu cita'
    );
  END IF;

  -- Perform the update
  UPDATE appointments
  SET
    status = p_new_status,
    updated_at = NOW(),
    notes = COALESCE(p_notes, notes),
    -- Set cancellation fields if cancelled
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
    cancelled_by = CASE WHEN p_new_status = 'cancelled' THEN p_user_id ELSE cancelled_by END,
    -- Set completion fields if completed
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
    completed_by = CASE WHEN p_new_status = 'completed' THEN p_user_id ELSE completed_by END,
    -- Set check-in time
    checked_in_at = CASE WHEN p_new_status = 'checked_in' THEN NOW() ELSE checked_in_at END
  WHERE id = p_appointment_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'status', p_new_status,
    'message', format('Estado actualizado de "%s" a "%s"', v_current_status, p_new_status)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_appointment_status_atomic TO authenticated;

COMMENT ON FUNCTION update_appointment_status_atomic IS
'RACE-003: Atomically validates and updates appointment status to prevent TOCTOU race conditions';
