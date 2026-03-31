-- =============================================================================
-- 02_STAFF_ALERT_PREFERENCES.SQL
-- =============================================================================
-- Staff notification preferences for inventory alerts
--
-- DEPENDENCIES: 10_core/01_tenants.sql, 10_core/02_profiles.sql
-- =============================================================================

-- =============================================================================
-- STAFF ALERT PREFERENCES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.staff_alert_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Alert types enabled
    low_stock_alerts BOOLEAN NOT NULL DEFAULT true,
    expiry_alerts BOOLEAN NOT NULL DEFAULT true,
    out_of_stock_alerts BOOLEAN NOT NULL DEFAULT true,

    -- Notification channels
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,

    -- Thresholds
    low_stock_threshold INTEGER DEFAULT 5,
    expiry_days_warning INTEGER DEFAULT 30,

    -- Contact info (can override profile defaults)
    notification_email TEXT,
    notification_phone TEXT,

    -- Digest settings
    digest_frequency TEXT NOT NULL DEFAULT 'immediate'
        CHECK (digest_frequency IN ('immediate', 'daily', 'weekly')),
    last_digest_sent_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One preference record per staff member per tenant
    CONSTRAINT staff_alert_preferences_unique UNIQUE(profile_id, tenant_id)
);

COMMENT ON TABLE public.staff_alert_preferences IS 'Staff notification preferences for inventory and stock alerts';
COMMENT ON COLUMN public.staff_alert_preferences.digest_frequency IS 'How often to send alert digests: immediate, daily, weekly';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_staff_alert_preferences_tenant
    ON public.staff_alert_preferences(tenant_id);

CREATE INDEX IF NOT EXISTS idx_staff_alert_preferences_profile
    ON public.staff_alert_preferences(profile_id);

-- Index for finding staff who want email notifications
CREATE INDEX IF NOT EXISTS idx_staff_alert_preferences_email
    ON public.staff_alert_preferences(tenant_id)
    WHERE email_enabled = true;

-- Index for finding staff who want WhatsApp notifications
CREATE INDEX IF NOT EXISTS idx_staff_alert_preferences_whatsapp
    ON public.staff_alert_preferences(tenant_id)
    WHERE whatsapp_enabled = true;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.staff_alert_preferences ENABLE ROW LEVEL SECURITY;

-- Staff can manage their own preferences
CREATE POLICY "Staff manage own preferences" ON public.staff_alert_preferences
    FOR ALL
    USING (profile_id = auth.uid());

-- Admins can view all preferences in their tenant
CREATE POLICY "Admins view tenant preferences" ON public.staff_alert_preferences
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = staff_alert_preferences.tenant_id
            AND p.role = 'admin'
        )
    );

-- =============================================================================
-- ALERT HISTORY (for tracking sent notifications)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.stock_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    profile_id UUID REFERENCES public.profiles(id),

    -- Alert type
    alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring', 'expired')),

    -- Channel used
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'in_app')),

    -- Related products (array of product IDs)
    product_ids UUID[] NOT NULL,

    -- Delivery status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

COMMENT ON TABLE public.stock_alert_history IS 'History of stock alert notifications sent to staff';

CREATE INDEX IF NOT EXISTS idx_stock_alert_history_tenant
    ON public.stock_alert_history(tenant_id);

CREATE INDEX IF NOT EXISTS idx_stock_alert_history_profile
    ON public.stock_alert_history(profile_id);

CREATE INDEX IF NOT EXISTS idx_stock_alert_history_recent
    ON public.stock_alert_history(created_at DESC);

ALTER TABLE public.stock_alert_history ENABLE ROW LEVEL SECURITY;

-- Staff can view their own alert history
CREATE POLICY "Staff view own history" ON public.stock_alert_history
    FOR SELECT
    USING (profile_id = auth.uid());

-- Admins can view all history in their tenant
CREATE POLICY "Admins view tenant history" ON public.stock_alert_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = stock_alert_history.tenant_id
            AND p.role = 'admin'
        )
    );

-- System can insert history records
CREATE POLICY "System insert history" ON public.stock_alert_history
    FOR INSERT
    WITH CHECK (true);

-- =============================================================================
-- TRIGGER: Update timestamp
-- =============================================================================

CREATE TRIGGER handle_staff_alert_preferences_updated_at
    BEFORE UPDATE ON public.staff_alert_preferences
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
