-- =============================================================================
-- 029_PURCHASE_ORDERS.SQL
-- =============================================================================
-- Adds purchase orders tables for procurement workflow.
-- Enables clinics to create, track, and receive purchase orders from suppliers.
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/suppliers/01_suppliers.sql, 60_store/products/01_products.sql
-- =============================================================================

-- =============================================================================
-- PURCHASE ORDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Supplier
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),

    -- Order info
    order_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'confirmed', 'shipped', 'received', 'cancelled')),

    -- Totals
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Delivery
    expected_delivery_date DATE,
    shipping_address TEXT,

    -- Notes
    notes TEXT,

    -- Created by
    created_by UUID NOT NULL REFERENCES public.profiles(id),

    -- Status timestamps
    submitted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    received_by UUID REFERENCES public.profiles(id),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE public.purchase_orders IS 'Purchase orders for inventory replenishment from suppliers';
COMMENT ON COLUMN public.purchase_orders.status IS 'Order lifecycle: draft → submitted → confirmed → shipped → received (or cancelled)';
COMMENT ON COLUMN public.purchase_orders.order_number IS 'Unique order number per tenant (e.g., PO-000001)';

-- =============================================================================
-- PURCHASE ORDER ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,

    -- Product reference
    catalog_product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Order quantities
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    line_total NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Receiving
    received_quantity INTEGER NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    received_at TIMESTAMPTZ,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.purchase_order_items IS 'Line items within a purchase order';
COMMENT ON COLUMN public.purchase_order_items.received_quantity IS 'Quantity actually received (may differ from ordered)';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON public.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON public.purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON public.purchase_orders(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_status ON public.purchase_orders(tenant_id, status);

-- Purchase order items indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON public.purchase_order_items(catalog_product_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access purchase_orders" ON public.purchase_orders;
CREATE POLICY "Service role full access purchase_orders" ON public.purchase_orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Service role full access purchase_order_items" ON public.purchase_order_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Staff can view purchase orders for their tenant
DROP POLICY IF EXISTS "Staff view purchase orders" ON public.purchase_orders;
CREATE POLICY "Staff view purchase orders" ON public.purchase_orders
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Only admins can manage purchase orders
DROP POLICY IF EXISTS "Admin manage purchase orders" ON public.purchase_orders;
CREATE POLICY "Admin manage purchase orders" ON public.purchase_orders
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = purchase_orders.tenant_id
            AND p.role = 'admin'
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = purchase_orders.tenant_id
            AND p.role = 'admin'
            AND p.deleted_at IS NULL
        )
    );

-- Purchase order items inherit access from parent order
DROP POLICY IF EXISTS "Staff view purchase order items" ON public.purchase_order_items;
CREATE POLICY "Staff view purchase order items" ON public.purchase_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            WHERE po.id = purchase_order_items.purchase_order_id
            AND public.is_staff_of(po.tenant_id)
        )
    );

DROP POLICY IF EXISTS "Admin manage purchase order items" ON public.purchase_order_items;
CREATE POLICY "Admin manage purchase order items" ON public.purchase_order_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            JOIN public.profiles p ON p.tenant_id = po.tenant_id
            WHERE po.id = purchase_order_items.purchase_order_id
            AND p.id = auth.uid()
            AND p.role = 'admin'
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            JOIN public.profiles p ON p.tenant_id = po.tenant_id
            WHERE po.id = purchase_order_items.purchase_order_id
            AND p.id = auth.uid()
            AND p.role = 'admin'
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger for purchase orders
DROP TRIGGER IF EXISTS handle_updated_at_purchase_orders ON public.purchase_orders;
CREATE TRIGGER handle_updated_at_purchase_orders
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-calculate line_total on insert/update
CREATE OR REPLACE FUNCTION calc_purchase_order_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.line_total := NEW.quantity * NEW.unit_cost;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_item_total ON public.purchase_order_items;
CREATE TRIGGER trg_calc_item_total
    BEFORE INSERT OR UPDATE OF quantity, unit_cost ON public.purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION calc_purchase_order_item_total();

-- Auto-update order totals when items change
CREATE OR REPLACE FUNCTION update_purchase_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_order_id UUID;
    v_subtotal NUMERIC(12,2);
BEGIN
    -- Get the order ID
    IF TG_OP = 'DELETE' THEN
        v_order_id := OLD.purchase_order_id;
    ELSE
        v_order_id := NEW.purchase_order_id;
    END IF;

    -- Calculate new subtotal
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_subtotal
    FROM public.purchase_order_items
    WHERE purchase_order_id = v_order_id;

    -- Update order totals
    UPDATE public.purchase_orders
    SET subtotal = v_subtotal,
        total = v_subtotal + tax_amount
    WHERE id = v_order_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_order_totals ON public.purchase_order_items;
CREATE TRIGGER trg_update_order_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_totals();

-- =============================================================================
-- HELPER FUNCTION: Generate next order number
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_purchase_order_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_last_number INTEGER;
    v_new_number TEXT;
BEGIN
    -- Get the last order number for this tenant
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(order_number FROM 'PO-(\d+)') AS INTEGER)),
        0
    )
    INTO v_last_number
    FROM public.purchase_orders
    WHERE tenant_id = p_tenant_id;

    -- Generate new number
    v_new_number := 'PO-' || LPAD((v_last_number + 1)::TEXT, 6, '0');

    RETURN v_new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_purchase_order_number(TEXT) IS 'Generates the next sequential purchase order number for a tenant';
