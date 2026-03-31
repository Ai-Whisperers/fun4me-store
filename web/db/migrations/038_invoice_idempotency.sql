-- Migration: Add idempotency keys to invoices
-- Purpose: Prevent duplicate invoice creation on retry
-- Created: 2026-01-06

-- Add idempotency_key column to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index for idempotency (per tenant)
-- The key must be unique within a tenant to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_idempotency_key
ON invoices (tenant_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN invoices.idempotency_key IS 'Client-provided key to prevent duplicate invoice creation on retry. Must be unique per tenant.';

-- Also add to hospitalization invoices for consistency
ALTER TABLE hospitalization_invoices
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hospitalization_invoices_idempotency_key
ON hospitalization_invoices (tenant_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN hospitalization_invoices.idempotency_key IS 'Client-provided key to prevent duplicate invoice creation on retry. Must be unique per tenant.';

-- Add to store commission invoices as well
ALTER TABLE store_commission_invoices
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_commission_invoices_idempotency_key
ON store_commission_invoices (tenant_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN store_commission_invoices.idempotency_key IS 'Client-provided key to prevent duplicate invoice creation on retry. Must be unique per tenant.';

-- Add to platform invoices
ALTER TABLE platform_invoices
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_invoices_idempotency_key
ON platform_invoices (tenant_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN platform_invoices.idempotency_key IS 'Client-provided key to prevent duplicate invoice creation on retry. Must be unique per tenant.';
