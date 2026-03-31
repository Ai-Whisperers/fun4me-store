-- =============================================================================
-- 044_MULTI_SERVICE_BOOKING.SQL
-- =============================================================================
-- Adds support for booking multiple services in a single session.
-- Services are created as separate sequential appointments linked by booking_group_id.
--
-- DEPENDENCIES: 40_scheduling/02_appointments.sql
-- =============================================================================

-- Add booking_group_id to link related appointments
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS booking_group_id UUID;

COMMENT ON COLUMN public.appointments.booking_group_id IS
    'Links multiple appointments booked together as a single multi-service booking session';

-- Index for efficient group queries
CREATE INDEX IF NOT EXISTS idx_appointments_booking_group
    ON public.appointments(booking_group_id)
    WHERE booking_group_id IS NOT NULL;

-- =============================================================================
-- ATOMIC MULTI-SERVICE BOOKING FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_multi_service_booking(
    p_tenant_id TEXT,
    p_pet_id UUID,
    p_start_time TIMESTAMPTZ,
    p_service_ids UUID[],
    p_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_vet_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_lock_key BIGINT;
    v_booking_group_id UUID;
    v_current_start TIMESTAMPTZ;
    v_current_end TIMESTAMPTZ;
    v_service RECORD;
    v_appointment_ids UUID[] := '{}';
    v_total_duration INTEGER := 0;
    v_appointment_id UUID;
    v_service_names TEXT[] := '{}';
    v_conflict RECORD;
BEGIN
    -- Validate input
    IF array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Debe seleccionar al menos un servicio',
            'error_code', 'no_services'
        );
    END IF;

    IF array_length(p_service_ids, 1) > 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Máximo 5 servicios por reserva',
            'error_code', 'too_many_services'
        );
    END IF;

    -- Check for same pet same day (business rule - atomic check)
    IF EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.pet_id = p_pet_id
        AND a.status NOT IN ('cancelled', 'no_show')
        AND a.deleted_at IS NULL
        AND date_trunc('day', a.start_time AT TIME ZONE 'America/Asuncion') =
            date_trunc('day', p_start_time AT TIME ZONE 'America/Asuncion')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Esta mascota ya tiene una cita programada para este día',
            'error_code', 'same_pet_same_day'
        );
    END IF;

    -- Generate booking group ID (only if more than one service)
    IF array_length(p_service_ids, 1) > 1 THEN
        v_booking_group_id := gen_random_uuid();
    END IF;

    v_current_start := p_start_time;

    -- Calculate total duration for overlap check
    SELECT COALESCE(SUM(COALESCE(s.duration_minutes, 30)), 30)
    INTO v_total_duration
    FROM public.services s
    WHERE s.id = ANY(p_service_ids);

    -- Calculate end time for the entire block
    v_current_end := p_start_time + (v_total_duration || ' minutes')::INTERVAL;

    -- Acquire advisory lock for the entire time block
    v_lock_key := hashtext(p_tenant_id || date_trunc('hour', p_start_time)::TEXT);
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Check for any overlaps in the entire time block (tenant-wide)
    SELECT a.id, a.start_time, a.end_time, p.name as pet_name
    INTO v_conflict
    FROM public.appointments a
    JOIN public.pets p ON a.pet_id = p.id
    WHERE a.tenant_id = p_tenant_id
    AND a.status NOT IN ('cancelled', 'no_show')
    AND a.deleted_at IS NULL
    AND (a.start_time, a.end_time) OVERLAPS (p_start_time, v_current_end)
    LIMIT 1;

    IF v_conflict.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El bloque de tiempo solicitado no está disponible',
            'error_code', 'slot_taken',
            'conflict', jsonb_build_object(
                'id', v_conflict.id,
                'start_time', v_conflict.start_time,
                'end_time', v_conflict.end_time,
                'pet_name', v_conflict.pet_name
            )
        );
    END IF;

    -- If vet_id provided, also check vet-specific overlap
    IF p_vet_id IS NOT NULL THEN
        SELECT a.id, a.start_time, a.end_time, p.name as pet_name
        INTO v_conflict
        FROM public.appointments a
        JOIN public.pets p ON a.pet_id = p.id
        WHERE a.tenant_id = p_tenant_id
        AND a.vet_id = p_vet_id
        AND a.status NOT IN ('cancelled', 'no_show')
        AND a.deleted_at IS NULL
        AND (a.start_time, a.end_time) OVERLAPS (p_start_time, v_current_end)
        LIMIT 1;

        IF v_conflict.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'El veterinario ya tiene una cita en ese horario',
                'error_code', 'vet_busy',
                'conflict', jsonb_build_object(
                    'id', v_conflict.id,
                    'start_time', v_conflict.start_time,
                    'end_time', v_conflict.end_time,
                    'pet_name', v_conflict.pet_name
                )
            );
        END IF;
    END IF;

    -- Create appointments sequentially
    v_current_start := p_start_time;

    FOR v_service IN
        SELECT s.id, s.name, COALESCE(s.duration_minutes, 30) as duration
        FROM public.services s
        WHERE s.id = ANY(p_service_ids)
        ORDER BY array_position(p_service_ids, s.id)
    LOOP
        v_current_end := v_current_start + (v_service.duration || ' minutes')::INTERVAL;

        INSERT INTO public.appointments (
            tenant_id,
            pet_id,
            service_id,
            start_time,
            end_time,
            duration_minutes,
            reason,
            notes,
            created_by,
            vet_id,
            booking_group_id,
            status
        ) VALUES (
            p_tenant_id,
            p_pet_id,
            v_service.id,
            v_current_start,
            v_current_end,
            v_service.duration,
            COALESCE(p_reason, v_service.name),
            p_notes,
            p_created_by,
            p_vet_id,
            v_booking_group_id,
            'pending'
        )
        RETURNING id INTO v_appointment_id;

        v_appointment_ids := v_appointment_ids || v_appointment_id;
        v_service_names := v_service_names || v_service.name;
        v_current_start := v_current_end;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'booking_group_id', v_booking_group_id,
        'appointment_ids', v_appointment_ids,
        'service_names', v_service_names,
        'total_duration', v_total_duration,
        'start_time', p_start_time,
        'end_time', v_current_start,
        'message', 'Citas creadas exitosamente'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.create_multi_service_booking(TEXT, UUID, TIMESTAMPTZ, UUID[], TEXT, TEXT, UUID, UUID) IS
    'Atomically create multiple sequential appointments for a multi-service booking session';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_multi_service_booking(TEXT, UUID, TIMESTAMPTZ, UUID[], TEXT, TEXT, UUID, UUID) TO authenticated;

-- =============================================================================
-- HELPER: GET APPOINTMENTS BY BOOKING GROUP
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_booking_group_appointments(
    p_booking_group_id UUID
)
RETURNS TABLE (
    appointment_id UUID,
    service_id UUID,
    service_name TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    status TEXT,
    sequence_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.service_id,
        s.name,
        a.start_time,
        a.end_time,
        a.duration_minutes,
        a.status,
        ROW_NUMBER() OVER (ORDER BY a.start_time)::INTEGER as sequence_order
    FROM public.appointments a
    LEFT JOIN public.services s ON a.service_id = s.id
    WHERE a.booking_group_id = p_booking_group_id
    AND a.deleted_at IS NULL
    ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_booking_group_appointments(UUID) IS
    'Get all appointments in a booking group, ordered by start time';

GRANT EXECUTE ON FUNCTION public.get_booking_group_appointments(UUID) TO authenticated;
