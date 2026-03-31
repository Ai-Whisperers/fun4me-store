-- =============================================================================
-- 01_WISHLIST.SQL
-- =============================================================================
-- User wishlist for product bookmarking
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/products/01_products.sql
-- =============================================================================

-- =============================================================================
-- STORE WISHLISTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One entry per user per product
    CONSTRAINT store_wishlists_unique UNIQUE(user_id, product_id)
);

COMMENT ON TABLE public.store_wishlists IS 'User wishlist items for product bookmarking';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_store_wishlists_tenant
    ON public.store_wishlists(tenant_id);

CREATE INDEX IF NOT EXISTS idx_store_wishlists_user
    ON public.store_wishlists(user_id);

CREATE INDEX IF NOT EXISTS idx_store_wishlists_product
    ON public.store_wishlists(product_id);

-- Composite for user's wishlist with product details
CREATE INDEX IF NOT EXISTS idx_store_wishlists_user_created
    ON public.store_wishlists(user_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.store_wishlists ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own wishlist
DROP POLICY IF EXISTS "Users manage own wishlist" ON public.store_wishlists;
CREATE POLICY "Users manage own wishlist" ON public.store_wishlists
    FOR ALL
    USING (user_id = auth.uid());

-- Staff can view wishlists in their tenant (for analytics)
DROP POLICY IF EXISTS "Staff view tenant wishlists" ON public.store_wishlists;
CREATE POLICY "Staff view tenant wishlists" ON public.store_wishlists
    FOR SELECT
    USING (is_staff_of(tenant_id));
