-- Migration: 060_pregeneration_fields.sql
-- Description: Add fields to support pre-generation workflow for clinic onboarding
--
-- Pre-generation allows:
-- 1. Scrape clinic data from Google Maps/Instagram
-- 2. Auto-generate website for them
-- 3. Reach out with "claim your website" message
-- 4. Track claim and trial status

-- Add pre-generation fields to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_pregenerated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS claimed_by TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS scraped_data JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS clinic_type TEXT DEFAULT 'general';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_rating TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- Add comments
COMMENT ON COLUMN tenants.status IS 'Tenant status: pregenerated | claimed | active | suspended';
COMMENT ON COLUMN tenants.is_pregenerated IS 'Whether this tenant was auto-generated from scraped data';
COMMENT ON COLUMN tenants.claimed_at IS 'When the clinic owner claimed the pre-generated website';
COMMENT ON COLUMN tenants.claimed_by IS 'User ID who claimed the clinic';
COMMENT ON COLUMN tenants.scraped_data IS 'Original scraped data from Google Maps, Instagram, etc';
COMMENT ON COLUMN tenants.clinic_type IS 'Clinic type for template: general | emergency | specialist | grooming | rural';
COMMENT ON COLUMN tenants.zone IS 'Zone/neighborhood for local targeting';
COMMENT ON COLUMN tenants.google_rating IS 'Google rating from scraping';
COMMENT ON COLUMN tenants.instagram_handle IS 'Instagram handle if available';

-- Create index for finding pregenerated/unclaimed clinics
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_pregenerated ON tenants(is_pregenerated) WHERE is_pregenerated = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_zone ON tenants(zone) WHERE zone IS NOT NULL;

-- Update existing tenants to have 'active' status
UPDATE tenants SET status = 'active' WHERE status IS NULL OR status = '';
