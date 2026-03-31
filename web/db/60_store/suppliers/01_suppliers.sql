-- =============================================================================
-- 01_SUPPLIERS.SQL
-- =============================================================================
-- B2B supplier management for veterinary products and services
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

-- =============================================================================
-- SUPPLIERS (B2B Layer)
-- =============================================================================
-- Suppliers can be GLOBAL (tenant_id NULL) or LOCAL (tenant_id set).
-- Global suppliers are platform-verified and available to all clinics.
-- Local suppliers are clinic-specific additions.

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global (platform-verified), SET = Local (clinic-specific)
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Supplier info
    name TEXT NOT NULL,
    legal_name TEXT,                              -- Razón social
    tax_id TEXT,                                  -- RUC (Paraguay)

    -- Contact
    contact_info JSONB DEFAULT '{}'::JSONB,       -- {phone, email, address, contact_person}
    website TEXT,

    -- Classification
    supplier_type TEXT DEFAULT 'products'
        CHECK (supplier_type IN ('products', 'services', 'both')),

    -- B2B specific
    is_platform_provider BOOLEAN DEFAULT false,   -- TRUE = This is US (The Aggregator)
    minimum_order_amount NUMERIC(12,2),
    payment_terms TEXT,                           -- "30 días", "Contado"
    delivery_time_days INTEGER,

    -- Verification
    verification_status TEXT DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.suppliers IS 'Product suppliers. NULL tenant_id = global platform-verified, SET = local clinic-specific';
COMMENT ON COLUMN public.suppliers.tenant_id IS 'NULL for global (platform-verified) suppliers, SET for local (clinic-specific)';
COMMENT ON COLUMN public.suppliers.is_platform_provider IS 'TRUE if this is the platform aggregator (us)';
COMMENT ON COLUMN public.suppliers.verification_status IS 'Verification status: pending, verified, rejected';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON public.suppliers(supplier_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_verification ON public.suppliers(verification_status);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_platform_provider ON public.suppliers(is_platform_provider) WHERE is_platform_provider = true;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access suppliers" ON public.suppliers;
CREATE POLICY "Service role full access suppliers" ON public.suppliers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can view suppliers (global + their clinic's local)
DROP POLICY IF EXISTS "Authenticated users view suppliers" ON public.suppliers;
CREATE POLICY "Authenticated users view suppliers" ON public.suppliers
    FOR SELECT TO authenticated
    USING (
        -- Global suppliers (available to all)
        tenant_id IS NULL
        -- OR clinic-specific suppliers for their clinic
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = suppliers.tenant_id
            AND p.deleted_at IS NULL
        )
    );

-- Clinic staff can manage their clinic's suppliers
DROP POLICY IF EXISTS "Clinic staff manage suppliers" ON public.suppliers;
CREATE POLICY "Clinic staff manage suppliers" ON public.suppliers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = suppliers.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = suppliers.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Platform admins can manage global suppliers
DROP POLICY IF EXISTS "Platform admins manage global suppliers" ON public.suppliers;
CREATE POLICY "Platform admins manage global suppliers" ON public.suppliers
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
DROP TRIGGER IF EXISTS handle_updated_at_suppliers ON public.suppliers;
CREATE TRIGGER handle_updated_at_suppliers
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
