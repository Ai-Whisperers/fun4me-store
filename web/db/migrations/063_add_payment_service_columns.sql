-- Migration 063: Add PaymentService Required Columns
-- Created: 2026-01-16
-- Purpose: Add columns expected by PaymentService implementation
-- References: PAYMENTSERVICE_SCHEMA_ISSUE.md, 30_DAY_AUTONOMOUS_WORK_PLAN.md Day 1

-- ============================================================================
-- ADD PAYMENT METHOD COLUMN
-- ============================================================================

-- Add method column (simplified payment method for service layer)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS method TEXT;

-- Add constraint for valid payment methods
ALTER TABLE payments
  ADD CONSTRAINT payments_method_check 
  CHECK (method IN ('cash', 'card', 'bank_transfer', 'stripe', 'digital_wallet'));

-- Create index for method filtering
CREATE INDEX IF NOT EXISTS idx_payments_method 
  ON payments(method) 
  WHERE method IS NOT NULL;

-- ============================================================================
-- ADD TRANSACTION REFERENCE COLUMN
-- ============================================================================

-- Add transaction_reference (generic reference for all payment types)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT;

-- Create index for transaction reference lookups
CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref 
  ON payments(transaction_reference) 
  WHERE transaction_reference IS NOT NULL;

-- ============================================================================
-- ADD STRIPE PAYMENT INTENT ID
-- ============================================================================

-- Add stripe_payment_intent_id (for Stripe payments)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Create index for Stripe lookups (important for webhook processing)
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent 
  ON payments(stripe_payment_intent_id) 
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Add unique constraint (one payment per Stripe intent)
ALTER TABLE payments
  ADD CONSTRAINT payments_stripe_intent_unique 
  UNIQUE (stripe_payment_intent_id);

-- ============================================================================
-- BACKFILL EXISTING DATA
-- ============================================================================

-- Backfill method from payment_method_name (if exists)
UPDATE payments
SET method = CASE
  WHEN LOWER(payment_method_name) LIKE '%cash%' THEN 'cash'
  WHEN LOWER(payment_method_name) LIKE '%card%' THEN 'card'
  WHEN LOWER(payment_method_name) LIKE '%credit%' THEN 'card'
  WHEN LOWER(payment_method_name) LIKE '%debit%' THEN 'card'
  WHEN LOWER(payment_method_name) LIKE '%bank%' THEN 'bank_transfer'
  WHEN LOWER(payment_method_name) LIKE '%transfer%' THEN 'bank_transfer'
  WHEN LOWER(payment_method_name) LIKE '%stripe%' THEN 'stripe'
  ELSE 'cash' -- Default to cash for unknown
END
WHERE method IS NULL AND payment_method_name IS NOT NULL;

-- Backfill transaction_reference from reference_number (if exists)
UPDATE payments
SET transaction_reference = reference_number
WHERE transaction_reference IS NULL AND reference_number IS NOT NULL;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN payments.method IS 'Payment method type: cash, card, bank_transfer, stripe, digital_wallet';
COMMENT ON COLUMN payments.transaction_reference IS 'Generic transaction reference ID from payment processor';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe Payment Intent ID (pi_xxx) for Stripe payments';

-- ============================================================================
-- RLS POLICIES (No changes needed - existing policies cover new columns)
-- ============================================================================

-- Verify existing RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'payments') THEN
    RAISE EXCEPTION 'RLS not enabled on payments table!';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'method'
  ) THEN
    RAISE EXCEPTION 'Column payments.method was not created!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'transaction_reference'
  ) THEN
    RAISE EXCEPTION 'Column payments.transaction_reference was not created!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    RAISE EXCEPTION 'Column payments.stripe_payment_intent_id was not created!';
  END IF;
  
  RAISE NOTICE 'Migration 063 completed successfully!';
END $$;
