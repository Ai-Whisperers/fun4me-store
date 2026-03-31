-- =============================================================================
-- 02_AUDIT.SQL
-- =============================================================================
-- System audit, notifications, QR tags, lost pets, disease surveillance.
--
-- DEPENDENCIES: 00_setup/*, 10_core/*, 20_pets/*
-- =============================================================================

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Action info
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id UUID,

    -- Details
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',

    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail for security and compliance. Admin view only.';
COMMENT ON COLUMN public.audit_logs.action IS 'Action performed: create, update, delete, view, export, login, etc.';
COMMENT ON COLUMN public.audit_logs.resource IS 'Resource type affected (e.g., pet, invoice, prescription)';
COMMENT ON COLUMN public.audit_logs.old_values IS 'Previous values for updates (JSONB snapshot)';
COMMENT ON COLUMN public.audit_logs.new_values IS 'New values for creates/updates (JSONB snapshot)';

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Notification info
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Reference
    reference_type TEXT,
    reference_id UUID,
    action_url TEXT,

    -- Status
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,

    -- Delivery
    channels TEXT[] DEFAULT ARRAY['in_app'],  -- in_app, email, push, sms
    delivered_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'In-app notifications for users (reminders, alerts, updates)';
COMMENT ON COLUMN public.notifications.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN public.notifications.channels IS 'Delivery channels: in_app, email, push, sms';
COMMENT ON COLUMN public.notifications.read_at IS 'When user read the notification (NULL = unread)';

-- =============================================================================
-- QR TAGS - Extended columns (base table in 20_pets/01_pets.sql)
-- =============================================================================
-- Add columns for theft prevention and scan tracking

ALTER TABLE public.qr_tags ADD COLUMN IF NOT EXISTS previous_pet_id UUID REFERENCES public.pets(id);
ALTER TABLE public.qr_tags ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMPTZ;
ALTER TABLE public.qr_tags ADD COLUMN IF NOT EXISTS reassigned_reason TEXT;
ALTER TABLE public.qr_tags ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;
ALTER TABLE public.qr_tags ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0;
ALTER TABLE public.qr_tags ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.qr_tags ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.qr_tags.previous_pet_id IS 'Previous pet for theft prevention tracking';
COMMENT ON COLUMN public.qr_tags.reassigned_reason IS 'Why tag was reassigned (lost, new owner, etc.)';
COMMENT ON COLUMN public.qr_tags.scan_count IS 'Total times this tag has been scanned';

-- =============================================================================
-- QR TAG SCANS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.qr_tag_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES public.qr_tags(id),
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Scan info
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,

    -- Location (if available)
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    location_accuracy NUMERIC,

    -- Contact attempt
    contact_attempted BOOLEAN DEFAULT false,
    contact_method TEXT,
    contact_details TEXT,

    -- Scanner info (if authenticated)
    scanned_by UUID REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.qr_tag_scans IS 'Log of QR tag scans with location data for lost pet tracking';
COMMENT ON COLUMN public.qr_tag_scans.contact_attempted IS 'TRUE if finder attempted to contact owner';
COMMENT ON COLUMN public.qr_tag_scans.location_accuracy IS 'GPS accuracy in meters';

-- =============================================================================
-- LOST PETS - Extended columns (base table in 20_pets/01_pets.sql)
-- =============================================================================
-- Add columns for enhanced lost pet features

ALTER TABLE public.lost_pets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.lost_pets ADD COLUMN IF NOT EXISTS distinctive_features TEXT;
ALTER TABLE public.lost_pets ADD COLUMN IF NOT EXISTS wearing TEXT;
ALTER TABLE public.lost_pets ADD COLUMN IF NOT EXISTS reward_offered BOOLEAN DEFAULT false;
ALTER TABLE public.lost_pets ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(12,2);
ALTER TABLE public.lost_pets ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.lost_pets ADD COLUMN IF NOT EXISTS share_url TEXT;
ALTER TABLE public.lost_pets ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.lost_pets.is_public IS 'TRUE to show on public lost pet board';
COMMENT ON COLUMN public.lost_pets.distinctive_features IS 'Notable features to identify the pet';

-- =============================================================================
-- DISEASE REPORTS (Epidemiology / Surveillance)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.disease_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Report info
    diagnosis_code TEXT,
    diagnosis_name TEXT NOT NULL,
    species TEXT NOT NULL,

    -- Location (zone-based for privacy)
    location_zone TEXT,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),

    -- Case info
    case_date DATE NOT NULL DEFAULT CURRENT_DATE,
    case_count INTEGER DEFAULT 1 CHECK (case_count > 0),
    outcome TEXT CHECK (outcome IN ('recovered', 'deceased', 'ongoing', 'unknown')),

    -- Severity
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),

    -- Anonymous pet reference (no FK for privacy)
    pet_age_months INTEGER,
    pet_breed TEXT,
    pet_sex TEXT,

    -- Reported by
    reported_by UUID REFERENCES public.profiles(id),

    -- Lab confirmation
    lab_confirmed BOOLEAN DEFAULT false,
    lab_order_id UUID,  -- Optional reference to lab_orders

    -- Notifiable disease
    is_notifiable BOOLEAN DEFAULT false,
    notified_authority BOOLEAN DEFAULT false,
    notified_at TIMESTAMPTZ,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.disease_reports IS 'Epidemiological surveillance: anonymized disease case reports for outbreak detection';
COMMENT ON COLUMN public.disease_reports.location_zone IS 'Geographic zone (anonymized for privacy)';
COMMENT ON COLUMN public.disease_reports.is_notifiable IS 'TRUE if disease must be reported to government authorities';
COMMENT ON COLUMN public.disease_reports.lab_confirmed IS 'TRUE if diagnosis was confirmed by laboratory testing';
COMMENT ON COLUMN public.disease_reports.severity IS 'Case severity: mild, moderate, severe, critical';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tag_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_reports ENABLE ROW LEVEL SECURITY;

-- Audit logs: Admin view only (immutable)
DROP POLICY IF EXISTS "Admin view audit logs" ON public.audit_logs;
CREATE POLICY "Admin view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = audit_logs.tenant_id
            AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role manage audit logs" ON public.audit_logs;
CREATE POLICY "Service role manage audit logs" ON public.audit_logs
    FOR ALL TO service_role USING (true);

-- Notifications: Users manage own
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manage notifications" ON public.notifications;
CREATE POLICY "Service role manage notifications" ON public.notifications
    FOR ALL TO service_role USING (true);

-- QR tags: Staff manage
DROP POLICY IF EXISTS "Staff manage QR tags" ON public.qr_tags;
CREATE POLICY "Staff manage QR tags" ON public.qr_tags
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view own pet tags" ON public.qr_tags;
CREATE POLICY "Owners view own pet tags" ON public.qr_tags
    FOR SELECT TO authenticated
    USING (
        pet_id IS NOT NULL
        AND public.is_owner_of_pet(pet_id)
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS "Public view active registered tags" ON public.qr_tags;
CREATE POLICY "Public view active registered tags" ON public.qr_tags
    FOR SELECT USING (is_active = true AND is_registered = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access QR tags" ON public.qr_tags;
CREATE POLICY "Service role full access QR tags" ON public.qr_tags
    FOR ALL TO service_role USING (true);

-- QR scans: Public insert, staff view
DROP POLICY IF EXISTS "Public log scans" ON public.qr_tag_scans;
CREATE POLICY "Public log scans" ON public.qr_tag_scans
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff view scans" ON public.qr_tag_scans;
CREATE POLICY "Staff view scans" ON public.qr_tag_scans
    FOR SELECT TO authenticated
    USING (
        tenant_id IS NOT NULL AND public.is_staff_of(tenant_id)
    );

DROP POLICY IF EXISTS "Service role full access scans" ON public.qr_tag_scans;
CREATE POLICY "Service role full access scans" ON public.qr_tag_scans
    FOR ALL TO service_role USING (true);

-- Lost pets: Public view public, staff and owners manage
DROP POLICY IF EXISTS "Public view public lost pets" ON public.lost_pets;
CREATE POLICY "Public view public lost pets" ON public.lost_pets
    FOR SELECT USING (is_public = true AND status = 'lost');

DROP POLICY IF EXISTS "Staff manage lost pets" ON public.lost_pets;
CREATE POLICY "Staff manage lost pets" ON public.lost_pets
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Owners manage own reports" ON public.lost_pets;
CREATE POLICY "Owners manage own reports" ON public.lost_pets
    FOR ALL TO authenticated
    USING (public.is_owner_of_pet(pet_id));

DROP POLICY IF EXISTS "Service role full access lost pets" ON public.lost_pets;
CREATE POLICY "Service role full access lost pets" ON public.lost_pets
    FOR ALL TO service_role USING (true);

-- Disease reports: Staff manage, public read aggregate only
DROP POLICY IF EXISTS "Staff manage disease reports" ON public.disease_reports;
CREATE POLICY "Staff manage disease reports" ON public.disease_reports
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access disease reports" ON public.disease_reports;
CREATE POLICY "Service role full access disease reports" ON public.disease_reports
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_brin ON public.audit_logs
    USING BRIN(created_at) WITH (pages_per_range = 32);

-- Covering index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs(tenant_id, created_at DESC)
    INCLUDE (user_id, action, resource);

-- Composite BRIN for tenant + time queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_brin ON public.audit_logs
    USING BRIN(tenant_id, created_at) WITH (pages_per_range = 64);

-- GIN indexes for JSONB columns (efficient value searches in audit data)
CREATE INDEX IF NOT EXISTS idx_audit_logs_old_values_gin ON public.audit_logs USING gin(old_values jsonb_path_ops)
    WHERE old_values IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_values_gin ON public.audit_logs USING gin(new_values jsonb_path_ops)
    WHERE new_values IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin ON public.audit_logs USING gin(metadata jsonb_path_ops)
    WHERE metadata IS NOT NULL AND metadata != '{}';

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read_at)
    WHERE read_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_brin ON public.notifications
    USING BRIN(created_at) WITH (pages_per_range = 32);

-- Unread notifications for user
CREATE INDEX IF NOT EXISTS idx_notifications_unread_list ON public.notifications(user_id, created_at DESC)
    INCLUDE (type, title, message, reference_type, reference_id)
    WHERE read_at IS NULL AND dismissed_at IS NULL;

-- QR tags
CREATE INDEX IF NOT EXISTS idx_qr_tags_code ON public.qr_tags(code);
CREATE INDEX IF NOT EXISTS idx_qr_tags_pet ON public.qr_tags(pet_id);
CREATE INDEX IF NOT EXISTS idx_qr_tags_tenant ON public.qr_tags(tenant_id);

-- One QR tag per pet (active tags only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_qr_tag_per_pet ON public.qr_tags(pet_id)
    WHERE pet_id IS NOT NULL AND is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qr_tags_batch ON public.qr_tags(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_tags_active ON public.qr_tags(is_active)
    WHERE is_active = true AND deleted_at IS NULL;

-- QR scans
CREATE INDEX IF NOT EXISTS idx_qr_tag_scans_tag ON public.qr_tag_scans(tag_id);
CREATE INDEX IF NOT EXISTS idx_qr_tag_scans_tenant ON public.qr_tag_scans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_tag_scans_scanned_brin ON public.qr_tag_scans
    USING BRIN(scanned_at) WITH (pages_per_range = 32);

-- Lost pets
CREATE INDEX IF NOT EXISTS idx_lost_pets_pet ON public.lost_pets(pet_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_tenant ON public.lost_pets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON public.lost_pets(status);

-- Unique lost pet report per pet (only one active)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_lost_report_per_pet ON public.lost_pets(pet_id)
    WHERE status = 'lost';
CREATE INDEX IF NOT EXISTS idx_lost_pets_public ON public.lost_pets(is_public)
    WHERE is_public = true AND status = 'lost';
CREATE INDEX IF NOT EXISTS idx_lost_pets_location ON public.lost_pets(last_seen_lat, last_seen_lng)
    WHERE status = 'lost';

-- Disease reports
CREATE INDEX IF NOT EXISTS idx_disease_reports_tenant ON public.disease_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_disease_reports_date_brin ON public.disease_reports
    USING BRIN(case_date) WITH (pages_per_range = 32);
CREATE INDEX IF NOT EXISTS idx_disease_reports_diagnosis ON public.disease_reports(diagnosis_code);
CREATE INDEX IF NOT EXISTS idx_disease_reports_species ON public.disease_reports(species);
CREATE INDEX IF NOT EXISTS idx_disease_reports_location ON public.disease_reports(location_zone);

-- Covering index for surveillance queries
CREATE INDEX IF NOT EXISTS idx_disease_reports_surveillance ON public.disease_reports(tenant_id, case_date DESC)
    INCLUDE (diagnosis_code, species, severity, case_count);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.qr_tags;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.qr_tags
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.lost_pets;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.lost_pets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id for QR scans
CREATE OR REPLACE FUNCTION public.qr_tag_scans_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.qr_tags
        WHERE id = NEW.tag_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS qr_scans_auto_tenant ON public.qr_tag_scans;
CREATE TRIGGER qr_scans_auto_tenant
    BEFORE INSERT ON public.qr_tag_scans
    FOR EACH ROW EXECUTE FUNCTION public.qr_tag_scans_set_tenant_id();

-- Update tag on scan
CREATE OR REPLACE FUNCTION public.update_qr_tag_on_scan()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.qr_tags
    SET last_scanned_at = NEW.scanned_at,
        scan_count = scan_count + 1
    WHERE id = NEW.tag_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS qr_scan_update_tag ON public.qr_tag_scans;
CREATE TRIGGER qr_scan_update_tag
    AFTER INSERT ON public.qr_tag_scans
    FOR EACH ROW EXECUTE FUNCTION public.update_qr_tag_on_scan();

-- Track QR tag reassignment
CREATE OR REPLACE FUNCTION public.track_qr_tag_reassignment()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.pet_id IS NOT NULL AND NEW.pet_id IS DISTINCT FROM OLD.pet_id THEN
        NEW.previous_pet_id := OLD.pet_id;
        NEW.reassigned_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS qr_tag_reassignment ON public.qr_tags;
CREATE TRIGGER qr_tag_reassignment
    BEFORE UPDATE ON public.qr_tags
    FOR EACH ROW
    WHEN (OLD.pet_id IS NOT NULL AND NEW.pet_id IS DISTINCT FROM OLD.pet_id)
    EXECUTE FUNCTION public.track_qr_tag_reassignment();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Log audit event
CREATE OR REPLACE FUNCTION public.log_audit(
    p_tenant_id TEXT,
    p_action TEXT,
    p_resource TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        tenant_id, user_id, action, resource,
        resource_id, old_values, new_values, metadata
    )
    VALUES (
        p_tenant_id, auth.uid(), p_action, p_resource,
        p_resource_id, p_old_values, p_new_values, COALESCE(p_metadata, '{}')
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT 'normal',
    p_channels TEXT[] DEFAULT ARRAY['in_app']
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_tenant_id TEXT;
BEGIN
    SELECT tenant_id INTO v_tenant_id
    FROM public.profiles
    WHERE id = p_user_id;

    INSERT INTO public.notifications (
        user_id, tenant_id, type, title, message,
        reference_type, reference_id, action_url, priority, channels
    )
    VALUES (
        p_user_id, v_tenant_id, p_type, p_title, p_message,
        p_reference_type, p_reference_id, p_action_url, p_priority, p_channels
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate QR code
CREATE OR REPLACE FUNCTION public.generate_qr_code(p_prefix TEXT DEFAULT 'VET')
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Format: PREFIX-XXXXXXXX (8 hex chars)
        v_code := p_prefix || '-' || UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));

        SELECT EXISTS (SELECT 1 FROM public.qr_tags WHERE code = v_code) INTO v_exists;

        IF NOT v_exists THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN v_code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create QR tag batch
CREATE OR REPLACE FUNCTION public.create_qr_tag_batch(
    p_tenant_id TEXT,
    p_count INTEGER,
    p_prefix TEXT DEFAULT 'VET'
)
RETURNS TABLE (tag_id UUID, code TEXT) AS $$
DECLARE
    v_batch_id TEXT;
    v_code TEXT;
BEGIN
    v_batch_id := 'BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');

    FOR i IN 1..p_count LOOP
        v_code := public.generate_qr_code(p_prefix);

        INSERT INTO public.qr_tags (tenant_id, code, batch_id)
        VALUES (p_tenant_id, v_code, v_batch_id)
        RETURNING id, qr_tags.code INTO tag_id, code;

        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.notifications
        WHERE user_id = p_user_id
          AND read_at IS NULL
          AND dismissed_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Mark all as read
        UPDATE public.notifications
        SET read_at = NOW()
        WHERE user_id = p_user_id
          AND read_at IS NULL;
    ELSE
        -- Mark specific ones
        UPDATE public.notifications
        SET read_at = NOW()
        WHERE user_id = p_user_id
          AND id = ANY(p_notification_ids)
          AND read_at IS NULL;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get disease outbreak alerts
CREATE OR REPLACE FUNCTION public.get_disease_alerts(
    p_tenant_id TEXT,
    p_days INTEGER DEFAULT 7,
    p_threshold INTEGER DEFAULT 3
)
RETURNS TABLE (
    diagnosis_code TEXT,
    diagnosis_name TEXT,
    species TEXT,
    case_count BIGINT,
    first_case DATE,
    last_case DATE,
    location_zone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dr.diagnosis_code,
        dr.diagnosis_name,
        dr.species,
        SUM(dr.case_count)::BIGINT,
        MIN(dr.case_date),
        MAX(dr.case_date),
        dr.location_zone
    FROM public.disease_reports dr
    WHERE dr.tenant_id = p_tenant_id
      AND dr.case_date >= CURRENT_DATE - p_days
    GROUP BY dr.diagnosis_code, dr.diagnosis_name, dr.species, dr.location_zone
    HAVING SUM(dr.case_count) >= p_threshold
    ORDER BY SUM(dr.case_count) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


