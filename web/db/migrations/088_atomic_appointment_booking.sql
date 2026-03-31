-- =============================================================================
-- 088_ATOMIC_APPOINTMENT_BOOKING.SQL
-- =============================================================================
-- Fixes appointment booking race condition (TOCTOU vulnerability).
--
-- PROBLEM:
--   Thread A: Check availability → Book appointment
--   Thread B: Check availability → Book appointment
--   RESULT: Double-booking in same time slot
--
-- SOLUTION:
--   Atomic function that checks availability and creates appointment in single transaction
--   using row-level locks (FOR UPDATE) to prevent concurrent bookings
--
-- CRITICAL: Prevents double-booking race condition
-- =============================================================================

CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
    p_tenant_id TEXT,
    p_pet_id UUID,
    p_service_id UUID,
    p_vet_id UUID,
    p_start_time TIMESTAMPTZ,
    p_duration_minutes INTEGER DEFAULT 30,
    p_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_booked_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_end_time TIMESTAMPTZ;
    v_appointment_id UUID;
    v_overlap_count INTEGER;
    v_vet_name TEXT;
    v_pet_name TEXT;
BEGIN
    -- Calculate end time
    v_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;

    -- =================================================================
    -- STEP 1: Lock and check for overlapping appointments
    -- =================================================================
    -- FOR UPDATE locks the rows until transaction commits
    -- Other transactions will WAIT here (no race condition)
    
    SELECT COUNT(*) INTO v_overlap_count
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND vet_id = p_vet_id
      AND status NOT IN ('cancelled', 'no_show')
      AND (
          -- New appointment starts during existing appointment
          (p_start_time >= start_time AND p_start_time < end_time)
          OR
          -- New appointment ends during existing appointment
          (v_end_time > start_time AND v_end_time <= end_time)
          OR
          -- New appointment completely encompasses existing appointment
          (p_start_time <= start_time AND v_end_time >= end_time)
      )
    FOR UPDATE;  -- 🔒 ROW LOCK - Prevents race condition

    -- =================================================================
    -- STEP 2: Validation checks
    -- =================================================================
    
    IF v_overlap_count > 0 THEN
        -- Get vet name for error message
        SELECT full_name INTO v_vet_name
        FROM profiles
        WHERE id = p_vet_id AND tenant_id = p_tenant_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'SLOT_UNAVAILABLE',
            'message', format('El horario no está disponible. %s ya tiene una cita en ese horario.',
                            COALESCE(v_vet_name, 'El veterinario'))
        );
    END IF;

    -- Verify pet exists and belongs to tenant
    SELECT name INTO v_pet_name
    FROM pets
    WHERE id = p_pet_id
      AND tenant_id = p_tenant_id
      AND deleted_at IS NULL;

    IF v_pet_name IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'PET_NOT_FOUND',
            'message', 'Mascota no encontrada'
        );
    END IF;

    -- Verify vet exists and is staff in tenant
    IF NOT EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = p_vet_id
          AND tenant_id = p_tenant_id
          AND role IN ('vet', 'admin')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'VET_NOT_FOUND',
            'message', 'Veterinario no encontrado'
        );
    END IF;

    -- Verify service exists
    IF NOT EXISTS (
        SELECT 1
        FROM services
        WHERE id = p_service_id
          AND tenant_id = p_tenant_id
          AND is_active = true
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'SERVICE_NOT_FOUND',
            'message', 'Servicio no encontrado'
        );
    END IF;

    -- Validate start time is in the future
    IF p_start_time <= NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TIME',
            'message', 'La hora de la cita debe ser en el futuro'
        );
    END IF;

    -- =================================================================
    -- STEP 3: Create the appointment
    -- =================================================================
    
    v_appointment_id := gen_random_uuid();

    INSERT INTO appointments (
        id,
        tenant_id,
        pet_id,
        service_id,
        vet_id,
        start_time,
        end_time,
        status,
        reason,
        notes,
        created_by
    ) VALUES (
        v_appointment_id,
        p_tenant_id,
        p_pet_id,
        p_service_id,
        p_vet_id,
        p_start_time,
        v_end_time,
        'scheduled',
        p_reason,
        p_notes,
        COALESCE(p_booked_by, (SELECT owner_id FROM pets WHERE id = p_pet_id))
    );

    -- =================================================================
    -- STEP 4: Return success
    -- =================================================================
    
    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_appointment_id,
        'start_time', p_start_time,
        'end_time', v_end_time,
        'status', 'scheduled'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNEXPECTED_ERROR',
            'message', 'Error inesperado al crear la cita',
            'details', SQLERRM
        );
END;
$$;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Ensure we have indexes for the overlap check
CREATE INDEX IF NOT EXISTS idx_appointments_vet_time_status
ON appointments(tenant_id, vet_id, start_time, end_time, status)
WHERE status NOT IN ('cancelled', 'no_show');

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION book_appointment_atomic TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION book_appointment_atomic IS
'Atomically checks availability and creates appointment. Uses row-level locks to prevent double-booking race condition.';

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
          AND p.proname = 'book_appointment_atomic'
    ) THEN
        RAISE EXCEPTION 'Migration failed: book_appointment_atomic function not created';
    END IF;

    RAISE NOTICE 'Atomic appointment booking migration complete';
END $$;
