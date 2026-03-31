-- =============================================================================
-- 02_APPOINTMENTS.SQL
-- =============================================================================
-- Appointment scheduling with overlap detection and dynamic slot generation.
-- INCLUDES FIXED get_available_slots using service settings.
--
-- DEPENDENCIES: 10_core/*, 20_pets/01_pets.sql, 40_scheduling/01_services.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Relationships
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Scheduling
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),

    -- Details
    reason TEXT,
    notes TEXT,
    internal_notes TEXT,  -- Staff-only notes

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN (
            'scheduled',    -- Confirmed appointment
            'confirmed',    -- Client confirmed
            'checked_in',   -- Client arrived
            'in_progress',  -- Currently being seen
            'completed',    -- Appointment done
            'cancelled',    -- Cancelled
            'no_show'       -- Client didn't show
        )),

    -- Status timestamps
    confirmed_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancellation_reason TEXT,

    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT appointments_time_order CHECK (end_time > start_time),
    CONSTRAINT appointments_duration_matches CHECK (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60 = duration_minutes
    )
);

COMMENT ON TABLE public.appointments IS 'Appointment scheduling with overlap detection and status tracking';
COMMENT ON COLUMN public.appointments.status IS 'Workflow: scheduled → confirmed → checked_in → in_progress → completed';
COMMENT ON COLUMN public.appointments.internal_notes IS 'Staff-only notes not visible to pet owners';
COMMENT ON COLUMN public.appointments.duration_minutes IS 'Duration in minutes (must match end_time - start_time)';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Owners can view their pets' appointments
DROP POLICY IF EXISTS "Owners view pet appointments" ON public.appointments;
CREATE POLICY "Owners view pet appointments" ON public.appointments
    FOR SELECT TO authenticated
    USING (
        public.is_owner_of_pet(pet_id)
        AND deleted_at IS NULL
    );

-- Owners can create appointments for their pets
DROP POLICY IF EXISTS "Owners create appointments" ON public.appointments;
CREATE POLICY "Owners create appointments" ON public.appointments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_owner_of_pet(pet_id));

-- Owners can cancel their own appointments
DROP POLICY IF EXISTS "Owners cancel appointments" ON public.appointments;
CREATE POLICY "Owners cancel appointments" ON public.appointments
    FOR UPDATE TO authenticated
    USING (
        public.is_owner_of_pet(pet_id)
        AND status IN ('scheduled', 'confirmed')
        AND deleted_at IS NULL
    )
    WITH CHECK (status = 'cancelled');

-- Staff can manage all appointments
DROP POLICY IF EXISTS "Staff manage appointments" ON public.appointments;
CREATE POLICY "Staff manage appointments" ON public.appointments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id))
    WITH CHECK (public.is_staff_of(tenant_id));

-- Service role full access
DROP POLICY IF EXISTS "Service role full access" ON public.appointments;
CREATE POLICY "Service role full access" ON public.appointments
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_pet ON public.appointments(pet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vet ON public.appointments(vet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON public.appointments(created_by);
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled_by ON public.appointments(cancelled_by);

-- Date-based queries (most common) - BRIN for time-series
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON public.appointments(tenant_id, start_time)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_start_brin ON public.appointments
    USING BRIN(start_time) WITH (pages_per_range = 64);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON public.appointments(tenant_id, status)
    WHERE deleted_at IS NULL;

-- Upcoming appointments (dashboard)
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming ON public.appointments(tenant_id, start_time, status)
    WHERE status IN ('scheduled', 'confirmed') AND deleted_at IS NULL;

-- Overlap detection (critical for booking)
CREATE INDEX IF NOT EXISTS idx_appointments_vet_overlap ON public.appointments(vet_id, start_time, end_time)
    WHERE status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL;

-- Calendar view covering index
CREATE INDEX IF NOT EXISTS idx_appointments_calendar ON public.appointments(tenant_id, start_time, status)
    INCLUDE (pet_id, vet_id, service_id, end_time, duration_minutes, reason)
    WHERE deleted_at IS NULL;

-- Upcoming appointments for owner portal
CREATE INDEX IF NOT EXISTS idx_appointments_owner_upcoming ON public.appointments(pet_id, start_time)
    INCLUDE (tenant_id, service_id, vet_id, status, reason)
    WHERE status IN ('scheduled', 'confirmed') AND deleted_at IS NULL;

-- Vet's daily schedule
CREATE INDEX IF NOT EXISTS idx_appointments_vet_schedule ON public.appointments(vet_id, start_time, end_time)
    INCLUDE (tenant_id, pet_id, service_id, status)
    WHERE status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.appointments;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- OVERLAP DETECTION FUNCTION
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
    AND a.deleted_at IS NULL
    AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
    AND (
        (a.start_time, a.end_time) OVERLAPS (p_start_time, p_end_time)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.check_appointment_overlap(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS
'Check for overlapping appointments for a vet. Returns conflicting appointments if any.';

-- =============================================================================
-- BOOKING VALIDATION TRIGGER
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

COMMENT ON FUNCTION public.validate_appointment_booking() IS
'Validates that new/updated appointments do not overlap with existing ones for the same vet';

DROP TRIGGER IF EXISTS validate_appointment_booking ON public.appointments;
CREATE TRIGGER validate_appointment_booking
    BEFORE INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_appointment_booking();

-- =============================================================================
-- AVAILABLE SLOTS FUNCTION
-- Uses service settings instead of hardcoded times
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
        AND a.deleted_at IS NULL
        AND (a.start_time, a.end_time) OVERLAPS (s.start_ts, s.end_ts)
    )
    -- Only return future slots for today
    AND (p_date > CURRENT_DATE OR s.start_ts > NOW())
    ORDER BY s.start_ts, s.vet_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_available_slots(TEXT, DATE, UUID, UUID, INTEGER) IS
'Generate available appointment slots for a given date, respecting service settings and existing bookings';

-- =============================================================================
-- HELPER: GET NEXT AVAILABLE SLOT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_next_available_slot(
    p_tenant_id TEXT,
    p_service_id UUID DEFAULT NULL,
    p_vet_id UUID DEFAULT NULL,
    p_from_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ,
    vet_id UUID,
    vet_name TEXT
) AS $$
DECLARE
    v_check_date DATE;
    v_max_days INTEGER := 30;  -- Look ahead 30 days
BEGIN
    v_check_date := p_from_date;

    -- Loop through dates until we find a slot
    FOR i IN 1..v_max_days LOOP
        RETURN QUERY
        SELECT s.slot_start, s.slot_end, s.vet_id, s.vet_name
        FROM public.get_available_slots(p_tenant_id, v_check_date, p_service_id, p_vet_id) s
        LIMIT 1;

        IF FOUND THEN
            RETURN;
        END IF;

        v_check_date := v_check_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_next_available_slot(TEXT, UUID, UUID, DATE) IS
'Find the next available appointment slot within 30 days';

-- =============================================================================
-- HELPER: GET APPOINTMENTS FOR DATE RANGE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_appointments_in_range(
    p_tenant_id TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_vet_id UUID DEFAULT NULL
)
RETURNS TABLE (
    appointment_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    pet_name TEXT,
    owner_name TEXT,
    service_name TEXT,
    vet_name TEXT,
    status TEXT
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
        a.status
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
    ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_appointments_in_range(TEXT, DATE, DATE, UUID) IS
'Get appointments within a date range for calendar views';

