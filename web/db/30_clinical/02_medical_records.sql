-- =============================================================================
-- 02_MEDICAL_RECORDS.SQL
-- =============================================================================
-- Medical records and prescriptions for veterinary patients.
--
-- DEPENDENCIES: 10_core/*, 20_pets/01_pets.sql, 30_clinical/01_reference_data.sql
-- =============================================================================

-- =============================================================================
-- MEDICAL RECORDS
-- =============================================================================
-- Core medical records for all patient encounters.

CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vet_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Record type
    record_type TEXT NOT NULL CHECK (record_type IN (
        'consultation', 'surgery', 'emergency', 'vaccination', 'checkup',
        'dental', 'grooming', 'lab_result', 'imaging', 'follow_up', 'other'
    )),

    -- Visit info
    visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chief_complaint TEXT,
    history TEXT,
    physical_exam TEXT,  -- Physical examination findings

    -- Vitals
    weight_kg NUMERIC(6,2) CHECK (weight_kg IS NULL OR weight_kg > 0),
    temperature_celsius NUMERIC(4,1) CHECK (temperature_celsius IS NULL OR (temperature_celsius >= 30 AND temperature_celsius <= 45)),
    heart_rate_bpm INTEGER CHECK (heart_rate_bpm IS NULL OR (heart_rate_bpm >= 20 AND heart_rate_bpm <= 400)),
    respiratory_rate_rpm INTEGER CHECK (respiratory_rate_rpm IS NULL OR (respiratory_rate_rpm >= 5 AND respiratory_rate_rpm <= 150)),
    blood_pressure TEXT,
    body_condition_score INTEGER CHECK (body_condition_score IS NULL OR (body_condition_score >= 1 AND body_condition_score <= 9)),

    -- Assessment
    diagnosis_code TEXT,
    diagnosis_text TEXT,
    assessment TEXT,  -- Assessment/Diagnosis summary
    clinical_notes TEXT,

    -- Plan
    treatment_plan TEXT,
    medications_prescribed TEXT,
    followup_date DATE,
    follow_up_notes TEXT,

    -- Emergency and follow-up flags
    is_emergency BOOLEAN DEFAULT false,
    requires_followup BOOLEAN DEFAULT false,

    -- Additional notes
    notes TEXT,

    -- Attachments
    attachments TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT medical_records_visit_not_future CHECK (visit_date <= NOW() + INTERVAL '1 day')
);

COMMENT ON TABLE public.medical_records IS 'Core medical records for all patient encounters (consultations, surgeries, etc.)';
COMMENT ON COLUMN public.medical_records.record_type IS 'Type of visit: consultation, surgery, emergency, vaccination, checkup, etc.';
COMMENT ON COLUMN public.medical_records.body_condition_score IS 'BCS on 1-9 scale: 1-3 underweight, 4-5 ideal, 6-9 overweight';
COMMENT ON COLUMN public.medical_records.diagnosis_code IS 'Reference to diagnosis_codes.code (VeNom/SNOMED)';

-- =============================================================================
-- PRESCRIPTIONS
-- =============================================================================
-- Digital prescriptions with medication details and signatures.

CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vet_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,

    -- Prescription number
    prescription_number TEXT NOT NULL,

    -- Dates
    prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,

    -- Medications (JSONB array)
    -- Structure: [{"name": "...", "dose": "...", "frequency": "...", "duration": "...", "instructions": "..."}]
    medications JSONB NOT NULL DEFAULT '[]',

    -- Signature
    signature_url TEXT,
    signed_at TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'dispensed', 'expired', 'cancelled')),

    -- PDF
    pdf_url TEXT,

    -- Notes
    notes TEXT,
    pharmacist_notes TEXT,
    dispensing_notes TEXT,

    -- Dispensing info
    dispensed_at TIMESTAMPTZ,
    dispensed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, prescription_number),
    CONSTRAINT prescriptions_valid_until_after_prescribed CHECK (
        valid_until IS NULL OR valid_until >= prescribed_date
    ),
    CONSTRAINT prescriptions_medications_is_array CHECK (
        jsonb_typeof(medications) = 'array'
    )
);

COMMENT ON TABLE public.prescriptions IS 'Digital veterinary prescriptions with medication details';
COMMENT ON COLUMN public.prescriptions.medications IS 'JSON array of medications with dose, frequency, duration, instructions';
COMMENT ON COLUMN public.prescriptions.status IS 'draft: being written, active: ready to dispense, dispensed: filled, expired: past valid_until, cancelled: voided';
COMMENT ON COLUMN public.prescriptions.signature_url IS 'URL to veterinarian digital signature image';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Medical records: Staff manage, owners view
DROP POLICY IF EXISTS "Staff manage medical records" ON public.medical_records;
CREATE POLICY "Staff manage medical records" ON public.medical_records
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet records" ON public.medical_records;
CREATE POLICY "Owners view pet records" ON public.medical_records
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access records" ON public.medical_records;
CREATE POLICY "Service role full access records" ON public.medical_records
    FOR ALL TO service_role USING (true);

-- Prescriptions: Staff manage, owners view
DROP POLICY IF EXISTS "Staff manage prescriptions" ON public.prescriptions;
CREATE POLICY "Staff manage prescriptions" ON public.prescriptions
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet prescriptions" ON public.prescriptions;
CREATE POLICY "Owners view pet prescriptions" ON public.prescriptions
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access prescriptions" ON public.prescriptions;
CREATE POLICY "Service role full access prescriptions" ON public.prescriptions
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Medical records
CREATE INDEX IF NOT EXISTS idx_medical_records_pet ON public.medical_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_tenant ON public.medical_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_vet ON public.medical_records(vet_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON public.medical_records(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON public.medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_medical_records_diagnosis ON public.medical_records(diagnosis_code);
CREATE INDEX IF NOT EXISTS idx_medical_records_active ON public.medical_records(tenant_id, deleted_at)
    WHERE deleted_at IS NULL;

-- Pet medical history (covering index)
CREATE INDEX IF NOT EXISTS idx_medical_records_pet_history ON public.medical_records(pet_id, visit_date DESC)
    INCLUDE (record_type, diagnosis_text, vet_id, weight_kg)
    WHERE deleted_at IS NULL;

-- Prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_pet ON public.prescriptions(pet_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant ON public.prescriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_vet ON public.prescriptions(vet_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_medical_record ON public.prescriptions(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON public.prescriptions(prescribed_date DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prescriptions_number ON public.prescriptions(prescription_number);
CREATE INDEX IF NOT EXISTS idx_prescriptions_dispensed_by ON public.prescriptions(dispensed_by);

-- Active prescriptions for a pet (covering index)
CREATE INDEX IF NOT EXISTS idx_prescriptions_pet_active ON public.prescriptions(pet_id, prescribed_date DESC)
    INCLUDE (prescription_number, status, valid_until, vet_id)
    WHERE deleted_at IS NULL AND status IN ('active', 'dispensed');

-- GIN index for JSONB medications (efficient medication searches)
CREATE INDEX IF NOT EXISTS idx_prescriptions_medications_gin ON public.prescriptions USING gin(medications jsonb_path_ops)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.medical_records;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.prescriptions;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id from pet
DROP TRIGGER IF EXISTS medical_records_auto_tenant ON public.medical_records;
CREATE TRIGGER medical_records_auto_tenant
    BEFORE INSERT ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.clinical_set_tenant_id();

DROP TRIGGER IF EXISTS prescriptions_auto_tenant ON public.prescriptions;
CREATE TRIGGER prescriptions_auto_tenant
    BEFORE INSERT ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION public.clinical_set_tenant_id();

-- Auto-expire prescriptions trigger
CREATE OR REPLACE FUNCTION public.auto_expire_prescription()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.valid_until IS NOT NULL AND NEW.valid_until < CURRENT_DATE AND NEW.status = 'active' THEN
        NEW.status := 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.auto_expire_prescription() IS 'Automatically set prescription status to expired when past valid_until date';

DROP TRIGGER IF EXISTS prescription_auto_expire ON public.prescriptions;
CREATE TRIGGER prescription_auto_expire
    BEFORE UPDATE ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION public.auto_expire_prescription();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate prescription number (thread-safe)
CREATE OR REPLACE FUNCTION public.generate_prescription_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'prescription', 'RX');
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_prescription_number(TEXT) IS
'Generate unique prescription number for a tenant. Format: RX-YYYY-NNNNNN';

-- Get pet medical summary
CREATE OR REPLACE FUNCTION public.get_pet_medical_summary(p_pet_id UUID)
RETURNS TABLE (
    total_visits INTEGER,
    last_visit_date TIMESTAMPTZ,
    last_weight_kg NUMERIC,
    last_diagnosis TEXT,
    active_prescriptions INTEGER,
    chronic_conditions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM public.medical_records WHERE pet_id = p_pet_id AND deleted_at IS NULL),
        (SELECT MAX(visit_date) FROM public.medical_records WHERE pet_id = p_pet_id AND deleted_at IS NULL),
        (SELECT weight_kg FROM public.medical_records WHERE pet_id = p_pet_id AND weight_kg IS NOT NULL AND deleted_at IS NULL ORDER BY visit_date DESC LIMIT 1),
        (SELECT diagnosis_text FROM public.medical_records WHERE pet_id = p_pet_id AND diagnosis_text IS NOT NULL AND deleted_at IS NULL ORDER BY visit_date DESC LIMIT 1),
        (SELECT COUNT(*)::INTEGER FROM public.prescriptions WHERE pet_id = p_pet_id AND status = 'active' AND deleted_at IS NULL),
        (SELECT p.chronic_conditions FROM public.pets p WHERE p.id = p_pet_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_medical_summary(UUID) IS
'Get summary of pet medical history including visit count, last weight, active prescriptions';

-- Get recent records for a pet
CREATE OR REPLACE FUNCTION public.get_pet_recent_records(
    p_pet_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    record_id UUID,
    record_type TEXT,
    visit_date TIMESTAMPTZ,
    diagnosis_text TEXT,
    vet_name TEXT,
    weight_kg NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mr.id,
        mr.record_type,
        mr.visit_date,
        mr.diagnosis_text,
        pr.full_name,
        mr.weight_kg
    FROM public.medical_records mr
    LEFT JOIN public.profiles pr ON mr.vet_id = pr.id
    WHERE mr.pet_id = p_pet_id
    AND mr.deleted_at IS NULL
    ORDER BY mr.visit_date DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pet_recent_records(UUID, INTEGER) IS
'Get recent medical records for a pet with vet information';

