-- =====================================================
-- COMP-002: Privacy Policy Automation Tables
-- =====================================================
-- Implements privacy policy versioning and acceptance tracking

-- =====================================================
-- Privacy Policy Status Enum
-- =====================================================
DO $$ BEGIN
  CREATE TYPE privacy_policy_status AS ENUM (
    'draft',      -- Being edited, not yet published
    'published',  -- Active and visible to users
    'archived'    -- No longer active
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- Acceptance Method Enum
-- =====================================================
DO $$ BEGIN
  CREATE TYPE acceptance_method AS ENUM (
    'checkbox',   -- Explicit checkbox during registration
    'button',     -- "Accept" button on modal
    'implicit',   -- Continued use after notification
    'api'         -- Programmatic acceptance
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- Privacy Policies Table
-- =====================================================
CREATE TABLE IF NOT EXISTS privacy_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),

  -- Version info
  version TEXT NOT NULL,
  status privacy_policy_status NOT NULL DEFAULT 'draft',
  effective_date DATE NOT NULL,
  expires_at DATE,

  -- Content (Spanish is required, English optional)
  content_es TEXT NOT NULL,
  content_en TEXT,

  -- Change summary (JSON array of strings)
  change_summary JSONB NOT NULL DEFAULT '[]',

  -- Re-acceptance requirement
  requires_reacceptance BOOLEAN NOT NULL DEFAULT false,

  -- Version chain
  previous_version_id UUID REFERENCES privacy_policies(id),

  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_version CHECK (version ~ '^\d+\.\d+(\.\d+)?$'),
  CONSTRAINT unique_tenant_version UNIQUE (tenant_id, version)
);

-- =====================================================
-- Privacy Acceptances Table
-- =====================================================
CREATE TABLE IF NOT EXISTS privacy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  policy_id UUID NOT NULL REFERENCES privacy_policies(id),
  policy_version TEXT NOT NULL,

  -- Acceptance details
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acceptance_method acceptance_method NOT NULL DEFAULT 'button',
  location_context TEXT, -- e.g., 'registration', 'policy_update'

  -- Audit trail
  ip_address INET,
  user_agent TEXT,

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only accept each policy version once
  CONSTRAINT unique_user_policy UNIQUE (user_id, policy_id)
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_privacy_policies_tenant ON privacy_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_privacy_policies_status ON privacy_policies(status);
CREATE INDEX IF NOT EXISTS idx_privacy_policies_effective ON privacy_policies(effective_date);
CREATE INDEX IF NOT EXISTS idx_privacy_policies_tenant_status ON privacy_policies(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_privacy_acceptances_user ON privacy_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_acceptances_tenant ON privacy_acceptances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_privacy_acceptances_policy ON privacy_acceptances(policy_id);
CREATE INDEX IF NOT EXISTS idx_privacy_acceptances_accepted_at ON privacy_acceptances(accepted_at);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE privacy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_acceptances ENABLE ROW LEVEL SECURITY;

-- Privacy policies: Everyone can view published policies for their tenant
CREATE POLICY IF NOT EXISTS "Anyone can view published policies"
  ON privacy_policies FOR SELECT
  USING (
    status = 'published' AND
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Staff can view all policies (including drafts)
CREATE POLICY IF NOT EXISTS "Staff can view all policies"
  ON privacy_policies FOR SELECT
  USING (is_staff_of(tenant_id));

-- Staff can create and update policies
CREATE POLICY IF NOT EXISTS "Staff can create policies"
  ON privacy_policies FOR INSERT
  WITH CHECK (is_staff_of(tenant_id));

CREATE POLICY IF NOT EXISTS "Staff can update policies"
  ON privacy_policies FOR UPDATE
  USING (is_staff_of(tenant_id));

-- Privacy acceptances: Users can view their own
CREATE POLICY IF NOT EXISTS "Users can view own acceptances"
  ON privacy_acceptances FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own acceptances
CREATE POLICY IF NOT EXISTS "Users can accept policies"
  ON privacy_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Staff can view all acceptances for their tenant
CREATE POLICY IF NOT EXISTS "Staff can view tenant acceptances"
  ON privacy_acceptances FOR SELECT
  USING (is_staff_of(tenant_id));

-- =====================================================
-- Helper Functions
-- =====================================================

-- Get current published policy for a tenant
CREATE OR REPLACE FUNCTION get_current_privacy_policy(p_tenant_id TEXT)
RETURNS privacy_policies AS $$
  SELECT *
  FROM privacy_policies
  WHERE tenant_id = p_tenant_id
    AND status = 'published'
    AND effective_date <= CURRENT_DATE
    AND (expires_at IS NULL OR expires_at > CURRENT_DATE)
  ORDER BY effective_date DESC, version DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Check if user has accepted current policy
CREATE OR REPLACE FUNCTION has_accepted_current_policy(p_user_id UUID, p_tenant_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_policy privacy_policies;
  v_acceptance_exists BOOLEAN;
BEGIN
  -- Get current policy
  SELECT * INTO v_current_policy
  FROM get_current_privacy_policy(p_tenant_id);

  IF v_current_policy.id IS NULL THEN
    -- No published policy, consider accepted
    RETURN true;
  END IF;

  -- Check if user has accepted this policy
  SELECT EXISTS(
    SELECT 1
    FROM privacy_acceptances
    WHERE user_id = p_user_id
      AND policy_id = v_current_policy.id
  ) INTO v_acceptance_exists;

  RETURN v_acceptance_exists;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get acceptance statistics for a policy
CREATE OR REPLACE FUNCTION get_policy_acceptance_stats(p_policy_id UUID)
RETURNS TABLE (
  acceptance_count BIGINT,
  total_users BIGINT,
  acceptance_rate NUMERIC
) AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  -- Get tenant from policy
  SELECT tenant_id INTO v_tenant_id
  FROM privacy_policies
  WHERE id = p_policy_id;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM privacy_acceptances WHERE policy_id = p_policy_id) AS acceptance_count,
    (SELECT COUNT(*) FROM profiles WHERE tenant_id = v_tenant_id AND role = 'owner') AS total_users,
    CASE
      WHEN (SELECT COUNT(*) FROM profiles WHERE tenant_id = v_tenant_id AND role = 'owner') = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*)::NUMERIC FROM privacy_acceptances WHERE policy_id = p_policy_id) /
        (SELECT COUNT(*)::NUMERIC FROM profiles WHERE tenant_id = v_tenant_id AND role = 'owner') * 100,
        2
      )
    END AS acceptance_rate;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Updated At Trigger
-- =====================================================
CREATE TRIGGER set_privacy_policies_updated_at
  BEFORE UPDATE ON privacy_policies
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE privacy_policies IS 'COMP-002: Privacy policy versions with content and status';
COMMENT ON TABLE privacy_acceptances IS 'COMP-002: User acceptance records for privacy policies';
COMMENT ON COLUMN privacy_policies.version IS 'Semantic version string (e.g., 1.0, 2.1.3)';
COMMENT ON COLUMN privacy_policies.change_summary IS 'JSON array of change descriptions for user notification';
COMMENT ON COLUMN privacy_policies.requires_reacceptance IS 'If true, users must explicitly re-accept this version';
COMMENT ON COLUMN privacy_acceptances.location_context IS 'Context where acceptance occurred (registration, policy_update, etc.)';
COMMENT ON FUNCTION get_current_privacy_policy(TEXT) IS 'Returns the currently effective published policy for a tenant';
COMMENT ON FUNCTION has_accepted_current_policy(UUID, TEXT) IS 'Checks if user has accepted the current policy';
