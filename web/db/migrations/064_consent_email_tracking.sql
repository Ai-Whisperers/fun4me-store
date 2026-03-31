-- Migration 063: Consent Email Tracking
-- FEAT-012: Add email_sent_at column to consent_documents table
-- This column tracks when a consent document was emailed to the owner

-- Add email_sent_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_documents' AND column_name = 'email_sent_at'
  ) THEN
    ALTER TABLE consent_documents
    ADD COLUMN email_sent_at TIMESTAMPTZ DEFAULT NULL;

    COMMENT ON COLUMN consent_documents.email_sent_at IS 'Timestamp when consent document was emailed to owner';
  END IF;
END $$;

-- Add index for querying sent/unsent consent documents
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consent_documents_email_sent_at
ON consent_documents(email_sent_at) WHERE email_sent_at IS NOT NULL;

-- Update the consent_audit_log to ensure 'sent' action is valid
-- (The action column likely uses TEXT or VARCHAR, so no change needed)
-- Just add a comment for documentation
COMMENT ON TABLE consent_audit_log IS 'Audit trail for consent documents. Actions: signed, revoked, viewed, downloaded, sent';
