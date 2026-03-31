-- =============================================================================
-- 02_PROFILES.SQL
-- =============================================================================
-- User profiles extending auth.users with application-specific data.
-- Links Supabase Auth users to tenant-specific roles and information.
--
-- DEPENDENCIES: 01_tenants.sql
-- =============================================================================

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- REFERENCES auth.users(id) ON DELETE CASCADE, -- Disabled for seeding
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,

    -- Identity
    full_name TEXT,
    email TEXT,  -- Denormalized from auth.users for queries
    phone TEXT,
    secondary_phone TEXT,
    avatar_url TEXT,

    -- Role-based access control
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),

    -- Owner-specific fields (clients)
    client_code TEXT,            -- Unique client identifier within tenant
    address TEXT,
    city TEXT,
    document_type TEXT,          -- CI, RUC, Pasaporte
    document_number TEXT,
    preferred_contact TEXT DEFAULT 'phone' CHECK (preferred_contact IN ('phone', 'email', 'whatsapp', 'sms')),
    notes TEXT,                  -- Internal notes about this client

    -- Vet/Staff-specific fields
    signature_url TEXT,          -- Digital signature for prescriptions
    license_number TEXT,         -- Professional license
    specializations TEXT[],      -- ['surgery', 'dermatology', etc.]
    bio TEXT,                    -- Public bio for display

    -- Soft delete (proper FK to profiles)
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT profiles_phone_length CHECK (phone IS NULL OR char_length(phone) >= 6),
    CONSTRAINT profiles_email_format CHECK (
        email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT profiles_name_length CHECK (full_name IS NULL OR char_length(full_name) >= 2),
    -- Staff must have email and name (critical for clinic operations)
    CONSTRAINT profiles_staff_requires_info CHECK (
        role = 'owner' OR (full_name IS NOT NULL AND email IS NOT NULL)
    )
);

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users with app-specific data';
COMMENT ON COLUMN public.profiles.role IS 'User role: owner (pet owner/client), vet (veterinarian), admin (clinic administrator)';
COMMENT ON COLUMN public.profiles.tenant_id IS 'The clinic this user belongs to. NULL for unassigned users';
COMMENT ON COLUMN public.profiles.client_code IS 'Unique client identifier within the tenant (e.g., CLI-00001)';
COMMENT ON COLUMN public.profiles.preferred_contact IS 'How the client prefers to be contacted';
COMMENT ON COLUMN public.profiles.specializations IS 'Vet specialization areas for staff profiles';

-- =============================================================================
-- CLINIC PROFILES (Junction table for multi-tenancy)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clinic_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Clinic-specific role (may differ from global role)
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),

    -- Membership status
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Clinic-specific settings
    permissions JSONB DEFAULT '{}',  -- Additional permissions within this clinic

    -- Audit
    invited_by UUID REFERENCES public.profiles(id),
    invitation_accepted_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(profile_id, tenant_id)
);

COMMENT ON TABLE public.clinic_profiles IS 'Junction table linking users to clinics they can access. Supports multi-tenancy.';
COMMENT ON COLUMN public.clinic_profiles.role IS 'Role within this specific clinic (may override global role)';
COMMENT ON COLUMN public.clinic_profiles.permissions IS 'Clinic-specific permission overrides';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_clinic_profiles_profile ON public.clinic_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_tenant ON public.clinic_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_active ON public.clinic_profiles(tenant_id, is_active)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.clinic_profiles ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access clinic_profiles" ON public.clinic_profiles;
CREATE POLICY "Service role full access clinic_profiles" ON public.clinic_profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can view their own clinic memberships
DROP POLICY IF EXISTS "Users view own clinic memberships" ON public.clinic_profiles;
CREATE POLICY "Users view own clinic memberships" ON public.clinic_profiles
    FOR SELECT TO authenticated
    USING (profile_id = auth.uid());

-- Clinic staff can manage clinic memberships
DROP POLICY IF EXISTS "Clinic staff manage clinic memberships" ON public.clinic_profiles;
CREATE POLICY "Clinic staff manage clinic memberships" ON public.clinic_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clinic_profiles cp
            WHERE cp.profile_id = auth.uid()
            AND cp.tenant_id = clinic_profiles.tenant_id
            AND cp.role IN ('vet', 'admin')
            AND cp.is_active = true
            AND cp.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clinic_profiles cp
            WHERE cp.profile_id = auth.uid()
            AND cp.tenant_id = clinic_profiles.tenant_id
            AND cp.role IN ('vet', 'admin')
            AND cp.is_active = true
            AND cp.deleted_at IS NULL
        )
    );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger
DROP TRIGGER IF EXISTS handle_updated_at_clinic_profiles ON public.clinic_profiles;
CREATE TRIGGER handle_updated_at_clinic_profiles
    BEFORE UPDATE ON public.clinic_profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Staff can view profiles in their tenant (for client lookup)
DROP POLICY IF EXISTS "Staff view tenant profiles" ON public.profiles;
CREATE POLICY "Staff view tenant profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id) AND deleted_at IS NULL);

-- Staff can update other profiles in their tenant (not their own role/tenant)
DROP POLICY IF EXISTS "Staff update tenant profiles" ON public.profiles;
CREATE POLICY "Staff update tenant profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        tenant_id IS NOT NULL
        AND public.is_staff_of(tenant_id)
        AND id != auth.uid()  -- Can't modify own profile via this policy
        AND deleted_at IS NULL
    );

-- Service role full access for admin operations
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
CREATE POLICY "Service role full access" ON public.profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role ON public.profiles(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted ON public.profiles(deleted_at) WHERE deleted_at IS NULL;

-- Case-insensitive email search
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(LOWER(email));

-- UNIQUE email per tenant (prevents duplicate registrations within a clinic)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_email_per_tenant
ON public.profiles(tenant_id, LOWER(email))
WHERE tenant_id IS NOT NULL AND email IS NOT NULL AND deleted_at IS NULL;

-- Name search with trigrams
CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON public.profiles USING gin(full_name gin_trgm_ops);

-- GIN index for specializations array search
CREATE INDEX IF NOT EXISTS idx_profiles_specializations_gin ON public.profiles USING gin(specializations)
WHERE specializations IS NOT NULL;

-- Unique client code per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_client_code ON public.profiles(tenant_id, client_code)
    WHERE client_code IS NOT NULL AND deleted_at IS NULL;

-- Staff lookup optimization for RLS (is_staff_of function)
CREATE INDEX IF NOT EXISTS idx_profiles_staff_lookup ON public.profiles(id, tenant_id, role)
    WHERE role IN ('vet', 'admin') AND deleted_at IS NULL;

-- Staff listing (covering index for common query)
CREATE INDEX IF NOT EXISTS idx_profiles_staff_list ON public.profiles(tenant_id, role)
    INCLUDE (full_name, email, phone, avatar_url, license_number)
    WHERE role IN ('vet', 'admin') AND deleted_at IS NULL;

-- Client listing (covering index for common query)
CREATE INDEX IF NOT EXISTS idx_profiles_client_list ON public.profiles(tenant_id)
    INCLUDE (full_name, email, phone, client_code, avatar_url)
    WHERE role = 'owner' AND deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Prevent users from modifying their own role/tenant
DROP TRIGGER IF EXISTS protect_critical_columns ON public.profiles;
CREATE TRIGGER protect_critical_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_critical_profile_columns();

-- =============================================================================
-- DEMO ACCOUNTS TABLE (For Development - DELETE IN PRODUCTION)
-- =============================================================================
-- Maps emails to tenants/roles for development without invites

DROP TABLE IF EXISTS public.demo_accounts;
CREATE TABLE public.demo_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),
    full_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.demo_accounts IS 'Development-only: pre-configured accounts for testing. DELETE IN PRODUCTION.';

ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage demo accounts" ON public.demo_accounts;
CREATE POLICY "Service role manage demo accounts" ON public.demo_accounts
    FOR ALL TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_demo_accounts_email ON public.demo_accounts(email) WHERE is_active = true;

-- =============================================================================
-- AUTH TRIGGER (Create profile on signup)
-- =============================================================================
-- Automatically creates a profile when a new user signs up via Supabase Auth.
-- Checks for pending invites or demo accounts to assign tenant/role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    invite_record RECORD;
    demo_record RECORD;
    v_tenant_id TEXT;
    v_role TEXT;
BEGIN
    -- 1. Check for pending invite (highest priority)
    BEGIN
        SELECT tenant_id, role INTO invite_record
        FROM public.clinic_invites
        WHERE email = NEW.email
        AND status = 'pending'
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 1;

        IF invite_record.tenant_id IS NOT NULL THEN
            v_tenant_id := invite_record.tenant_id;
            v_role := COALESCE(invite_record.role, 'owner');

            -- Mark invite as accepted
            UPDATE public.clinic_invites
            SET status = 'accepted',
                accepted_at = NOW(),
                accepted_by = NEW.id
            WHERE email = NEW.email AND status = 'pending';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- clinic_invites table might not exist yet during initial setup
        NULL;
    END;

    -- 2. If no invite, check demo accounts (for dev/test environments)
    IF v_tenant_id IS NULL THEN
        BEGIN
            SELECT tenant_id, role INTO demo_record
            FROM public.demo_accounts
            WHERE email = NEW.email
            AND is_active = true;

            IF demo_record.tenant_id IS NOT NULL THEN
                v_tenant_id := demo_record.tenant_id;
                v_role := demo_record.role;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- demo_accounts table might not exist yet during initial setup
            NULL;
        END;
    END IF;

    -- 3. Default: no tenant assigned (user will be assigned later via portal/invite)
    IF v_tenant_id IS NULL THEN
        v_role := 'owner';
    END IF;

    -- Create profile (with conflict handling for safety)
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        avatar_url,
        tenant_id,
        role
    ) VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        v_tenant_id,
        v_role
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the auth flow
    -- Profile will be created by application fallback
    RAISE WARNING 'handle_new_user failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.handle_new_user() IS
'Auth trigger: Creates profile on user signup, checking for invites/demo accounts to assign tenant/role';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Check if demo mode is enabled (any active demo accounts exist)
CREATE OR REPLACE FUNCTION public.is_demo_mode()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.demo_accounts WHERE is_active = true LIMIT 1
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

COMMENT ON FUNCTION public.is_demo_mode() IS 'Check if demo mode is enabled (any active demo accounts exist)';

-- Generate client code for a new client
CREATE OR REPLACE FUNCTION public.generate_client_code(p_tenant_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN public.next_document_number(p_tenant_id, 'client', 'CLI', 0);
END;
$$ LANGUAGE plpgsql SET search_path = public;

COMMENT ON FUNCTION public.generate_client_code(TEXT) IS 'Generate sequential client code for a tenant. Format: CLI-NNNNNN';

-- =============================================================================
-- DEFERRED POLICIES (require profiles to exist)
-- =============================================================================

-- Admin policy for document_sequences (moved here since profiles now exists)
DROP POLICY IF EXISTS "Admin manage sequences" ON public.document_sequences;
CREATE POLICY "Admin manage sequences" ON public.document_sequences
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = document_sequences.tenant_id
            AND p.role = 'admin'
            AND p.deleted_at IS NULL
        )
    );

-- =============================================================================
-- UPDATE TENANTS RLS (now that profiles table exists)
-- =============================================================================

-- Update tenants RLS to include profile-based access
DROP POLICY IF EXISTS "Authenticated users view active tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated users view own tenant" ON public.tenants;
CREATE POLICY "Authenticated users view own tenant" ON public.tenants
    FOR SELECT TO authenticated
    USING (
        is_active = true
        AND (
            -- Users can see their own tenant
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.tenant_id = tenants.id
            )
            -- Or public discovery (limited info via column security in views)
            OR true
        )
    );