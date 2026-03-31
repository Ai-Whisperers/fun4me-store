-- =============================================================================
-- 01_INSURANCE.SQL
-- =============================================================================
-- Pet insurance management: providers, policies, claims.
--
-- DEPENDENCIES: 10_core/*, 20_pets/*, 40_scheduling/*, 50_finance/*
-- =============================================================================

-- =============================================================================
-- INSURANCE PROVIDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Provider info
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    country TEXT,
    logo_url TEXT,
    website TEXT,

    -- Contact
    phone TEXT,
    email TEXT,
    claims_email TEXT,
    claims_phone TEXT,

    -- Address
    address JSONB,

    -- Coverage
    coverage_types TEXT[],  -- ['accident', 'illness', 'wellness', 'dental']
    direct_billing BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.insurance_providers IS 'Pet insurance provider directory (global reference data)';
COMMENT ON COLUMN public.insurance_providers.claims_email IS 'Email for submitting claims';
COMMENT ON COLUMN public.insurance_providers.claims_phone IS 'Phone for claims inquiries';

-- =============================================================================
-- INSURANCE POLICIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    pet_id UUID NOT NULL REFERENCES public.pets(id),
    provider_id UUID REFERENCES public.insurance_providers(id),

    -- Policy info
    policy_number TEXT NOT NULL,
    group_number TEXT,

    -- Coverage
    coverage_type TEXT DEFAULT 'basic'
        CHECK (coverage_type IN ('basic', 'standard', 'premium', 'comprehensive')),
    coverage_details JSONB DEFAULT '{}',

    -- Limits
    annual_limit NUMERIC(12,2),
    deductible NUMERIC(12,2),
    copay_percentage NUMERIC(5,2),

    -- Validity
    effective_date DATE NOT NULL,
    expiry_date DATE,

    -- Status
    status TEXT DEFAULT 'active'
        CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'suspended')),

    -- Contact for claims
    claims_contact_name TEXT,
    claims_contact_phone TEXT,
    claims_contact_email TEXT,

    -- Documents
    policy_document_url TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.insurance_policies IS 'Pet insurance policies with coverage details and limits';
COMMENT ON COLUMN public.insurance_policies.coverage_type IS 'Coverage tier: basic, standard, premium, comprehensive';
COMMENT ON COLUMN public.insurance_policies.coverage_details IS 'JSON with detailed coverage info: procedures, exclusions, limits';
COMMENT ON COLUMN public.insurance_policies.status IS 'Policy status: pending (application), active, expired, cancelled, suspended';

-- =============================================================================
-- INSURANCE CLAIMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    policy_id UUID NOT NULL REFERENCES public.insurance_policies(id),
    pet_id UUID NOT NULL REFERENCES public.pets(id),

    -- Claim info
    claim_number TEXT,
    claim_type TEXT NOT NULL
        CHECK (claim_type IN ('treatment', 'surgery', 'hospitalization', 'medication', 'diagnostic', 'other')),

    -- Amounts
    claimed_amount NUMERIC(12,2) NOT NULL,
    approved_amount NUMERIC(12,2),
    paid_amount NUMERIC(12,2),

    -- Dates
    service_date DATE NOT NULL,
    submitted_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,

    -- Status
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'denied', 'paid')),

    -- Denial
    denial_reason TEXT,

    -- Reference
    invoice_id UUID REFERENCES public.invoices(id),
    medical_record_id UUID REFERENCES public.medical_records(id),

    -- Documents
    supporting_documents TEXT[] DEFAULT '{}',

    -- Notes
    notes TEXT,
    provider_notes TEXT,

    -- Submitted by
    submitted_by UUID REFERENCES public.profiles(id),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.insurance_claims IS 'Insurance claim submissions with approval workflow';
COMMENT ON COLUMN public.insurance_claims.claim_type IS 'Type of claim: treatment, surgery, hospitalization, medication, diagnostic, other';
COMMENT ON COLUMN public.insurance_claims.status IS 'Claim status: draft → submitted → under_review → approved/denied → paid';
COMMENT ON COLUMN public.insurance_claims.supporting_documents IS 'Array of document URLs (invoices, medical records, etc.)';

-- =============================================================================
-- INSURANCE CLAIM ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_claim_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Item details
    description TEXT NOT NULL,
    service_id UUID REFERENCES public.services(id),
    quantity INTEGER DEFAULT 1,
    amount NUMERIC(12,2) NOT NULL,

    -- Approval
    approved_amount NUMERIC(12,2),
    is_covered BOOLEAN,
    denial_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.insurance_claim_items IS 'Line items within a claim. Includes tenant_id for optimized RLS.';
COMMENT ON COLUMN public.insurance_claim_items.is_covered IS 'Whether the provider covers this item';
COMMENT ON COLUMN public.insurance_claim_items.denial_reason IS 'Reason if item was not covered';

-- =============================================================================
-- PRE-AUTHORIZATION REQUESTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.insurance_preauth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    policy_id UUID NOT NULL REFERENCES public.insurance_policies(id),
    pet_id UUID NOT NULL REFERENCES public.pets(id),

    -- Request info
    request_number TEXT,
    procedure_description TEXT NOT NULL,
    estimated_cost NUMERIC(12,2),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'approved', 'denied', 'expired')),

    -- Response
    approved_amount NUMERIC(12,2),
    valid_until DATE,
    authorization_code TEXT,
    denial_reason TEXT,

    -- Submitted
    submitted_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES public.profiles(id),

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.insurance_preauth IS 'Pre-authorization requests for procedures. Get approval before treatment.';
COMMENT ON COLUMN public.insurance_preauth.status IS 'Request status: pending → submitted → approved/denied/expired';
COMMENT ON COLUMN public.insurance_preauth.authorization_code IS 'Code from insurer to reference when submitting claim';
COMMENT ON COLUMN public.insurance_preauth.valid_until IS 'Pre-auth expires after this date';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claim_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_preauth ENABLE ROW LEVEL SECURITY;

-- Providers: Public read
DROP POLICY IF EXISTS "Public read providers" ON public.insurance_providers;
CREATE POLICY "Public read providers" ON public.insurance_providers
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role manage providers" ON public.insurance_providers;
CREATE POLICY "Service role manage providers" ON public.insurance_providers
    FOR ALL TO service_role USING (true);

-- Policies: Staff manage, owners view own pets
DROP POLICY IF EXISTS "Staff manage policies" ON public.insurance_policies;
CREATE POLICY "Staff manage policies" ON public.insurance_policies
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet policies" ON public.insurance_policies;
CREATE POLICY "Owners view pet policies" ON public.insurance_policies
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access policies" ON public.insurance_policies;
CREATE POLICY "Service role full access policies" ON public.insurance_policies
    FOR ALL TO service_role USING (true);

-- Claims: Staff manage, owners view own
DROP POLICY IF EXISTS "Staff manage claims" ON public.insurance_claims;
CREATE POLICY "Staff manage claims" ON public.insurance_claims
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners view pet claims" ON public.insurance_claims;
CREATE POLICY "Owners view pet claims" ON public.insurance_claims
    FOR SELECT TO authenticated
    USING (public.is_owner_of_pet(pet_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role full access claims" ON public.insurance_claims;
CREATE POLICY "Service role full access claims" ON public.insurance_claims
    FOR ALL TO service_role USING (true);

-- Claim items: Via claim RLS
DROP POLICY IF EXISTS "Staff manage claim items" ON public.insurance_claim_items;
CREATE POLICY "Staff manage claim items" ON public.insurance_claim_items
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access claim items" ON public.insurance_claim_items;
CREATE POLICY "Service role full access claim items" ON public.insurance_claim_items
    FOR ALL TO service_role USING (true);

-- Preauth: Staff manage
DROP POLICY IF EXISTS "Staff manage preauth" ON public.insurance_preauth;
CREATE POLICY "Staff manage preauth" ON public.insurance_preauth
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access preauth" ON public.insurance_preauth;
CREATE POLICY "Service role full access preauth" ON public.insurance_preauth
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_insurance_providers_active ON public.insurance_providers(is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_insurance_policies_tenant ON public.insurance_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_pet ON public.insurance_policies(pet_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_provider ON public.insurance_policies(provider_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_status ON public.insurance_policies(status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_insurance_claims_tenant ON public.insurance_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy ON public.insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_pet ON public.insurance_claims(pet_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON public.insurance_claims(status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_insurance_claim_items_claim ON public.insurance_claim_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claim_items_tenant ON public.insurance_claim_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_insurance_preauth_tenant ON public.insurance_preauth(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_preauth_policy ON public.insurance_preauth(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_preauth_status ON public.insurance_preauth(status);

-- GIN indexes for JSONB columns (efficient coverage lookups)
CREATE INDEX IF NOT EXISTS idx_insurance_policies_coverage_gin ON public.insurance_policies USING gin(coverage_details jsonb_path_ops)
    WHERE coverage_details IS NOT NULL AND coverage_details != '{}';
CREATE INDEX IF NOT EXISTS idx_insurance_providers_address_gin ON public.insurance_providers USING gin(address jsonb_path_ops)
    WHERE address IS NOT NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.insurance_providers;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.insurance_providers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.insurance_policies;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.insurance_policies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.insurance_claims;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.insurance_claims
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.insurance_preauth;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.insurance_preauth
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id for claim items
CREATE OR REPLACE FUNCTION public.insurance_claim_items_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.insurance_claims
        WHERE id = NEW.claim_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS claim_items_auto_tenant ON public.insurance_claim_items;
CREATE TRIGGER claim_items_auto_tenant
    BEFORE INSERT ON public.insurance_claim_items
    FOR EACH ROW EXECUTE FUNCTION public.insurance_claim_items_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate claim number (thread-safe with advisory lock)
CREATE OR REPLACE FUNCTION public.generate_claim_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_seq INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Generate lock key from tenant_id and document type
    v_lock_key := ('x' || substr(md5(p_tenant_id || ':claim:0'), 1, 8))::bit(32)::bigint;

    -- Acquire advisory lock
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Upsert with year = 0 to indicate non-yearly sequence
    INSERT INTO public.document_sequences (tenant_id, document_type, year, current_sequence, prefix)
    VALUES (p_tenant_id, 'claim', 0, 1, 'CLM')
    ON CONFLICT (tenant_id, document_type, year)
    DO UPDATE SET
        current_sequence = public.document_sequences.current_sequence + 1,
        updated_at = NOW()
    RETURNING current_sequence INTO v_seq;

    RETURN 'CLM' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

