-- =============================================================================
-- 01_SERVICES.SQL
-- =============================================================================
-- Service catalog for appointments and invoicing.
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Service details
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'consultation', 'vaccination', 'grooming', 'surgery',
        'diagnostic', 'dental', 'emergency', 'hospitalization',
        'treatment', 'identification', 'other'
    )),

    -- Pricing
    base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    currency TEXT NOT NULL DEFAULT 'PYG',
    tax_rate NUMERIC(5,2) DEFAULT 10.00 CHECK (tax_rate >= 0 AND tax_rate <= 100),

    -- Scheduling
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
    buffer_minutes INTEGER DEFAULT 0 CHECK (buffer_minutes >= 0),
    max_daily_bookings INTEGER CHECK (max_daily_bookings IS NULL OR max_daily_bookings > 0),

    -- Availability - USED BY get_available_slots
    requires_appointment BOOLEAN DEFAULT true,
    available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],  -- Mon-Fri (1=Monday per ISO)
    available_start_time TIME DEFAULT '08:00',
    available_end_time TIME DEFAULT '18:00',

    -- Deposits
    requires_deposit BOOLEAN DEFAULT false,
    deposit_percentage NUMERIC(5,2) CHECK (deposit_percentage IS NULL OR (deposit_percentage >= 0 AND deposit_percentage <= 100)),

    -- Species restrictions
    species_allowed TEXT[],  -- NULL = all species

    -- Display
    display_order INTEGER DEFAULT 100,
    is_featured BOOLEAN DEFAULT false,
    icon TEXT,
    color TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT services_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
    CONSTRAINT services_time_order CHECK (available_start_time < available_end_time),
    CONSTRAINT services_tax_rate_valid CHECK (tax_rate IS NULL OR (tax_rate >= 0 AND tax_rate <= 100)),
    CONSTRAINT services_buffer_non_negative CHECK (buffer_minutes IS NULL OR buffer_minutes >= 0)
);

COMMENT ON TABLE public.services IS 'Service catalog for appointments and invoicing';
COMMENT ON COLUMN public.services.category IS 'Service category: consultation, vaccination, grooming, surgery, diagnostic, dental, emergency, hospitalization, treatment, identification, other';
COMMENT ON COLUMN public.services.available_days IS 'Days service is available as ISO day numbers: 1=Monday, 7=Sunday';
COMMENT ON COLUMN public.services.species_allowed IS 'Allowed species array (NULL = all species allowed)';
COMMENT ON COLUMN public.services.buffer_minutes IS 'Buffer time after appointment before next can be booked';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Public can view active services (for booking)
DROP POLICY IF EXISTS "Public view active services" ON public.services;
CREATE POLICY "Public view active services" ON public.services
    FOR SELECT
    USING (is_active = true AND deleted_at IS NULL);

-- Staff can manage services
DROP POLICY IF EXISTS "Staff manage services" ON public.services;
CREATE POLICY "Staff manage services" ON public.services
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id))
    WITH CHECK (public.is_staff_of(tenant_id));

-- Service role full access
DROP POLICY IF EXISTS "Service role full access" ON public.services;
CREATE POLICY "Service role full access" ON public.services
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- =============================================================================
-- UNIQUE CONSTRAINTS
-- =============================================================================

-- Service names must be unique per tenant (for upsert support)
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_tenant_name_unique
    ON public.services(tenant_id, name) WHERE deleted_at IS NULL;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_active ON public.services(tenant_id, is_active)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_services_featured ON public.services(tenant_id, is_featured)
    WHERE is_featured = true AND is_active = true AND deleted_at IS NULL;

-- Covering index for service list
CREATE INDEX IF NOT EXISTS idx_services_list ON public.services(tenant_id, display_order)
    INCLUDE (name, category, base_price, duration_minutes, is_featured)
    WHERE is_active = true AND deleted_at IS NULL;

-- Active services for booking
CREATE INDEX IF NOT EXISTS idx_services_booking ON public.services(tenant_id, category, display_order)
    INCLUDE (name, base_price, duration_minutes, is_featured, species_allowed)
    WHERE is_active = true AND deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.services;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get services available for a species
CREATE OR REPLACE FUNCTION public.get_services_for_species(
    p_tenant_id TEXT,
    p_species TEXT
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    duration_minutes INTEGER,
    is_featured BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.description,
        s.category,
        s.base_price,
        s.duration_minutes,
        s.is_featured
    FROM public.services s
    WHERE s.tenant_id = p_tenant_id
    AND s.is_active = true
    AND s.deleted_at IS NULL
    AND (s.species_allowed IS NULL OR p_species = ANY(s.species_allowed))
    ORDER BY s.display_order, s.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_services_for_species(TEXT, TEXT) IS
'Get services available for a specific species (filters by species_allowed array)';

