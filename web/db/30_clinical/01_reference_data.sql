-- =============================================================================
-- 01_REFERENCE_DATA.SQL
-- =============================================================================
-- Clinical reference tables: diagnosis codes, drug dosages, growth standards,
-- reproductive cycles, and euthanasia assessments.
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql, 20_pets/01_pets.sql
-- =============================================================================

-- =============================================================================
-- DIAGNOSIS CODES
-- =============================================================================
-- Standard and custom diagnosis codes for veterinary medicine.
-- Supports VeNom, SNOMED, and custom codes.

CREATE TABLE IF NOT EXISTS public.diagnosis_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Code info
    code TEXT NOT NULL UNIQUE,
    term TEXT NOT NULL,
    standard TEXT DEFAULT 'custom' CHECK (standard IN ('venom', 'snomed', 'custom')),
    category TEXT,
    description TEXT,

    -- Species applicability
    species TEXT[] DEFAULT ARRAY['all']::TEXT[],

    -- Severity level
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT diagnosis_codes_code_length CHECK (char_length(code) >= 2),
    CONSTRAINT diagnosis_codes_term_length CHECK (char_length(term) >= 2)
);

COMMENT ON TABLE public.diagnosis_codes IS 'Standardized diagnosis codes (VeNom, SNOMED) and custom codes for veterinary diagnoses';
COMMENT ON COLUMN public.diagnosis_codes.standard IS 'venom: VeNom standard, snomed: SNOMED-CT, custom: clinic-defined';
COMMENT ON COLUMN public.diagnosis_codes.species IS 'Species this code applies to. ["all"] means all species.';

-- =============================================================================
-- DRUG DOSAGES
-- =============================================================================
-- Drug dosage reference data for dose calculations.

CREATE TABLE IF NOT EXISTS public.drug_dosages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Drug info
    name TEXT NOT NULL,
    generic_name TEXT,
    species TEXT DEFAULT 'all' CHECK (species IN ('dog', 'cat', 'bird', 'rabbit', 'all')),
    category TEXT CHECK (category IN ('antibiotic', 'analgesic', 'nsaid', 'corticosteroid', 'antiemetic', 'cardiac', 'antifungal', 'antiparasitic', 'sedative', 'steroid', 'heartworm', 'vaccine', 'other')),

    -- Dosage range
    min_dose_mg_kg NUMERIC(10,2) CHECK (min_dose_mg_kg IS NULL OR min_dose_mg_kg >= 0),
    max_dose_mg_kg NUMERIC(10,2) CHECK (max_dose_mg_kg IS NULL OR max_dose_mg_kg >= 0),
    concentration_mg_ml NUMERIC(10,2) CHECK (concentration_mg_ml IS NULL OR concentration_mg_ml > 0),

    -- Administration
    route TEXT CHECK (route IS NULL OR route IN ('oral', 'PO', 'IV', 'IM', 'SC', 'SQ', 'topical', 'inhaled', 'rectal', 'ophthalmic', 'otic')),
    frequency TEXT,
    max_daily_dose_mg_kg NUMERIC(10,2) CHECK (max_daily_dose_mg_kg IS NULL OR max_daily_dose_mg_kg >= 0),

    -- Warnings
    contraindications TEXT[],
    side_effects TEXT[],
    notes TEXT,

    -- Prescription requirements
    requires_prescription BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(name, species),
    CONSTRAINT drug_dosages_name_length CHECK (char_length(name) >= 2),
    CONSTRAINT drug_dosages_dose_order CHECK (
        min_dose_mg_kg IS NULL OR max_dose_mg_kg IS NULL OR max_dose_mg_kg >= min_dose_mg_kg
    )
);

COMMENT ON TABLE public.drug_dosages IS 'Drug dosage reference data for veterinary dose calculations';
COMMENT ON COLUMN public.drug_dosages.min_dose_mg_kg IS 'Minimum dose in mg per kg body weight';
COMMENT ON COLUMN public.drug_dosages.max_dose_mg_kg IS 'Maximum dose in mg per kg body weight';
COMMENT ON COLUMN public.drug_dosages.concentration_mg_ml IS 'Drug concentration for liquid formulations';
COMMENT ON COLUMN public.drug_dosages.route IS 'Administration route: oral, IV, IM, SQ, topical, etc.';

-- =============================================================================
-- GROWTH STANDARDS
-- =============================================================================
-- Weight percentile data for growth chart calculations.

CREATE TABLE IF NOT EXISTS public.growth_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    species TEXT NOT NULL DEFAULT 'dog' CHECK (species IN ('dog', 'cat')),
    breed TEXT,  -- NULL for general breed category standards
    breed_category TEXT,  -- 'toy', 'small', 'medium', 'large', 'giant'
    gender TEXT CHECK (gender IN ('male', 'female')),
    age_weeks INTEGER NOT NULL CHECK (age_weeks >= 0),

    -- Weight data
    weight_kg NUMERIC(10,2) NOT NULL CHECK (weight_kg > 0),
    percentile TEXT DEFAULT 'P50' CHECK (percentile IN ('P3', 'P10', 'P25', 'P50', 'P75', 'P90', 'P97')),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(species, breed, gender, age_weeks, percentile)
);

COMMENT ON TABLE public.growth_standards IS 'Weight percentile reference data for pet growth chart analysis';
COMMENT ON COLUMN public.growth_standards.percentile IS 'Weight percentile: P3, P10, P25, P50 (median), P75, P90, P97';
COMMENT ON COLUMN public.growth_standards.breed_category IS 'Size category for dogs: small, medium, large, giant';

-- =============================================================================
-- VACCINE PROTOCOLS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vaccine_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vaccine info
    vaccine_name TEXT NOT NULL,
    vaccine_code TEXT NOT NULL UNIQUE,
    species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'all')),
    protocol_type TEXT NOT NULL CHECK (protocol_type IN ('core', 'non-core', 'lifestyle')),

    -- Diseases prevented
    diseases_prevented TEXT[] NOT NULL,

    -- Dosing schedule
    first_dose_weeks INTEGER,
    booster_weeks INTEGER[],
    booster_intervals_months INTEGER[],
    revaccination_months INTEGER,
    duration_years INTEGER,

    -- Additional info
    manufacturer TEXT,
    notes TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.vaccine_protocols IS 'Standard vaccination protocols by species and vaccine type';
COMMENT ON COLUMN public.vaccine_protocols.protocol_type IS 'Vaccine type: core (essential), non-core (recommended), lifestyle (optional)';
COMMENT ON COLUMN public.vaccine_protocols.diseases_prevented IS 'Array of diseases this vaccine prevents';
COMMENT ON COLUMN public.vaccine_protocols.booster_intervals_months IS 'Array of booster intervals in months';

-- =============================================================================
-- REPRODUCTIVE CYCLES
-- =============================================================================
-- Track reproductive cycles for breeding management.

CREATE TABLE IF NOT EXISTS public.reproductive_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Cycle details
    cycle_type TEXT NOT NULL DEFAULT 'heat' CHECK (cycle_type IN ('heat', 'pregnancy', 'lactation', 'anestrus')),
    cycle_start TIMESTAMPTZ NOT NULL,
    cycle_end TIMESTAMPTZ,

    -- Breeding info
    mating_date DATE,
    expected_due_date DATE,
    actual_birth_date DATE,
    litter_size INTEGER CHECK (litter_size IS NULL OR litter_size >= 0),

    -- Notes
    notes TEXT,

    -- Recorded by
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reproductive_cycles_dates CHECK (cycle_end IS NULL OR cycle_end >= cycle_start)
);

COMMENT ON TABLE public.reproductive_cycles IS 'Reproductive cycle tracking for breeding management';
COMMENT ON COLUMN public.reproductive_cycles.cycle_type IS 'heat: estrus, pregnancy: gestation, lactation: nursing, anestrus: non-cycling';

-- =============================================================================
-- EUTHANASIA ASSESSMENTS (HHHHHMM Scale)
-- =============================================================================
-- Quality of life assessments using the Hurt-Hunger-Hydration-Hygiene-Happiness-Mobility-More scale.

CREATE TABLE IF NOT EXISTS public.euthanasia_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- HHHHHMM Scale (each 0-10)
    hurt_score INTEGER NOT NULL CHECK (hurt_score >= 0 AND hurt_score <= 10),
    hunger_score INTEGER NOT NULL CHECK (hunger_score >= 0 AND hunger_score <= 10),
    hydration_score INTEGER NOT NULL CHECK (hydration_score >= 0 AND hydration_score <= 10),
    hygiene_score INTEGER NOT NULL CHECK (hygiene_score >= 0 AND hygiene_score <= 10),
    happiness_score INTEGER NOT NULL CHECK (happiness_score >= 0 AND happiness_score <= 10),
    mobility_score INTEGER NOT NULL CHECK (mobility_score >= 0 AND mobility_score <= 10),
    more_good_days_score INTEGER NOT NULL CHECK (more_good_days_score >= 0 AND more_good_days_score <= 10),

    -- Computed total (0-70, higher is better quality of life)
    total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 70),

    -- Notes
    notes TEXT,
    recommendations TEXT,

    -- Assessor
    assessed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.euthanasia_assessments IS 'Quality of life assessments using HHHHHMM (Hurt-Hunger-Hydration-Hygiene-Happiness-Mobility-More) scale';
COMMENT ON COLUMN public.euthanasia_assessments.hurt_score IS 'Pain level assessment (0=severe pain, 10=no pain)';
COMMENT ON COLUMN public.euthanasia_assessments.total_score IS 'Sum of all scores. Above 35 generally indicates acceptable quality of life.';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.diagnosis_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_dosages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproductive_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.euthanasia_assessments ENABLE ROW LEVEL SECURITY;

-- Diagnosis codes: Public read
DROP POLICY IF EXISTS "Public read diagnosis codes" ON public.diagnosis_codes;
CREATE POLICY "Public read diagnosis codes" ON public.diagnosis_codes
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role manage diagnosis codes" ON public.diagnosis_codes;
CREATE POLICY "Service role manage diagnosis codes" ON public.diagnosis_codes
    FOR ALL TO service_role USING (true);

-- Drug dosages: Public read
DROP POLICY IF EXISTS "Public read drug dosages" ON public.drug_dosages;
CREATE POLICY "Public read drug dosages" ON public.drug_dosages
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role manage drug dosages" ON public.drug_dosages;
CREATE POLICY "Service role manage drug dosages" ON public.drug_dosages
    FOR ALL TO service_role USING (true);

-- Growth standards: Public read
DROP POLICY IF EXISTS "Public read growth standards" ON public.growth_standards;
CREATE POLICY "Public read growth standards" ON public.growth_standards
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role manage growth standards" ON public.growth_standards;
CREATE POLICY "Service role manage growth standards" ON public.growth_standards
    FOR ALL TO service_role USING (true);

-- Reproductive cycles: Staff manage, owners view
DROP POLICY IF EXISTS "Staff manage reproductive cycles" ON public.reproductive_cycles;
CREATE POLICY "Staff manage reproductive cycles" ON public.reproductive_cycles
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet cycles" ON public.reproductive_cycles;
CREATE POLICY "Owners view pet cycles" ON public.reproductive_cycles
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access cycles" ON public.reproductive_cycles;
CREATE POLICY "Service role full access cycles" ON public.reproductive_cycles
    FOR ALL TO service_role USING (true);

-- Euthanasia assessments: Staff manage, owners view
DROP POLICY IF EXISTS "Staff manage assessments" ON public.euthanasia_assessments;
CREATE POLICY "Staff manage assessments" ON public.euthanasia_assessments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet assessments" ON public.euthanasia_assessments;
CREATE POLICY "Owners view pet assessments" ON public.euthanasia_assessments
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access assessments" ON public.euthanasia_assessments;
CREATE POLICY "Service role full access assessments" ON public.euthanasia_assessments
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Diagnosis codes
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_code ON public.diagnosis_codes(code);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_category ON public.diagnosis_codes(category);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_standard ON public.diagnosis_codes(standard);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_active ON public.diagnosis_codes(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_term_search ON public.diagnosis_codes USING gin(term gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_species ON public.diagnosis_codes USING gin(species);

-- Drug dosages
CREATE INDEX IF NOT EXISTS idx_drug_dosages_name ON public.drug_dosages(name);
CREATE INDEX IF NOT EXISTS idx_drug_dosages_species ON public.drug_dosages(species);
CREATE INDEX IF NOT EXISTS idx_drug_dosages_active ON public.drug_dosages(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drug_dosages_name_search ON public.drug_dosages USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drug_dosages_route ON public.drug_dosages(route);

-- Growth standards
CREATE INDEX IF NOT EXISTS idx_growth_standards_breed ON public.growth_standards(breed);
CREATE INDEX IF NOT EXISTS idx_growth_standards_species ON public.growth_standards(species);
CREATE INDEX IF NOT EXISTS idx_growth_standards_lookup ON public.growth_standards(species, breed, gender, age_weeks);
CREATE INDEX IF NOT EXISTS idx_growth_standards_active ON public.growth_standards(id) WHERE deleted_at IS NULL;

-- Reproductive cycles
CREATE INDEX IF NOT EXISTS idx_reproductive_cycles_pet ON public.reproductive_cycles(pet_id);
CREATE INDEX IF NOT EXISTS idx_reproductive_cycles_tenant ON public.reproductive_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reproductive_cycles_type ON public.reproductive_cycles(cycle_type);
CREATE INDEX IF NOT EXISTS idx_reproductive_cycles_recorded_by ON public.reproductive_cycles(recorded_by);
CREATE INDEX IF NOT EXISTS idx_reproductive_cycles_dates ON public.reproductive_cycles(cycle_start, cycle_end);

-- Euthanasia assessments
CREATE INDEX IF NOT EXISTS idx_euthanasia_assessments_pet ON public.euthanasia_assessments(pet_id);
CREATE INDEX IF NOT EXISTS idx_euthanasia_assessments_tenant ON public.euthanasia_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_euthanasia_assessments_assessed_by ON public.euthanasia_assessments(assessed_by);
CREATE INDEX IF NOT EXISTS idx_euthanasia_assessments_date ON public.euthanasia_assessments(assessed_at DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.diagnosis_codes;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.diagnosis_codes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.drug_dosages;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.drug_dosages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.growth_standards;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.growth_standards
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.reproductive_cycles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.reproductive_cycles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.euthanasia_assessments;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.euthanasia_assessments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id from pet
CREATE OR REPLACE FUNCTION public.clinical_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL AND NEW.pet_id IS NOT NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.pets WHERE id = NEW.pet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.clinical_set_tenant_id() IS 'Auto-populate tenant_id from pet_id for clinical tables';

DROP TRIGGER IF EXISTS reproductive_cycles_auto_tenant ON public.reproductive_cycles;
CREATE TRIGGER reproductive_cycles_auto_tenant
    BEFORE INSERT ON public.reproductive_cycles
    FOR EACH ROW EXECUTE FUNCTION public.clinical_set_tenant_id();

DROP TRIGGER IF EXISTS euthanasia_assessments_auto_tenant ON public.euthanasia_assessments;
CREATE TRIGGER euthanasia_assessments_auto_tenant
    BEFORE INSERT ON public.euthanasia_assessments
    FOR EACH ROW EXECUTE FUNCTION public.clinical_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Calculate drug dose for a pet
CREATE OR REPLACE FUNCTION public.calculate_drug_dose(
    p_drug_name TEXT,
    p_species TEXT,
    p_weight_kg NUMERIC
)
RETURNS TABLE (
    drug_name TEXT,
    min_dose_mg NUMERIC,
    max_dose_mg NUMERIC,
    min_ml NUMERIC,
    max_ml NUMERIC,
    route TEXT,
    frequency TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.name,
        ROUND(d.min_dose_mg_kg * p_weight_kg, 2),
        ROUND(d.max_dose_mg_kg * p_weight_kg, 2),
        CASE WHEN d.concentration_mg_ml IS NOT NULL AND d.concentration_mg_ml > 0
             THEN ROUND((d.min_dose_mg_kg * p_weight_kg) / d.concentration_mg_ml, 2)
             ELSE NULL END,
        CASE WHEN d.concentration_mg_ml IS NOT NULL AND d.concentration_mg_ml > 0
             THEN ROUND((d.max_dose_mg_kg * p_weight_kg) / d.concentration_mg_ml, 2)
             ELSE NULL END,
        d.route,
        d.frequency,
        d.notes
    FROM public.drug_dosages d
    WHERE d.name ILIKE p_drug_name
    AND (d.species = p_species OR d.species = 'all')
    AND d.deleted_at IS NULL
    ORDER BY
        CASE WHEN d.species = p_species THEN 0 ELSE 1 END
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.calculate_drug_dose(TEXT, TEXT, NUMERIC) IS
'Calculate drug dose in mg and mL for a given drug, species, and body weight';

-- Get growth percentile for a pet
CREATE OR REPLACE FUNCTION public.get_growth_percentile(
    p_species TEXT,
    p_breed TEXT,
    p_gender TEXT,
    p_age_weeks INTEGER,
    p_weight_kg NUMERIC
)
RETURNS TEXT AS $$
DECLARE
    v_p50 NUMERIC;
    v_p25 NUMERIC;
    v_p75 NUMERIC;
    v_p10 NUMERIC;
    v_p90 NUMERIC;
BEGIN
    -- Get reference weights
    SELECT weight_kg INTO v_p50 FROM public.growth_standards
    WHERE species = p_species AND breed ILIKE p_breed AND gender = p_gender
    AND age_weeks = p_age_weeks AND percentile = 'P50' AND deleted_at IS NULL;

    IF v_p50 IS NULL THEN
        RETURN 'No data';
    END IF;

    SELECT weight_kg INTO v_p25 FROM public.growth_standards
    WHERE species = p_species AND breed ILIKE p_breed AND gender = p_gender
    AND age_weeks = p_age_weeks AND percentile = 'P25' AND deleted_at IS NULL;

    SELECT weight_kg INTO v_p75 FROM public.growth_standards
    WHERE species = p_species AND breed ILIKE p_breed AND gender = p_gender
    AND age_weeks = p_age_weeks AND percentile = 'P75' AND deleted_at IS NULL;

    -- Estimate percentile
    IF p_weight_kg < v_p25 THEN
        RETURN 'Below 25th';
    ELSIF p_weight_kg < v_p50 THEN
        RETURN '25th-50th';
    ELSIF p_weight_kg < v_p75 THEN
        RETURN '50th-75th';
    ELSE
        RETURN 'Above 75th';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_growth_percentile(TEXT, TEXT, TEXT, INTEGER, NUMERIC) IS
'Estimate weight percentile for a pet based on breed growth standards';

-- =============================================================================
-- CONSENT TEMPLATES
-- =============================================================================
-- Templates for informed consent forms and documents

CREATE TABLE IF NOT EXISTS public.consent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = global template, SET = clinic-specific
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Template identification
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('surgical', 'anesthetic', 'diagnostic', 'therapeutic', 'vaccination', 'euthanasia', 'general')),

    -- Content
    title TEXT NOT NULL,
    content_html TEXT NOT NULL,
    requires_witness BOOLEAN DEFAULT false,

    -- Validity
    validity_days INTEGER,  -- NULL = unlimited
    version TEXT DEFAULT '1.0',

    -- Metadata
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT consent_templates_code_length CHECK (char_length(code) BETWEEN 2 AND 50),
    CONSTRAINT consent_templates_name_length CHECK (char_length(name) BETWEEN 2 AND 200),
    CONSTRAINT consent_templates_version_format CHECK (version ~ '^\d+\.\d+$'),

    -- Unique constraints
    CONSTRAINT consent_templates_global_code UNIQUE (code) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT consent_templates_tenant_code UNIQUE (tenant_id, code) DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE public.consent_templates IS 'Templates for informed consent forms and legal documents';
COMMENT ON COLUMN public.consent_templates.tenant_id IS 'NULL for global templates, clinic ID for clinic-specific templates';
COMMENT ON COLUMN public.consent_templates.validity_days IS 'How long the signed consent is valid (NULL = unlimited)';
COMMENT ON COLUMN public.consent_templates.version IS 'Semantic version for template updates';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_consent_templates_tenant ON public.consent_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consent_templates_category ON public.consent_templates(category);
CREATE INDEX IF NOT EXISTS idx_consent_templates_code ON public.consent_templates(code);

-- Row Level Security
DROP POLICY IF EXISTS "Global templates viewable by all" ON public.consent_templates;
CREATE POLICY "Global templates viewable by all" ON public.consent_templates
    FOR SELECT TO authenticated
    USING (tenant_id IS NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Clinic templates managed by staff" ON public.consent_templates;
CREATE POLICY "Clinic templates managed by staff" ON public.consent_templates
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access consent_templates" ON public.consent_templates;
CREATE POLICY "Service role full access consent_templates" ON public.consent_templates
    FOR ALL TO service_role USING (true);

