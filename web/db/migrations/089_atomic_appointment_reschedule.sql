-- =============================================================================
-- 089_ATOMIC_APPOINTMENT_RESCHEDULE.SQL
-- =============================================================================
-- Fixes appointment rescheduling race condition (TOCTOU vulnerability).
--
-- PROBLEM:
--   Thread A: Check new slot availability → Update appointment
--   Thread B: Check new slot availability → Update appointment
--   RESULT: Double-booking in the new time slot
--
-- SOLUTION:
--   Atomic function that checks availability and updates appointment in single transaction
--   using row-level locks (FOR UPDATE) to prevent concurrent updates
--
-- CRITICAL: Prevents double-booking during reschedule
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reschedule_appointment_atomic(
    p_appointment_id UUID,
    p_new_start_time TIMESTAMPTZ,
    p_user_id UUID,
    p_is_staff BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appointment RECORD;
    v_new_end_time TIMESTAMPTZ;
    v_duration_minutes INTEGER;
    v_overlap_count INTEGER;
    v_vet_name TEXT;
BEGIN
    -- =================================================================
    -- STEP 1: Lock the appointment row and get current state
    -- =================================================================
    -- FOR UPDATE locks the row until transaction commits
    
    SELECT
        id,
        tenant_id,
        pet_id,
        service_id,
        vet_id,
        start_time,
        end_time,
        status,
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60 AS duration_mins
    INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id
    FOR UPDATE;  -- 🔒 ROW LOCK - Prevents concurrent reschedules

    -- =================================================================
    -- STEP 2: Validation checks
    -- =================================================================
    
    IF v_appointment.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'NOT_FOUND',
            'message', 'Cita no encontrada'
        );
    END IF;

    -- Check if appointment can be rescheduled
    IF v_appointment.status IN ('cancelled', 'completed', 'no_show') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_STATUS',
            'message', format('No se puede reprogramar una cita %s', v_appointment.status)
        );
    END IF;

    -- Authorization check: verify user owns the pet or is staff
    IF NOT p_is_staff THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pets
            WHERE id = v_appointment.pet_id
              AND owner_id = p_user_id
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'UNAUTHORIZED',
                'message', 'No tienes permiso para reprogramar esta cita'
            );
        END IF;
    END IF;

    -- Validate new time is in the future
    IF p_new_start_time <= NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TIME',
            'message', 'La nueva hora debe ser en el futuro'
        );
    END IF;

    -- Calculate new end time (maintain same duration)
    v_duration_minutes := FLOOR(v_appointment.duration_mins);
    v_new_end_time := p_new_start_time + (v_duration_minutes || ' minutes')::INTERVAL;

    -- =================================================================
    -- STEP 3: Lock and check for overlapping appointments
    -- =================================================================
    -- Check all appointments EXCEPT the one being rescheduled
    
    SELECT COUNT(*) INTO v_overlap_count
    FROM appointments
    WHERE tenant_id = v_appointment.tenant_id
      AND vet_id = v_appointment.vet_id
      AND id != p_appointment_id  -- Exclude current appointment
      AND status NOT IN ('cancelled', 'no_show')
      AND (
          -- New time overlaps with existing appointment
          (p_new_start_time >= start_time AND p_new_start_time < end_time)
          OR
          (v_new_end_time > start_time AND v_new_end_time <= end_time)
          OR
          (p_new_start_time <= start_time AND v_new_end_time >= end_time)
      )
    FOR UPDATE;  -- 🔒 ROW LOCK - Prevents race condition

    IF v_overlap_count > 0 THEN
        -- Get vet name for error message
        SELECT full_name INTO v_vet_name
        FROM profiles
        WHERE id = v_appointment.vet_id AND tenant_id = v_appointment.tenant_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'SLOT_UNAVAILABLE',
            'message', format('El nuevo horario no está disponible. %s ya tiene una cita en ese horario.',
                            COALESCE(v_vet_name, 'El veterinario'))
        );
    END IF;

    -- =================================================================
    -- STEP 4: Update the appointment
    -- =================================================================
    
    UPDATE appointments
    SET
        start_time = p_new_start_time,
        end_time = v_new_end_time,
        status = CASE
            -- Reset to pending if currently scheduled (needs re-confirmation)
            WHEN status = 'scheduled' THEN 'pending'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_appointment_id;

    -- =================================================================
    -- STEP 5: Return success
    -- =================================================================
    
    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', p_appointment_id,
        'old_start_time', v_appointment.start_time,
        'new_start_time', p_new_start_time,
        'new_end_time', v_new_end_time,
        'status', CASE
            WHEN v_appointment.status = 'scheduled' THEN 'pending'
            ELSE v_appointment.status
        END
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNEXPECTED_ERROR',
            'message', 'Error inesperado al reprogramar la cita',
            'details', SQLERRM
        );
END;
$$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION reschedule_appointment_atomic TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION reschedule_appointment_atomic IS
'Atomically checks new slot availability and reschedules appointment. Uses row-level locks to prevent double-booking race condition.';

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
          AND p.proname = 'reschedule_appointment_atomic'
    ) THEN
        RAISE EXCEPTION 'Migration failed: reschedule_appointment_atomic function not created';
    END IF;

    RAISE NOTICE 'Atomic appointment reschedule migration complete';
END $$;
