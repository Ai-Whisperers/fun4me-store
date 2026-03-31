-- =============================================================================
-- 05_ATOMIC_BOOKING.SQL
-- =============================================================================
-- Atomic appointment booking to prevent race condition double-booking.
-- Uses PostgreSQL advisory locks for serialization.
--
-- DEPENDENCIES: 40_scheduling/02_appointments.sql
-- =============================================================================

-- =============================================================================
-- ATOMIC APPOINTMENT CREATION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
    p_tenant_id TEXT,
    p_pet_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_reason TEXT,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_vet_id UUID DEFAULT NULL,
    p_service_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_lock_key BIGINT;
    v_conflict RECORD;
    v_appointment_id UUID;
    v_duration_minutes INTEGER;
BEGIN
    -- Calculate duration
    v_duration_minutes := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 60;

    -- Validate times
    IF p_end_time <= p_start_time THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'end_time must be after start_time',
            'error_code', 'invalid_time'
        );
    END IF;

    -- Generate advisory lock key from tenant + date + hour
    -- This allows concurrent bookings at different hours while serializing same-slot attempts
    v_lock_key := hashtext(p_tenant_id || date_trunc('hour', p_start_time)::TEXT);

    -- Acquire advisory lock (transaction-scoped, auto-released on commit/rollback)
    -- This serializes all booking attempts for the same tenant + hour
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Check for tenant-wide overlap (any appointment in the slot)
    SELECT a.id, a.start_time, a.end_time, p.name as pet_name
    INTO v_conflict
    FROM public.appointments a
    JOIN public.pets p ON a.pet_id = p.id
    WHERE a.tenant_id = p_tenant_id
    AND a.status NOT IN ('cancelled', 'no_show')
    AND a.deleted_at IS NULL
    AND (a.start_time, a.end_time) OVERLAPS (p_start_time, p_end_time)
    LIMIT 1;

    IF v_conflict.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El horario ya está ocupado',
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
        AND (a.start_time, a.end_time) OVERLAPS (p_start_time, p_end_time)
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

    -- Insert appointment (safe now - we hold the lock)
    INSERT INTO public.appointments (
        tenant_id,
        pet_id,
        start_time,
        end_time,
        duration_minutes,
        reason,
        notes,
        created_by,
        vet_id,
        service_id,
        status
    ) VALUES (
        p_tenant_id,
        p_pet_id,
        p_start_time,
        p_end_time,
        v_duration_minutes,
        p_reason,
        p_notes,
        p_created_by,
        p_vet_id,
        p_service_id,
        'pending'
    )
    RETURNING id INTO v_appointment_id;

    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_appointment_id,
        'message', 'Cita creada exitosamente'
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

COMMENT ON FUNCTION public.create_appointment_atomic(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, UUID, UUID) IS
'Atomically create an appointment with race-condition-safe overlap detection using advisory locks';

-- Grant execute to authenticated users (RLS will still apply on the insert)
GRANT EXECUTE ON FUNCTION public.create_appointment_atomic(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, UUID, UUID) TO authenticated;

-- =============================================================================
-- HELPER: Check if slot is available (without creating)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_slot_available(
    p_tenant_id TEXT,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_vet_id UUID DEFAULT NULL,
    p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_conflict_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM public.appointments a
    WHERE a.tenant_id = p_tenant_id
    AND a.status NOT IN ('cancelled', 'no_show')
    AND a.deleted_at IS NULL
    AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
    AND (p_vet_id IS NULL OR a.vet_id = p_vet_id)
    AND (a.start_time, a.end_time) OVERLAPS (p_start_time, p_end_time);

    RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.is_slot_available(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) IS
'Check if a time slot is available for booking';

GRANT EXECUTE ON FUNCTION public.is_slot_available(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) TO authenticated;
