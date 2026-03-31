-- =============================================================================
-- 01_REVIEWS.SQL
-- =============================================================================
-- Product reviews and wishlists
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/products/01_products.sql, 60_store/orders/01_orders.sql
-- =============================================================================

-- =============================================================================
-- PRODUCT REVIEWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    order_id UUID REFERENCES public.store_orders(id),

    -- Review
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,

    -- Moderation
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One review per customer per product
    UNIQUE(product_id, customer_id)
);

COMMENT ON TABLE public.store_reviews IS 'Product reviews with moderation. One review per customer per product.';
COMMENT ON COLUMN public.store_reviews.is_approved IS 'Review must be approved before public display';

-- =============================================================================
-- WISHLIST
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(customer_id, product_id)
);

COMMENT ON TABLE public.store_wishlist IS 'Customer wishlists for saved products';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_store_reviews_tenant ON public.store_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_product ON public.store_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_customer ON public.store_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_rating ON public.store_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_store_reviews_approved ON public.store_reviews(is_approved, created_at DESC)
    WHERE is_approved = true AND deleted_at IS NULL;

-- Wishlist indexes
CREATE INDEX IF NOT EXISTS idx_store_wishlist_tenant ON public.store_wishlist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_wishlist_customer ON public.store_wishlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_wishlist_product ON public.store_wishlist(product_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_wishlist ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access reviews" ON public.store_reviews;
CREATE POLICY "Service role full access reviews" ON public.store_reviews
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access wishlist" ON public.store_wishlist;
CREATE POLICY "Service role full access wishlist" ON public.store_wishlist
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can view approved reviews
DROP POLICY IF EXISTS "Public view approved reviews" ON public.store_reviews;
CREATE POLICY "Public view approved reviews" ON public.store_reviews
    FOR SELECT USING (is_approved = true AND deleted_at IS NULL);

-- Customers can manage their own reviews and wishlist
DROP POLICY IF EXISTS "Customers manage own reviews" ON public.store_reviews;
CREATE POLICY "Customers manage own reviews" ON public.store_reviews
    FOR ALL TO authenticated
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers manage own wishlist" ON public.store_wishlist;
CREATE POLICY "Customers manage own wishlist" ON public.store_wishlist
    FOR ALL TO authenticated
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

-- Clinic staff can moderate reviews
DROP POLICY IF EXISTS "Clinic staff moderate reviews" ON public.store_reviews;
CREATE POLICY "Clinic staff moderate reviews" ON public.store_reviews
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_reviews.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = store_reviews.tenant_id
            AND p.role IN ('vet', 'admin')
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger for reviews
DROP TRIGGER IF EXISTS handle_updated_at_reviews ON public.store_reviews;
CREATE TRIGGER handle_updated_at_reviews
    BEFORE UPDATE ON public.store_reviews
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
