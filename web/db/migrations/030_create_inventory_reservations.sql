-- =============================================================================
-- 030_CREATE_INVENTORY_RESERVATIONS.SQL
-- =============================================================================
-- Creates the store_inventory_reservations table that was missing but referenced
-- by the process_checkout function in migration 021.
--
-- PURPOSE:
-- Stock reservations prevent overselling during the checkout window.
-- When a customer adds items to cart, stock is "soft reserved" until:
-- - Checkout completes (reservation -> completed)
-- - Cart expires (reservation -> expired, stock returned)
-- - Customer removes item (reservation -> cancelled, stock returned)
--
-- This table is referenced by:
-- - process_checkout() function (migration 021)
-- - /api/cron/release-reservations endpoint
-- =============================================================================

-- =============================================================================
-- STORE INVENTORY RESERVATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy (required for RLS)
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Cart reference (reservation is tied to a specific cart)
    cart_id UUID NOT NULL REFERENCES public.store_carts(id) ON DELETE CASCADE,

    -- Product being reserved
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,

    -- Quantity reserved
    quantity INTEGER NOT NULL CHECK (quantity > 0),

    -- Reservation status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),

    -- Timing
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
    completed_at TIMESTAMPTZ,

    -- Link to order when completed
    order_id UUID REFERENCES public.invoices(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_inventory_reservations IS 'Stock reservations to prevent overselling during checkout window';
COMMENT ON COLUMN public.store_inventory_reservations.status IS 'pending=reserved, completed=checked out, expired=timed out, cancelled=removed from cart';
COMMENT ON COLUMN public.store_inventory_reservations.expires_at IS 'Reservations expire after 30 minutes by default';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookup: find reservations by cart
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_cart
    ON public.store_inventory_reservations(cart_id);

-- Find reservations by product (for stock calculations)
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product
    ON public.store_inventory_reservations(product_id);

-- Find pending reservations that need expiry processing
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_pending_expiry
    ON public.store_inventory_reservations(expires_at)
    WHERE status = 'pending';

-- Tenant isolation index
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_tenant
    ON public.store_inventory_reservations(tenant_id);

-- Composite for common query pattern
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_cart_status
    ON public.store_inventory_reservations(cart_id, status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.store_inventory_reservations ENABLE ROW LEVEL SECURITY;

-- Staff can manage all reservations for their tenant
CREATE POLICY "Staff manage reservations"
    ON public.store_inventory_reservations
    FOR ALL
    USING (public.is_staff_of(tenant_id));

-- Customers can view their own reservations (via their cart)
CREATE POLICY "Customers view own reservations"
    ON public.store_inventory_reservations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_carts sc
            WHERE sc.id = store_inventory_reservations.cart_id
            AND sc.customer_id = auth.uid()
        )
    );

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_inventory_reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- HELPER FUNCTION: Get reserved quantity for a product
-- =============================================================================
-- Returns the total quantity currently reserved (pending) for a product.
-- Used to calculate "available" stock = physical stock - reserved quantity.

CREATE OR REPLACE FUNCTION public.get_reserved_quantity(
    p_tenant_id TEXT,
    p_product_id UUID
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(SUM(quantity), 0)::INTEGER
    FROM public.store_inventory_reservations
    WHERE tenant_id = p_tenant_id
      AND product_id = p_product_id
      AND status = 'pending'
      AND expires_at > NOW();
$$;

COMMENT ON FUNCTION public.get_reserved_quantity(TEXT, UUID) IS
'Returns total pending reserved quantity for a product (excludes expired)';

-- =============================================================================
-- HELPER FUNCTION: Get available stock (physical - reserved)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_available_stock(
    p_tenant_id TEXT,
    p_product_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT GREATEST(0,
        COALESCE(
            (SELECT stock_quantity FROM public.store_inventory
             WHERE tenant_id = p_tenant_id AND product_id = p_product_id),
            0
        ) - public.get_reserved_quantity(p_tenant_id, p_product_id)
    );
$$;

COMMENT ON FUNCTION public.get_available_stock(TEXT, UUID) IS
'Returns available stock = physical stock - pending reservations';

-- =============================================================================
-- HELPER FUNCTION: Release expired reservations
-- =============================================================================
-- Called by cron job to clean up expired reservations.
-- Returns the number of reservations released.

CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.store_inventory_reservations
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
      AND expires_at <= NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.release_expired_reservations() IS
'Marks expired pending reservations as expired. Called by cron job.';

-- Grant execute to service role (for cron jobs)
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_inventory_reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_inventory_reservations TO service_role;
