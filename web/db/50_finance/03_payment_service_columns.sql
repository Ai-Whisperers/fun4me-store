-- Migration: Add PaymentService Required Columns
-- Date: 2026-01-15
-- Purpose: Add columns needed by PaymentService implementation
-- 
-- The PaymentService implementation expects these columns for proper payment tracking:
-- - method: Payment method type (cash, card, bank_transfer, stripe)
-- - transaction_reference: External transaction reference/ID
-- - stripe_payment_intent_id: Stripe payment intent ID for Stripe payments
--
-- These columns enable the Core MVP PaymentService to function correctly.

-- Add method column
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS method TEXT;

-- Add transaction reference column  
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT;

-- Add Stripe payment intent ID column
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Add check constraint for method values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payments_method_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_method_check 
      CHECK (method IN ('cash', 'card', 'bank_transfer', 'stripe') OR method IS NULL);
  END IF;
END $$;

-- Create index for method filtering
CREATE INDEX IF NOT EXISTS idx_payments_method 
  ON public.payments(method) 
  WHERE method IS NOT NULL;

-- Create index for Stripe payment intent lookups
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent 
  ON public.payments(stripe_payment_intent_id) 
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Create index for transaction reference lookups
CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref 
  ON public.payments(transaction_reference) 
  WHERE transaction_reference IS NOT NULL;

-- Migrate existing data: set method based on payment_method_name
UPDATE public.payments
SET method = CASE
  WHEN payment_method_name ILIKE '%efectivo%' OR payment_method_name ILIKE '%cash%' THEN 'cash'
  WHEN payment_method_name ILIKE '%tarjeta%' OR payment_method_name ILIKE '%card%' THEN 'card'
  WHEN payment_method_name ILIKE '%transferencia%' OR payment_method_name ILIKE '%transfer%' THEN 'bank_transfer'
  WHEN payment_method_name ILIKE '%stripe%' THEN 'stripe'
  ELSE 'cash' -- Default to cash for unknown methods
END
WHERE method IS NULL AND payment_method_name IS NOT NULL;

-- Set default method for payments without payment_method_name
UPDATE public.payments
SET method = 'cash'
WHERE method IS NULL;

-- Migrate transaction references from reference_number
UPDATE public.payments
SET transaction_reference = reference_number
WHERE transaction_reference IS NULL AND reference_number IS NOT NULL;

-- Add comment documenting the columns
COMMENT ON COLUMN public.payments.method IS 'Payment method type: cash, card, bank_transfer, or stripe';
COMMENT ON COLUMN public.payments.transaction_reference IS 'External transaction reference or ID';
COMMENT ON COLUMN public.payments.stripe_payment_intent_id IS 'Stripe payment intent ID for Stripe payments';

-- Verify migration
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'payments'
    AND column_name IN ('method', 'transaction_reference', 'stripe_payment_intent_id');
  
  IF col_count = 3 THEN
    RAISE NOTICE 'PaymentService columns migration completed successfully';
  ELSE
    RAISE EXCEPTION 'PaymentService columns migration failed - expected 3 columns, found %', col_count;
  END IF;
END $$;
