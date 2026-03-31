-- =============================================================================
-- 01_STOCK_ALERTS.SQL
-- =============================================================================
-- Stock availability notifications for customers
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql,
--               60_store/products/01_products.sql
-- =============================================================================

-- =============================================================================
-- STOCK ALERTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,

    -- Customer info (optional user_id for logged-in users)
    user_id UUID REFERENCES public.profiles(id),
    email TEXT NOT NULL,

    -- Status
    notified BOOLEAN NOT NULL DEFAULT false,
    notified_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One alert per email per product
    CONSTRAINT store_stock_alerts_unique UNIQUE(email, product_id)
);

COMMENT ON TABLE public.store_stock_alerts IS 'Customer requests for back-in-stock notifications';
COMMENT ON COLUMN public.store_stock_alerts.notified IS 'Whether the customer has been notified of stock restoration';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_store_stock_alerts_tenant
    ON public.store_stock_alerts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_store_stock_alerts_product
    ON public.store_stock_alerts(product_id);

CREATE INDEX IF NOT EXISTS idx_store_stock_alerts_user
    ON public.store_stock_alerts(user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_stock_alerts_pending
    ON public.store_stock_alerts(product_id)
    WHERE notified = false;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.store_stock_alerts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own alerts
DROP POLICY IF EXISTS "Users manage own alerts" ON public.store_stock_alerts;
CREATE POLICY "Users manage own alerts" ON public.store_stock_alerts
    FOR ALL
    USING (user_id = auth.uid() OR user_id IS NULL);

-- Staff can view all alerts in their tenant
DROP POLICY IF EXISTS "Staff view tenant alerts" ON public.store_stock_alerts;
CREATE POLICY "Staff view tenant alerts" ON public.store_stock_alerts
    FOR SELECT
    USING (is_staff_of(tenant_id));

-- Anyone can create an alert (for guest users)
DROP POLICY IF EXISTS "Anyone can create alert" ON public.store_stock_alerts;
CREATE POLICY "Anyone can create alert" ON public.store_stock_alerts
    FOR INSERT
    WITH CHECK (true);

-- =============================================================================
-- NOTIFICATION QUEUE (for async processing)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.notification_queue IS 'Async notification queue for background processing';

CREATE INDEX IF NOT EXISTS idx_notification_queue_pending
    ON public.notification_queue(created_at)
    WHERE status = 'pending';

-- =============================================================================
-- TRIGGER: Notify when stock restored
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_stock_restored()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if stock was restored (was 0 or less, now > 0)
    IF (OLD.stock_quantity <= 0 OR OLD.stock_quantity IS NULL)
       AND NEW.stock_quantity > 0 THEN
        -- Queue notification for background processing
        INSERT INTO public.notification_queue (type, payload)
        VALUES (
            'stock_restored',
            jsonb_build_object(
                'product_id', NEW.product_id,
                'tenant_id', NEW.tenant_id,
                'new_quantity', NEW.stock_quantity
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_stock_restored IS 'Queues stock restoration notifications when inventory is replenished';

-- Create trigger on store_inventory table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_inventory') THEN
        DROP TRIGGER IF EXISTS on_stock_restored ON public.store_inventory;
        CREATE TRIGGER on_stock_restored
            AFTER UPDATE ON public.store_inventory
            FOR EACH ROW
            EXECUTE FUNCTION notify_stock_restored();
    END IF;
END;
$$;
