-- =============================================================================
-- 01_ORDERS.SQL
-- =============================================================================
-- Order management, payments, and coupons
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/products/01_products.sql
-- =============================================================================

-- =============================================================================
-- STORE CAMPAIGNS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Campaign info
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT DEFAULT 'sale'
        CHECK (campaign_type IN ('sale', 'bogo', 'bundle', 'flash', 'seasonal')),

    -- Duration
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,

    -- Discount
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(12,2),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT store_campaigns_dates CHECK (end_date > start_date)
);

COMMENT ON TABLE public.store_campaigns IS 'Promotional campaigns: sales, BOGO, bundles, flash sales, seasonal';
COMMENT ON COLUMN public.store_campaigns.campaign_type IS 'Campaign type: sale, bogo (buy one get one), bundle, flash, seasonal';

-- =============================================================================
-- STORE CAMPAIGN ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_campaign_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.store_campaigns(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,

    -- Override discount for this product
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(12,2),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_campaign_items IS 'Campaign-specific product discounts and overrides';

-- =============================================================================
-- STORE COUPONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Coupon details
    code TEXT NOT NULL,
    name TEXT,
    description TEXT,

    -- Type and value
    type TEXT NOT NULL
        CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping')),
    value NUMERIC(12,2) NOT NULL
        CHECK (value > 0),

    -- Conditions
    minimum_order_amount NUMERIC(12,2),
    applicable_categories UUID[],  -- Array of category IDs (no FK constraint for arrays)
    applicable_products UUID[],    -- Array of product IDs (no FK constraint for arrays)

    -- Usage limits
    usage_limit INTEGER,  -- Total uses allowed
    usage_limit_per_user INTEGER,  -- Uses per customer
    used_count INTEGER DEFAULT 0,

    -- Validity
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    -- Created by
    created_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE public.store_coupons IS 'Discount coupons and promotional codes';
COMMENT ON COLUMN public.store_coupons.type IS 'Type: percentage, fixed_amount, free_shipping';
COMMENT ON COLUMN public.store_coupons.applicable_categories IS 'Categories this coupon applies to (NULL = all)';
COMMENT ON COLUMN public.store_coupons.applicable_products IS 'Specific products this coupon applies to (NULL = all)';

-- =============================================================================
-- STORE ORDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Order number
    order_number TEXT NOT NULL,

    -- Customer
    customer_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',      -- Order placed
            'confirmed',    -- Payment confirmed
            'processing',   -- Being prepared
            'ready',        -- Ready for pickup/shipping
            'shipped',      -- In transit
            'delivered',    -- Completed
            'cancelled',    -- Cancelled
            'refunded'      -- Refunded
        )),

    -- Totals
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    shipping_cost NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Shipping
    shipping_address JSONB,
    shipping_method TEXT,
    tracking_number TEXT,

    -- Payment
    payment_status TEXT DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method TEXT,
    payment_reference TEXT,

    -- Coupon
    coupon_id UUID REFERENCES public.store_coupons(id),
    coupon_code TEXT,

    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,

    -- Timestamps
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(id),
    cancellation_reason TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE public.store_orders IS 'Customer orders with status tracking and payment handling';
COMMENT ON COLUMN public.store_orders.status IS 'Workflow: pending → confirmed → processing → ready → shipped → delivered. Also: cancelled, refunded';
COMMENT ON COLUMN public.store_orders.payment_status IS 'Payment status: pending, paid, failed, refunded';

-- =============================================================================
-- STORE ORDER ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,

    -- Product
    product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Quantities and pricing
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_price NUMERIC(12,2) NOT NULL,

    -- Product snapshot (for historical accuracy)
    product_name TEXT NOT NULL,
    product_sku TEXT,
    product_image_url TEXT,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_order_items IS 'Order line items with product snapshots for historical accuracy';

-- =============================================================================
-- STORE PRICE HISTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Price change
    old_price NUMERIC(12,2),
    new_price NUMERIC(12,2) NOT NULL,
    old_sale_price NUMERIC(12,2),
    new_sale_price NUMERIC(12,2),

    -- Reason
    change_reason TEXT,
    changed_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_price_history IS 'Audit trail of price changes for products';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_store_campaigns_tenant ON public.store_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_campaigns_type ON public.store_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_store_campaigns_dates ON public.store_campaigns(start_date, end_date)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_campaigns_active ON public.store_campaigns(tenant_id, is_active, start_date, end_date)
    WHERE is_active = true AND deleted_at IS NULL;

-- Campaign items indexes
CREATE INDEX IF NOT EXISTS idx_store_campaign_items_campaign ON public.store_campaign_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_store_campaign_items_tenant ON public.store_campaign_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_campaign_items_product ON public.store_campaign_items(product_id);

-- Coupons indexes
CREATE INDEX IF NOT EXISTS idx_store_coupons_tenant ON public.store_coupons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_coupons_code ON public.store_coupons(code);
-- CREATE INDEX IF NOT EXISTS idx_store_coupons_active ON public.store_coupons(tenant_id, is_active, expires_at)
--     WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW()); -- NOW() is STABLE, not IMMUTABLE

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_store_orders_tenant ON public.store_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_customer ON public.store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON public.store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_payment_status ON public.store_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_store_orders_created ON public.store_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_orders_number ON public.store_orders(order_number);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_store_order_items_tenant ON public.store_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON public.store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_product ON public.store_order_items(product_id);

-- Price history indexes
CREATE INDEX IF NOT EXISTS idx_store_price_history_tenant ON public.store_price_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_price_history_product ON public.store_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_store_price_history_date ON public.store_price_history(created_at DESC);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_campaign_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_price_history ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access campaigns" ON public.store_campaigns;
CREATE POLICY "Service role full access campaigns" ON public.store_campaigns
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access campaign_items" ON public.store_campaign_items;
CREATE POLICY "Service role full access campaign_items" ON public.store_campaign_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access coupons" ON public.store_coupons;
CREATE POLICY "Service role full access coupons" ON public.store_coupons
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access orders" ON public.store_orders;
CREATE POLICY "Service role full access orders" ON public.store_orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access order_items" ON public.store_order_items;
CREATE POLICY "Service role full access order_items" ON public.store_order_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access price_history" ON public.store_price_history;
CREATE POLICY "Service role full access price_history" ON public.store_price_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Clinic staff can manage their clinic's campaigns, coupons and orders
DROP POLICY IF EXISTS "Clinic staff manage campaigns" ON public.store_campaigns;
CREATE POLICY "Clinic staff manage campaigns" ON public.store_campaigns
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_campaigns.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_campaigns.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Clinic staff manage campaign_items" ON public.store_campaign_items;
CREATE POLICY "Clinic staff manage campaign_items" ON public.store_campaign_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_campaign_items.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_campaign_items.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Clinic staff manage coupons" ON public.store_coupons;
CREATE POLICY "Clinic staff manage coupons" ON public.store_coupons
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_coupons.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_coupons.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Clinic staff manage orders" ON public.store_orders;
CREATE POLICY "Clinic staff manage orders" ON public.store_orders
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_orders.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_orders.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- Customers can view their own orders
DROP POLICY IF EXISTS "Customers view own orders" ON public.store_orders;
CREATE POLICY "Customers view own orders" ON public.store_orders
    FOR SELECT TO authenticated
    USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers view own order_items" ON public.store_order_items;
CREATE POLICY "Customers view own order_items" ON public.store_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.store_orders o
            WHERE o.id = store_order_items.order_id
            AND o.customer_id = auth.uid()
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at triggers
DROP TRIGGER IF EXISTS handle_updated_at_campaigns ON public.store_campaigns;
CREATE TRIGGER handle_updated_at_campaigns
    BEFORE UPDATE ON public.store_campaigns
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_campaign_items ON public.store_campaign_items;
CREATE TRIGGER handle_updated_at_campaign_items
    BEFORE UPDATE ON public.store_campaign_items
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_coupons ON public.store_coupons;
CREATE TRIGGER handle_updated_at_coupons
    BEFORE UPDATE ON public.store_coupons
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_orders ON public.store_orders;
CREATE TRIGGER handle_updated_at_orders
    BEFORE UPDATE ON public.store_orders
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_order_items ON public.store_order_items;
CREATE TRIGGER handle_updated_at_order_items
    BEFORE UPDATE ON public.store_order_items
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
