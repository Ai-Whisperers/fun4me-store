-- =============================================================================
-- 01_INVENTORY.SQL
-- =============================================================================
-- Inventory management and stock tracking
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/products/01_products.sql
-- =============================================================================

-- =============================================================================
-- STORE INVENTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Stock levels
    stock_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    reserved_quantity NUMERIC(12,2) DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity NUMERIC(12,2) GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED,

    -- Reorder settings
    min_stock_level NUMERIC(12,2) DEFAULT 0,
    reorder_quantity NUMERIC(12,2),
    reorder_point NUMERIC(12,2),

    -- Cost tracking
    weighted_average_cost NUMERIC(12,2) DEFAULT 0,

    -- Location
    location TEXT,
    bin_number TEXT,

    -- Batch/Expiry
    batch_number TEXT,
    expiry_date DATE,
    supplier_name TEXT,

    -- Timestamps
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(product_id),

    -- CHECK constraints
    CONSTRAINT store_inventory_stock_non_negative CHECK (stock_quantity >= 0),
    CONSTRAINT store_inventory_reserved_valid CHECK (COALESCE(reserved_quantity, 0) <= stock_quantity)
);

COMMENT ON TABLE public.store_inventory IS 'Per-product per-clinic inventory levels with weighted average cost tracking';
COMMENT ON COLUMN public.store_inventory.available_quantity IS 'Computed: stock_quantity - reserved_quantity';
COMMENT ON COLUMN public.store_inventory.weighted_average_cost IS 'Running WAC updated on purchase transactions';
COMMENT ON COLUMN public.store_inventory.reorder_point IS 'Stock level at which to reorder';

-- =============================================================================
-- INVENTORY TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Transaction
    type TEXT NOT NULL
        CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'damage', 'theft', 'expired', 'transfer')),
    quantity NUMERIC(12,2) NOT NULL,  -- Positive = add, Negative = remove
    unit_cost NUMERIC(12,2),

    -- Reference
    reference_type TEXT,  -- 'order', 'invoice', 'adjustment'
    reference_id UUID,
    notes TEXT,

    -- Performed by
    performed_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_inventory_transactions IS 'Inventory movement ledger: purchases, sales, adjustments, returns, damages';
COMMENT ON COLUMN public.store_inventory_transactions.type IS 'Transaction type: purchase, sale, adjustment, return, damage, theft, expired, transfer';
COMMENT ON COLUMN public.store_inventory_transactions.quantity IS 'Positive = add stock, Negative = remove stock';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_store_inventory_product ON public.store_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_tenant ON public.store_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_available ON public.store_inventory(tenant_id, available_quantity)
    WHERE available_quantity > 0;
CREATE INDEX IF NOT EXISTS idx_store_inventory_reorder ON public.store_inventory(tenant_id, reorder_point)
    WHERE reorder_point IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_inventory_expiry ON public.store_inventory(expiry_date)
    WHERE expiry_date IS NOT NULL;

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant ON public.store_inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON public.store_inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.store_inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON public.store_inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON public.store_inventory_transactions(reference_type, reference_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access inventory" ON public.store_inventory;
CREATE POLICY "Service role full access inventory" ON public.store_inventory
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access inventory_txns" ON public.store_inventory_transactions;
CREATE POLICY "Service role full access inventory_txns" ON public.store_inventory_transactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read inventory levels (for store stock display)
DROP POLICY IF EXISTS "Public read inventory levels" ON public.store_inventory;
CREATE POLICY "Public read inventory levels" ON public.store_inventory
    FOR SELECT USING (true);

-- Clinic staff can manage their clinic's inventory
DROP POLICY IF EXISTS "Clinic staff manage inventory" ON public.store_inventory;
CREATE POLICY "Clinic staff manage inventory" ON public.store_inventory
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_inventory.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_inventory.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Clinic staff manage inventory_txns" ON public.store_inventory_transactions;
CREATE POLICY "Clinic staff manage inventory_txns" ON public.store_inventory_transactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_inventory_transactions.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_inventory_transactions.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger for inventory
DROP TRIGGER IF EXISTS handle_updated_at_inventory ON public.store_inventory;
CREATE TRIGGER handle_updated_at_inventory
    BEFORE UPDATE ON public.store_inventory
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
