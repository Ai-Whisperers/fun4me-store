-- =============================================================================
-- 034_ADOPTION_BOARD.SQL
-- =============================================================================
-- Creates the adoption board feature for clinics to list pets for adoption
-- and manage adoption applications.
--
-- NEW TABLES:
-- 1. adoption_listings - Pets available for adoption
-- 2. adoption_applications - Applications from potential adopters
-- 3. adoption_contracts - Finalized adoption contracts
-- 4. adoption_followups - Post-adoption check-ins
-- =============================================================================

-- =============================================================================
-- ADOPTION LISTINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.adoption_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,

    -- Listing details
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending', 'adopted', 'withdrawn')),
    story TEXT, -- Pet's backstory
    personality TEXT, -- Personality description
    requirements TEXT, -- Adoption requirements (e.g., "must have fenced yard")
    requirements_checklist JSONB DEFAULT '[]'::jsonb, -- Structured requirements

    -- Fees and logistics
    adoption_fee NUMERIC(10, 2) DEFAULT 0,
    includes_vaccines BOOLEAN DEFAULT true,
    includes_neutering BOOLEAN DEFAULT true,
    includes_microchip BOOLEAN DEFAULT true,

    -- Additional info
    good_with_kids BOOLEAN,
    good_with_dogs BOOLEAN,
    good_with_cats BOOLEAN,
    energy_level TEXT CHECK (energy_level IN ('low', 'medium', 'high')),
    special_needs TEXT, -- Any medical/behavioral needs

    -- Management
    listed_by UUID NOT NULL REFERENCES public.profiles(id),
    listed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    featured BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.adoption_listings IS 'Pets available for adoption at the clinic';
COMMENT ON COLUMN public.adoption_listings.requirements_checklist IS 'JSON array of requirements: [{id, label, required}]';
COMMENT ON COLUMN public.adoption_listings.adoption_fee IS 'Fee to cover vaccines, neutering, care costs';

-- RLS
ALTER TABLE public.adoption_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view available listings
DROP POLICY IF EXISTS "Public view available listings" ON public.adoption_listings;
CREATE POLICY "Public view available listings" ON public.adoption_listings
    FOR SELECT USING (status = 'available');

-- Staff can manage listings for their tenant
DROP POLICY IF EXISTS "Staff manage listings" ON public.adoption_listings;
CREATE POLICY "Staff manage listings" ON public.adoption_listings
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_adoption_listings_tenant ON public.adoption_listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_adoption_listings_pet ON public.adoption_listings(pet_id);
CREATE INDEX IF NOT EXISTS idx_adoption_listings_status ON public.adoption_listings(tenant_id, status)
    WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_adoption_listings_featured ON public.adoption_listings(tenant_id, featured)
    WHERE status = 'available' AND featured = true;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.adoption_listings;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.adoption_listings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ADOPTION APPLICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.adoption_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.adoption_listings(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Applicant info
    applicant_id UUID REFERENCES public.profiles(id), -- If logged in user
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    applicant_phone TEXT NOT NULL,

    -- Living situation
    living_situation TEXT NOT NULL CHECK (living_situation IN ('house', 'apartment', 'farm', 'other')),
    has_yard BOOLEAN DEFAULT false,
    yard_fenced BOOLEAN DEFAULT false,
    own_or_rent TEXT CHECK (own_or_rent IN ('own', 'rent')),
    landlord_allows_pets BOOLEAN,

    -- Household
    household_members INTEGER DEFAULT 1,
    has_children BOOLEAN DEFAULT false,
    children_ages TEXT, -- Free text: "5, 8, 12"
    other_pets TEXT, -- Description of other pets
    allergies TEXT,

    -- Experience
    pet_experience TEXT, -- Previous pet ownership experience
    veterinarian_info TEXT, -- Previous/current vet reference

    -- Intent
    reason_for_adoption TEXT NOT NULL,
    who_will_care TEXT, -- Primary caretaker
    hours_alone INTEGER, -- Hours pet will be alone daily
    exercise_plan TEXT,
    emergency_plan TEXT, -- Plan if can no longer care for pet

    -- Application status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'interview_scheduled', 'approved', 'rejected', 'withdrawn')),
    status_reason TEXT, -- Reason for rejection/withdrawal
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    interview_scheduled_at TIMESTAMPTZ,
    interview_notes TEXT,

    -- Documents
    documents JSONB DEFAULT '[]'::jsonb, -- [{name, url, type}]

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.adoption_applications IS 'Applications from people interested in adopting a pet';
COMMENT ON COLUMN public.adoption_applications.requirements_met IS 'Checklist of met requirements from listing';

-- Add the requirements_met column
ALTER TABLE public.adoption_applications
    ADD COLUMN IF NOT EXISTS requirements_met JSONB DEFAULT '[]'::jsonb;

-- RLS
ALTER TABLE public.adoption_applications ENABLE ROW LEVEL SECURITY;

-- Applicants can view their own applications
DROP POLICY IF EXISTS "Applicants view own applications" ON public.adoption_applications;
CREATE POLICY "Applicants view own applications" ON public.adoption_applications
    FOR SELECT TO authenticated
    USING (applicant_id = auth.uid());

-- Applicants can create applications
DROP POLICY IF EXISTS "Anyone can apply" ON public.adoption_applications;
CREATE POLICY "Anyone can apply" ON public.adoption_applications
    FOR INSERT WITH CHECK (true);

-- Staff can manage all applications for their tenant
DROP POLICY IF EXISTS "Staff manage applications" ON public.adoption_applications;
CREATE POLICY "Staff manage applications" ON public.adoption_applications
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_adoption_applications_listing ON public.adoption_applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_adoption_applications_tenant ON public.adoption_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_adoption_applications_applicant ON public.adoption_applications(applicant_id)
    WHERE applicant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_adoption_applications_status ON public.adoption_applications(tenant_id, status)
    WHERE status IN ('pending', 'reviewing');
CREATE INDEX IF NOT EXISTS idx_adoption_applications_email ON public.adoption_applications(applicant_email);

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.adoption_applications;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.adoption_applications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ADOPTION CONTRACTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.adoption_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.adoption_listings(id) ON DELETE RESTRICT,
    application_id UUID NOT NULL REFERENCES public.adoption_applications(id) ON DELETE RESTRICT,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- New owner info
    new_owner_id UUID REFERENCES public.profiles(id),
    new_owner_name TEXT NOT NULL,
    new_owner_email TEXT NOT NULL,
    new_owner_phone TEXT NOT NULL,
    new_owner_address TEXT,

    -- Contract details
    contract_number TEXT NOT NULL,
    adoption_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fee_paid NUMERIC(10, 2) DEFAULT 0,
    payment_method TEXT,

    -- Contract document
    contract_url TEXT, -- PDF of signed contract
    contract_signed_at TIMESTAMPTZ,
    signed_by_adopter BOOLEAN DEFAULT false,
    signed_by_staff BOOLEAN DEFAULT false,
    staff_signer_id UUID REFERENCES public.profiles(id),

    -- Terms
    return_policy TEXT, -- e.g., "Return within 30 days if not compatible"
    follow_up_required BOOLEAN DEFAULT true,
    notes TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'completed', 'voided')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.adoption_contracts IS 'Finalized adoption contracts between clinic and adopter';

-- RLS
ALTER TABLE public.adoption_contracts ENABLE ROW LEVEL SECURITY;

-- New owners can view their contracts
DROP POLICY IF EXISTS "Owners view own contracts" ON public.adoption_contracts;
CREATE POLICY "Owners view own contracts" ON public.adoption_contracts
    FOR SELECT TO authenticated
    USING (new_owner_id = auth.uid());

-- Staff can manage contracts for their tenant
DROP POLICY IF EXISTS "Staff manage contracts" ON public.adoption_contracts;
CREATE POLICY "Staff manage contracts" ON public.adoption_contracts
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_adoption_contracts_listing ON public.adoption_contracts(listing_id);
CREATE INDEX IF NOT EXISTS idx_adoption_contracts_application ON public.adoption_contracts(application_id);
CREATE INDEX IF NOT EXISTS idx_adoption_contracts_tenant ON public.adoption_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_adoption_contracts_owner ON public.adoption_contracts(new_owner_id)
    WHERE new_owner_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_adoption_contracts_number ON public.adoption_contracts(tenant_id, contract_number);

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.adoption_contracts;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.adoption_contracts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ADOPTION FOLLOWUPS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.adoption_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.adoption_contracts(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Follow-up schedule
    scheduled_date DATE NOT NULL,
    followup_type TEXT NOT NULL DEFAULT 'check_in' CHECK (followup_type IN ('check_in', 'home_visit', 'vet_check', 'photo_update')),

    -- Completion
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id),

    -- Notes and observations
    notes TEXT,
    pet_condition TEXT CHECK (pet_condition IN ('excellent', 'good', 'fair', 'poor', 'concern')),
    concerns TEXT,
    photos JSONB DEFAULT '[]'::jsonb, -- [{url, caption}]

    -- If there are concerns
    action_required BOOLEAN DEFAULT false,
    action_taken TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.adoption_followups IS 'Post-adoption follow-up check-ins and home visits';

-- RLS
ALTER TABLE public.adoption_followups ENABLE ROW LEVEL SECURITY;

-- New owners can view their followups
DROP POLICY IF EXISTS "Owners view followups" ON public.adoption_followups;
CREATE POLICY "Owners view followups" ON public.adoption_followups
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.adoption_contracts c
            WHERE c.id = contract_id
            AND c.new_owner_id = auth.uid()
        )
    );

-- Staff can manage followups for their tenant
DROP POLICY IF EXISTS "Staff manage followups" ON public.adoption_followups;
CREATE POLICY "Staff manage followups" ON public.adoption_followups
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_adoption_followups_contract ON public.adoption_followups(contract_id);
CREATE INDEX IF NOT EXISTS idx_adoption_followups_tenant ON public.adoption_followups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_adoption_followups_pending ON public.adoption_followups(tenant_id, scheduled_date)
    WHERE completed_at IS NULL;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.adoption_followups;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.adoption_followups
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- HELPER FUNCTION: Auto-set tenant_id from listing
-- =============================================================================

CREATE OR REPLACE FUNCTION public.adoption_application_set_tenant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.adoption_listings
        WHERE id = NEW.listing_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS adoption_application_auto_tenant ON public.adoption_applications;
CREATE TRIGGER adoption_application_auto_tenant
    BEFORE INSERT ON public.adoption_applications
    FOR EACH ROW EXECUTE FUNCTION public.adoption_application_set_tenant();

-- =============================================================================
-- HELPER FUNCTION: Generate contract number
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_adoption_contract_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_sequence INTEGER;
    v_number TEXT;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(contract_number, '^ADO-' || v_year || '-', ''), '')::INTEGER
    ), 0) + 1
    INTO v_sequence
    FROM public.adoption_contracts
    WHERE tenant_id = p_tenant_id
    AND contract_number LIKE 'ADO-' || v_year || '-%';

    v_number := 'ADO-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

    RETURN v_number;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_adoption_contract_number(TEXT) IS
'Generates a sequential adoption contract number: ADO-YYYY-NNNN';

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for public adoption listings with pet info
CREATE OR REPLACE VIEW public.v_adoption_listings AS
SELECT
    al.id,
    al.tenant_id,
    al.pet_id,
    al.status,
    al.story,
    al.personality,
    al.requirements,
    al.adoption_fee,
    al.includes_vaccines,
    al.includes_neutering,
    al.includes_microchip,
    al.good_with_kids,
    al.good_with_dogs,
    al.good_with_cats,
    al.energy_level,
    al.special_needs,
    al.featured,
    al.views_count,
    al.listed_at,
    p.name AS pet_name,
    p.species,
    p.breed,
    p.sex,
    p.birth_date,
    p.color,
    p.photo_url,
    p.photos AS pet_photos,
    p.weight_kg,
    (SELECT COUNT(*) FROM public.adoption_applications aa WHERE aa.listing_id = al.id AND aa.status NOT IN ('rejected', 'withdrawn')) AS applications_count
FROM public.adoption_listings al
JOIN public.pets p ON al.pet_id = p.id
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW public.v_adoption_listings IS 'Public view of adoption listings with pet details';

-- =============================================================================
-- ANALYZE TABLES
-- =============================================================================
ANALYZE public.adoption_listings;
ANALYZE public.adoption_applications;
ANALYZE public.adoption_contracts;
ANALYZE public.adoption_followups;
