-- =============================================================================
-- 017_SUBSCRIPTIONS.SQL
-- =============================================================================
-- Auto-ship subscription system for recurring orders
-- Allows customers to subscribe to products for automatic reordering
--
-- DEPENDENCIES: store_products, profiles, tenants
-- =============================================================================

-- =============================================================================
-- SUBSCRIPTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.store_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.store_product_variants(id) ON DELETE SET NULL,

    -- Subscription details
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    frequency_days INT NOT NULL DEFAULT 30 CHECK (frequency_days >= 7 AND frequency_days <= 180),

    -- Scheduling
    next_order_date DATE NOT NULL,
    last_order_date DATE,
    last_order_id UUID REFERENCES public.store_orders(id) ON DELETE SET NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    pause_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Payment (optional - for future payment integration)
    payment_method_id UUID,

    -- Pricing snapshot (to detect price changes)
    subscribed_price NUMERIC(12,2) NOT NULL,

    -- Delivery preferences
    shipping_address JSONB,
    delivery_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_active_subscription UNIQUE (tenant_id, customer_id, product_id, variant_id)
        DEFERRABLE INITIALLY DEFERRED
);

-- =============================================================================
-- SUBSCRIPTION HISTORY TABLE
-- =============================================================================
-- Track all subscription events for audit and analytics
CREATE TABLE IF NOT EXISTS public.store_subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.store_subscriptions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'created', 'paused', 'resumed', 'cancelled',
        'frequency_changed', 'quantity_changed', 'skipped',
        'order_created', 'order_failed', 'price_changed'
    )),
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
-- Index for finding active subscriptions due for processing
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_order
    ON public.store_subscriptions(next_order_date, status)
    WHERE status = 'active';

-- Index for customer's subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer
    ON public.store_subscriptions(customer_id, tenant_id);

-- Index for product subscriptions (for analytics)
CREATE INDEX IF NOT EXISTS idx_subscriptions_product
    ON public.store_subscriptions(product_id, status);

-- Index for subscription history
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription
    ON public.store_subscription_history(subscription_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscription_history ENABLE ROW LEVEL SECURITY;

-- Customers can manage their own subscriptions
CREATE POLICY "Customers manage own subscriptions" ON public.store_subscriptions
    FOR ALL TO authenticated
    USING (customer_id = auth.uid());

-- Staff can view all subscriptions for their tenant
CREATE POLICY "Staff view tenant subscriptions" ON public.store_subscriptions
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Staff can update subscriptions for their tenant (for support)
CREATE POLICY "Staff update tenant subscriptions" ON public.store_subscriptions
    FOR UPDATE TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Customers can view their subscription history
CREATE POLICY "Customers view own subscription history" ON public.store_subscription_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.store_subscriptions s
            WHERE s.id = subscription_id AND s.customer_id = auth.uid()
        )
    );

-- Staff can view subscription history for their tenant
CREATE POLICY "Staff view tenant subscription history" ON public.store_subscription_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.store_subscriptions s
            WHERE s.id = subscription_id AND public.is_staff_of(s.tenant_id)
        )
    );

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate next order date based on frequency
CREATE OR REPLACE FUNCTION public.calculate_next_subscription_date(
    p_frequency_days INT,
    p_from_date DATE DEFAULT CURRENT_DATE
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN p_from_date + (p_frequency_days || ' days')::INTERVAL;
END;
$$;

-- Function to get subscription summary for a customer
CREATE OR REPLACE FUNCTION public.get_customer_subscriptions(
    p_customer_id UUID,
    p_tenant_id TEXT
)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    product_name TEXT,
    product_image TEXT,
    variant_id UUID,
    variant_name TEXT,
    quantity INT,
    frequency_days INT,
    next_order_date DATE,
    status TEXT,
    subscribed_price NUMERIC,
    current_price NUMERIC,
    price_changed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.product_id,
        p.name AS product_name,
        p.image_url AS product_image,
        s.variant_id,
        v.name AS variant_name,
        s.quantity,
        s.frequency_days,
        s.next_order_date,
        s.status,
        s.subscribed_price,
        COALESCE(v.price, p.base_price) AS current_price,
        s.subscribed_price != COALESCE(v.price, p.base_price) AS price_changed
    FROM public.store_subscriptions s
    JOIN public.store_products p ON p.id = s.product_id
    LEFT JOIN public.store_product_variants v ON v.id = s.variant_id
    WHERE s.customer_id = p_customer_id
      AND s.tenant_id = p_tenant_id
      AND s.status != 'cancelled'
    ORDER BY s.next_order_date ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_next_subscription_date(INT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_subscriptions(UUID, TEXT) TO authenticated;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at on subscription changes
CREATE TRIGGER handle_subscriptions_updated_at
    BEFORE UPDATE ON public.store_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Log subscription changes to history
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_type TEXT;
    v_event_data JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_event_type := 'created';
        v_event_data := jsonb_build_object(
            'quantity', NEW.quantity,
            'frequency_days', NEW.frequency_days,
            'subscribed_price', NEW.subscribed_price
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Determine what changed
        IF OLD.status != NEW.status THEN
            IF NEW.status = 'paused' THEN
                v_event_type := 'paused';
                v_event_data := jsonb_build_object('reason', NEW.pause_reason);
            ELSIF NEW.status = 'cancelled' THEN
                v_event_type := 'cancelled';
                v_event_data := jsonb_build_object('reason', NEW.cancellation_reason);
            ELSIF OLD.status = 'paused' AND NEW.status = 'active' THEN
                v_event_type := 'resumed';
                v_event_data := '{}'::JSONB;
            END IF;
        ELSIF OLD.frequency_days != NEW.frequency_days THEN
            v_event_type := 'frequency_changed';
            v_event_data := jsonb_build_object(
                'old_frequency', OLD.frequency_days,
                'new_frequency', NEW.frequency_days
            );
        ELSIF OLD.quantity != NEW.quantity THEN
            v_event_type := 'quantity_changed';
            v_event_data := jsonb_build_object(
                'old_quantity', OLD.quantity,
                'new_quantity', NEW.quantity
            );
        ELSIF OLD.subscribed_price != NEW.subscribed_price THEN
            v_event_type := 'price_changed';
            v_event_data := jsonb_build_object(
                'old_price', OLD.subscribed_price,
                'new_price', NEW.subscribed_price
            );
        ELSE
            -- Minor update, don't log
            RETURN NEW;
        END IF;
    END IF;

    IF v_event_type IS NOT NULL THEN
        INSERT INTO public.store_subscription_history (subscription_id, event_type, event_data)
        VALUES (NEW.id, v_event_type, v_event_data);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER log_subscription_changes
    AFTER INSERT OR UPDATE ON public.store_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.log_subscription_change();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE public.store_subscriptions IS
    'Auto-ship subscriptions for recurring product orders. Customers can subscribe to products for automatic reordering.';

COMMENT ON TABLE public.store_subscription_history IS
    'Audit log for all subscription events including creation, pauses, cancellations, and order processing.';

COMMENT ON COLUMN public.store_subscriptions.frequency_days IS
    'Number of days between orders. Minimum 7 days, maximum 180 days.';

COMMENT ON COLUMN public.store_subscriptions.subscribed_price IS
    'Price at time of subscription. Used to notify customer of price changes.';

COMMENT ON FUNCTION public.get_customer_subscriptions IS
    'Get all active/paused subscriptions for a customer with current product info and price change detection.';
