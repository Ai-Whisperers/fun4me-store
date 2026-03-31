-- =============================================================================
-- 01_PRODUCTS.SQL
-- =============================================================================
-- Product catalog with dual-unit inventory system
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/categories/01_categories.sql, 60_store/brands/01_brands.sql,
--               60_store/suppliers/01_suppliers.sql
-- =============================================================================

-- =============================================================================
-- STORE PRODUCTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global catalog product, SET = Local clinic product
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Classification
    category_id UUID REFERENCES public.store_categories(id),
    brand_id UUID REFERENCES public.store_brands(id),

    -- Identification
    sku TEXT,
    barcode TEXT,

    -- Product info
    name TEXT NOT NULL,
    description TEXT,
    short_description TEXT,

    -- ==========================================================================
    -- DUAL-UNIT INVENTORY (B2B Layer)
    -- ==========================================================================
    -- Example: Buy "Caja" of 100 pills, sell by "Tableta"
    -- purchase_unit = 'Caja', sale_unit = 'Tableta', conversion_factor = 100
    -- unit_cost = price_per_box / 100 = cost per pill
    -- ==========================================================================

    -- Unit of PURCHASE (how you buy from supplier)
    purchase_unit TEXT DEFAULT 'Unidad'
        CHECK (purchase_unit IN (
            'Unidad', 'Caja', 'Pack', 'Bolsa', 'Frasco', 'Bulto',
            'Display', 'Blister', 'Paquete', 'Kg', 'L'
        )),

    -- Unit of SALE (how you sell to customers)
    sale_unit TEXT DEFAULT 'Unidad'
        CHECK (sale_unit IN (
            'Unidad', 'Tableta', 'Ampolla', 'Cápsula', 'Comprimido',
            'ml', 'g', 'Kg', 'Dosis', 'Aplicación',
            'Bolsa', 'Frasco', 'Caja', 'Sobre', 'Pipeta'
        )),

    -- Conversion: 1 purchase_unit = N sale_units
    conversion_factor NUMERIC(12,4) DEFAULT 1 CHECK (conversion_factor > 0),

    -- Pricing
    -- purchase_price: What you pay per purchase_unit (Box price)
    purchase_price NUMERIC(12,2) CHECK (purchase_price IS NULL OR purchase_price >= 0),

    -- unit_cost: Computed cost per sale_unit = purchase_price / conversion_factor
    -- This is STORED for performance (updated via trigger)
    unit_cost NUMERIC(12,4) GENERATED ALWAYS AS (
        CASE WHEN purchase_price IS NOT NULL AND conversion_factor > 0
             THEN purchase_price / conversion_factor
             ELSE NULL
        END
    ) STORED,

    -- base_price: Selling price per sale_unit (what customer pays)
    base_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),

    -- sale_price: Promotional price per sale_unit (optional)
    sale_price NUMERIC(12,2) CHECK (sale_price IS NULL OR sale_price >= 0),

    -- cost_price: Legacy field, prefer unit_cost
    cost_price NUMERIC(12,2) CHECK (cost_price IS NULL OR cost_price >= 0),

    -- Supplier relationship
    default_supplier_id UUID REFERENCES public.suppliers(id),

    -- Media
    image_url TEXT,
    images TEXT[] DEFAULT '{}',

    -- Attributes
    weight_grams NUMERIC(10,2),
    dimensions JSONB,  -- {length, width, height, unit}
    attributes JSONB DEFAULT '{}',  -- {color, size, concentration, etc.}

    -- Species/targeting
    target_species TEXT[],

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    requires_prescription BOOLEAN DEFAULT false,

    -- Display
    display_order INTEGER DEFAULT 100,

    -- ==========================================================================
    -- GLOBAL CATALOG FLAGS (B2B Layer)
    -- ==========================================================================
    is_global_catalog BOOLEAN DEFAULT false,      -- TRUE = Platform-verified product
    created_by_tenant_id TEXT REFERENCES public.tenants(id), -- Original creator
    verification_status TEXT DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected', 'needs_review')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id),

    -- SEO
    meta_title TEXT,
    meta_description TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_products IS 'Product catalog. NULL tenant_id = global catalog, SET = local clinic product. Supports dual-unit inventory.';
COMMENT ON COLUMN public.store_products.purchase_unit IS 'Unit for purchasing from supplier (e.g., Caja, Bulto)';
COMMENT ON COLUMN public.store_products.sale_unit IS 'Unit for selling to customer (e.g., Tableta, Unidad)';
COMMENT ON COLUMN public.store_products.conversion_factor IS '1 purchase_unit = N sale_units (e.g., 1 Caja = 100 Tabletas)';
COMMENT ON COLUMN public.store_products.purchase_price IS 'Price per purchase_unit (what you pay supplier)';
COMMENT ON COLUMN public.store_products.unit_cost IS 'Computed cost per sale_unit = purchase_price / conversion_factor';
COMMENT ON COLUMN public.store_products.base_price IS 'Selling price per sale_unit';
COMMENT ON COLUMN public.store_products.is_global_catalog IS 'TRUE for platform-verified global catalog products';

-- Unique constraint: global products have unique SKUs, local products unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_products_global_sku
    ON public.store_products(sku) WHERE tenant_id IS NULL AND sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_products_tenant_sku
    ON public.store_products(tenant_id, sku) WHERE tenant_id IS NOT NULL AND sku IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_store_products_category ON public.store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_brand ON public.store_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_store_products_supplier ON public.store_products(default_supplier_id);
CREATE INDEX IF NOT EXISTS idx_store_products_tenant ON public.store_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_products_featured ON public.store_products(is_featured)
    WHERE is_featured = true AND is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_products_prescription ON public.store_products(requires_prescription)
    WHERE requires_prescription = true;
CREATE INDEX IF NOT EXISTS idx_store_products_global_catalog ON public.store_products(is_global_catalog)
    WHERE is_global_catalog = true;
CREATE INDEX IF NOT EXISTS idx_store_products_verification ON public.store_products(verification_status);
CREATE INDEX IF NOT EXISTS idx_store_products_active ON public.store_products(tenant_id, is_active, deleted_at)
    INCLUDE (name, base_price, sale_price, image_url, is_featured);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_store_products_search ON public.store_products
    USING gin(to_tsvector('spanish', name || ' ' || coalesce(description, '')))
    WHERE deleted_at IS NULL;

-- Species targeting index (for filtering)
CREATE INDEX IF NOT EXISTS idx_store_products_species ON public.store_products
    USING gin(target_species) WHERE target_species IS NOT NULL;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access products" ON public.store_products;
CREATE POLICY "Service role full access products" ON public.store_products
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read active global catalog products (for store browsing without auth)
DROP POLICY IF EXISTS "Public read products" ON public.store_products;
CREATE POLICY "Public read products" ON public.store_products
    FOR SELECT
    USING (
        is_active = true
        AND deleted_at IS NULL
        AND tenant_id IS NULL  -- Only global catalog
    );

-- Authenticated users can view products
DROP POLICY IF EXISTS "Authenticated users view products" ON public.store_products;
CREATE POLICY "Authenticated users view products" ON public.store_products
    FOR SELECT TO authenticated
    USING (
        -- Global catalog products (available to all)
        tenant_id IS NULL
        -- OR clinic-specific products for their clinic
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_products.tenant_id
            AND p.deleted_at IS NULL
        )
    );

-- Clinic staff can manage their clinic's products
DROP POLICY IF EXISTS "Clinic staff manage products" ON public.store_products;
CREATE POLICY "Clinic staff manage products" ON public.store_products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_products.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_products.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Platform admins can manage global catalog products
DROP POLICY IF EXISTS "Platform admins manage global products" ON public.store_products;
CREATE POLICY "Platform admins manage global products" ON public.store_products
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
DROP TRIGGER IF EXISTS handle_updated_at_products ON public.store_products;
CREATE TRIGGER handle_updated_at_products
    BEFORE UPDATE ON public.store_products
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
