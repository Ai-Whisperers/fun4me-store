-- =============================================================================
-- 011_QUICK_FIX_PROFILE_CREATION.SQL
-- =============================================================================
-- EMERGENCY FIX: Run this on your Supabase database to fix profile creation.
--
-- Copy this entire file and paste into Supabase SQL Editor to apply.
--
-- Issues fixed:
-- 1. Missing INSERT policy on profiles table (users couldn't create own profile)
-- 2. Trigger failing silently without creating profile
-- 3. Demo accounts hardcoded in trigger (security risk)
-- =============================================================================

BEGIN;

-- =============================================================================
-- FIX 1: Add INSERT policy to profiles (allows fallback creation)
-- =============================================================================

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- =============================================================================
-- FIX 2: Create demo_accounts table (if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.demo_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage demo accounts" ON public.demo_accounts;
CREATE POLICY "Service role manage demo accounts" ON public.demo_accounts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed demo accounts
INSERT INTO public.demo_accounts (email, tenant_id, role) VALUES
    ('admin@demo.com', 'adris', 'admin'),
    ('vet@demo.com', 'adris', 'vet'),
    ('owner@demo.com', 'adris', 'owner'),
    ('owner2@demo.com', 'adris', 'owner'),
    ('vet@petlife.com', 'petlife', 'vet'),
    ('admin@petlife.com', 'petlife', 'admin')
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- FIX 3: Update handle_new_user() with robust error handling
-- =============================================================================

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

            UPDATE public.clinic_invites
            SET status = 'accepted', accepted_at = NOW(), accepted_by = NEW.id
            WHERE email = NEW.email AND status = 'pending';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Table might not exist
    END;

    -- 2. Check demo accounts
    IF v_tenant_id IS NULL THEN
        BEGIN
            SELECT tenant_id, role INTO demo_record
            FROM public.demo_accounts
            WHERE email = NEW.email AND is_active = true;

            IF demo_record.tenant_id IS NOT NULL THEN
                v_tenant_id := demo_record.tenant_id;
                v_role := demo_record.role;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    -- 3. Default: no tenant
    IF v_tenant_id IS NULL THEN
        v_role := 'owner';
    END IF;

    -- Create profile with conflict handling
    INSERT INTO public.profiles (id, full_name, email, avatar_url, tenant_id, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
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
    RAISE WARNING 'handle_new_user failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX 4: Recreate trigger
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- =============================================================================
-- VERIFICATION: Check the fixes were applied
-- =============================================================================

SELECT 'Policies on profiles:' as check_type;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;

SELECT 'Demo accounts:' as check_type;
SELECT email, tenant_id, role FROM demo_accounts WHERE is_active = true;

SELECT 'Trigger status:' as check_type;
SELECT tgname, tgtype FROM pg_trigger WHERE tgname = 'on_auth_user_created';
