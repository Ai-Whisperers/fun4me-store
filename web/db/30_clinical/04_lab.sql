-- =============================================================================
-- 04_LAB.SQL
-- =============================================================================
-- Laboratory management: test catalog, panels, orders, results, attachments.
-- ALL CHILD TABLES INCLUDE tenant_id FOR OPTIMIZED RLS (avoids joins to parent).
--
-- DEPENDENCIES: 10_core/*, 20_pets/01_pets.sql, 30_clinical/02_medical_records.sql
-- =============================================================================

-- =============================================================================
-- LAB TEST CATALOG
-- =============================================================================
-- Available laboratory tests (global or tenant-specific).

CREATE TABLE IF NOT EXISTS public.lab_test_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,  -- NULL = global test

    -- Test info
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,

    -- Pricing
    base_price NUMERIC(12,2) DEFAULT 0 CHECK (base_price >= 0),

    -- Reference ranges (JSON for flexibility by species)
    -- Structure: {"dog": {"min": 5, "max": 15, "unit": "mg/dL"}, "cat": {...}}
    reference_ranges JSONB DEFAULT '{}',

    -- Settings
    turnaround_days INTEGER DEFAULT 1 CHECK (turnaround_days > 0),
    requires_fasting BOOLEAN DEFAULT false,
    sample_type TEXT CHECK (sample_type IS NULL OR sample_type IN (
        'blood', 'serum', 'plasma', 'urine', 'feces', 'tissue', 'swab',
        'citrated_blood', 'edta_blood', 'aspirate', 'biopsy', 'skin', 'hair', 'other'
    )),
    sample_volume_ml NUMERIC(6,2) CHECK (sample_volume_ml IS NULL OR sample_volume_ml > 0),
    special_instructions TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 100,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, code),
    CONSTRAINT lab_test_catalog_name_length CHECK (char_length(name) >= 2),
    CONSTRAINT lab_test_catalog_code_length CHECK (char_length(code) >= 2)
);

COMMENT ON TABLE public.lab_test_catalog IS 'Available laboratory tests. NULL tenant_id = global test available to all clinics.';
COMMENT ON COLUMN public.lab_test_catalog.reference_ranges IS 'Species-specific reference ranges as JSON: {"dog": {"min": 5, "max": 15, "unit": "mg/dL"}}';
COMMENT ON COLUMN public.lab_test_catalog.sample_type IS 'Required sample type: blood, serum, plasma, urine, feces, tissue, swab, etc.';

-- Unique for global tests
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_test_catalog_global_code
ON public.lab_test_catalog (code) WHERE tenant_id IS NULL AND deleted_at IS NULL;

-- =============================================================================
-- LAB PANELS (Test Groups)
-- =============================================================================
-- Pre-defined groups of tests that are commonly ordered together.

CREATE TABLE IF NOT EXISTS public.lab_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Panel info
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Tests included (array of test IDs)
    test_ids UUID[] NOT NULL DEFAULT '{}',

    -- Pricing
    panel_price NUMERIC(12,2) CHECK (panel_price IS NULL OR panel_price >= 0),  -- NULL = sum of individual tests

    -- Status
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 100,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, code),
    CONSTRAINT lab_panels_name_length CHECK (char_length(name) >= 2)
);

COMMENT ON TABLE public.lab_panels IS 'Pre-defined groups of tests (e.g., CBC+Chemistry, Pre-anesthetic panel)';
COMMENT ON COLUMN public.lab_panels.test_ids IS 'Array of lab_test_catalog IDs included in this panel';
COMMENT ON COLUMN public.lab_panels.panel_price IS 'Fixed panel price. NULL = sum of individual test prices.';

-- =============================================================================
-- LAB ORDERS
-- =============================================================================
-- Laboratory test orders for patients.

CREATE TABLE IF NOT EXISTS public.lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Order number
    order_number TEXT NOT NULL,

    -- Relationships
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE RESTRICT,
    ordered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,

    -- Order details
    priority TEXT DEFAULT 'routine'
        CHECK (priority IN ('stat', 'urgent', 'routine')),
    clinical_notes TEXT,
    fasting_confirmed BOOLEAN DEFAULT false,

    -- Lab type
    lab_type TEXT DEFAULT 'in_house'
        CHECK (lab_type IN ('in_house', 'reference_lab')),
    reference_lab_name TEXT,
    external_accession TEXT,

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',      -- Order created
            'collected',    -- Sample collected
            'processing',   -- Being analyzed
            'completed',    -- Results ready
            'reviewed',     -- Results reviewed by vet
            'cancelled'     -- Order cancelled
        )),

    -- Status timestamps
    collected_at TIMESTAMPTZ,
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    processing_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE public.lab_orders IS 'Laboratory test orders for patients';
COMMENT ON COLUMN public.lab_orders.order_number IS 'Unique order number (format: LAB-YYYY-NNNNNN)';
COMMENT ON COLUMN public.lab_orders.priority IS 'stat: immediate, urgent: within hours, routine: standard turnaround';
COMMENT ON COLUMN public.lab_orders.lab_type IS 'in_house: performed at clinic, reference_lab: sent to external lab';
COMMENT ON COLUMN public.lab_orders.status IS 'Workflow: pending → collected → processing → completed → reviewed';

-- =============================================================================
-- LAB ORDER ITEMS - WITH TENANT_ID
-- =============================================================================
-- Individual tests within a lab order.

CREATE TABLE IF NOT EXISTS public.lab_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.lab_test_catalog(id) ON DELETE RESTRICT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),

    -- Pricing at time of order
    price NUMERIC(12,2) CHECK (price IS NULL OR price >= 0),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(lab_order_id, test_id)
);

COMMENT ON TABLE public.lab_order_items IS 'Individual tests within a lab order';
COMMENT ON COLUMN public.lab_order_items.price IS 'Price locked at time of order (may differ from catalog)';

-- =============================================================================
-- LAB RESULTS - WITH TENANT_ID
-- =============================================================================
-- Test results for lab orders.

CREATE TABLE IF NOT EXISTS public.lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.lab_test_catalog(id) ON DELETE RESTRICT,

    -- Result
    value TEXT NOT NULL,
    numeric_value NUMERIC(12,4),
    unit TEXT,

    -- Reference range at time of result
    reference_min NUMERIC(12,4),
    reference_max NUMERIC(12,4),

    -- Flags
    flag TEXT CHECK (flag IS NULL OR flag IN ('low', 'normal', 'high', 'critical_low', 'critical_high')),
    is_abnormal BOOLEAN DEFAULT false,

    -- Notes
    notes TEXT,

    -- Entered by
    entered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(lab_order_id, test_id)
);

COMMENT ON TABLE public.lab_results IS 'Test results for lab orders';
COMMENT ON COLUMN public.lab_results.flag IS 'Result interpretation: low, normal, high, critical_low, critical_high';
COMMENT ON COLUMN public.lab_results.is_abnormal IS 'True if result is outside reference range';

-- =============================================================================
-- LAB RESULT ATTACHMENTS - WITH TENANT_ID
-- =============================================================================
-- File attachments for lab results (PDF reports, images, etc.).

CREATE TABLE IF NOT EXISTS public.lab_result_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- File info
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size_bytes INTEGER CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),

    -- Metadata
    description TEXT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.lab_result_attachments IS 'File attachments for lab results (PDF reports, microscopy images, etc.)';

-- =============================================================================
-- LAB RESULT COMMENTS - WITH TENANT_ID
-- =============================================================================
-- Comments and notes on lab results.

CREATE TABLE IF NOT EXISTS public.lab_result_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Comment
    comment TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.lab_result_comments IS 'Comments and interpretation notes on lab results';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.lab_test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_result_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_result_comments ENABLE ROW LEVEL SECURITY;

-- Test catalog: Public read active tests
DROP POLICY IF EXISTS "Public read lab tests" ON public.lab_test_catalog;
CREATE POLICY "Public read lab tests" ON public.lab_test_catalog
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage tenant tests" ON public.lab_test_catalog;
CREATE POLICY "Staff manage tenant tests" ON public.lab_test_catalog
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id))
    WITH CHECK (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access lab tests" ON public.lab_test_catalog;
CREATE POLICY "Service role full access lab tests" ON public.lab_test_catalog
    FOR ALL TO service_role USING (true);

-- Lab panels: Public read active panels
DROP POLICY IF EXISTS "Public read lab panels" ON public.lab_panels;
CREATE POLICY "Public read lab panels" ON public.lab_panels
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage panels" ON public.lab_panels;
CREATE POLICY "Staff manage panels" ON public.lab_panels
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access panels" ON public.lab_panels;
CREATE POLICY "Service role full access panels" ON public.lab_panels
    FOR ALL TO service_role USING (true);

-- Lab orders: Staff manage, owners view completed
DROP POLICY IF EXISTS "Staff manage lab orders" ON public.lab_orders;
CREATE POLICY "Staff manage lab orders" ON public.lab_orders
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet lab orders" ON public.lab_orders;
CREATE POLICY "Owners view pet lab orders" ON public.lab_orders
    FOR SELECT TO authenticated
    USING (
        public.is_owner_of_pet(pet_id)
        AND status IN ('completed', 'reviewed')
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS "Service role full access lab orders" ON public.lab_orders;
CREATE POLICY "Service role full access lab orders" ON public.lab_orders
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Lab order items uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage order items" ON public.lab_order_items;
CREATE POLICY "Staff manage order items" ON public.lab_order_items
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view order items" ON public.lab_order_items;
CREATE POLICY "Owners view order items" ON public.lab_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lab_orders lo
            WHERE lo.id = lab_order_items.lab_order_id
            AND public.is_owner_of_pet(lo.pet_id)
            AND lo.status IN ('completed', 'reviewed')
        )
    );

DROP POLICY IF EXISTS "Service role full access order items" ON public.lab_order_items;
CREATE POLICY "Service role full access order items" ON public.lab_order_items
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Lab results uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage results" ON public.lab_results;
CREATE POLICY "Staff manage results" ON public.lab_results
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view results" ON public.lab_results;
CREATE POLICY "Owners view results" ON public.lab_results
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lab_orders lo
            WHERE lo.id = lab_results.lab_order_id
            AND public.is_owner_of_pet(lo.pet_id)
            AND lo.status IN ('completed', 'reviewed')
        )
    );

DROP POLICY IF EXISTS "Service role full access results" ON public.lab_results;
CREATE POLICY "Service role full access results" ON public.lab_results
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Attachments uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage attachments" ON public.lab_result_attachments;
CREATE POLICY "Staff manage attachments" ON public.lab_result_attachments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners view attachments" ON public.lab_result_attachments;
CREATE POLICY "Owners view attachments" ON public.lab_result_attachments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lab_orders lo
            WHERE lo.id = lab_result_attachments.lab_order_id
            AND public.is_owner_of_pet(lo.pet_id)
            AND lo.status IN ('completed', 'reviewed')
        )
    );

DROP POLICY IF EXISTS "Service role full access attachments" ON public.lab_result_attachments;
CREATE POLICY "Service role full access attachments" ON public.lab_result_attachments
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Comments uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage comments" ON public.lab_result_comments;
CREATE POLICY "Staff manage comments" ON public.lab_result_comments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access comments" ON public.lab_result_comments;
CREATE POLICY "Service role full access comments" ON public.lab_result_comments
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Lab test catalog
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_tenant ON public.lab_test_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_category ON public.lab_test_catalog(category);
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_sample_type ON public.lab_test_catalog(sample_type);
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_active ON public.lab_test_catalog(is_active)
    WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_name_search ON public.lab_test_catalog USING gin(name gin_trgm_ops);

-- GIN index for JSONB reference ranges (efficient range lookups)
CREATE INDEX IF NOT EXISTS idx_lab_test_catalog_ranges_gin ON public.lab_test_catalog USING gin(reference_ranges jsonb_path_ops)
    WHERE reference_ranges IS NOT NULL AND reference_ranges != '{}';

-- Lab panels
CREATE INDEX IF NOT EXISTS idx_lab_panels_tenant ON public.lab_panels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_panels_active ON public.lab_panels(is_active)
    WHERE is_active = true AND deleted_at IS NULL;

-- Lab orders
CREATE INDEX IF NOT EXISTS idx_lab_orders_tenant ON public.lab_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_pet ON public.lab_orders(pet_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_ordered_by ON public.lab_orders(ordered_by);
CREATE INDEX IF NOT EXISTS idx_lab_orders_collected_by ON public.lab_orders(collected_by);
CREATE INDEX IF NOT EXISTS idx_lab_orders_reviewed_by ON public.lab_orders(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_lab_orders_medical_record ON public.lab_orders(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON public.lab_orders(status)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_orders_pending ON public.lab_orders(tenant_id, priority)
    WHERE status IN ('pending', 'collected', 'processing') AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_orders_created_brin ON public.lab_orders
    USING BRIN(created_at) WITH (pages_per_range = 32);

-- Lab order items
CREATE INDEX IF NOT EXISTS idx_lab_order_items_order ON public.lab_order_items(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_order_items_tenant ON public.lab_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_order_items_test ON public.lab_order_items(test_id);
CREATE INDEX IF NOT EXISTS idx_lab_order_items_status ON public.lab_order_items(status);

-- Lab results
CREATE INDEX IF NOT EXISTS idx_lab_results_order ON public.lab_results(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_tenant ON public.lab_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_test ON public.lab_results(test_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_entered_by ON public.lab_results(entered_by);
CREATE INDEX IF NOT EXISTS idx_lab_results_abnormal ON public.lab_results(is_abnormal)
    WHERE is_abnormal = true;
CREATE INDEX IF NOT EXISTS idx_lab_results_flag ON public.lab_results(flag)
    WHERE flag IN ('critical_low', 'critical_high');

-- Lab attachments
CREATE INDEX IF NOT EXISTS idx_lab_attachments_order ON public.lab_result_attachments(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_attachments_tenant ON public.lab_result_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_attachments_uploaded_by ON public.lab_result_attachments(uploaded_by);

-- Lab comments
CREATE INDEX IF NOT EXISTS idx_lab_comments_order ON public.lab_result_comments(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_comments_tenant ON public.lab_result_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_comments_created_by ON public.lab_result_comments(created_by);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.lab_test_catalog;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lab_test_catalog
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.lab_panels;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lab_panels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.lab_orders;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lab_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.lab_order_items;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lab_order_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.lab_results;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lab_results
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- TENANT ID AUTO-POPULATION
-- =============================================================================

-- Auto-set tenant_id for child tables
CREATE OR REPLACE FUNCTION public.lab_order_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.lab_orders
        WHERE id = NEW.lab_order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.lab_order_set_tenant_id() IS
'Auto-populate tenant_id from lab_order for child tables';

DROP TRIGGER IF EXISTS lab_order_items_auto_tenant ON public.lab_order_items;
CREATE TRIGGER lab_order_items_auto_tenant
    BEFORE INSERT ON public.lab_order_items
    FOR EACH ROW EXECUTE FUNCTION public.lab_order_set_tenant_id();

DROP TRIGGER IF EXISTS lab_results_auto_tenant ON public.lab_results;
CREATE TRIGGER lab_results_auto_tenant
    BEFORE INSERT ON public.lab_results
    FOR EACH ROW EXECUTE FUNCTION public.lab_order_set_tenant_id();

DROP TRIGGER IF EXISTS lab_attachments_auto_tenant ON public.lab_result_attachments;
CREATE TRIGGER lab_attachments_auto_tenant
    BEFORE INSERT ON public.lab_result_attachments
    FOR EACH ROW EXECUTE FUNCTION public.lab_order_set_tenant_id();

DROP TRIGGER IF EXISTS lab_comments_auto_tenant ON public.lab_result_comments;
CREATE TRIGGER lab_comments_auto_tenant
    BEFORE INSERT ON public.lab_result_comments
    FOR EACH ROW EXECUTE FUNCTION public.lab_order_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- THREAD-SAFE lab order number generation
CREATE OR REPLACE FUNCTION public.generate_lab_order_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'lab_order', 'LAB');
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_lab_order_number(TEXT) IS
'Generate unique lab order number for a tenant. Format: LAB-YYYY-NNNNNN';

-- Get pending lab orders for a tenant
CREATE OR REPLACE FUNCTION public.get_pending_lab_orders(p_tenant_id TEXT)
RETURNS TABLE (
    order_id UUID,
    order_number TEXT,
    pet_name TEXT,
    owner_name TEXT,
    priority TEXT,
    status TEXT,
    ordered_by_name TEXT,
    created_at TIMESTAMPTZ,
    tests_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lo.id,
        lo.order_number,
        p.name,
        pr.full_name,
        lo.priority,
        lo.status,
        orderer.full_name,
        lo.created_at,
        (SELECT COUNT(*)::INTEGER FROM public.lab_order_items WHERE lab_order_id = lo.id)
    FROM public.lab_orders lo
    JOIN public.pets p ON lo.pet_id = p.id
    JOIN public.profiles pr ON p.owner_id = pr.id
    LEFT JOIN public.profiles orderer ON lo.ordered_by = orderer.id
    WHERE lo.tenant_id = p_tenant_id
    AND lo.status IN ('pending', 'collected', 'processing')
    AND lo.deleted_at IS NULL
    ORDER BY
        CASE lo.priority WHEN 'stat' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
        lo.created_at;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_pending_lab_orders(TEXT) IS
'Get all pending lab orders for a tenant, ordered by priority';

-- Get lab order with results
CREATE OR REPLACE FUNCTION public.get_lab_order_results(p_order_id UUID)
RETURNS TABLE (
    test_code TEXT,
    test_name TEXT,
    category TEXT,
    value TEXT,
    numeric_value NUMERIC,
    unit TEXT,
    reference_min NUMERIC,
    reference_max NUMERIC,
    flag TEXT,
    is_abnormal BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.code,
        tc.name,
        tc.category,
        lr.value,
        lr.numeric_value,
        lr.unit,
        lr.reference_min,
        lr.reference_max,
        lr.flag,
        lr.is_abnormal,
        lr.notes
    FROM public.lab_results lr
    JOIN public.lab_test_catalog tc ON lr.test_id = tc.id
    WHERE lr.lab_order_id = p_order_id
    ORDER BY tc.category, tc.display_order, tc.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_lab_order_results(UUID) IS
'Get all results for a lab order with test details';

-- =============================================================================
-- SEED DATA
-- =============================================================================
-- Global lab tests (available to all clinics)

INSERT INTO public.lab_test_catalog (tenant_id, code, name, category, sample_type, turnaround_days, reference_ranges) VALUES
    (NULL, 'CBC', 'Complete Blood Count', 'Hematology', 'edta_blood', 1, '{}'),
    (NULL, 'CHEM10', 'Chemistry Panel 10', 'Chemistry', 'serum', 1, '{}'),
    (NULL, 'CHEM17', 'Chemistry Panel 17', 'Chemistry', 'serum', 1, '{}'),
    (NULL, 'UA', 'Urinalysis', 'Urine', 'urine', 1, '{}'),
    (NULL, 'T4', 'Total T4', 'Endocrine', 'serum', 1, '{}'),
    (NULL, 'TSH', 'Thyroid Stimulating Hormone', 'Endocrine', 'serum', 2, '{}'),
    (NULL, 'FELV', 'FeLV Antigen Test', 'Infectious Disease', 'blood', 1, '{}'),
    (NULL, 'FIV', 'FIV Antibody Test', 'Infectious Disease', 'blood', 1, '{}'),
    (NULL, 'HW', 'Heartworm Antigen Test', 'Infectious Disease', 'blood', 1, '{}'),
    (NULL, 'FECAL', 'Fecal Flotation', 'Parasitology', 'feces', 1, '{}'),
    (NULL, 'GIARDIA', 'Giardia Antigen', 'Parasitology', 'feces', 1, '{}'),
    (NULL, 'LIPID', 'Lipid Panel', 'Chemistry', 'serum', 1, '{}'),
    (NULL, 'COAG', 'Coagulation Panel', 'Hematology', 'citrated_blood', 1, '{}'),
    (NULL, 'LYTES', 'Electrolyte Panel', 'Chemistry', 'serum', 1, '{}'),
    (NULL, 'CORTISOL', 'Cortisol Baseline', 'Endocrine', 'serum', 2, '{}')
ON CONFLICT DO NOTHING;

