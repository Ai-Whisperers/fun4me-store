-- Migration 072: Add idempotency key to invoices (checkout creates invoices, not store_orders)
-- AUDIT-106: Prevents duplicate checkout when request is retried

-- Add idempotency key column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index for tenant + idempotency key combination
-- Partial index: only applies when idempotency_key is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_idempotency
ON invoices(tenant_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Add comment
COMMENT ON COLUMN invoices.idempotency_key IS
  'AUDIT-106: Client-generated UUID to prevent duplicate checkout on retry';
