-- Migration: 066_claim_code_verification.sql
-- Description: SEC-020 - Add claim code verification for pre-generated clinics
--
-- This prevents unauthorized users from claiming clinics they don't own.
-- When pre-generating a clinic, we send a unique claim code to the business email.
-- The clinic owner must provide this code when claiming their website.

-- Add claim code fields to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS claim_code TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS claim_code_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS claim_code_sent_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS claim_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS claim_locked_until TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN tenants.claim_code IS 'Hashed claim verification code for ownership verification';
COMMENT ON COLUMN tenants.claim_code_email IS 'Business email where claim code was sent';
COMMENT ON COLUMN tenants.claim_code_sent_at IS 'When the claim code was sent';
COMMENT ON COLUMN tenants.claim_attempts IS 'Number of failed claim attempts (for rate limiting)';
COMMENT ON COLUMN tenants.claim_locked_until IS 'If set, claim attempts blocked until this time';

-- Create index for claim lookups
CREATE INDEX IF NOT EXISTS idx_tenants_claim_code ON tenants(claim_code)
    WHERE claim_code IS NOT NULL AND status = 'pregenerated';

-- Create audit table for claim attempts
CREATE TABLE IF NOT EXISTS public.claim_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id TEXT NOT NULL REFERENCES tenants(id),
    email_attempted TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE claim_audit_log IS 'Audit log for clinic claim attempts - security monitoring';

-- Enable RLS on audit table
ALTER TABLE claim_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit log
CREATE POLICY "Service role full access" ON claim_audit_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create index for monitoring
CREATE INDEX IF NOT EXISTS idx_claim_audit_clinic ON claim_audit_log(clinic_id);
CREATE INDEX IF NOT EXISTS idx_claim_audit_email ON claim_audit_log(email_attempted);
CREATE INDEX IF NOT EXISTS idx_claim_audit_created ON claim_audit_log(created_at DESC);

-- Function to generate a secure claim code
CREATE OR REPLACE FUNCTION generate_claim_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No confusing chars (0/O, 1/I)
    result TEXT := '';
    i INTEGER;
BEGIN
    -- Format: CLAIM-XXXX-XXXX (12 chars + separators)
    result := 'CLAIM-';
    FOR i IN 1..4 LOOP
        result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    result := result || '-';
    FOR i IN 1..4 LOOP
        result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_claim_code IS 'Generates a human-readable claim code in format CLAIM-XXXX-XXXX';
