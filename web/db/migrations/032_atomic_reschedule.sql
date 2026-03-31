-- =============================================================================
-- 032_ATOMIC_RESCHEDULE.SQL
-- =============================================================================
-- Adds atomic reschedule function to prevent race condition when rescheduling
-- appointments via drag-and-drop in the calendar.
--
-- PROBLEM: The current reschedule flow checks for overlaps, then updates
-- separately. Between the check and update, another transaction could create
-- a conflicting appointment (TOCTOU race condition).
--
-- SOLUTION: Use advisory locks and atomic check+update within a single
-- database function, similar to create_appointment_atomic().
-- =============================================================================

-- =============================================================================
-- ATOMIC APPOINTMENT RESCHEDULE FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reschedule_appointment_atomic(
    p_appointment_id UUID,
    p_new_start_time TIMESTAMPTZ,
    p_new_end_time TIMESTAMPTZ,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_lock_key BIGINT;
    v_appointment RECORD;
    v_conflict RECORD;
    v_duration_minutes INTEGER;
BEGIN
    -- Validate times
    IF p_new_end_time <= p_new_start_time THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La hora de fin debe ser posterior a la hora de inicio',
            'error_code', 'invalid_time'
        );
    END IF;

    -- Validate not in the past
    IF p_new_start_time < NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No se puede reprogramar a una fecha pasada',
            'error_code', 'past_date'
        );
    END IF;

    -- Get current appointment
    SELECT id, tenant_id, vet_id, status, start_time, end_time
    INTO v_appointment
    FROM public.appointments
    WHERE id = p_appointment_id
    AND deleted_at IS NULL;

    IF v_appointment.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cita no encontrada',
            'error_code', 'not_found'
        );
    END IF;

    -- Check if appointment can be rescheduled
    IF v_appointment.status IN ('cancelled', 'completed', 'no_show') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Esta cita no puede ser reprogramada',
            'error_code', 'invalid_status'
        );
    END IF;

    -- Calculate new duration
    v_duration_minutes := EXTRACT(EPOCH FROM (p_new_end_time - p_new_start_time)) / 60;

    -- Generate advisory lock key from tenant + new date/hour
    -- This serializes reschedule attempts for the same time slot
    v_lock_key := hashtext(
        v_appointment.tenant_id || ':' ||
        COALESCE(v_appointment.vet_id::TEXT, 'ANY') || ':' ||
        to_char(p_new_start_time, 'YYYY-MM-DD-HH24')
    );

    -- Acquire advisory lock (transaction-scoped)
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Check for conflicts with other appointments (excluding current one)
    SELECT
        a.id,
        a.start_time,
        a.end_time,
        p.name as pet_name,
        pr.full_name as owner_name
    INTO v_conflict
    FROM public.appointments a
    JOIN public.pets p ON a.pet_id = p.id
    LEFT JOIN public.profiles pr ON p.owner_id = pr.id
    WHERE a.tenant_id = v_appointment.tenant_id
    AND a.id != p_appointment_id
    AND a.status NOT IN ('cancelled', 'no_show')
    AND a.deleted_at IS NULL
    AND (
        -- Check tenant-wide overlap OR vet-specific overlap
        (v_appointment.vet_id IS NULL) OR (a.vet_id = v_appointment.vet_id)
    )
    AND tstzrange(a.start_time, a.end_time, '[)') && tstzrange(p_new_start_time, p_new_end_time, '[)')
    LIMIT 1;

    IF v_conflict.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El horario seleccionado no está disponible',
            'error_code', 'slot_taken',
            'conflict', jsonb_build_object(
                'id', v_conflict.id,
                'start_time', v_conflict.start_time,
                'end_time', v_conflict.end_time,
                'pet_name', v_conflict.pet_name,
                'owner_name', v_conflict.owner_name
            )
        );
    END IF;

    -- Perform the update (safe now - we hold the lock)
    UPDATE public.appointments
    SET
        start_time = p_new_start_time,
        end_time = p_new_end_time,
        duration_minutes = v_duration_minutes,
        updated_at = NOW()
    WHERE id = p_appointment_id;

    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', p_appointment_id,
        'new_start_time', p_new_start_time,
        'new_end_time', p_new_end_time,
        'message', 'Cita reprogramada exitosamente'
    );

EXCEPTION
    WHEN exclusion_violation THEN
        -- Caught by EXCLUSION constraint - another transaction won the race
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El horario fue tomado por otra cita. Por favor intente otro horario.',
            'error_code', 'exclusion_violation'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.reschedule_appointment_atomic(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS
'Atomically reschedules an appointment with race-condition-safe overlap detection using advisory locks';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.reschedule_appointment_atomic(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;
