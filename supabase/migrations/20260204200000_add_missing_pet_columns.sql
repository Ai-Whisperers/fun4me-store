-- Add missing columns to pets table (schema drift fix)
-- These columns are referenced in code/services/types but were never migrated

ALTER TABLE pets ADD COLUMN IF NOT EXISTS temperament TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS existing_conditions TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS diet_category TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS diet_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN pets.temperament IS 'Pet temperament/behavior notes';
COMMENT ON COLUMN pets.existing_conditions IS 'Pre-existing medical conditions';
COMMENT ON COLUMN pets.diet_category IS 'Diet type/category';
COMMENT ON COLUMN pets.diet_notes IS 'Additional diet notes';
