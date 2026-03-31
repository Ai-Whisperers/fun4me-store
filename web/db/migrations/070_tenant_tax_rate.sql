-- Migration 070: Add tenant tax rate configuration
-- BUG-015: Tax rate should be configurable per tenant, not hardcoded

-- Add tax_rate column to tenants table
-- Default 10% (IVA in Paraguay)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1000;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_name TEXT DEFAULT 'IVA';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_tax_inclusive BOOLEAN DEFAULT FALSE;

-- Add constraint to ensure valid tax rate
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_tax_rate_valid;
ALTER TABLE tenants ADD CONSTRAINT tenants_tax_rate_valid
  CHECK (tax_rate >= 0 AND tax_rate <= 1);

-- Add comments
COMMENT ON COLUMN tenants.tax_rate IS 'Tax rate as decimal (e.g., 0.10 = 10%)';
COMMENT ON COLUMN tenants.tax_name IS 'Tax name displayed to customers (e.g., IVA, VAT)';
COMMENT ON COLUMN tenants.is_tax_inclusive IS 'Whether prices already include tax';
