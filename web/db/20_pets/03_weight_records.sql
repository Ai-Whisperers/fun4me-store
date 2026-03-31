-- Pet Weight Records
-- Tracks historical weight measurements for growth curve analysis
-- =============================================================================

-- Table: pet_weight_records
-- Stores individual weight measurements over time for each pet
CREATE TABLE IF NOT EXISTS pet_weight_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),

    -- Weight measurement
    weight_kg NUMERIC(6,2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Who recorded the weight
    recorded_by UUID REFERENCES profiles(id),

    -- Context
    record_type TEXT DEFAULT 'checkup' CHECK (record_type IN ('checkup', 'vaccination', 'surgery', 'hospitalization', 'grooming', 'other')),
    notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT weight_records_weight_positive CHECK (weight_kg > 0),
    CONSTRAINT weight_records_date_not_future CHECK (recorded_at <= NOW() + INTERVAL '1 day')
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_weight_records_pet_id ON pet_weight_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_pet_date ON pet_weight_records(pet_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_weight_records_tenant ON pet_weight_records(tenant_id);

-- Trigger for updated_at
CREATE TRIGGER handle_pet_weight_records_updated_at
    BEFORE UPDATE ON pet_weight_records
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE pet_weight_records ENABLE ROW LEVEL SECURITY;

-- Pet owners can view weight records for their own pets
CREATE POLICY "Owners view own pet weight records" ON pet_weight_records
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = pet_weight_records.pet_id
            AND pets.owner_id = auth.uid()
        )
    );

-- Staff can view all weight records in their clinic
CREATE POLICY "Staff view clinic weight records" ON pet_weight_records
    FOR SELECT
    USING (is_staff_of(tenant_id));

-- Staff can insert weight records for their clinic
CREATE POLICY "Staff insert weight records" ON pet_weight_records
    FOR INSERT
    WITH CHECK (is_staff_of(tenant_id));

-- Staff can update weight records for their clinic
CREATE POLICY "Staff update weight records" ON pet_weight_records
    FOR UPDATE
    USING (is_staff_of(tenant_id))
    WITH CHECK (is_staff_of(tenant_id));

-- Staff can delete weight records for their clinic
CREATE POLICY "Staff delete weight records" ON pet_weight_records
    FOR DELETE
    USING (is_staff_of(tenant_id));

-- Service role full access for seeding
CREATE POLICY "Service role full access to weight records" ON pet_weight_records
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get weight history for a pet
CREATE OR REPLACE FUNCTION get_pet_weight_history(p_pet_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    weight_kg NUMERIC(6,2),
    recorded_at TIMESTAMPTZ,
    age_weeks INTEGER,
    record_type TEXT,
    notes TEXT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        pwr.weight_kg,
        pwr.recorded_at,
        EXTRACT(WEEK FROM AGE(pwr.recorded_at, p.birth_date))::INTEGER as age_weeks,
        pwr.record_type,
        pwr.notes
    FROM pet_weight_records pwr
    JOIN pets p ON p.id = pwr.pet_id
    WHERE pwr.pet_id = p_pet_id
    ORDER BY pwr.recorded_at DESC
    LIMIT p_limit;
$$;

-- Function to calculate growth percentile for a pet based on latest weight
CREATE OR REPLACE FUNCTION get_pet_growth_percentile(p_pet_id UUID)
RETURNS TABLE (
    current_weight NUMERIC(6,2),
    expected_weight NUMERIC(6,2),
    age_weeks INTEGER,
    percentile_position TEXT,
    breed_category TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_pet RECORD;
    v_age_weeks INTEGER;
    v_breed_category TEXT;
BEGIN
    -- Get pet details
    SELECT * INTO v_pet FROM pets WHERE id = p_pet_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Calculate age in weeks
    v_age_weeks := EXTRACT(WEEK FROM AGE(NOW(), v_pet.birth_date))::INTEGER;

    -- Determine breed category (simplified mapping)
    v_breed_category := CASE
        WHEN v_pet.species = 'cat' THEN
            CASE WHEN v_pet.breed IN ('Maine Coon', 'Ragdoll', 'Norwegian Forest') THEN 'cat_large' ELSE 'cat_standard' END
        WHEN v_pet.species = 'dog' THEN
            CASE
                WHEN v_pet.breed IN ('Chihuahua', 'Yorkshire Terrier', 'Pomeranian', 'Maltese') THEN 'toy'
                WHEN v_pet.breed IN ('Beagle', 'Cocker Spaniel', 'Shih Tzu', 'Poodle', 'French Bulldog') THEN 'small'
                WHEN v_pet.breed IN ('Bulldog Inglés', 'Boxer', 'Border Collie', 'Australian Shepherd') THEN 'medium'
                WHEN v_pet.breed IN ('Labrador Retriever', 'Golden Retriever', 'Pastor Alemán', 'Rottweiler', 'Doberman') THEN 'large'
                WHEN v_pet.breed IN ('Great Dane', 'Saint Bernard', 'Mastiff', 'Irish Wolfhound') THEN 'giant'
                ELSE 'medium'
            END
        ELSE 'medium'
    END;

    RETURN QUERY
    SELECT
        v_pet.weight_kg as current_weight,
        gs.weight_kg as expected_weight,
        v_age_weeks as age_weeks,
        CASE
            WHEN v_pet.weight_kg > gs.weight_kg * 1.2 THEN 'above_normal'
            WHEN v_pet.weight_kg < gs.weight_kg * 0.8 THEN 'below_normal'
            ELSE 'normal'
        END as percentile_position,
        v_breed_category as breed_category
    FROM growth_standards gs
    WHERE gs.species = v_pet.species
      AND gs.breed_category = v_breed_category
      AND gs.gender = v_pet.sex
      AND gs.age_weeks = (
          SELECT MAX(age_weeks)
          FROM growth_standards
          WHERE species = v_pet.species
            AND breed_category = v_breed_category
            AND gender = v_pet.sex
            AND age_weeks <= v_age_weeks
      )
    LIMIT 1;
END;
$$;

-- Add comment
COMMENT ON TABLE pet_weight_records IS 'Historical weight measurements for pets - enables growth curve tracking and analysis';
