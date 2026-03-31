-- =============================================================================
-- 038_PET_WEIGHT_HISTORY.SQL
-- =============================================================================
-- Add weight history table for tracking pet weights over time (for growth chart)
-- Both owners and vets can record weights.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pet_weight_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Weight data
    weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 500),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Who recorded it
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Optional notes
    notes TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pet_weight_history IS 'Historical weight records for pets (for growth chart)';
COMMENT ON COLUMN public.pet_weight_history.weight_kg IS 'Weight in kilograms';
COMMENT ON COLUMN public.pet_weight_history.recorded_by IS 'User who recorded the weight (owner or vet)';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.pet_weight_history ENABLE ROW LEVEL SECURITY;

-- Owners can insert and view weights for their own pets
DROP POLICY IF EXISTS "Owners manage own pet weights" ON public.pet_weight_history;
CREATE POLICY "Owners manage own pet weights" ON public.pet_weight_history
    FOR ALL TO authenticated
    USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE pets.id = pet_weight_history.pet_id
            AND pets.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pets
            WHERE pets.id = pet_weight_history.pet_id
            AND pets.owner_id = auth.uid()
        )
    );

-- Staff can manage all weights in their tenant
DROP POLICY IF EXISTS "Staff manage tenant pet weights" ON public.pet_weight_history;
CREATE POLICY "Staff manage tenant pet weights" ON public.pet_weight_history
    FOR ALL TO authenticated
    USING (
        deleted_at IS NULL AND
        public.is_staff_of(tenant_id)
    )
    WITH CHECK (
        public.is_staff_of(tenant_id)
    );

-- Service role full access
DROP POLICY IF EXISTS "Service role full access pet_weight_history" ON public.pet_weight_history;
CREATE POLICY "Service role full access pet_weight_history" ON public.pet_weight_history
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_pet_weight_history_pet ON public.pet_weight_history(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_weight_history_tenant ON public.pet_weight_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pet_weight_history_recorded_at ON public.pet_weight_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_weight_history_active ON public.pet_weight_history(pet_id, recorded_at DESC) WHERE deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS handle_updated_at ON public.pet_weight_history;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.pet_weight_history
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id from pet
DROP TRIGGER IF EXISTS pet_weight_history_auto_tenant ON public.pet_weight_history;
CREATE TRIGGER pet_weight_history_auto_tenant
    BEFORE INSERT ON public.pet_weight_history
    FOR EACH ROW EXECUTE FUNCTION public.clinical_set_tenant_id();

-- =============================================================================
-- FUNCTION: Update pet's current weight when new weight is recorded
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_pet_current_weight()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.pets
    SET weight_kg = NEW.weight_kg,
        updated_at = NOW()
    WHERE id = NEW.pet_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS pet_weight_history_update_current ON public.pet_weight_history;
CREATE TRIGGER pet_weight_history_update_current
    AFTER INSERT ON public.pet_weight_history
    FOR EACH ROW EXECUTE FUNCTION public.update_pet_current_weight();
