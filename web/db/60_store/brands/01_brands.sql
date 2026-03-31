-- =============================================================================
-- 01_BRANDS.SQL
-- =============================================================================
-- Product brand management for veterinary store
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

-- =============================================================================
-- STORE BRANDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global (platform-wide), SET = Local (clinic-specific)
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Brand info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    country_origin TEXT,                          -- País de origen

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Global catalog flags
    is_global_catalog BOOLEAN DEFAULT false,      -- TRUE = Platform-verified brand
    created_by_tenant_id TEXT REFERENCES public.tenants(id),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_brands IS 'Product brands. NULL tenant_id = global platform brand, SET = local clinic-specific';
COMMENT ON COLUMN public.store_brands.is_global_catalog IS 'TRUE for platform-verified brands';

-- Unique constraint: global brands have unique slugs, local brands unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_brands_global_slug
    ON public.store_brands(slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_brands_tenant_slug
    ON public.store_brands(tenant_id, slug) WHERE tenant_id IS NOT NULL;

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_store_brands_tenant_active ON public.store_brands(tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_brands_global_catalog ON public.store_brands(is_global_catalog) WHERE is_global_catalog = true;
CREATE INDEX IF NOT EXISTS idx_store_brands_country ON public.store_brands(country_origin);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_brands ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access brands" ON public.store_brands;
CREATE POLICY "Service role full access brands" ON public.store_brands
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read active global brands (for store browsing without auth)
DROP POLICY IF EXISTS "Public read brands" ON public.store_brands;
CREATE POLICY "Public read brands" ON public.store_brands
    FOR SELECT
    USING (
        is_active = true
        AND deleted_at IS NULL
        AND tenant_id IS NULL  -- Only global brands
    );

-- Authenticated users can view brands
DROP POLICY IF EXISTS "Authenticated users view brands" ON public.store_brands;
CREATE POLICY "Authenticated users view brands" ON public.store_brands
    FOR SELECT TO authenticated
    USING (
        -- Global brands (available to all)
        tenant_id IS NULL
        -- OR clinic-specific brands for their clinic
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_brands.tenant_id
            AND p.deleted_at IS NULL
        )
    );

-- Clinic staff can manage their clinic's brands
DROP POLICY IF EXISTS "Clinic staff manage brands" ON public.store_brands;
CREATE POLICY "Clinic staff manage brands" ON public.store_brands
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_brands.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_brands.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Platform admins can manage global brands
DROP POLICY IF EXISTS "Platform admins manage global brands" ON public.store_brands;
CREATE POLICY "Platform admins manage global brands" ON public.store_brands
    FOR ALL TO authenticated
    USING (
        tenant_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        tenant_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.tenant_id IS NULL
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger
DROP TRIGGER IF EXISTS handle_updated_at_brands ON public.store_brands;
CREATE TRIGGER handle_updated_at_brands
    BEFORE UPDATE ON public.store_brands
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
