-- =============================================================================
-- 036_PLATFORM_ADMIN.SQL
-- =============================================================================
-- Adds platform administrator role for cross-tenant management.
-- Platform admins can access all tenants for bulk purchasing, analytics,
-- and platform-wide operations.
--
-- CHANGES:
-- 1. Add is_platform_admin column to profiles
-- 2. Create platform_audit_logs table for cross-tenant actions
-- 3. Create platform_settings table for global configuration
-- 4. Create helper function for platform admin checks
-- 5. Update RLS policies to allow platform admin access
-- =============================================================================

-- =============================================================================
-- ADD PLATFORM ADMIN FLAG TO PROFILES
-- =============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_platform_admin IS
'Whether user is a platform administrator with cross-tenant access';

-- Index for quick platform admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_platform_admin
ON public.profiles(is_platform_admin) WHERE is_platform_admin = true;

-- =============================================================================
-- PLATFORM AUDIT LOGS TABLE
-- =============================================================================
-- Tracks all platform-level administrative actions

CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who performed the action
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

    -- What action was taken
    action TEXT NOT NULL,
    action_category TEXT NOT NULL CHECK (action_category IN (
        'tenant_management',
        'user_management',
        'bulk_purchasing',
        'system_config',
        'security',
        'data_export'
    )),

    -- Target of the action
    target_tenant_id TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_resource_type TEXT,
    target_resource_id TEXT,

    -- Details
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,

    -- Result
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'pending')),
    error_message TEXT,

    -- Timestamp (no updated_at - audit logs are immutable)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.platform_audit_logs IS
'Audit trail for all platform administrator actions';

-- RLS for platform audit logs (only platform admins can view)
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins view audit logs" ON public.platform_audit_logs;
CREATE POLICY "Platform admins view audit logs" ON public.platform_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_platform_admin = true
        )
    );

DROP POLICY IF EXISTS "System can insert audit logs" ON public.platform_audit_logs;
CREATE POLICY "System can insert audit logs" ON public.platform_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_platform_admin = true
        )
    );

-- Indexes for platform audit logs
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_admin ON public.platform_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_tenant ON public.platform_audit_logs(target_tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created ON public.platform_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_category ON public.platform_audit_logs(action_category, created_at DESC);

-- =============================================================================
-- PLATFORM SETTINGS TABLE
-- =============================================================================
-- Global platform configuration

CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,

    -- Metadata
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.platform_settings IS
'Global platform configuration settings';

-- RLS for platform settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON public.platform_settings;
CREATE POLICY "Public can view non-sensitive settings" ON public.platform_settings
    FOR SELECT
    USING (NOT (value ? 'sensitive' AND (value->>'sensitive')::boolean = true));

DROP POLICY IF EXISTS "Platform admins manage settings" ON public.platform_settings;
CREATE POLICY "Platform admins manage settings" ON public.platform_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_platform_admin = true
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.platform_settings;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.platform_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value, description) VALUES
    ('platform_name', '"Vete"', 'Platform display name'),
    ('bulk_purchasing_enabled', 'true', 'Whether bulk purchasing feature is enabled'),
    ('min_bulk_order_clinics', '3', 'Minimum clinics needed for bulk order'),
    ('default_currency', '"PYG"', 'Default currency code'),
    ('maintenance_mode', 'false', 'Whether platform is in maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- HELPER FUNCTION: IS_PLATFORM_ADMIN
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_platform_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_platform_admin() IS
'Check if current user is a platform administrator';

-- =============================================================================
-- HELPER FUNCTION: IS_PLATFORM_ADMIN_OF (for specific user check)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = p_user_id
        AND profiles.is_platform_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_platform_admin_user(UUID) IS
'Check if a specific user is a platform administrator';

-- =============================================================================
-- UPDATE EXISTING RLS POLICIES FOR CROSS-TENANT ACCESS
-- =============================================================================
-- Platform admins should be able to view (but not necessarily modify) data
-- across all tenants for analytics and support purposes.

-- TENANTS TABLE: Platform admins can view all tenants
DROP POLICY IF EXISTS "Platform admins view all tenants" ON public.tenants;
CREATE POLICY "Platform admins view all tenants" ON public.tenants
    FOR SELECT TO authenticated
    USING (public.is_platform_admin());

-- PROFILES TABLE: Platform admins can view all profiles
DROP POLICY IF EXISTS "Platform admins view all profiles" ON public.profiles;
CREATE POLICY "Platform admins view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_platform_admin());

-- Note: Additional policies for other tables should be added based on need.
-- Platform admins should generally have READ access, not WRITE access,
-- to prevent accidental data modification in clinics.

-- =============================================================================
-- TENANT STATISTICS VIEW FOR PLATFORM DASHBOARD
-- =============================================================================

CREATE OR REPLACE VIEW public.v_tenant_statistics AS
SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.created_at AS tenant_created_at,
    COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'owner' AND p.deleted_at IS NULL) AS client_count,
    COUNT(DISTINCT p.id) FILTER (WHERE p.role IN ('vet', 'admin') AND p.deleted_at IS NULL) AS staff_count,
    COUNT(DISTINCT pet.id) FILTER (WHERE pet.deleted_at IS NULL) AS pet_count,
    COUNT(DISTINCT a.id) FILTER (WHERE a.start_time >= CURRENT_DATE - INTERVAL '30 days') AS appointments_30d,
    COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid' AND i.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) AS revenue_30d
FROM public.tenants t
LEFT JOIN public.profiles p ON p.tenant_id = t.id
LEFT JOIN public.pets pet ON pet.tenant_id = t.id
LEFT JOIN public.appointments a ON a.tenant_id = t.id
LEFT JOIN public.invoices i ON i.tenant_id = t.id
WHERE t.is_active = true
GROUP BY t.id, t.name, t.created_at;

COMMENT ON VIEW public.v_tenant_statistics IS
'Aggregated statistics for each tenant (for platform dashboard)';

-- =============================================================================
-- PLATFORM ANNOUNCEMENTS TABLE
-- =============================================================================
-- For broadcasting messages to all clinics

CREATE TABLE IF NOT EXISTS public.platform_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    announcement_type TEXT NOT NULL DEFAULT 'info' CHECK (announcement_type IN (
        'info',
        'warning',
        'maintenance',
        'feature',
        'urgent'
    )),

    -- Targeting
    target_roles TEXT[] DEFAULT ARRAY['admin']::TEXT[], -- Which roles see this
    target_tenant_ids TEXT[], -- NULL means all tenants

    -- Display settings
    is_dismissible BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher = more prominent
    action_url TEXT, -- Optional link
    action_label TEXT,

    -- Scheduling
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.platform_announcements IS
'Platform-wide announcements for clinics';

-- RLS
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

-- Staff can view active announcements targeting their role
DROP POLICY IF EXISTS "Staff view relevant announcements" ON public.platform_announcements;
CREATE POLICY "Staff view relevant announcements" ON public.platform_announcements
    FOR SELECT TO authenticated
    USING (
        is_active = true
        AND NOW() >= starts_at
        AND (ends_at IS NULL OR NOW() < ends_at)
        AND (
            target_tenant_ids IS NULL
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.tenant_id = ANY(target_tenant_ids)
            )
        )
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = ANY(target_roles)
        )
    );

-- Platform admins manage announcements
DROP POLICY IF EXISTS "Platform admins manage announcements" ON public.platform_announcements;
CREATE POLICY "Platform admins manage announcements" ON public.platform_announcements
    FOR ALL TO authenticated
    USING (public.is_platform_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_announcements_active
ON public.platform_announcements(is_active, starts_at, ends_at)
WHERE is_active = true;

-- Trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.platform_announcements;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.platform_announcements
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- DISMISSED ANNOUNCEMENTS TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dismissed_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.platform_announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(announcement_id, user_id)
);

-- RLS
ALTER TABLE public.dismissed_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own dismissals" ON public.dismissed_announcements;
CREATE POLICY "Users manage own dismissals" ON public.dismissed_announcements
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_dismissed_announcements_user
ON public.dismissed_announcements(user_id);

-- =============================================================================
-- LOG PLATFORM ADMIN ACTIONS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_platform_action(
    p_action TEXT,
    p_category TEXT,
    p_target_tenant_id TEXT DEFAULT NULL,
    p_target_user_id UUID DEFAULT NULL,
    p_target_resource_type TEXT DEFAULT NULL,
    p_target_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Verify caller is platform admin
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Only platform administrators can log platform actions';
    END IF;

    INSERT INTO public.platform_audit_logs (
        admin_id,
        action,
        action_category,
        target_tenant_id,
        target_user_id,
        target_resource_type,
        target_resource_id,
        details
    )
    VALUES (
        auth.uid(),
        p_action,
        p_category,
        p_target_tenant_id,
        p_target_user_id,
        p_target_resource_type,
        p_target_resource_id,
        p_details
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_platform_action(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB) IS
'Log a platform administrator action for audit purposes';

-- =============================================================================
-- ANALYZE TABLES
-- =============================================================================
ANALYZE public.profiles;
ANALYZE public.platform_audit_logs;
ANALYZE public.platform_settings;
ANALYZE public.platform_announcements;
ANALYZE public.dismissed_announcements;
