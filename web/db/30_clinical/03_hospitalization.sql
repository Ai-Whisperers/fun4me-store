-- =============================================================================
-- 03_HOSPITALIZATION.SQL
-- =============================================================================
-- Hospitalization management: kennels, admissions, vitals, treatments, feedings.
-- ALL CHILD TABLES INCLUDE tenant_id FOR OPTIMIZED RLS (avoids joins to parent).
--
-- DEPENDENCIES: 10_core/*, 20_pets/01_pets.sql, 50_finance/01_invoicing.sql
-- =============================================================================

-- =============================================================================
-- KENNELS
-- =============================================================================
-- Physical kennel/cage units for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.kennels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Kennel info
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    location TEXT,
    kennel_type TEXT DEFAULT 'standard'
        CHECK (kennel_type IN ('standard', 'isolation', 'icu', 'recovery', 'large', 'small', 'extra-large', 'oxygen', 'exotic')),

    -- Capacity
    max_occupancy INTEGER DEFAULT 1 CHECK (max_occupancy > 0),
    current_occupancy INTEGER DEFAULT 0 CHECK (current_occupancy >= 0),
    max_weight_kg NUMERIC(6,2) CHECK (max_weight_kg IS NULL OR max_weight_kg > 0),

    -- Features
    features TEXT[],

    -- Pricing
    daily_rate NUMERIC(12,2) DEFAULT 0 CHECK (daily_rate >= 0),

    -- Status
    current_status TEXT DEFAULT 'available'
        CHECK (current_status IN ('available', 'occupied', 'cleaning', 'maintenance', 'reserved')),
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, code),
    CONSTRAINT kennels_occupancy_valid CHECK (current_occupancy <= max_occupancy),
    CONSTRAINT kennels_name_length CHECK (char_length(name) >= 1),
    CONSTRAINT kennels_code_length CHECK (char_length(code) >= 1)
);

COMMENT ON TABLE public.kennels IS 'Physical kennel/cage units for hospitalized patients';
COMMENT ON COLUMN public.kennels.kennel_type IS 'Type: standard, isolation (infectious), icu (critical), recovery, large, small, exotic';
COMMENT ON COLUMN public.kennels.current_status IS 'available: ready for patient, occupied: has patient, cleaning: being cleaned, maintenance: out of service';
COMMENT ON COLUMN public.kennels.daily_rate IS 'Base daily rate for this kennel (may vary by type)';

-- =============================================================================
-- HOSPITALIZATIONS
-- =============================================================================
-- Patient admission records for hospitalized animals.

CREATE TABLE IF NOT EXISTS public.hospitalizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Relationships
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE RESTRICT,
    kennel_id UUID REFERENCES public.kennels(id) ON DELETE SET NULL,
    primary_vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Admission info
    admission_number TEXT NOT NULL,
    admitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_discharge TIMESTAMPTZ,
    actual_discharge TIMESTAMPTZ,

    -- Diagnosis
    reason TEXT NOT NULL,
    diagnosis TEXT,
    notes TEXT,
    discharge_instructions TEXT,

    -- Priority/Acuity
    acuity_level TEXT DEFAULT 'normal'
        CHECK (acuity_level IN ('low', 'normal', 'high', 'critical')),

    -- Status
    status TEXT NOT NULL DEFAULT 'admitted'
        CHECK (status IN (
            'admitted',       -- Currently hospitalized
            'in_treatment',   -- Active treatment
            'stable',         -- Stable condition
            'critical',       -- Critical condition
            'recovering',     -- Recovery phase
            'discharged',     -- Discharged
            'deceased',       -- Died during hospitalization
            'transferred'     -- Transferred to another facility
        )),

    -- Discharge
    discharge_notes TEXT,
    discharged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,

    -- Billing
    estimated_cost NUMERIC(12,2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    actual_cost NUMERIC(12,2) CHECK (actual_cost IS NULL OR actual_cost >= 0),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, admission_number),
    CONSTRAINT hospitalizations_discharge_after_admission CHECK (
        actual_discharge IS NULL OR actual_discharge >= admitted_at
    ),
    CONSTRAINT hospitalizations_reason_length CHECK (char_length(reason) >= 3)
);

COMMENT ON TABLE public.hospitalizations IS 'Patient admission records for hospitalized animals';
COMMENT ON COLUMN public.hospitalizations.admission_number IS 'Unique admission number (format: ADM-NNNNNN)';
COMMENT ON COLUMN public.hospitalizations.acuity_level IS 'Patient acuity: low, normal, high, critical';
COMMENT ON COLUMN public.hospitalizations.status IS 'Admission status workflow: admitted → in_treatment → stable/critical → recovering → discharged';

-- Only one active hospitalization per pet
CREATE UNIQUE INDEX IF NOT EXISTS idx_hospitalizations_one_active_per_pet
ON public.hospitalizations(pet_id)
WHERE status NOT IN ('discharged', 'deceased', 'transferred') AND deleted_at IS NULL;

-- =============================================================================
-- HOSPITALIZATION VITALS - WITH TENANT_ID
-- =============================================================================
-- Vital signs recordings for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.hospitalization_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Vitals (with medically reasonable ranges)
    temperature NUMERIC(4,1) CHECK (temperature IS NULL OR (temperature >= 30 AND temperature <= 45)),
    heart_rate INTEGER CHECK (heart_rate IS NULL OR (heart_rate >= 20 AND heart_rate <= 400)),
    respiratory_rate INTEGER CHECK (respiratory_rate IS NULL OR (respiratory_rate >= 5 AND respiratory_rate <= 150)),
    blood_pressure_systolic INTEGER CHECK (blood_pressure_systolic IS NULL OR (blood_pressure_systolic >= 40 AND blood_pressure_systolic <= 300)),
    blood_pressure_diastolic INTEGER CHECK (blood_pressure_diastolic IS NULL OR (blood_pressure_diastolic >= 20 AND blood_pressure_diastolic <= 200)),
    spo2 INTEGER CHECK (spo2 IS NULL OR (spo2 >= 0 AND spo2 <= 100)),
    weight_kg NUMERIC(6,2) CHECK (weight_kg IS NULL OR weight_kg > 0),
    pain_score INTEGER CHECK (pain_score IS NULL OR (pain_score >= 0 AND pain_score <= 10)),
    mentation TEXT CHECK (mentation IS NULL OR mentation IN ('bright', 'quiet', 'dull', 'obtunded', 'comatose')),
    hydration_status TEXT CHECK (hydration_status IS NULL OR hydration_status IN ('normal', 'mild', 'moderate', 'severe')),

    -- Notes
    notes TEXT,

    -- Recorded by
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hospitalization_vitals IS 'Vital signs recordings for hospitalized patients';
COMMENT ON COLUMN public.hospitalization_vitals.pain_score IS 'Pain score on 0-10 scale (0=no pain, 10=worst pain)';
COMMENT ON COLUMN public.hospitalization_vitals.mentation IS 'Mental status: bright (normal), quiet, dull, obtunded, comatose';
COMMENT ON COLUMN public.hospitalization_vitals.spo2 IS 'Blood oxygen saturation percentage (0-100%)';

-- =============================================================================
-- HOSPITALIZATION MEDICATIONS - WITH TENANT_ID
-- =============================================================================
-- Medication administration records for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.hospitalization_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Medication
    medication_name TEXT NOT NULL,
    dose TEXT NOT NULL,
    route TEXT CHECK (route IS NULL OR route IN ('oral', 'IV', 'IM', 'SQ', 'topical', 'inhaled', 'rectal', 'ophthalmic', 'otic')),
    frequency TEXT,

    -- Schedule
    scheduled_at TIMESTAMPTZ,
    administered_at TIMESTAMPTZ,
    skipped_reason TEXT,

    -- Status
    status TEXT DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'administered', 'skipped', 'held')),

    -- Administered by
    administered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hospitalization_medications IS 'Medication administration records for hospitalized patients';
COMMENT ON COLUMN public.hospitalization_medications.status IS 'scheduled: pending, administered: given, skipped: missed intentionally, held: temporarily suspended';
COMMENT ON COLUMN public.hospitalization_medications.route IS 'Administration route: oral, IV, IM, SQ, topical, etc.';

-- =============================================================================
-- HOSPITALIZATION TREATMENTS - WITH TENANT_ID
-- =============================================================================
-- Non-medication treatments and procedures for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.hospitalization_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Treatment
    treatment_type TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Schedule
    scheduled_at TIMESTAMPTZ,
    performed_at TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'performed', 'skipped', 'pending')),

    -- Performed by
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hospitalization_treatments IS 'Non-medication treatments and procedures (e.g., wound care, physical therapy)';
COMMENT ON COLUMN public.hospitalization_treatments.treatment_type IS 'Type of treatment: wound_care, fluid_therapy, physical_therapy, etc.';

-- =============================================================================
-- HOSPITALIZATION FEEDINGS - WITH TENANT_ID
-- =============================================================================
-- Feeding records for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.hospitalization_feedings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Feeding details
    food_type TEXT NOT NULL,
    amount TEXT,
    method TEXT CHECK (method IS NULL OR method IN ('oral', 'syringe', 'tube', 'assisted')),

    -- Timing
    scheduled_at TIMESTAMPTZ,
    fed_at TIMESTAMPTZ,

    -- Results
    consumed_amount TEXT,
    appetite_score INTEGER CHECK (appetite_score IS NULL OR (appetite_score >= 0 AND appetite_score <= 5)),
    vomited BOOLEAN DEFAULT false,

    -- Status
    status TEXT DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'completed', 'refused', 'partial')),

    -- Fed by
    fed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hospitalization_feedings IS 'Feeding records for hospitalized patients';
COMMENT ON COLUMN public.hospitalization_feedings.appetite_score IS 'Appetite score 0-5: 0=anorexic, 5=ravenous';
COMMENT ON COLUMN public.hospitalization_feedings.method IS 'Feeding method: oral (voluntary), syringe, tube (feeding tube), assisted';

-- =============================================================================
-- HOSPITALIZATION NOTES - WITH TENANT_ID
-- =============================================================================
-- Progress notes and documentation for hospitalized patients.

CREATE TABLE IF NOT EXISTS public.hospitalization_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Note
    note_type TEXT DEFAULT 'progress'
        CHECK (note_type IN ('progress', 'doctor', 'nursing', 'discharge', 'owner_update', 'other')),
    content TEXT NOT NULL,

    -- Author
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.hospitalization_notes IS 'Progress notes and documentation for hospitalized patients';
COMMENT ON COLUMN public.hospitalization_notes.note_type IS 'Type: progress (routine), doctor (vet notes), nursing, discharge (summary), owner_update';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.kennels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalization_notes ENABLE ROW LEVEL SECURITY;

-- Kennels: Staff only
DROP POLICY IF EXISTS "Staff manage kennels" ON public.kennels;
CREATE POLICY "Staff manage kennels" ON public.kennels
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access kennels" ON public.kennels;
CREATE POLICY "Service role full access kennels" ON public.kennels
    FOR ALL TO service_role USING (true);

-- Hospitalizations: Staff manage, owners view
DROP POLICY IF EXISTS "Staff manage hospitalizations" ON public.hospitalizations;
CREATE POLICY "Staff manage hospitalizations" ON public.hospitalizations
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet hospitalizations" ON public.hospitalizations;
CREATE POLICY "Owners view pet hospitalizations" ON public.hospitalizations
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access hospitalizations" ON public.hospitalizations;
CREATE POLICY "Service role full access hospitalizations" ON public.hospitalizations
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Vitals uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage vitals" ON public.hospitalization_vitals;
CREATE POLICY "Staff manage vitals" ON public.hospitalization_vitals
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view vitals" ON public.hospitalization_vitals;
CREATE POLICY "Owners view vitals" ON public.hospitalization_vitals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.hospitalizations h
            WHERE h.id = hospitalization_vitals.hospitalization_id
            AND public.is_owner_of_pet(h.pet_id)
        )
    );

DROP POLICY IF EXISTS "Service role full access vitals" ON public.hospitalization_vitals;
CREATE POLICY "Service role full access vitals" ON public.hospitalization_vitals
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Medications uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage medications" ON public.hospitalization_medications;
CREATE POLICY "Staff manage medications" ON public.hospitalization_medications
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access medications" ON public.hospitalization_medications;
CREATE POLICY "Service role full access medications" ON public.hospitalization_medications
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Treatments uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage treatments" ON public.hospitalization_treatments;
CREATE POLICY "Staff manage treatments" ON public.hospitalization_treatments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access treatments" ON public.hospitalization_treatments;
CREATE POLICY "Service role full access treatments" ON public.hospitalization_treatments
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Feedings uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage feedings" ON public.hospitalization_feedings;
CREATE POLICY "Staff manage feedings" ON public.hospitalization_feedings
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access feedings" ON public.hospitalization_feedings;
CREATE POLICY "Service role full access feedings" ON public.hospitalization_feedings
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Notes uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage notes" ON public.hospitalization_notes;
CREATE POLICY "Staff manage notes" ON public.hospitalization_notes
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view notes" ON public.hospitalization_notes;
CREATE POLICY "Owners view notes" ON public.hospitalization_notes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.hospitalizations h
            WHERE h.id = hospitalization_notes.hospitalization_id
            AND public.is_owner_of_pet(h.pet_id)
        )
    );

DROP POLICY IF EXISTS "Service role full access notes" ON public.hospitalization_notes;
CREATE POLICY "Service role full access notes" ON public.hospitalization_notes
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Kennels
CREATE INDEX IF NOT EXISTS idx_kennels_tenant ON public.kennels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kennels_status ON public.kennels(current_status)
    WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kennels_available ON public.kennels(tenant_id, current_status)
    WHERE current_status = 'available' AND is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kennels_type ON public.kennels(tenant_id, kennel_type)
    WHERE is_active = true AND deleted_at IS NULL;

-- Hospitalizations
CREATE INDEX IF NOT EXISTS idx_hospitalizations_tenant ON public.hospitalizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_pet ON public.hospitalizations(pet_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_kennel ON public.hospitalizations(kennel_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_primary_vet ON public.hospitalizations(primary_vet_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_admitted_by ON public.hospitalizations(admitted_by);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_discharged_by ON public.hospitalizations(discharged_by);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_status ON public.hospitalizations(status)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hospitalizations_active ON public.hospitalizations(tenant_id, status)
    WHERE status NOT IN ('discharged', 'deceased', 'transferred') AND deleted_at IS NULL;

-- Covering index for active hospitalizations dashboard
CREATE INDEX IF NOT EXISTS idx_hospitalizations_board ON public.hospitalizations(tenant_id, status, acuity_level)
    INCLUDE (pet_id, kennel_id, admitted_at, expected_discharge, diagnosis, primary_vet_id)
    WHERE status NOT IN ('discharged', 'deceased', 'transferred') AND deleted_at IS NULL;

-- BRIN indexes for time-series data (efficient for append-only tables)
CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_hosp ON public.hospitalization_vitals(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_tenant ON public.hospitalization_vitals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_recorded_by ON public.hospitalization_vitals(recorded_by);
CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_recorded_brin ON public.hospitalization_vitals
    USING BRIN(recorded_at) WITH (pages_per_range = 32);

-- Medications indexes
CREATE INDEX IF NOT EXISTS idx_hospitalization_medications_hosp ON public.hospitalization_medications(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_medications_tenant ON public.hospitalization_medications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_medications_administered_by ON public.hospitalization_medications(administered_by);
CREATE INDEX IF NOT EXISTS idx_hospitalization_medications_scheduled ON public.hospitalization_medications(scheduled_at)
    WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_hospitalization_meds_scheduled_brin ON public.hospitalization_medications
    USING BRIN(scheduled_at) WITH (pages_per_range = 32)
    WHERE scheduled_at IS NOT NULL;

-- Treatments indexes
CREATE INDEX IF NOT EXISTS idx_hospitalization_treatments_hosp ON public.hospitalization_treatments(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_treatments_tenant ON public.hospitalization_treatments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_treatments_performed_by ON public.hospitalization_treatments(performed_by);

-- Feedings indexes
CREATE INDEX IF NOT EXISTS idx_hospitalization_feedings_hosp ON public.hospitalization_feedings(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_feedings_tenant ON public.hospitalization_feedings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_feedings_fed_by ON public.hospitalization_feedings(fed_by);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_hospitalization_notes_hosp ON public.hospitalization_notes(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_notes_tenant ON public.hospitalization_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_notes_created_by ON public.hospitalization_notes(created_by);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.kennels;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.kennels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.hospitalizations;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.hospitalizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.hospitalization_medications;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.hospitalization_medications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.hospitalization_treatments;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.hospitalization_treatments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.hospitalization_feedings;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.hospitalization_feedings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get hospitalization tenant_id efficiently
CREATE OR REPLACE FUNCTION public.get_hospitalization_tenant(p_hosp_id UUID)
RETURNS TEXT AS $$
    SELECT tenant_id FROM public.hospitalizations WHERE id = p_hosp_id;
$$ LANGUAGE sql STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_hospitalization_tenant(UUID) IS
'Get tenant_id for a hospitalization (used by child table triggers)';

-- Auto-set tenant_id for child tables
CREATE OR REPLACE FUNCTION public.hospitalization_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.get_hospitalization_tenant(NEW.hospitalization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.hospitalization_set_tenant_id() IS
'Auto-populate tenant_id from hospitalization for child tables';

DROP TRIGGER IF EXISTS vitals_auto_tenant ON public.hospitalization_vitals;
CREATE TRIGGER vitals_auto_tenant
    BEFORE INSERT ON public.hospitalization_vitals
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_set_tenant_id();

DROP TRIGGER IF EXISTS medications_auto_tenant ON public.hospitalization_medications;
CREATE TRIGGER medications_auto_tenant
    BEFORE INSERT ON public.hospitalization_medications
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_set_tenant_id();

DROP TRIGGER IF EXISTS treatments_auto_tenant ON public.hospitalization_treatments;
CREATE TRIGGER treatments_auto_tenant
    BEFORE INSERT ON public.hospitalization_treatments
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_set_tenant_id();

DROP TRIGGER IF EXISTS feedings_auto_tenant ON public.hospitalization_feedings;
CREATE TRIGGER feedings_auto_tenant
    BEFORE INSERT ON public.hospitalization_feedings
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_set_tenant_id();

DROP TRIGGER IF EXISTS notes_auto_tenant ON public.hospitalization_notes;
CREATE TRIGGER notes_auto_tenant
    BEFORE INSERT ON public.hospitalization_notes
    FOR EACH ROW EXECUTE FUNCTION public.hospitalization_set_tenant_id();

-- =============================================================================
-- KENNEL STATUS MANAGEMENT
-- =============================================================================

-- Update kennel status on hospitalization changes
CREATE OR REPLACE FUNCTION public.update_kennel_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.kennel_id IS NOT NULL THEN
        UPDATE public.kennels
        SET current_occupancy = current_occupancy + 1,
            current_status = CASE
                WHEN current_occupancy + 1 >= max_occupancy THEN 'occupied'
                ELSE current_status
            END,
            updated_at = NOW()
        WHERE id = NEW.kennel_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Moving to different kennel
        IF OLD.kennel_id IS DISTINCT FROM NEW.kennel_id THEN
            IF OLD.kennel_id IS NOT NULL THEN
                UPDATE public.kennels
                SET current_occupancy = GREATEST(0, current_occupancy - 1),
                    current_status = CASE
                        WHEN current_occupancy - 1 = 0 THEN 'available'
                        ELSE current_status
                    END,
                    updated_at = NOW()
                WHERE id = OLD.kennel_id;
            END IF;
            IF NEW.kennel_id IS NOT NULL THEN
                UPDATE public.kennels
                SET current_occupancy = current_occupancy + 1,
                    current_status = CASE
                        WHEN current_occupancy + 1 >= max_occupancy THEN 'occupied'
                        ELSE current_status
                    END,
                    updated_at = NOW()
                WHERE id = NEW.kennel_id;
            END IF;
        END IF;
        -- Discharged/Deceased/Transferred - free up kennel
        IF NEW.status IN ('discharged', 'deceased', 'transferred')
           AND OLD.status NOT IN ('discharged', 'deceased', 'transferred') THEN
            IF NEW.kennel_id IS NOT NULL THEN
                UPDATE public.kennels
                SET current_occupancy = GREATEST(0, current_occupancy - 1),
                    current_status = CASE
                        WHEN current_occupancy - 1 = 0 THEN 'available'
                        ELSE current_status
                    END,
                    updated_at = NOW()
                WHERE id = NEW.kennel_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.update_kennel_status() IS
'Automatically update kennel occupancy and status when hospitalizations change';

DROP TRIGGER IF EXISTS hospitalization_kennel_status ON public.hospitalizations;
CREATE TRIGGER hospitalization_kennel_status
    AFTER INSERT OR UPDATE ON public.hospitalizations
    FOR EACH ROW EXECUTE FUNCTION public.update_kennel_status();

-- =============================================================================
-- DOCUMENT NUMBER GENERATION
-- =============================================================================

-- THREAD-SAFE admission number generation using advisory locks
CREATE OR REPLACE FUNCTION public.generate_admission_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_seq INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Admission numbers don't reset yearly, so we use year = 0
    v_lock_key := hashtext(p_tenant_id || ':admission:0');

    -- Acquire advisory lock
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Upsert with year = 0 to indicate non-yearly sequence
    INSERT INTO public.document_sequences (tenant_id, document_type, year, current_sequence, prefix)
    VALUES (p_tenant_id, 'admission', 0, 1, 'ADM')
    ON CONFLICT (tenant_id, document_type, year)
    DO UPDATE SET
        current_sequence = public.document_sequences.current_sequence + 1,
        updated_at = NOW()
    RETURNING current_sequence INTO v_seq;

    RETURN 'ADM' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_admission_number(TEXT) IS
'Generate unique admission number for a tenant. Format: ADM-NNNNNN (non-yearly sequence)';

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Get current hospitalizations for a tenant
CREATE OR REPLACE FUNCTION public.get_active_hospitalizations(p_tenant_id TEXT)
RETURNS TABLE (
    hospitalization_id UUID,
    admission_number TEXT,
    pet_name TEXT,
    owner_name TEXT,
    owner_phone TEXT,
    kennel_name TEXT,
    status TEXT,
    acuity_level TEXT,
    admitted_at TIMESTAMPTZ,
    expected_discharge TIMESTAMPTZ,
    primary_vet_name TEXT,
    days_hospitalized INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.admission_number,
        p.name,
        pr.full_name,
        pr.phone,
        k.name,
        h.status,
        h.acuity_level,
        h.admitted_at,
        h.expected_discharge,
        vet.full_name,
        (CURRENT_DATE - h.admitted_at::DATE)::INTEGER
    FROM public.hospitalizations h
    JOIN public.pets p ON h.pet_id = p.id
    JOIN public.profiles pr ON p.owner_id = pr.id
    LEFT JOIN public.kennels k ON h.kennel_id = k.id
    LEFT JOIN public.profiles vet ON h.primary_vet_id = vet.id
    WHERE h.tenant_id = p_tenant_id
    AND h.status NOT IN ('discharged', 'deceased', 'transferred')
    AND h.deleted_at IS NULL
    ORDER BY
        CASE h.acuity_level
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            ELSE 4
        END,
        h.admitted_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_active_hospitalizations(TEXT) IS
'Get all active hospitalizations for a tenant with patient and owner details';

-- Get hospitalization summary
CREATE OR REPLACE FUNCTION public.get_hospitalization_summary(p_hospitalization_id UUID)
RETURNS TABLE (
    admission_number TEXT,
    pet_name TEXT,
    days_hospitalized INTEGER,
    total_vitals_recorded INTEGER,
    total_medications_administered INTEGER,
    total_treatments_performed INTEGER,
    total_feedings INTEGER,
    last_vital_recorded_at TIMESTAMPTZ,
    last_medication_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.admission_number,
        p.name,
        (CURRENT_DATE - h.admitted_at::DATE)::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM public.hospitalization_vitals WHERE hospitalization_id = p_hospitalization_id),
        (SELECT COUNT(*)::INTEGER FROM public.hospitalization_medications WHERE hospitalization_id = p_hospitalization_id AND status = 'administered'),
        (SELECT COUNT(*)::INTEGER FROM public.hospitalization_treatments WHERE hospitalization_id = p_hospitalization_id AND status = 'performed'),
        (SELECT COUNT(*)::INTEGER FROM public.hospitalization_feedings WHERE hospitalization_id = p_hospitalization_id AND status = 'completed'),
        (SELECT MAX(recorded_at) FROM public.hospitalization_vitals WHERE hospitalization_id = p_hospitalization_id),
        (SELECT MAX(administered_at) FROM public.hospitalization_medications WHERE hospitalization_id = p_hospitalization_id AND status = 'administered')
    FROM public.hospitalizations h
    JOIN public.pets p ON h.pet_id = p.id
    WHERE h.id = p_hospitalization_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_hospitalization_summary(UUID) IS
'Get summary statistics for a specific hospitalization';

