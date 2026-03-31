-- =============================================================================
-- 01_TENANTS.SQL
-- =============================================================================
-- Multi-tenant support: each clinic is a tenant with isolated data.
-- This is the foundation table - all other tables reference tenant_id.
--
-- DEPENDENCIES: 00_setup/01_extensions.sql, 00_setup/02_core_functions.sql
-- =============================================================================

-- =============================================================================
-- TENANTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    legal_name TEXT,

    -- Contact information
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Paraguay',

    -- Business information
    ruc TEXT,                    -- Paraguay tax ID
    logo_url TEXT,
    website_url TEXT,

    -- Settings (JSONB for flexibility)
    -- Structure: { currency: 'PYG', timezone: 'America/Asuncion', ... }
    settings JSONB DEFAULT '{}'::jsonb,
    business_hours JSONB DEFAULT '{}'::jsonb,

    -- Feature flags (which modules are enabled)
    features_enabled TEXT[] DEFAULT ARRAY['core'],

    -- Subscription/billing
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
    plan_expires_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT tenants_id_format CHECK (id ~ '^[a-z][a-z0-9_-]*$'),
    CONSTRAINT tenants_id_length CHECK (char_length(id) BETWEEN 2 AND 50),
    CONSTRAINT tenants_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
    CONSTRAINT tenants_settings_is_object CHECK (settings IS NULL OR jsonb_typeof(settings) = 'object')
);

COMMENT ON TABLE public.tenants IS 'Multi-tenant clinic organizations. Each clinic is a tenant with isolated data.';
COMMENT ON COLUMN public.tenants.id IS 'URL-friendly slug identifier (e.g., "adris", "petlife")';
COMMENT ON COLUMN public.tenants.settings IS 'Flexible settings: { currency, timezone, working_hours, notification_preferences, ... }';
COMMENT ON COLUMN public.tenants.features_enabled IS 'Array of enabled module names: core, store, lab, hospitalization, etc.';
COMMENT ON COLUMN public.tenants.plan IS 'Subscription tier affecting available features and limits';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Authenticated users can see active tenants (RLS will be updated after profiles table exists)
DROP POLICY IF EXISTS "Authenticated users view active tenants" ON public.tenants;
CREATE POLICY "Authenticated users view active tenants" ON public.tenants
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Service role full access for admin operations
DROP POLICY IF EXISTS "Service role full access" ON public.tenants;
CREATE POLICY "Service role full access" ON public.tenants
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_tenants_active ON public.tenants(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenants_name ON public.tenants USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON public.tenants(plan) WHERE is_active = true;

-- GIN index for JSONB settings (efficient key/value queries)
CREATE INDEX IF NOT EXISTS idx_tenants_settings_gin ON public.tenants USING gin(settings jsonb_path_ops)
    WHERE settings IS NOT NULL AND settings != '{}';

-- =============================================================================
-- DOCUMENT SEQUENCES (Thread-Safe Sequence Generation)
-- =============================================================================
-- Generic sequence table for all document types (invoices, admissions, etc.)
-- Uses advisory locks to prevent race conditions in concurrent environments

CREATE TABLE IF NOT EXISTS public.document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,  -- 'invoice', 'admission', 'lab_order', 'payment', etc.
    year INTEGER NOT NULL,        -- 0 for non-yearly sequences (like admissions)
    current_sequence INTEGER NOT NULL DEFAULT 0 CHECK (current_sequence >= 0),
    prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, document_type, year)
);

COMMENT ON TABLE public.document_sequences IS 'Thread-safe document numbering sequences per tenant/type/year';
COMMENT ON COLUMN public.document_sequences.year IS 'Sequence year. Use 0 for non-yearly sequences (e.g., admission numbers)';
COMMENT ON COLUMN public.document_sequences.current_sequence IS 'Last used sequence number. Next number = current_sequence + 1';

-- Enable RLS
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

-- Service role manages sequences (admin policy added after profiles table exists)
DROP POLICY IF EXISTS "Service role full access sequences" ON public.document_sequences;
CREATE POLICY "Service role full access sequences" ON public.document_sequences
    FOR ALL TO service_role USING (true);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_document_sequences_lookup
ON public.document_sequences(tenant_id, document_type, year);

-- Updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.document_sequences;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.document_sequences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- TENANT SETTINGS VIEW (Safe public access)
-- =============================================================================

CREATE OR REPLACE VIEW public.tenant_public_info AS
SELECT
    id,
    name,
    logo_url,
    city,
    country,
    is_active
FROM public.tenants
WHERE is_active = true;

COMMENT ON VIEW public.tenant_public_info IS 'Public-safe tenant information for discovery/display';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.tenants;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
