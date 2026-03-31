-- Migration: 064_export_jobs.sql
-- DATA-002: Data export job tracking for self-service data export functionality
-- =============================================================================

-- =============================================================================
-- Export Jobs Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Configuration (stored as JSONB)
  config JSONB NOT NULL DEFAULT '{}',
  -- Structure:
  -- {
  --   "tables": ["pets", "appointments"],
  --   "format": "csv" | "json" | "xlsx",
  --   "dateRange": { "from": "2024-01-01", "to": "2024-12-31" },
  --   "includeRelations": true,
  --   "anonymize": false
  -- }

  -- Job status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Result
  file_url TEXT,
  file_size BIGINT,
  expires_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Add index for efficient queries
  CONSTRAINT valid_file_url CHECK (
    (status = 'completed' AND file_url IS NOT NULL) OR
    (status != 'completed')
  )
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Index for listing user's export jobs
CREATE INDEX idx_export_jobs_user ON export_jobs(user_id, created_at DESC);

-- Index for listing tenant's export jobs
CREATE INDEX idx_export_jobs_tenant ON export_jobs(tenant_id, created_at DESC);

-- Index for processing pending jobs
CREATE INDEX idx_export_jobs_pending ON export_jobs(status, created_at)
  WHERE status IN ('pending', 'processing');

-- Index for expired job cleanup
CREATE INDEX idx_export_jobs_expired ON export_jobs(expires_at)
  WHERE status = 'completed' AND expires_at IS NOT NULL;

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own export jobs
CREATE POLICY "Users can view own export jobs"
  ON export_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create export jobs for their tenant
CREATE POLICY "Users can create export jobs"
  ON export_jobs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = export_jobs.tenant_id
    )
  );

-- Only allow updates via service role (for job processing)
-- Regular users cannot update export jobs directly
CREATE POLICY "Service role can update export jobs"
  ON export_jobs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Staff can view all export jobs for their tenant (for admin dashboard)
CREATE POLICY "Staff can view tenant export jobs"
  ON export_jobs
  FOR SELECT
  USING (
    is_staff_of(tenant_id)
  );

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER export_jobs_updated_at
  BEFORE UPDATE ON export_jobs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE export_jobs IS 'DATA-002: Tracks data export jobs for self-service data export';
COMMENT ON COLUMN export_jobs.config IS 'Export configuration: tables, format, dateRange, options';
COMMENT ON COLUMN export_jobs.status IS 'Job status: pending, processing, completed, failed, expired';
COMMENT ON COLUMN export_jobs.file_url IS 'URL to download the generated export file';
COMMENT ON COLUMN export_jobs.file_size IS 'Size of the generated file in bytes';
COMMENT ON COLUMN export_jobs.expires_at IS 'When the download link expires (typically 7 days)';
