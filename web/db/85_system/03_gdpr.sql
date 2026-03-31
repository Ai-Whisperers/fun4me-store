-- =====================================================
-- COMP-001: GDPR Data Subject Rights Tables
-- =====================================================
-- Implements GDPR Articles 15, 16, 17, 18, 20, 21
-- for tracking and processing data subject requests

-- =====================================================
-- GDPR Request Types Enum
-- =====================================================
DO $$ BEGIN
  CREATE TYPE gdpr_request_type AS ENUM (
    'access',        -- Article 15 - Right of access
    'rectification', -- Article 16 - Right to rectification
    'erasure',       -- Article 17 - Right to erasure
    'restriction',   -- Article 18 - Right to restriction
    'portability',   -- Article 20 - Right to data portability
    'objection'      -- Article 21 - Right to object
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- GDPR Request Status Enum
-- =====================================================
DO $$ BEGIN
  CREATE TYPE gdpr_request_status AS ENUM (
    'pending',               -- Request received
    'identity_verification', -- Awaiting identity verification
    'processing',            -- Currently being processed
    'completed',             -- Request fulfilled
    'rejected',              -- Request rejected
    'cancelled'              -- Cancelled by user
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- GDPR Requests Table
-- =====================================================
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  request_type gdpr_request_type NOT NULL,
  status gdpr_request_status NOT NULL DEFAULT 'pending',

  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Verification
  verification_token TEXT,
  verification_expires_at TIMESTAMPTZ,

  -- Export details (for access/portability requests)
  export_file_url TEXT,
  export_expires_at TIMESTAMPTZ,

  -- Rejection details
  rejection_reason TEXT,

  -- Notes and metadata
  notes TEXT,
  processed_by UUID REFERENCES profiles(id),

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GDPR Compliance Logs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS gdpr_compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES gdpr_requests(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),

  -- Action details
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',

  -- Who performed the action
  performed_by TEXT NOT NULL, -- 'system' or user ID
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Add soft delete columns to profiles table
-- =====================================================
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- =====================================================
-- Add soft delete columns to pets table
-- =====================================================
DO $$ BEGIN
  ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
  ALTER TABLE pets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user ON gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_tenant ON gdpr_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created ON gdpr_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_compliance_logs_request ON gdpr_compliance_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_compliance_logs_user ON gdpr_compliance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_compliance_logs_tenant ON gdpr_compliance_logs(tenant_id);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_compliance_logs ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own requests
CREATE POLICY IF NOT EXISTS "Users can view own GDPR requests"
  ON gdpr_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create GDPR requests"
  ON gdpr_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own GDPR requests"
  ON gdpr_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- Staff can view all GDPR requests for their tenant
CREATE POLICY IF NOT EXISTS "Staff can view tenant GDPR requests"
  ON gdpr_requests FOR SELECT
  USING (is_staff_of(tenant_id));

CREATE POLICY IF NOT EXISTS "Staff can update tenant GDPR requests"
  ON gdpr_requests FOR UPDATE
  USING (is_staff_of(tenant_id));

-- Compliance logs - users can view their own
CREATE POLICY IF NOT EXISTS "Users can view own compliance logs"
  ON gdpr_compliance_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Staff can view and create compliance logs for their tenant
CREATE POLICY IF NOT EXISTS "Staff can view tenant compliance logs"
  ON gdpr_compliance_logs FOR SELECT
  USING (is_staff_of(tenant_id));

CREATE POLICY IF NOT EXISTS "Staff can create compliance logs"
  ON gdpr_compliance_logs FOR INSERT
  WITH CHECK (is_staff_of(tenant_id));

-- System can insert compliance logs
CREATE POLICY IF NOT EXISTS "System can insert compliance logs"
  ON gdpr_compliance_logs FOR INSERT
  WITH CHECK (performed_by = 'system');

-- =====================================================
-- Updated At Trigger
-- =====================================================
CREATE TRIGGER set_gdpr_requests_updated_at
  BEFORE UPDATE ON gdpr_requests
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE gdpr_requests IS 'COMP-001: Tracks GDPR data subject requests';
COMMENT ON TABLE gdpr_compliance_logs IS 'COMP-001: Audit trail for GDPR compliance';
COMMENT ON COLUMN gdpr_requests.request_type IS 'Type of GDPR request per EU GDPR articles';
COMMENT ON COLUMN gdpr_requests.verification_token IS 'Token for email-based identity verification';
COMMENT ON COLUMN gdpr_requests.export_file_url IS 'URL to download exported data (access/portability)';
COMMENT ON COLUMN profiles.is_deleted IS 'COMP-001: Soft delete flag for GDPR compliance';
COMMENT ON COLUMN pets.is_deleted IS 'COMP-001: Soft delete flag for GDPR compliance';
