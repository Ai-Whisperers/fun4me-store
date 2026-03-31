-- =============================================================================
-- 03_INVITES.SQL
-- =============================================================================
-- Clinic invite system for onboarding new users to specific tenants.
-- Supports inviting clients, vets, and admins with email-based acceptance.
--
-- DEPENDENCIES: 01_tenants.sql, 02_profiles.sql
-- =============================================================================

-- =============================================================================
-- CLINIC INVITES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clinic_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Invite details
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),

    -- Invite metadata
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    message TEXT,  -- Optional personal message to invitee

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

    -- Acceptance tracking
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT clinic_invites_email_format CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT clinic_invites_message_length CHECK (
        message IS NULL OR char_length(message) <= 500
    )
);

COMMENT ON TABLE public.clinic_invites IS 'Email invitations to join a clinic as owner/vet/admin';
COMMENT ON COLUMN public.clinic_invites.status IS 'pending: awaiting acceptance, accepted: user signed up, expired: past expiry, cancelled: revoked';
COMMENT ON COLUMN public.clinic_invites.expires_at IS 'Invite expires after 7 days by default';
COMMENT ON COLUMN public.clinic_invites.message IS 'Optional personal message from inviter to invitee';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.clinic_invites ENABLE ROW LEVEL SECURITY;

-- Staff can manage invites for their tenant
DROP POLICY IF EXISTS "Staff manage invites" ON public.clinic_invites;
CREATE POLICY "Staff manage invites" ON public.clinic_invites
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

-- Service role full access for admin operations
DROP POLICY IF EXISTS "Service role full access" ON public.clinic_invites;
CREATE POLICY "Service role full access" ON public.clinic_invites
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_clinic_invites_tenant ON public.clinic_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invites_email ON public.clinic_invites(email);

-- FK indexes (for join performance)
CREATE INDEX IF NOT EXISTS idx_clinic_invites_invited_by ON public.clinic_invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_clinic_invites_accepted_by ON public.clinic_invites(accepted_by);

-- Pending invites lookup (used in handle_new_user trigger)
CREATE INDEX IF NOT EXISTS idx_clinic_invites_pending ON public.clinic_invites(email, status, expires_at)
    WHERE status = 'pending';

-- Tenant's active invites
CREATE INDEX IF NOT EXISTS idx_clinic_invites_tenant_pending ON public.clinic_invites(tenant_id, status)
    INCLUDE (email, role, expires_at, invited_by)
    WHERE status = 'pending';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.clinic_invites;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.clinic_invites
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Create invite function (with duplicate checking)
CREATE OR REPLACE FUNCTION public.create_clinic_invite(
    p_tenant_id TEXT,
    p_email TEXT,
    p_role TEXT DEFAULT 'owner',
    p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_invite_id UUID;
BEGIN
    -- Validate role
    IF p_role NOT IN ('owner', 'vet', 'admin') THEN
        RAISE EXCEPTION 'Invalid role: %', p_role
            USING ERRCODE = 'invalid_parameter_value',
                  HINT = 'Role must be one of: owner, vet, admin';
    END IF;

    -- Check if user already exists in this tenant
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE email = p_email
        AND tenant_id = p_tenant_id
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'User already belongs to this clinic'
            USING ERRCODE = 'unique_violation',
                  HINT = 'This email is already registered with this clinic';
    END IF;

    -- Cancel any existing pending invites for this email/tenant
    UPDATE public.clinic_invites
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE email = p_email
    AND tenant_id = p_tenant_id
    AND status = 'pending';

    -- Create new invite
    INSERT INTO public.clinic_invites (tenant_id, email, role, invited_by, message)
    VALUES (p_tenant_id, LOWER(TRIM(p_email)), p_role, auth.uid(), p_message)
    RETURNING id INTO v_invite_id;

    RETURN v_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.create_clinic_invite(TEXT, TEXT, TEXT, TEXT) IS
'Create a clinic invite. Cancels existing pending invites for same email/tenant.
Returns the new invite UUID.';

-- Check invite validity (for signup flow)
CREATE OR REPLACE FUNCTION public.check_invite(p_email TEXT)
RETURNS TABLE (
    invite_id UUID,
    tenant_id TEXT,
    tenant_name TEXT,
    role TEXT,
    expires_at TIMESTAMPTZ,
    message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ci.id,
        ci.tenant_id,
        t.name,
        ci.role,
        ci.expires_at,
        ci.message
    FROM public.clinic_invites ci
    JOIN public.tenants t ON t.id = ci.tenant_id
    WHERE ci.email = LOWER(TRIM(p_email))
    AND ci.status = 'pending'
    AND (ci.expires_at IS NULL OR ci.expires_at > NOW())
    ORDER BY ci.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.check_invite(TEXT) IS
'Check if a valid pending invite exists for an email. Used during signup flow.';

-- Expire old invites (for scheduled job)
CREATE OR REPLACE FUNCTION public.expire_old_invites()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.clinic_invites
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.expire_old_invites() IS
'Mark expired invites as expired. Returns count of updated invites. Run via scheduled job.';

-- Resend invite (extends expiry)
CREATE OR REPLACE FUNCTION public.resend_invite(p_invite_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE public.clinic_invites
    SET expires_at = NOW() + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = p_invite_id
    AND status = 'pending';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.resend_invite(UUID) IS
'Extend invite expiry by 7 days. Returns true if successful.';

-- Cancel invite
CREATE OR REPLACE FUNCTION public.cancel_invite(p_invite_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE public.clinic_invites
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_invite_id
    AND status = 'pending';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.cancel_invite(UUID) IS
'Cancel a pending invite. Returns true if successful.';
