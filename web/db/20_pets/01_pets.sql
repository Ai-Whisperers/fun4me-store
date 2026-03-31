-- =============================================================================
-- 01_PETS.SQL
-- =============================================================================
-- Pet profiles - the core entity for veterinary management.
-- Each pet belongs to an owner (profile) and a tenant (clinic).
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

-- =============================================================================
-- PETS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    tenant_id TEXT REFERENCES public.tenants(id), -- Nullable for global pets

    -- Identity
    name TEXT NOT NULL,
    species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other')),
    breed TEXT,
    color TEXT,

    -- Demographics
    sex TEXT CHECK (sex IN ('male', 'female', 'unknown')),
    birth_date DATE,
    birth_date_estimated BOOLEAN DEFAULT false,  -- True if birth_date is estimated
    is_neutered BOOLEAN DEFAULT false,
    neutered_date DATE,

    -- Physical characteristics
    weight_kg NUMERIC(6,2),
    weight_updated_at TIMESTAMPTZ,

    -- Identification
    microchip_number TEXT,
    microchip_date DATE,
    registration_number TEXT,  -- Government/breed registration

    -- Media
    photo_url TEXT,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Medical flags
    is_deceased BOOLEAN DEFAULT false,
    deceased_date DATE,
    deceased_reason TEXT,
    blood_type TEXT,  -- For dogs/cats

    -- Medical conditions (consider normalizing to junction tables for large datasets)
    allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
    chronic_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT pets_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT pets_weight_positive CHECK (weight_kg IS NULL OR weight_kg > 0),
    CONSTRAINT pets_birth_not_future CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE),
    CONSTRAINT pets_deceased_consistency CHECK (
        (is_deceased = false AND deceased_date IS NULL) OR (is_deceased = true)
    ),
    CONSTRAINT pets_neutered_consistency CHECK (
        (is_neutered = false AND neutered_date IS NULL) OR (is_neutered = true)
    ),
    CONSTRAINT pets_allergies_limit CHECK (
        allergies IS NULL OR array_length(allergies, 1) IS NULL OR array_length(allergies, 1) <= 50
    ),
    CONSTRAINT pets_conditions_limit CHECK (
        chronic_conditions IS NULL OR array_length(chronic_conditions, 1) IS NULL OR array_length(chronic_conditions, 1) <= 50
    )
);

COMMENT ON TABLE public.pets IS 'Pet profiles - core entity for veterinary management';
COMMENT ON COLUMN public.pets.species IS 'Pet species: dog, cat, bird, rabbit, hamster, fish, reptile, other';
COMMENT ON COLUMN public.pets.birth_date_estimated IS 'True if birth_date is estimated (e.g., rescue animals)';
COMMENT ON COLUMN public.pets.blood_type IS 'Blood type for dogs (DEA 1.1+/-) or cats (A, B, AB)';
COMMENT ON COLUMN public.pets.allergies IS 'Known allergies. Consider pet_allergies junction table for complex querying.';
COMMENT ON COLUMN public.pets.chronic_conditions IS 'Chronic conditions. Consider pet_conditions junction table for complex querying.';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own pets
DROP POLICY IF EXISTS "Owners manage own pets" ON public.pets;
CREATE POLICY "Owners manage own pets" ON public.pets
    FOR ALL TO authenticated
    USING (owner_id = auth.uid() AND deleted_at IS NULL)
    WITH CHECK (owner_id = auth.uid());

-- Staff can manage all pets in their tenant
DROP POLICY IF EXISTS "Staff manage tenant pets" ON public.pets;
CREATE POLICY "Staff manage tenant pets" ON public.pets
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

-- Service role full access for admin operations
DROP POLICY IF EXISTS "Service role full access" ON public.pets;
CREATE POLICY "Service role full access" ON public.pets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_pets_owner ON public.pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_pets_tenant ON public.pets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pets_tenant_owner ON public.pets(tenant_id, owner_id);

-- Active pets (most common filter)
CREATE INDEX IF NOT EXISTS idx_pets_active ON public.pets(tenant_id)
    WHERE deleted_at IS NULL AND is_deceased = false;

-- Name search with trigrams
CREATE INDEX IF NOT EXISTS idx_pets_name_search ON public.pets USING gin(name gin_trgm_ops);

-- Species filtering
CREATE INDEX IF NOT EXISTS idx_pets_species ON public.pets(tenant_id, species)
    WHERE deleted_at IS NULL;

-- Unique microchip number globally
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_microchip ON public.pets(microchip_number)
    WHERE microchip_number IS NOT NULL AND deleted_at IS NULL;

-- GIN indexes for array columns (efficient array containment queries)
CREATE INDEX IF NOT EXISTS idx_pets_allergies_gin ON public.pets USING gin(allergies)
    WHERE allergies IS NOT NULL AND allergies != '{}';
CREATE INDEX IF NOT EXISTS idx_pets_conditions_gin ON public.pets USING gin(chronic_conditions)
    WHERE chronic_conditions IS NOT NULL AND chronic_conditions != '{}';

-- Pet ownership lookup for RLS (is_owner_of_pet function)
CREATE INDEX IF NOT EXISTS idx_pets_owner_rls ON public.pets(id, owner_id)
    WHERE deleted_at IS NULL;

-- Staff pet list (covering index for common query)
CREATE INDEX IF NOT EXISTS idx_pets_tenant_list ON public.pets(tenant_id, name)
    INCLUDE (owner_id, species, breed, photo_url, is_deceased, is_active)
    WHERE deleted_at IS NULL;

-- Owner's pet list (covering index for common query)
CREATE INDEX IF NOT EXISTS idx_pets_owner_list ON public.pets(owner_id)
    INCLUDE (name, species, breed, photo_url, birth_date, is_deceased, tenant_id)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.pets;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.pets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Get pet age as human-readable string
CREATE OR REPLACE FUNCTION public.get_pet_age(pet_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_birth_date DATE;
    v_years INTEGER;
    v_months INTEGER;
BEGIN
    SELECT birth_date INTO v_birth_date FROM public.pets WHERE id = pet_id;

    IF v_birth_date IS NULL THEN
        RETURN NULL;
    END IF;

    v_years := EXTRACT(YEAR FROM age(CURRENT_DATE, v_birth_date));
    v_months := EXTRACT(MONTH FROM age(CURRENT_DATE, v_birth_date));

    IF v_years > 0 THEN
        RETURN v_years || ' año' || CASE WHEN v_years > 1 THEN 's' ELSE '' END;
    ELSE
        RETURN v_months || ' mes' || CASE WHEN v_months != 1 THEN 'es' ELSE '' END;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_pet_age(UUID) IS 'Get pet age as human-readable string in Spanish (e.g., "2 años", "5 meses")';

-- Search pets by name, microchip, or owner info
CREATE OR REPLACE FUNCTION public.search_pets(
    p_tenant_id TEXT,
    p_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    species TEXT,
    breed TEXT,
    photo_url TEXT,
    owner_name TEXT,
    owner_phone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.species,
        p.breed,
        p.photo_url,
        pr.full_name,
        pr.phone
    FROM public.pets p
    JOIN public.profiles pr ON p.owner_id = pr.id
    WHERE p.tenant_id = p_tenant_id
    AND p.deleted_at IS NULL
    AND (
        p.name ILIKE '%' || p_query || '%'
        OR p.microchip_number ILIKE '%' || p_query || '%'
        OR pr.full_name ILIKE '%' || p_query || '%'
        OR pr.phone ILIKE '%' || p_query || '%'
    )
    ORDER BY
        CASE WHEN p.name ILIKE p_query || '%' THEN 0 ELSE 1 END,
        p.name
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.search_pets(TEXT, TEXT, INTEGER) IS
'Search pets by name, microchip, or owner name/phone. Returns top matches with owner info.';

-- Get pet with owner info
CREATE OR REPLACE FUNCTION public.get_pet_with_owner(p_pet_id UUID)
RETURNS TABLE (
    pet_id UUID,
    pet_name TEXT,
    species TEXT,
    breed TEXT,
    birth_date DATE,
    photo_url TEXT,
    owner_id UUID,
    owner_name TEXT,
    owner_phone TEXT,
    owner_email TEXT,
    tenant_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.species,
        p.breed,
        p.birth_date,
        p.photo_url,
        p.owner_id,
        pr.full_name,
        pr.phone,
        pr.email,
        p.tenant_id
    FROM public.pets p
    JOIN public.profiles pr ON p.owner_id = pr.id
    WHERE p.id = p_pet_id
    AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_with_owner(UUID) IS
'Get pet details with owner contact information.';

-- =============================================================================
-- QR TAGS TABLE
-- =============================================================================
-- QR tag codes that can be assigned to pets for identification

CREATE TABLE IF NOT EXISTS public.qr_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,

    -- Tag info
    code TEXT NOT NULL UNIQUE,  -- Unique tag code (printed on physical tag)
    batch_number TEXT,          -- Manufacturing batch
    batch_id TEXT,              -- Batch identifier

    -- Assignment
    is_registered BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT qr_tags_code_format CHECK (char_length(code) >= 6)
);

COMMENT ON TABLE public.qr_tags IS 'QR tag codes for pet identification. Tags can be pre-generated and assigned later.';
COMMENT ON COLUMN public.qr_tags.code IS 'Unique code printed on physical QR tag';
COMMENT ON COLUMN public.qr_tags.is_registered IS 'True if tag has been linked to a pet';

-- RLS
ALTER TABLE public.qr_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public lookup tags" ON public.qr_tags;
CREATE POLICY "Public lookup tags" ON public.qr_tags
    FOR SELECT USING (is_active = true AND is_registered = true);

DROP POLICY IF EXISTS "Staff manage tags" ON public.qr_tags;
CREATE POLICY "Staff manage tags" ON public.qr_tags
    FOR ALL TO authenticated
    USING (tenant_id IS NULL OR public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access tags" ON public.qr_tags;
CREATE POLICY "Service role full access tags" ON public.qr_tags
    FOR ALL TO service_role USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qr_tags_code ON public.qr_tags(code);
CREATE INDEX IF NOT EXISTS idx_qr_tags_pet ON public.qr_tags(pet_id) WHERE pet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_tags_tenant ON public.qr_tags(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_tags_unassigned ON public.qr_tags(tenant_id)
    WHERE pet_id IS NULL AND is_active = true;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.qr_tags;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.qr_tags
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- LOST PETS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lost_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Status
    status TEXT NOT NULL DEFAULT 'lost' CHECK (status IN ('lost', 'found', 'reunited')),

    -- Location info
    last_seen_location TEXT,
    last_seen_lat NUMERIC(10, 7),
    last_seen_lng NUMERIC(10, 7),
    last_seen_at TIMESTAMPTZ,

    -- Reporter
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contact_phone TEXT,
    contact_email TEXT,

    -- Resolution
    found_at TIMESTAMPTZ,
    found_location TEXT,
    found_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.lost_pets IS 'Lost and found pet reports';
COMMENT ON COLUMN public.lost_pets.status IS 'lost: currently missing, found: located but not returned, reunited: back with owner';

-- RLS
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view lost pets" ON public.lost_pets;
CREATE POLICY "Public view lost pets" ON public.lost_pets
    FOR SELECT USING (status = 'lost');

DROP POLICY IF EXISTS "Staff manage lost pets" ON public.lost_pets;
CREATE POLICY "Staff manage lost pets" ON public.lost_pets
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners manage own lost pets" ON public.lost_pets;
CREATE POLICY "Owners manage own lost pets" ON public.lost_pets
    FOR ALL TO authenticated
    USING (public.is_owner_of_pet(pet_id));

DROP POLICY IF EXISTS "Service role full access lost pets" ON public.lost_pets;
CREATE POLICY "Service role full access lost pets" ON public.lost_pets
    FOR ALL TO service_role USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lost_pets_pet ON public.lost_pets(pet_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_tenant ON public.lost_pets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON public.lost_pets(status) WHERE status = 'lost';
CREATE INDEX IF NOT EXISTS idx_lost_pets_location ON public.lost_pets(last_seen_lat, last_seen_lng)
    WHERE status = 'lost' AND last_seen_lat IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.lost_pets;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lost_pets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id from pet
CREATE OR REPLACE FUNCTION public.lost_pets_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.pets WHERE id = NEW.pet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS lost_pets_auto_tenant ON public.lost_pets;
CREATE TRIGGER lost_pets_auto_tenant
    BEFORE INSERT ON public.lost_pets
    FOR EACH ROW EXECUTE FUNCTION public.lost_pets_set_tenant_id();

-- =============================================================================
-- CLINIC PETS (Junction table for pet-clinic relationships)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clinic_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Visit tracking
    first_visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_visit_date TIMESTAMPTZ,
    visit_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Clinic-specific notes
    notes TEXT,

    -- Audit
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(pet_id, tenant_id)
);

COMMENT ON TABLE public.clinic_pets IS 'Junction table linking pets to clinics they visit. Supports pets visiting multiple clinics.';
COMMENT ON COLUMN public.clinic_pets.first_visit_date IS 'When this pet was first seen at this clinic';
COMMENT ON COLUMN public.clinic_pets.visit_count IS 'Total visits to this clinic';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_clinic_pets_pet ON public.clinic_pets(pet_id);
CREATE INDEX IF NOT EXISTS idx_clinic_pets_tenant ON public.clinic_pets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinic_pets_active ON public.clinic_pets(tenant_id, is_active)
    WHERE is_active = true;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.clinic_pets ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access clinic_pets" ON public.clinic_pets;
CREATE POLICY "Service role full access clinic_pets" ON public.clinic_pets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Clinic staff can manage their clinic's pet relationships
DROP POLICY IF EXISTS "Clinic staff manage clinic_pets" ON public.clinic_pets;
CREATE POLICY "Clinic staff manage clinic_pets" ON public.clinic_pets
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = clinic_pets.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = clinic_pets.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Pet owners can view their pets' clinic relationships
DROP POLICY IF EXISTS "Owners view their pets clinic relationships" ON public.clinic_pets;
CREATE POLICY "Owners view their pets clinic relationships" ON public.clinic_pets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pets pet
            WHERE pet.id = clinic_pets.pet_id
            AND pet.owner_id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger
DROP TRIGGER IF EXISTS handle_updated_at_clinic_pets ON public.clinic_pets;
CREATE TRIGGER handle_updated_at_clinic_pets
    BEFORE UPDATE ON public.clinic_pets
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
