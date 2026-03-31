-- =============================================================================
-- 01_CATEGORIES.SQL
-- =============================================================================
-- Product category hierarchy for veterinary store
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

-- =============================================================================
-- STORE CATEGORIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global (platform-wide), SET = Local (clinic-specific)
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Category info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.store_categories(id),

    -- Hierarchy level (1 = top, 2 = sub, 3 = detail, 4 = granular, 5 = micro)
    level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 5),

    -- Media
    image_url TEXT,

    -- Display
    display_order INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,

    -- Global catalog flags
    is_global_catalog BOOLEAN DEFAULT false,      -- TRUE = Platform-verified category
    created_by_tenant_id TEXT REFERENCES public.tenants(id), -- Who created it originally

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_categories IS 'Product categories. NULL tenant_id = global platform category, SET = local clinic-specific';
COMMENT ON COLUMN public.store_categories.level IS 'Hierarchy level: 1=top, 2=sub, 3=detail, 4=granular, 5=micro';
COMMENT ON COLUMN public.store_categories.is_global_catalog IS 'TRUE for platform-verified categories';

-- Unique constraint: global categories have unique slugs, local categories unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_categories_global_slug
    ON public.store_categories(slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_categories_tenant_slug
    ON public.store_categories(tenant_id, slug) WHERE tenant_id IS NOT NULL;

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_store_categories_parent ON public.store_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_level ON public.store_categories(level);
CREATE INDEX IF NOT EXISTS idx_store_categories_tenant_active ON public.store_categories(tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_categories_global_catalog ON public.store_categories(is_global_catalog) WHERE is_global_catalog = true;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access categories" ON public.store_categories;
CREATE POLICY "Service role full access categories" ON public.store_categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read active global categories (for store browsing without auth)
DROP POLICY IF EXISTS "Public read categories" ON public.store_categories;
CREATE POLICY "Public read categories" ON public.store_categories
    FOR SELECT
    USING (
        is_active = true
        AND deleted_at IS NULL
        AND tenant_id IS NULL  -- Only global categories
    );

-- Authenticated users can view categories
DROP POLICY IF EXISTS "Authenticated users view categories" ON public.store_categories;
CREATE POLICY "Authenticated users view categories" ON public.store_categories
    FOR SELECT TO authenticated
    USING (
        -- Global categories (available to all)
        tenant_id IS NULL
        -- OR clinic-specific categories for their clinic
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_categories.tenant_id
            AND p.deleted_at IS NULL
        )
    );

-- Clinic staff can manage their clinic's categories
DROP POLICY IF EXISTS "Clinic staff manage categories" ON public.store_categories;
CREATE POLICY "Clinic staff manage categories" ON public.store_categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_categories.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_categories.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Platform admins can manage global categories
DROP POLICY IF EXISTS "Platform admins manage global categories" ON public.store_categories;
CREATE POLICY "Platform admins manage global categories" ON public.store_categories
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
DROP TRIGGER IF EXISTS handle_updated_at_categories ON public.store_categories;
CREATE TRIGGER handle_updated_at_categories
    BEFORE UPDATE ON public.store_categories
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
