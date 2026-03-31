-- =============================================================================
-- 004_FIX_HANDLE_NEW_USER.SQL
-- =============================================================================
-- Migration to fix handle_new_user() trigger and add demo_accounts table.
--
-- NOTE: As of schema v2, these changes are included in the base 11_profiles.sql.
-- This migration exists for databases that were set up before the fix was merged.
--
-- Safe to run multiple times (idempotent).
-- =============================================================================

BEGIN;

-- =============================================================================
-- A. CREATE DEMO_ACCOUNTS TABLE (if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.demo_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'vet', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add constraint if not exists (might fail on existing tables without constraint)
DO $$
BEGIN
    ALTER TABLE public.demo_accounts
    ADD CONSTRAINT demo_accounts_email_pattern CHECK (
        email LIKE '%@demo.%' OR
        email LIKE '%@test.%' OR
        email LIKE '%@example.%' OR
        email LIKE '%@petlife.%'
    );
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists
    NULL;
END $$;

-- RLS (safe to run multiple times)
ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage demo accounts" ON public.demo_accounts;
CREATE POLICY "Service role manage demo accounts" ON public.demo_accounts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- B. SEED DEMO ACCOUNTS (idempotent)
-- =============================================================================

INSERT INTO public.demo_accounts (email, tenant_id, role) VALUES
    ('admin@demo.com', 'adris', 'admin'),
    ('vet@demo.com', 'adris', 'vet'),
    ('owner@demo.com', 'adris', 'owner'),
    ('owner2@demo.com', 'adris', 'owner'),
    ('vet@petlife.com', 'petlife', 'vet'),
    ('admin@petlife.com', 'petlife', 'admin')
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- C. ADD INSERT POLICY TO PROFILES (if not exists)
-- =============================================================================

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- =============================================================================
-- D. UPDATE HANDLE_NEW_USER FUNCTION
-- =============================================================================
-- This is the robust version with:
-- - Demo accounts lookup (not hardcoded)
-- - Proper error handling
-- - Conflict handling for safety
-- - Support for Google OAuth name field

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
        -- clinic_invites table might not exist yet, continue
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
            -- demo_accounts table might not exist yet, continue
            NULL;
        END;
    END IF;

    -- 3. Default: no tenant assigned (user will be assigned later via portal)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- E. HELPER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_demo_mode()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.demo_accounts WHERE is_active = true LIMIT 1
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- This migration:
-- 1. Creates demo_accounts table for configurable demo users
-- 2. Adds INSERT policy so authenticated users can create their own profile
-- 3. Updates handle_new_user() to be robust with error handling
-- 4. Removes hardcoded demo emails (uses demo_accounts table instead)
--
-- For PRODUCTION: Run DELETE FROM demo_accounts; or set is_active = false
-- =============================================================================
