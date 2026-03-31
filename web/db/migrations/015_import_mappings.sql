-- =============================================================================
-- 015_IMPORT_MAPPINGS.SQL
-- =============================================================================
-- Store saved column mappings for inventory imports
-- Allows clinics to save and reuse their Excel/CSV column configurations
--
-- DEPENDENCIES: 60_store/01_schema.sql (store tables)
-- =============================================================================

-- =============================================================================
-- IMPORT MAPPINGS TABLE
-- =============================================================================
-- Stores saved column mapping configurations for repeat imports
CREATE TABLE IF NOT EXISTS public.store_import_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    mapping JSONB NOT NULL,
    -- Track usage for ordering by most used
    usage_count INT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),

    -- Ensure unique names per tenant
    CONSTRAINT unique_mapping_name_per_tenant UNIQUE (tenant_id, name)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_import_mappings_tenant
    ON public.store_import_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_import_mappings_usage
    ON public.store_import_mappings(tenant_id, usage_count DESC, last_used_at DESC NULLS LAST);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.store_import_mappings ENABLE ROW LEVEL SECURITY;

-- Staff can manage mappings for their clinic
DROP POLICY IF EXISTS "Staff manage import mappings" ON public.store_import_mappings;
CREATE POLICY "Staff manage import mappings" ON public.store_import_mappings
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access import mappings" ON public.store_import_mappings;
CREATE POLICY "Service role full access import mappings" ON public.store_import_mappings
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
DROP TRIGGER IF EXISTS handle_updated_at ON public.store_import_mappings;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_import_mappings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE public.store_import_mappings IS
    'Saved column mapping configurations for inventory bulk imports. Created in migration 015.';
COMMENT ON COLUMN public.store_import_mappings.mapping IS
    'JSONB object mapping source columns to target fields, e.g., {"A": "sku", "B": "name", "C": "price"}';
COMMENT ON COLUMN public.store_import_mappings.usage_count IS
    'Number of times this mapping has been used, for sorting by popularity';
