-- =============================================================================
-- 033_LOST_FOUND_SIGHTINGS.SQL
-- =============================================================================
-- Enhances the Lost & Found feature with sightings tracking and match suggestions.
--
-- NEW TABLES:
-- 1. pet_sightings - Reports of where a lost pet was seen
-- 2. pet_match_suggestions - AI-suggested matches between lost and found reports
-- =============================================================================

-- =============================================================================
-- PET SIGHTINGS TABLE
-- =============================================================================
-- Allow public to report sightings of lost pets

CREATE TABLE IF NOT EXISTS public.pet_sightings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lost_pet_id UUID NOT NULL REFERENCES public.lost_pets(id) ON DELETE CASCADE,

    -- Reporter info (can be anonymous)
    reporter_name TEXT,
    reporter_email TEXT,
    reporter_phone TEXT,

    -- Sighting details
    sighting_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sighting_location TEXT NOT NULL,
    sighting_lat NUMERIC(10, 7),
    sighting_lng NUMERIC(10, 7),

    -- Description
    description TEXT,
    photo_url TEXT,

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pet_sightings IS 'Public reports of sightings of lost pets';

-- RLS
ALTER TABLE public.pet_sightings ENABLE ROW LEVEL SECURITY;

-- Anyone can report a sighting (insert)
DROP POLICY IF EXISTS "Anyone can report sightings" ON public.pet_sightings;
CREATE POLICY "Anyone can report sightings" ON public.pet_sightings
    FOR INSERT WITH CHECK (true);

-- Anyone can view sightings for lost pets
DROP POLICY IF EXISTS "Public view sightings" ON public.pet_sightings;
CREATE POLICY "Public view sightings" ON public.pet_sightings
    FOR SELECT USING (true);

-- Staff can manage sightings
DROP POLICY IF EXISTS "Staff manage sightings" ON public.pet_sightings;
CREATE POLICY "Staff manage sightings" ON public.pet_sightings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lost_pets lp
            WHERE lp.id = lost_pet_id
            AND public.is_staff_of(lp.tenant_id)
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pet_sightings_lost_pet ON public.pet_sightings(lost_pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_sightings_date ON public.pet_sightings(sighting_date DESC);
CREATE INDEX IF NOT EXISTS idx_pet_sightings_location ON public.pet_sightings(sighting_lat, sighting_lng)
    WHERE sighting_lat IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.pet_sightings;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.pet_sightings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- PET MATCH SUGGESTIONS TABLE
-- =============================================================================
-- Suggested matches between lost reports and found reports based on characteristics

CREATE TABLE IF NOT EXISTS public.pet_match_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The lost pet report
    lost_report_id UUID NOT NULL REFERENCES public.lost_pets(id) ON DELETE CASCADE,

    -- The potentially matching found pet (could be from another clinic/report)
    found_report_id UUID REFERENCES public.lost_pets(id) ON DELETE CASCADE,
    found_pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,

    -- Match scoring
    confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    match_reasons JSONB DEFAULT '[]'::jsonb,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'confirmed', 'rejected')),

    -- Review info
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure we have either found_report_id or found_pet_id
    CONSTRAINT match_has_found CHECK (found_report_id IS NOT NULL OR found_pet_id IS NOT NULL)
);

COMMENT ON TABLE public.pet_match_suggestions IS 'Suggested matches between lost and found pet reports';
COMMENT ON COLUMN public.pet_match_suggestions.confidence_score IS 'Match confidence percentage (0-100)';
COMMENT ON COLUMN public.pet_match_suggestions.match_reasons IS 'JSON array of reasons: breed match, color match, location proximity, etc.';

-- RLS
ALTER TABLE public.pet_match_suggestions ENABLE ROW LEVEL SECURITY;

-- Staff can view and manage match suggestions for their tenant
DROP POLICY IF EXISTS "Staff manage matches" ON public.pet_match_suggestions;
CREATE POLICY "Staff manage matches" ON public.pet_match_suggestions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lost_pets lp
            WHERE lp.id = lost_report_id
            AND public.is_staff_of(lp.tenant_id)
        )
    );

-- Pet owners can view matches for their pets
DROP POLICY IF EXISTS "Owners view matches" ON public.pet_match_suggestions;
CREATE POLICY "Owners view matches" ON public.pet_match_suggestions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lost_pets lp
            JOIN public.pets p ON lp.pet_id = p.id
            WHERE lp.id = lost_report_id
            AND public.is_owner_of_pet(p.id)
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pet_match_lost ON public.pet_match_suggestions(lost_report_id);
CREATE INDEX IF NOT EXISTS idx_pet_match_found ON public.pet_match_suggestions(found_report_id);
CREATE INDEX IF NOT EXISTS idx_pet_match_status ON public.pet_match_suggestions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pet_match_confidence ON public.pet_match_suggestions(confidence_score DESC);

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.pet_match_suggestions;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.pet_match_suggestions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate distance between two coordinates (in km)
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
    lat1 NUMERIC, lng1 NUMERIC,
    lat2 NUMERIC, lng2 NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    R NUMERIC := 6371; -- Earth's radius in km
    dlat NUMERIC;
    dlng NUMERIC;
    a NUMERIC;
    c NUMERIC;
BEGIN
    IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
        RETURN NULL;
    END IF;

    dlat := radians(lat2 - lat1);
    dlng := radians(lng2 - lng1);

    a := sin(dlat/2) * sin(dlat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlng/2) * sin(dlng/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));

    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_distance_km(NUMERIC, NUMERIC, NUMERIC, NUMERIC) IS
'Calculate great-circle distance between two coordinates in kilometers';

-- =============================================================================
-- ANALYZE TABLES
-- =============================================================================
ANALYZE public.pet_sightings;
ANALYZE public.pet_match_suggestions;
