-- =============================================================================
-- 020_APPOINTMENT_RACE_CONDITION_FIX.SQL
-- =============================================================================
-- Fixes the appointment double-booking race condition using PostgreSQL EXCLUSION
-- constraint. This ensures no two non-cancelled appointments can overlap for the
-- same vet at the database level, even under concurrent transactions.
--
-- PROBLEM: The current trigger-based check is vulnerable to TOCTOU (Time-of-Check
-- to Time-of-Use) race conditions under READ COMMITTED isolation.
--
-- SOLUTION: Use btree_gist extension to create an EXCLUSION constraint that
-- atomically enforces non-overlapping time ranges per vet.
-- =============================================================================

-- Enable btree_gist extension for EXCLUSION constraints on non-geometric types
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================================
-- EXCLUSION CONSTRAINT: Prevent overlapping appointments per vet
-- =============================================================================
-- This constraint ensures that no two active appointments (not cancelled/no_show)
-- can have overlapping time ranges for the same vet. It uses a partial constraint
-- to only apply to non-cancelled appointments.

-- First, drop the existing trigger-based validation (we'll keep the function for
-- better error messages, but the constraint is the actual enforcement)
DROP TRIGGER IF EXISTS validate_appointment_booking ON public.appointments;

-- Add the exclusion constraint
-- Using GIST index on (vet_id, tstzrange) to prevent overlapping
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'appointments_no_vet_overlap'
    ) THEN
        -- Create the exclusion constraint
        -- Note: EXCLUDE USING GIST requires btree_gist for non-geometric types
        ALTER TABLE public.appointments
        ADD CONSTRAINT appointments_no_vet_overlap
        EXCLUDE USING GIST (
            vet_id WITH =,
            tstzrange(start_time, end_time, '[)') WITH &&
        )
        WHERE (status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL AND vet_id IS NOT NULL);
    END IF;
END
$$;

COMMENT ON CONSTRAINT appointments_no_vet_overlap ON public.appointments IS
'Prevents overlapping appointments for the same vet. Uses EXCLUSION constraint for atomic enforcement.';

-- =============================================================================
-- IMPROVED ERROR HANDLING TRIGGER
-- =============================================================================
-- Re-create the trigger for better error messages (the constraint catches the
-- error but gives a generic message). This trigger fires first to give a
-- user-friendly message.

CREATE OR REPLACE FUNCTION public.validate_appointment_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_conflict RECORD;
BEGIN
    -- Skip for cancelled/no-show/deleted
    IF NEW.status IN ('cancelled', 'no_show') OR NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Skip if no vet assigned (constraint won't apply anyway)
    IF NEW.vet_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check for overlaps to provide a better error message
    -- (The exclusion constraint is the actual enforcement)
    SELECT
        a.id,
        a.start_time,
        a.end_time,
        p.name as pet_name,
        pr.full_name as owner_name
    INTO v_conflict
    FROM public.appointments a
    JOIN public.pets p ON a.pet_id = p.id
    JOIN public.profiles pr ON p.owner_id = pr.id
    WHERE a.tenant_id = NEW.tenant_id
      AND a.vet_id = NEW.vet_id
      AND a.status NOT IN ('cancelled', 'no_show')
      AND a.deleted_at IS NULL
      AND (NEW.id IS NULL OR a.id != NEW.id)
      AND tstzrange(a.start_time, a.end_time, '[)') && tstzrange(NEW.start_time, NEW.end_time, '[)')
    LIMIT 1;

    IF v_conflict.id IS NOT NULL THEN
        RAISE EXCEPTION 'Este horario se superpone con una cita existente para % (dueño: %). Por favor elige otro horario.',
            v_conflict.pet_name,
            v_conflict.owner_name
            USING ERRCODE = 'exclusion_violation',
                  HINT = 'Elige un horario diferente o selecciona otro veterinario';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate the trigger (fires before constraint for better error messages)
DROP TRIGGER IF EXISTS validate_appointment_booking ON public.appointments;
CREATE TRIGGER validate_appointment_booking
    BEFORE INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_appointment_booking();

-- =============================================================================
-- TENANT-LEVEL SLOT EXCLUSION (Optional - for clinics without vet assignment)
-- =============================================================================
-- Some appointments may not have a vet assigned but still need overlap prevention
-- at the clinic level (e.g., single-vet clinics or resource-limited slots)

-- Create a function for tenant-level slot locking using advisory locks
CREATE OR REPLACE FUNCTION public.acquire_appointment_slot_lock(
    p_tenant_id TEXT,
    p_vet_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
    v_lock_key BIGINT;
BEGIN
    -- Generate a unique lock key from tenant + vet + date/hour
    -- This ensures we lock at a granular enough level
    v_lock_key := hashtext(
        p_tenant_id || ':' ||
        COALESCE(p_vet_id::TEXT, 'ANY') || ':' ||
        to_char(p_start_time, 'YYYY-MM-DD-HH24')
    );

    -- Try to acquire advisory lock (waits if locked)
    PERFORM pg_advisory_xact_lock(v_lock_key);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = public;

COMMENT ON FUNCTION public.acquire_appointment_slot_lock(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Acquires an advisory lock for appointment slot booking. Lock is released at transaction end.';

-- =============================================================================
-- ATOMIC APPOINTMENT CREATION FUNCTION
-- =============================================================================
-- Provides a single atomic function for creating appointments with proper locking

CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
    p_tenant_id TEXT,
    p_pet_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_vet_id UUID DEFAULT NULL,
    p_service_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_appointment_id UUID;
    v_duration_minutes INTEGER;
BEGIN
    -- Calculate duration
    v_duration_minutes := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 60;

    -- Acquire advisory lock first (serializes concurrent attempts for same slot)
    PERFORM public.acquire_appointment_slot_lock(p_tenant_id, p_vet_id, p_start_time, p_end_time);

    -- Insert appointment (exclusion constraint provides final safety net)
    INSERT INTO public.appointments (
        tenant_id,
        pet_id,
        service_id,
        vet_id,
        start_time,
        end_time,
        duration_minutes,
        reason,
        notes,
        status,
        created_by
    )
    VALUES (
        p_tenant_id,
        p_pet_id,
        p_service_id,
        p_vet_id,
        p_start_time,
        p_end_time,
        v_duration_minutes,
        p_reason,
        p_notes,
        'scheduled',
        p_created_by
    )
    RETURNING id INTO v_appointment_id;

    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.create_appointment_atomic(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT, UUID) IS
'Creates an appointment atomically with proper locking to prevent double-booking race conditions.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_appointment_atomic(TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT, UUID) TO authenticated;

-- =============================================================================
-- INDEX FOR EXCLUSION CONSTRAINT PERFORMANCE
-- =============================================================================
-- The EXCLUSION constraint creates a GIST index, but we add a supporting BTREE
-- for faster vet_id lookups in the constraint check

CREATE INDEX IF NOT EXISTS idx_appointments_vet_active_slots
ON public.appointments (vet_id, start_time, end_time)
WHERE status NOT IN ('cancelled', 'no_show') AND deleted_at IS NULL AND vet_id IS NOT NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Test the constraint works (should fail if run twice with same data)
-- DO $$
-- BEGIN
--     -- This would fail if overlapping appointments exist
--     RAISE NOTICE 'Migration 020 applied successfully. Exclusion constraint active.';
-- END
-- $$;
