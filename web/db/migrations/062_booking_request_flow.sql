-- =============================================================================
-- 062_BOOKING_REQUEST_FLOW.SQL
-- =============================================================================
-- Implements booking request flow where customers submit requests without
-- selecting specific times. Clinic staff then schedules the actual appointment.
--
-- Changes:
-- 1. Add scheduling_status column to track request vs scheduled state
-- 2. Add preference columns for customer preferences
-- 3. Add metadata columns for request tracking
-- 4. Create RPC functions for request submission and scheduling
-- 5. Update validation to skip overlap checks for pending requests
--
-- DEPENDENCIES: 40_scheduling/02_appointments.sql, 40_scheduling/05_atomic_booking.sql
-- =============================================================================

-- =============================================================================
-- SCHEMA CHANGES
-- =============================================================================

-- Add scheduling_status column
-- This is SEPARATE from status (which tracks appointment lifecycle)
-- scheduling_status tracks the booking/scheduling phase
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS scheduling_status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (scheduling_status IN (
        'pending_scheduling',  -- Customer submitted request, awaiting clinic scheduling
        'scheduled',           -- Clinic has assigned a specific time (default)
        'rescheduling'         -- Being rescheduled by staff (future use)
    ));

COMMENT ON COLUMN public.appointments.scheduling_status IS
'Tracks booking phase: pending_scheduling (request submitted, no time set), scheduled (time assigned), rescheduling (being changed)';

-- Add request metadata columns
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS scheduled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Add customer preference columns
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS preferred_date_start DATE;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS preferred_date_end DATE;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS preferred_time_of_day TEXT
    CHECK (preferred_time_of_day IS NULL OR preferred_time_of_day IN ('morning', 'afternoon', 'any'));

COMMENT ON COLUMN public.appointments.requested_at IS 'When the customer submitted the booking request';
COMMENT ON COLUMN public.appointments.scheduled_by IS 'Staff member who scheduled the pending request';
COMMENT ON COLUMN public.appointments.scheduled_at IS 'When the appointment was scheduled (time assigned)';
COMMENT ON COLUMN public.appointments.preferred_date_start IS 'Customer preferred date range start (optional)';
COMMENT ON COLUMN public.appointments.preferred_date_end IS 'Customer preferred date range end (optional)';
COMMENT ON COLUMN public.appointments.preferred_time_of_day IS 'Customer preference: morning, afternoon, or any';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for staff dashboard pending requests view
CREATE INDEX IF NOT EXISTS idx_appointments_pending_scheduling
    ON public.appointments(tenant_id, scheduling_status, requested_at)
    WHERE scheduling_status = 'pending_scheduling' AND deleted_at IS NULL;

-- Update calendar covering index to include scheduling_status
DROP INDEX IF EXISTS idx_appointments_calendar_v2;
CREATE INDEX IF NOT EXISTS idx_appointments_calendar_v2
    ON public.appointments(tenant_id, start_time, status, scheduling_status)
    INCLUDE (pet_id, vet_id, service_id, end_time, duration_minutes, reason)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- UPDATE VALIDATION TRIGGER
-- Skip overlap validation for pending_scheduling appointments
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_appointment_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict RECORD;
BEGIN
    -- Skip for cancelled/no-show
    IF NEW.status IN ('cancelled', 'no_show') THEN
        RETURN NEW;
    END IF;

    -- Skip overlap validation for pending_scheduling appointments
    -- (they use sentinel times, not real scheduled times)
    IF NEW.scheduling_status = 'pending_scheduling' THEN
        RETURN NEW;
    END IF;

    -- Check for overlaps if vet is assigned
    IF NEW.vet_id IS NOT NULL THEN
        SELECT * INTO v_conflict
        FROM public.check_appointment_overlap(
            NEW.tenant_id,
            NEW.vet_id,
            NEW.start_time,
            NEW.end_time,
            NEW.id
        )
        LIMIT 1;

        IF v_conflict.conflicting_id IS NOT NULL THEN
            RAISE EXCEPTION 'Appointment overlaps with existing booking for %',
                v_conflict.pet_name
                USING ERRCODE = 'exclusion_violation',
                      HINT = 'Choose a different time slot or vet';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================================
-- RPC: CREATE BOOKING REQUEST (for customers)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_booking_request(
    p_tenant_id TEXT,
    p_pet_id UUID,
    p_service_ids UUID[],
    p_notes TEXT DEFAULT NULL,
    p_preferred_date_start DATE DEFAULT NULL,
    p_preferred_date_end DATE DEFAULT NULL,
    p_preferred_time_of_day TEXT DEFAULT 'any',
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_appointment_id UUID;
    v_booking_group_id UUID;
    v_service_id UUID;
    v_service RECORD;
    v_total_duration INTEGER := 0;
    v_sentinel_date DATE;
    v_sentinel_start TIMESTAMPTZ;
    v_sentinel_end TIMESTAMPTZ;
    v_service_count INTEGER := 0;
    v_appointment_ids UUID[] := ARRAY[]::UUID[];
    v_reason TEXT := '';
BEGIN
    -- Validate service_ids not empty
    IF array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Debes seleccionar al menos un servicio',
            'error_code', 'no_services'
        );
    END IF;

    -- Validate max services
    IF array_length(p_service_ids, 1) > 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No puedes reservar más de 5 servicios a la vez',
            'error_code', 'too_many_services'
        );
    END IF;

    -- Validate preferred_time_of_day
    IF p_preferred_time_of_day IS NOT NULL AND p_preferred_time_of_day NOT IN ('morning', 'afternoon', 'any') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Preferencia de horario inválida',
            'error_code', 'invalid_preference'
        );
    END IF;

    -- Validate date range logic
    IF p_preferred_date_start IS NOT NULL AND p_preferred_date_end IS NOT NULL
       AND p_preferred_date_end < p_preferred_date_start THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La fecha de fin debe ser posterior a la fecha de inicio',
            'error_code', 'invalid_date_range'
        );
    END IF;

    -- Generate booking group ID for multi-service requests
    v_booking_group_id := gen_random_uuid();

    -- Calculate sentinel datetime (23:30-23:59 on preferred start date or tomorrow)
    v_sentinel_date := COALESCE(p_preferred_date_start, CURRENT_DATE + 1);
    v_sentinel_start := v_sentinel_date + TIME '23:30:00';

    -- Get services and build reason string
    FOR v_service IN
        SELECT s.id, s.name, COALESCE(s.duration_minutes, 30) as duration
        FROM public.services s
        WHERE s.id = ANY(p_service_ids)
        AND s.tenant_id = p_tenant_id
        AND s.is_active = true
        AND s.deleted_at IS NULL
    LOOP
        v_service_count := v_service_count + 1;
        v_total_duration := v_total_duration + v_service.duration;

        IF v_reason != '' THEN
            v_reason := v_reason || ', ';
        END IF;
        v_reason := v_reason || v_service.name;
    END LOOP;

    -- Validate all services were found
    IF v_service_count != array_length(p_service_ids, 1) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Uno o más servicios seleccionados no están disponibles',
            'error_code', 'invalid_services'
        );
    END IF;

    -- Calculate sentinel end time (duration in minutes from start)
    v_sentinel_end := v_sentinel_start + (v_total_duration || ' minutes')::INTERVAL;

    -- Insert booking request (single appointment even for multi-service)
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
        status,
        scheduling_status,
        requested_at,
        preferred_date_start,
        preferred_date_end,
        preferred_time_of_day
    ) VALUES (
        p_tenant_id,
        p_pet_id,
        p_service_ids[1],  -- Primary service
        v_sentinel_start,
        v_sentinel_end,
        v_total_duration,
        v_reason,
        p_notes,
        p_created_by,
        'scheduled',  -- Status is scheduled (workflow status)
        'pending_scheduling',  -- But scheduling_status is pending
        NOW(),
        p_preferred_date_start,
        p_preferred_date_end,
        COALESCE(p_preferred_time_of_day, 'any')
    )
    RETURNING id INTO v_appointment_id;

    v_appointment_ids := array_append(v_appointment_ids, v_appointment_id);

    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_appointment_id,
        'booking_group_id', v_booking_group_id,
        'appointment_ids', v_appointment_ids,
        'service_count', v_service_count,
        'total_duration', v_total_duration,
        'message', 'Solicitud de cita creada exitosamente. La clínica te contactará para confirmar el horario.'
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

COMMENT ON FUNCTION public.create_booking_request(TEXT, UUID, UUID[], TEXT, DATE, DATE, TEXT, UUID) IS
'Create a booking request without specific time selection. Clinic staff will schedule later.';

GRANT EXECUTE ON FUNCTION public.create_booking_request(TEXT, UUID, UUID[], TEXT, DATE, DATE, TEXT, UUID) TO authenticated;

-- =============================================================================
-- RPC: SCHEDULE PENDING APPOINTMENT (for staff)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.schedule_pending_appointment(
    p_appointment_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_vet_id UUID DEFAULT NULL,
    p_scheduled_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_appointment RECORD;
    v_conflict RECORD;
    v_duration_minutes INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Validate times
    IF p_end_time <= p_start_time THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La hora de fin debe ser posterior a la hora de inicio',
            'error_code', 'invalid_time'
        );
    END IF;

    -- Calculate duration
    v_duration_minutes := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 60;

    -- Get appointment and verify it's pending
    SELECT a.*, p.name as pet_name, pr.full_name as owner_name, pr.id as owner_id
    INTO v_appointment
    FROM public.appointments a
    JOIN public.pets p ON a.pet_id = p.id
    JOIN public.profiles pr ON p.owner_id = pr.id
    WHERE a.id = p_appointment_id
    AND a.deleted_at IS NULL
    FOR UPDATE;  -- Lock the row

    IF v_appointment IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cita no encontrada',
            'error_code', 'not_found'
        );
    END IF;

    IF v_appointment.scheduling_status != 'pending_scheduling' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Esta cita ya está programada',
            'error_code', 'already_scheduled'
        );
    END IF;

    -- Acquire advisory lock for this tenant + hour to prevent double booking
    v_lock_key := hashtext(v_appointment.tenant_id || date_trunc('hour', p_start_time)::TEXT);
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Check for tenant-wide overlap
    SELECT a.id, a.start_time, a.end_time, pet.name as pet_name
    INTO v_conflict
    FROM public.appointments a
    JOIN public.pets pet ON a.pet_id = pet.id
    WHERE a.tenant_id = v_appointment.tenant_id
    AND a.id != p_appointment_id
    AND a.status NOT IN ('cancelled', 'no_show')
    AND a.scheduling_status = 'scheduled'  -- Only check against scheduled appointments
    AND a.deleted_at IS NULL
    AND (a.start_time, a.end_time) OVERLAPS (p_start_time, p_end_time)
    LIMIT 1;

    IF v_conflict.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'El horario ya está ocupado por ' || v_conflict.pet_name,
            'error_code', 'slot_taken',
            'conflict', jsonb_build_object(
                'id', v_conflict.id,
                'start_time', v_conflict.start_time,
                'end_time', v_conflict.end_time,
                'pet_name', v_conflict.pet_name
            )
        );
    END IF;

    -- If vet_id provided, check vet-specific overlap
    IF p_vet_id IS NOT NULL THEN
        SELECT a.id, a.start_time, a.end_time, pet.name as pet_name
        INTO v_conflict
        FROM public.appointments a
        JOIN public.pets pet ON a.pet_id = pet.id
        WHERE a.tenant_id = v_appointment.tenant_id
        AND a.id != p_appointment_id
        AND a.vet_id = p_vet_id
        AND a.status NOT IN ('cancelled', 'no_show')
        AND a.scheduling_status = 'scheduled'
        AND a.deleted_at IS NULL
        AND (a.start_time, a.end_time) OVERLAPS (p_start_time, p_end_time)
        LIMIT 1;

        IF v_conflict.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'El veterinario ya tiene una cita en ese horario con ' || v_conflict.pet_name,
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

    -- Update appointment with actual schedule
    UPDATE public.appointments
    SET
        start_time = p_start_time,
        end_time = p_end_time,
        duration_minutes = v_duration_minutes,
        vet_id = COALESCE(p_vet_id, vet_id),
        scheduling_status = 'scheduled',
        scheduled_by = p_scheduled_by,
        scheduled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_appointment_id;

    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', p_appointment_id,
        'pet_name', v_appointment.pet_name,
        'owner_name', v_appointment.owner_name,
        'owner_id', v_appointment.owner_id,
        'start_time', p_start_time,
        'end_time', p_end_time,
        'message', 'Cita programada exitosamente'
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

COMMENT ON FUNCTION public.schedule_pending_appointment(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) IS
'Schedule a pending booking request by assigning actual start/end times. Staff only.';

GRANT EXECUTE ON FUNCTION public.schedule_pending_appointment(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID) TO authenticated;

-- =============================================================================
-- RPC: GET PENDING BOOKING REQUESTS (for staff dashboard)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_pending_booking_requests(
    p_tenant_id TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    pet_id UUID,
    pet_name TEXT,
    pet_species TEXT,
    owner_id UUID,
    owner_name TEXT,
    owner_email TEXT,
    owner_phone TEXT,
    service_names TEXT,
    reason TEXT,
    notes TEXT,
    total_duration INTEGER,
    preferred_date_start DATE,
    preferred_date_end DATE,
    preferred_time_of_day TEXT,
    requested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.pet_id,
        p.name as pet_name,
        p.species as pet_species,
        pr.id as owner_id,
        pr.full_name as owner_name,
        pr.email as owner_email,
        pr.phone as owner_phone,
        a.reason as service_names,
        a.reason,
        a.notes,
        a.duration_minutes as total_duration,
        a.preferred_date_start,
        a.preferred_date_end,
        a.preferred_time_of_day,
        a.requested_at,
        a.created_at
    FROM public.appointments a
    JOIN public.pets p ON a.pet_id = p.id
    JOIN public.profiles pr ON p.owner_id = pr.id
    WHERE a.tenant_id = p_tenant_id
    AND a.scheduling_status = 'pending_scheduling'
    AND a.status NOT IN ('cancelled', 'no_show')
    AND a.deleted_at IS NULL
    ORDER BY a.requested_at ASC  -- FIFO: oldest requests first
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pending_booking_requests(TEXT, INTEGER, INTEGER) IS
'Get pending booking requests for staff dashboard. Returns oldest first (FIFO).';

GRANT EXECUTE ON FUNCTION public.get_pending_booking_requests(TEXT, INTEGER, INTEGER) TO authenticated;

-- =============================================================================
-- UPDATE OVERLAP DETECTION TO EXCLUDE PENDING
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_appointment_overlap(
    p_tenant_id TEXT,
    p_vet_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    conflicting_id UUID,
    conflicting_start TIMESTAMPTZ,
    conflicting_end TIMESTAMPTZ,
    pet_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.start_time,
        a.end_time,
        p.name
    FROM public.appointments a
    JOIN public.pets p ON a.pet_id = p.id
    WHERE a.tenant_id = p_tenant_id
    AND a.vet_id = p_vet_id
    AND a.status NOT IN ('cancelled', 'no_show')
    AND a.scheduling_status = 'scheduled'  -- Only check scheduled appointments
    AND a.deleted_at IS NULL
    AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
    AND (
        (a.start_time, a.end_time) OVERLAPS (p_start_time, p_end_time)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- UPDATE is_slot_available TO EXCLUDE PENDING
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
    AND a.scheduling_status = 'scheduled'  -- Only check scheduled appointments
    AND a.deleted_at IS NULL
    AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
    AND (p_vet_id IS NULL OR a.vet_id = p_vet_id)
    AND (a.start_time, a.end_time) OVERLAPS (p_start_time, p_end_time);

    RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- UPDATE get_available_slots TO EXCLUDE PENDING
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_tenant_id TEXT,
    p_date DATE,
    p_service_id UUID DEFAULT NULL,
    p_vet_id UUID DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ,
    vet_id UUID,
    vet_name TEXT
) AS $$
DECLARE
    v_start_time TIME;
    v_end_time TIME;
    v_duration INTEGER;
    v_available_days INTEGER[];
    v_slot_interval INTERVAL;
    v_day_of_week INTEGER;
BEGIN
    -- Get service settings if service_id provided
    IF p_service_id IS NOT NULL THEN
        SELECT
            s.available_start_time,
            s.available_end_time,
            s.duration_minutes,
            s.available_days
        INTO v_start_time, v_end_time, v_duration, v_available_days
        FROM public.services s
        WHERE s.id = p_service_id
        AND s.tenant_id = p_tenant_id
        AND s.is_active = true
        AND s.deleted_at IS NULL;

        -- Use service duration if found, otherwise use parameter
        v_duration := COALESCE(v_duration, p_duration_minutes);
    ELSE
        -- Default values if no service specified
        v_start_time := '08:00'::TIME;
        v_end_time := '18:00'::TIME;
        v_duration := p_duration_minutes;
        v_available_days := ARRAY[1,2,3,4,5];  -- Mon-Fri
    END IF;

    -- Check if day is available
    v_day_of_week := EXTRACT(ISODOW FROM p_date)::INTEGER;  -- 1=Monday, 7=Sunday
    IF NOT (v_day_of_week = ANY(v_available_days)) THEN
        RETURN;  -- Day not available for this service
    END IF;

    v_slot_interval := (v_duration || ' minutes')::INTERVAL;

    -- Generate slots for each vet
    RETURN QUERY
    WITH vets AS (
        SELECT pr.id, pr.full_name
        FROM public.profiles pr
        WHERE pr.tenant_id = p_tenant_id
        AND pr.role = 'vet'
        AND pr.deleted_at IS NULL
        AND (p_vet_id IS NULL OR pr.id = p_vet_id)
    ),
    time_slots AS (
        SELECT generate_series(
            p_date + v_start_time,
            p_date + v_end_time - v_slot_interval,
            v_slot_interval
        ) AS start_ts
    ),
    all_slots AS (
        SELECT
            ts.start_ts,
            ts.start_ts + v_slot_interval AS end_ts,
            v.id AS vet_id,
            v.full_name AS vet_name
        FROM time_slots ts
        CROSS JOIN vets v
    )
    SELECT
        s.start_ts,
        s.end_ts,
        s.vet_id,
        s.vet_name
    FROM all_slots s
    WHERE NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.tenant_id = p_tenant_id
        AND a.vet_id = s.vet_id
        AND a.status NOT IN ('cancelled', 'no_show')
        AND a.scheduling_status = 'scheduled'  -- Only check scheduled appointments
        AND a.deleted_at IS NULL
        AND (a.start_time, a.end_time) OVERLAPS (s.start_ts, s.end_ts)
    )
    -- Only return future slots for today
    AND (p_date > CURRENT_DATE OR s.start_ts > NOW())
    ORDER BY s.start_ts, s.vet_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- UPDATE get_appointments_in_range TO SUPPORT FILTERING BY SCHEDULING STATUS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_appointments_in_range(
    p_tenant_id TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_vet_id UUID DEFAULT NULL,
    p_scheduling_status TEXT DEFAULT 'scheduled'  -- New parameter
)
RETURNS TABLE (
    appointment_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    pet_name TEXT,
    owner_name TEXT,
    service_name TEXT,
    vet_name TEXT,
    status TEXT,
    scheduling_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.start_time,
        a.end_time,
        p.name,
        pr.full_name,
        s.name,
        v.full_name,
        a.status,
        a.scheduling_status
    FROM public.appointments a
    JOIN public.pets p ON a.pet_id = p.id
    JOIN public.profiles pr ON p.owner_id = pr.id
    LEFT JOIN public.services s ON a.service_id = s.id
    LEFT JOIN public.profiles v ON a.vet_id = v.id
    WHERE a.tenant_id = p_tenant_id
    AND a.start_time >= p_start_date
    AND a.start_time < p_end_date + 1
    AND a.deleted_at IS NULL
    AND (p_vet_id IS NULL OR a.vet_id = p_vet_id)
    AND (p_scheduling_status IS NULL OR a.scheduling_status = p_scheduling_status)
    ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
