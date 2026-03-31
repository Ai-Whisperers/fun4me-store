-- Migration: Add Prescription Requirement to Store Products
-- Date: 2026-01-15
-- Purpose: Add is_prescription_required column for StoreService
--
-- The StoreService implementation needs to track which products require
-- a prescription before purchase. This is essential for veterinary clinics
-- selling prescription medications and controlled products.

-- Add is_prescription_required column
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS is_prescription_required BOOLEAN DEFAULT false;

-- Set NOT NULL constraint after adding default
ALTER TABLE public.store_products
  ALTER COLUMN is_prescription_required SET DEFAULT false;

-- Create index for filtering prescription products
CREATE INDEX IF NOT EXISTS idx_store_products_prescription 
  ON public.store_products(is_prescription_required) 
  WHERE is_prescription_required = true;

-- Create composite index for common queries (active + prescription)
CREATE INDEX IF NOT EXISTS idx_store_products_active_prescription 
  ON public.store_products(is_active, is_prescription_required)
  WHERE is_active = true;

-- Update existing products with prescription requirement based on naming patterns
-- This is a conservative approach - products can be manually updated later
UPDATE public.store_products
SET is_prescription_required = true
WHERE is_prescription_required IS NULL
  AND (
    name ILIKE '%antibiotic%'
    OR name ILIKE '%antibiótico%'
    OR name ILIKE '%prescription%'
    OR name ILIKE '%receta%'
    OR name ILIKE '%controlled%'
    OR name ILIKE '%controlado%'
    OR description ILIKE '%prescription required%'
    OR description ILIKE '%requiere receta%'
    OR description ILIKE '%venta con receta%'
  );

-- Set all remaining NULL values to false (no prescription required)
UPDATE public.store_products
SET is_prescription_required = false
WHERE is_prescription_required IS NULL;

-- Now make column NOT NULL since we have defaults
ALTER TABLE public.store_products
  ALTER COLUMN is_prescription_required SET NOT NULL;

-- Add comment documenting the column
COMMENT ON COLUMN public.store_products.is_prescription_required IS 
  'Indicates if product requires a veterinary prescription for purchase. ' ||
  'When true, orders containing this product will be flagged for prescription review.';

-- Verify migration
DO $$
DECLARE
  col_exists BOOLEAN;
  col_nullable BOOLEAN;
BEGIN
  -- Check column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'store_products'
      AND column_name = 'is_prescription_required'
  ) INTO col_exists;
  
  -- Check column is not nullable
  SELECT is_nullable = 'NO' INTO col_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'store_products'
    AND column_name = 'is_prescription_required';
  
  IF col_exists AND col_nullable THEN
    RAISE NOTICE 'Prescription required column migration completed successfully';
  ELSIF NOT col_exists THEN
    RAISE EXCEPTION 'Migration failed - column was not created';
  ELSIF NOT col_nullable THEN
    RAISE EXCEPTION 'Migration failed - column should be NOT NULL';
  END IF;
END $$;

-- Create a view for prescription products (helpful for admin)
CREATE OR REPLACE VIEW public.prescription_products AS
SELECT 
  id,
  name,
  sku,
  base_price,
  is_active,
  tenant_id,
  category_id
FROM public.store_products
WHERE is_prescription_required = true
  AND is_active = true
ORDER BY name;

COMMENT ON VIEW public.prescription_products IS 
  'View of all active products that require a prescription for purchase';
