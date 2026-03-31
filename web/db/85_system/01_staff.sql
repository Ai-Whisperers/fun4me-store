-- =============================================================================
-- 01_STAFF.SQL
-- =============================================================================
-- Staff management: profiles, schedules, time off.
--
-- DEPENDENCIES: 10_core/*
-- =============================================================================

-- =============================================================================
-- STAFF PROFILES (Extended info for staff members)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Professional info
    license_number TEXT,
    license_expiry DATE,
    specializations TEXT[],
    education TEXT,
    bio TEXT,

    -- Employment
    hire_date DATE,
    employment_type TEXT DEFAULT 'full_time'
        CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'intern')),
    department TEXT,
    title TEXT,

    -- Rate/compensation
    hourly_rate NUMERIC(12,2),
    daily_rate NUMERIC(12,2),

    -- Emergency contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,

    -- Signatures
    signature_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(profile_id)
);

COMMENT ON TABLE public.staff_profiles IS 'Extended staff info: licenses, specializations, employment details, signatures';
COMMENT ON COLUMN public.staff_profiles.license_number IS 'Professional license number (veterinarian, technician)';
COMMENT ON COLUMN public.staff_profiles.specializations IS 'Array of medical specializations (e.g., surgery, dermatology)';
COMMENT ON COLUMN public.staff_profiles.employment_type IS 'Employment type: full_time, part_time, contractor, intern';
COMMENT ON COLUMN public.staff_profiles.signature_url IS 'Digital signature image for prescriptions and documents';

-- =============================================================================
-- STAFF SCHEDULES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Schedule name
    name TEXT DEFAULT 'Default',
    is_default BOOLEAN DEFAULT true,

    -- Effective dates
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.staff_schedules IS 'Named schedule definitions for staff members with effective date ranges';
COMMENT ON COLUMN public.staff_schedules.is_default IS 'TRUE if this is the staff members primary schedule';
COMMENT ON COLUMN public.staff_schedules.effective_from IS 'Schedule starts applying from this date';
COMMENT ON COLUMN public.staff_schedules.effective_until IS 'Schedule ends on this date (NULL = indefinite)';

-- =============================================================================
-- STAFF SCHEDULE ENTRIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.staff_schedule_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.staff_schedules(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Day (1 = Monday, 7 = Sunday for ISO week)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),

    -- Time range
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Break
    break_start TIME,
    break_end TIME,

    -- Location (if multiple)
    location TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT staff_schedule_entries_times CHECK (end_time > start_time),
    CONSTRAINT staff_schedule_entries_break CHECK (
        (break_start IS NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
    )
);

COMMENT ON TABLE public.staff_schedule_entries IS 'Daily working hours within a schedule (one row per working day)';
COMMENT ON COLUMN public.staff_schedule_entries.day_of_week IS 'ISO day of week: 1=Monday through 7=Sunday';
COMMENT ON COLUMN public.staff_schedule_entries.break_start IS 'Lunch/break start time (optional)';
COMMENT ON COLUMN public.staff_schedule_entries.break_end IS 'Lunch/break end time (optional)';

-- =============================================================================
-- TIME OFF TYPES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.time_off_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- tenant_id NULL = global template, NOT NULL = clinic-specific
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Type info
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,

    -- Settings
    is_paid BOOLEAN DEFAULT true,
    max_days_per_year INTEGER,
    requires_approval BOOLEAN DEFAULT true,
    requires_documentation BOOLEAN DEFAULT false,

    -- Display
    color TEXT DEFAULT '#6366f1',
    icon TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE public.time_off_types IS 'Time off categories: vacation, sick, personal, etc. NULL tenant_id = global templates';
COMMENT ON COLUMN public.time_off_types.is_paid IS 'Whether this type of leave is paid';
COMMENT ON COLUMN public.time_off_types.max_days_per_year IS 'Annual allowance limit (NULL = unlimited)';
COMMENT ON COLUMN public.time_off_types.requires_approval IS 'Whether requests need manager approval';

-- =============================================================================
-- STAFF TIME OFF
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.staff_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    type_id UUID REFERENCES public.time_off_types(id),

    -- Request details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_half_day BOOLEAN DEFAULT false,
    end_half_day BOOLEAN DEFAULT false,

    -- Reason
    reason TEXT,
    notes TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

    -- Approval
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT staff_time_off_dates CHECK (end_date >= start_date)
);

COMMENT ON TABLE public.staff_time_off IS 'Staff time off requests with approval workflow';
COMMENT ON COLUMN public.staff_time_off.status IS 'Request status: pending → approved/rejected, or cancelled by staff';
COMMENT ON COLUMN public.staff_time_off.start_half_day IS 'TRUE if starting afternoon only';
COMMENT ON COLUMN public.staff_time_off.end_half_day IS 'TRUE if ending morning only';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;

-- Staff profiles
DROP POLICY IF EXISTS "Staff view all profiles" ON public.staff_profiles;
CREATE POLICY "Staff view all profiles" ON public.staff_profiles
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage own profile" ON public.staff_profiles;
CREATE POLICY "Staff manage own profile" ON public.staff_profiles
    FOR UPDATE TO authenticated
    USING (profile_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admin manage all profiles" ON public.staff_profiles;
CREATE POLICY "Admin manage all profiles" ON public.staff_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = staff_profiles.tenant_id
            AND p.role = 'admin'
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Service role full access staff profiles" ON public.staff_profiles;
CREATE POLICY "Service role full access staff profiles" ON public.staff_profiles
    FOR ALL TO service_role USING (true);

-- Schedules
DROP POLICY IF EXISTS "Staff view schedules" ON public.staff_schedules;
CREATE POLICY "Staff view schedules" ON public.staff_schedules
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Admin manage schedules" ON public.staff_schedules;
CREATE POLICY "Admin manage schedules" ON public.staff_schedules
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = staff_schedules.tenant_id
            AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role full access schedules" ON public.staff_schedules;
CREATE POLICY "Service role full access schedules" ON public.staff_schedules
    FOR ALL TO service_role USING (true);

-- Schedule entries
DROP POLICY IF EXISTS "Access schedule entries" ON public.staff_schedule_entries;
CREATE POLICY "Access schedule entries" ON public.staff_schedule_entries
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access entries" ON public.staff_schedule_entries;
CREATE POLICY "Service role full access entries" ON public.staff_schedule_entries
    FOR ALL TO service_role USING (true);

-- Time off types
DROP POLICY IF EXISTS "Staff view time off types" ON public.time_off_types;
CREATE POLICY "Staff view time off types" ON public.time_off_types
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Admin manage time off types" ON public.time_off_types;
CREATE POLICY "Admin manage time off types" ON public.time_off_types
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = time_off_types.tenant_id
            AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role full access time off types" ON public.time_off_types;
CREATE POLICY "Service role full access time off types" ON public.time_off_types
    FOR ALL TO service_role USING (true);

-- Time off requests
DROP POLICY IF EXISTS "Staff view own time off" ON public.staff_time_off;
CREATE POLICY "Staff view own time off" ON public.staff_time_off
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            WHERE sp.id = staff_time_off.staff_id
            AND sp.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff request time off" ON public.staff_time_off;
CREATE POLICY "Staff request time off" ON public.staff_time_off
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff_profiles sp
            WHERE sp.id = staff_time_off.staff_id
            AND sp.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admin manage time off" ON public.staff_time_off;
CREATE POLICY "Admin manage time off" ON public.staff_time_off
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = staff_time_off.tenant_id
            AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role full access time off" ON public.staff_time_off;
CREATE POLICY "Service role full access time off" ON public.staff_time_off
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_staff_profiles_profile ON public.staff_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_tenant ON public.staff_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON public.staff_profiles(is_active)
    WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff ON public.staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_tenant ON public.staff_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_active ON public.staff_schedules(is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_staff_schedule_entries_schedule ON public.staff_schedule_entries(schedule_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_entries_tenant ON public.staff_schedule_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_entries_day ON public.staff_schedule_entries(day_of_week);

CREATE INDEX IF NOT EXISTS idx_time_off_types_tenant ON public.time_off_types(tenant_id);

CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff ON public.staff_time_off(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_tenant ON public.staff_time_off(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates ON public.staff_time_off(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_status ON public.staff_time_off(status)
    WHERE status = 'pending';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.staff_profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.staff_schedules;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.staff_schedules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.staff_time_off;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.staff_time_off
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id for schedule entries
CREATE OR REPLACE FUNCTION public.staff_schedule_entries_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.staff_schedules
        WHERE id = NEW.schedule_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS schedule_entries_auto_tenant ON public.staff_schedule_entries;
CREATE TRIGGER schedule_entries_auto_tenant
    BEFORE INSERT ON public.staff_schedule_entries
    FOR EACH ROW EXECUTE FUNCTION public.staff_schedule_entries_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Check staff availability
CREATE OR REPLACE FUNCTION public.check_staff_availability(
    p_staff_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    v_day_of_week INTEGER;
    v_has_schedule BOOLEAN;
    v_has_time_off BOOLEAN;
BEGIN
    v_day_of_week := EXTRACT(ISODOW FROM p_date)::INTEGER;

    -- Check schedule
    SELECT EXISTS (
        SELECT 1 FROM public.staff_schedule_entries se
        JOIN public.staff_schedules s ON se.schedule_id = s.id
        WHERE s.staff_id = p_staff_id
          AND s.is_active = true
          AND (s.effective_until IS NULL OR s.effective_until >= p_date)
          AND s.effective_from <= p_date
          AND se.day_of_week = v_day_of_week
          AND se.start_time <= p_start_time
          AND se.end_time >= p_end_time
    ) INTO v_has_schedule;

    IF NOT v_has_schedule THEN
        RETURN false;
    END IF;

    -- Check time off
    SELECT EXISTS (
        SELECT 1 FROM public.staff_time_off
        WHERE staff_id = p_staff_id
          AND status = 'approved'
          AND p_date BETWEEN start_date AND end_date
    ) INTO v_has_time_off;

    RETURN NOT v_has_time_off;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

