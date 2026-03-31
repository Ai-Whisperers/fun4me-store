-- =============================================================================
-- 02_VACCINES.SQL
-- =============================================================================
-- Vaccination records, templates, and reaction tracking.
-- Vaccines are global with administered_by_clinic for attribution.
--
-- DEPENDENCIES: 20_pets/01_pets.sql
-- =============================================================================

-- =============================================================================
-- VACCINE TEMPLATES (Reference Data)
-- =============================================================================
-- Global or tenant-specific vaccine schedules/requirements

CREATE TABLE IF NOT EXISTS public.vaccine_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,  -- NULL = global template

    -- Vaccine info
    name TEXT NOT NULL,
    code TEXT,                   -- Short code (e.g., "DHPP", "FVRCP")
    species TEXT[] NOT NULL,     -- ['dog'], ['cat'], ['dog', 'cat']
    description TEXT,

    -- Schedule
    min_age_weeks INTEGER CHECK (min_age_weeks IS NULL OR min_age_weeks >= 0),
    recommended_age_weeks INTEGER CHECK (recommended_age_weeks IS NULL OR recommended_age_weeks >= 0),
    booster_interval_days INTEGER CHECK (booster_interval_days IS NULL OR booster_interval_days > 0),
    is_required BOOLEAN DEFAULT false,

    -- Display
    display_order INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT vaccine_templates_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
    CONSTRAINT vaccine_templates_age_order CHECK (
        min_age_weeks IS NULL OR recommended_age_weeks IS NULL OR
        recommended_age_weeks >= min_age_weeks
    )
);

COMMENT ON TABLE public.vaccine_templates IS 'Vaccine schedule templates. NULL tenant_id = global template available to all clinics.';
COMMENT ON COLUMN public.vaccine_templates.species IS 'Array of species this vaccine applies to';
COMMENT ON COLUMN public.vaccine_templates.min_age_weeks IS 'Minimum age in weeks for first dose';
COMMENT ON COLUMN public.vaccine_templates.booster_interval_days IS 'Days between booster doses';
COMMENT ON COLUMN public.vaccine_templates.is_required IS 'True if legally required (e.g., rabies)';

-- =============================================================================
-- VACCINES (Applied to Pets)
-- =============================================================================
-- WITH TENANT_ID FOR OPTIMIZED RLS (avoids expensive join to pets table)

CREATE TABLE IF NOT EXISTS public.vaccines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    administered_by_clinic TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.vaccine_templates(id) ON DELETE SET NULL,
    administered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Vaccine details
    name TEXT NOT NULL,
    batch_number TEXT,
    manufacturer TEXT,
    route TEXT CHECK (route IN ('oral', 'PO', 'IV', 'IM', 'SC', 'SQ', 'topical', 'inhaled', 'rectal', 'ophthalmic', 'otic')),
    dosage TEXT,
    lot_expiry DATE,

    -- Dates
    administered_date DATE NOT NULL,
    next_due_date DATE,

    -- Status
    status TEXT NOT NULL DEFAULT 'completed'
        CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),

    -- Documentation
    vet_signature TEXT,
    certificate_url TEXT,
    adverse_reactions TEXT,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT vaccines_date_order CHECK (
        next_due_date IS NULL OR next_due_date > administered_date
    ),
    CONSTRAINT vaccines_name_length CHECK (char_length(name) BETWEEN 2 AND 100)
);

COMMENT ON TABLE public.vaccines IS 'Vaccination records for pets';
COMMENT ON COLUMN public.vaccines.administered_by_clinic IS 'Clinic that administered the vaccine';
COMMENT ON COLUMN public.vaccines.status IS 'scheduled: upcoming, completed: administered, missed: overdue, cancelled: not needed';
COMMENT ON COLUMN public.vaccines.next_due_date IS 'Next booster due date (NULL if no booster needed)';

-- =============================================================================
-- VACCINE REACTIONS
-- =============================================================================
-- Track adverse reactions for safety monitoring

CREATE TABLE IF NOT EXISTS public.vaccine_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,  -- Added for direct RLS (migration 024)
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    vaccine_id UUID REFERENCES public.vaccines(id) ON DELETE SET NULL,

    -- Reaction details
    vaccine_name TEXT NOT NULL,
    vaccine_brand TEXT,
    reaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    onset_hours INTEGER,  -- Hours after vaccination when reaction started

    -- Classification
    severity TEXT NOT NULL DEFAULT 'low'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    reaction_type TEXT CHECK (reaction_type IN (
        'local', 'systemic', 'allergic', 'anaphylactic', 'other'
    )),

    -- Symptoms and treatment
    symptoms TEXT[],
    treatment TEXT,
    outcome TEXT,
    hospitalization_required BOOLEAN DEFAULT false,
    recovery_days INTEGER,

    -- Notes
    notes TEXT,

    -- Reporter
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.vaccine_reactions IS 'Adverse reaction reports for pharmacovigilance';
COMMENT ON COLUMN public.vaccine_reactions.severity IS 'low: mild local, medium: requires treatment, high: serious, critical: life-threatening';
COMMENT ON COLUMN public.vaccine_reactions.reaction_type IS 'local: injection site, systemic: fever/lethargy, allergic: hives/swelling, anaphylactic: shock';
COMMENT ON COLUMN public.vaccine_reactions.onset_hours IS 'Hours after vaccination when symptoms appeared';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.vaccine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_reactions ENABLE ROW LEVEL SECURITY;

-- Templates: Public read global, staff manage tenant-specific
DROP POLICY IF EXISTS "Public read global templates" ON public.vaccine_templates;
CREATE POLICY "Public read global templates" ON public.vaccine_templates
    FOR SELECT USING (tenant_id IS NULL AND is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff read tenant templates" ON public.vaccine_templates;
CREATE POLICY "Staff read tenant templates" ON public.vaccine_templates
    FOR SELECT TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage tenant templates" ON public.vaccine_templates;
CREATE POLICY "Staff manage tenant templates" ON public.vaccine_templates
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access templates" ON public.vaccine_templates;
CREATE POLICY "Service role full access templates" ON public.vaccine_templates
    FOR ALL TO service_role USING (true);

-- Vaccines: Staff manage, owners view
DROP POLICY IF EXISTS "Owners view pet vaccines" ON public.vaccines;
CREATE POLICY "Owners view pet vaccines" ON public.vaccines
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

-- Staff manage vaccines for pets in their clinic
DROP POLICY IF EXISTS "Staff manage vaccines" ON public.vaccines;
CREATE POLICY "Staff manage vaccines" ON public.vaccines
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pets p
            WHERE p.id = vaccines.pet_id
            AND public.is_staff_of(p.tenant_id)
        )
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS "Service role full access vaccines" ON public.vaccines;
CREATE POLICY "Service role full access vaccines" ON public.vaccines
    FOR ALL TO service_role USING (true);

-- Reactions: Staff manage, owners view
DROP POLICY IF EXISTS "Owners view pet reactions" ON public.vaccine_reactions;
CREATE POLICY "Owners view pet reactions" ON public.vaccine_reactions
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id));

-- Staff manage reactions for pets in their clinic
-- NOTE: Uses tenant_id directly for O(1) performance (added in migration 024)
-- Falls back to pet lookup if tenant_id is NULL (legacy records)
DROP POLICY IF EXISTS "Staff manage reactions" ON public.vaccine_reactions;
CREATE POLICY "Staff manage reactions" ON public.vaccine_reactions
    FOR ALL TO authenticated
    USING (
        CASE
            WHEN tenant_id IS NOT NULL THEN public.is_staff_of(tenant_id)
            ELSE EXISTS (
                SELECT 1 FROM public.pets p
                WHERE p.id = vaccine_reactions.pet_id
                AND public.is_staff_of(p.tenant_id)
            )
        END
    )
    WITH CHECK (
        CASE
            WHEN tenant_id IS NOT NULL THEN public.is_staff_of(tenant_id)
            ELSE EXISTS (
                SELECT 1 FROM public.pets p
                WHERE p.id = vaccine_reactions.pet_id
                AND public.is_staff_of(p.tenant_id)
            )
        END
    );

DROP POLICY IF EXISTS "Service role full access reactions" ON public.vaccine_reactions;
CREATE POLICY "Service role full access reactions" ON public.vaccine_reactions
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Templates
CREATE INDEX IF NOT EXISTS idx_vaccine_templates_tenant ON public.vaccine_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_templates_species ON public.vaccine_templates USING gin(species);
CREATE INDEX IF NOT EXISTS idx_vaccine_templates_active ON public.vaccine_templates(id)
    WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vaccine_templates_global ON public.vaccine_templates(display_order)
    WHERE tenant_id IS NULL AND is_active = true AND deleted_at IS NULL;

-- Vaccines
CREATE INDEX IF NOT EXISTS idx_vaccines_pet ON public.vaccines(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccines_administered_by_clinic ON public.vaccines(administered_by_clinic);
CREATE INDEX IF NOT EXISTS idx_vaccines_template ON public.vaccines(template_id);
-- CREATE INDEX IF NOT EXISTS idx_vaccines_status ON public.vaccines(status) WHERE deleted_at IS NULL; -- Temporarily disabled due to IMMUTABLE function issue
CREATE INDEX IF NOT EXISTS idx_vaccines_administered_by ON public.vaccines(administered_by);

-- Vaccine history (covering index)
CREATE INDEX IF NOT EXISTS idx_vaccines_pet_history ON public.vaccines(pet_id, administered_date DESC)
    INCLUDE (name, status, next_due_date, administered_by, batch_number)
    WHERE deleted_at IS NULL;

-- Due vaccines for reminders
-- CREATE INDEX IF NOT EXISTS idx_vaccines_due ON public.vaccines(administered_by_clinic, next_due_date)
--     INCLUDE (pet_id, name, status)
--     WHERE next_due_date IS NOT NULL AND next_due_date <= CURRENT_DATE + INTERVAL '30 days'
--     AND status = 'completed' AND deleted_at IS NULL; -- CURRENT_DATE is STABLE, not IMMUTABLE

-- Overdue vaccines
-- CREATE INDEX IF NOT EXISTS idx_vaccines_overdue ON public.vaccines(administered_by_clinic, next_due_date)
--     WHERE next_due_date < CURRENT_DATE AND status = 'completed' AND deleted_at IS NULL; -- CURRENT_DATE is STABLE, not IMMUTABLE

-- Reactions
CREATE INDEX IF NOT EXISTS idx_vaccine_reactions_pet ON public.vaccine_reactions(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_reactions_tenant ON public.vaccine_reactions(tenant_id);  -- Added for direct RLS (migration 024)
CREATE INDEX IF NOT EXISTS idx_vaccine_reactions_vaccine ON public.vaccine_reactions(vaccine_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_reactions_severity ON public.vaccine_reactions(severity)
    WHERE severity IN ('high', 'critical');

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.vaccine_templates;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.vaccine_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.vaccines;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.vaccines
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.vaccine_reactions;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.vaccine_reactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Note: Vaccines are global - no tenant_id auto-setting needed

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Get pet's vaccination history
CREATE OR REPLACE FUNCTION public.get_pet_vaccines(p_pet_id UUID)
RETURNS TABLE (
    vaccine_id UUID,
    name TEXT,
    administered_date DATE,
    next_due_date DATE,
    status TEXT,
    administered_by_name TEXT,
    is_overdue BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.id,
        v.name,
        v.administered_date,
        v.next_due_date,
        v.status,
        p.full_name,
        v.next_due_date IS NOT NULL AND v.next_due_date < CURRENT_DATE AND v.status = 'completed'
    FROM public.vaccines v
    LEFT JOIN public.profiles p ON v.administered_by = p.id
    WHERE v.pet_id = p_pet_id
    AND v.deleted_at IS NULL
    ORDER BY v.administered_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_vaccines(UUID) IS
'Get vaccination history for a pet with overdue status';

-- Get vaccines due soon for a tenant
-- Temporarily disabled get_vaccines_due function due to syntax issues
-- TODO: Fix and re-enable

-- COMMENT ON FUNCTION public.get_vaccines_due(TEXT, INTEGER) IS
-- 'Get vaccines due within specified days for reminder system';
