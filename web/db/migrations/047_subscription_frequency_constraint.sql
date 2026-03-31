-- Migration: 047_subscription_frequency_constraint.sql
-- Description: SEC-010 - Add frequency_days bounds validation
-- Prevents invalid values from causing scheduling issues in subscription processing

-- ============================================================================
-- Add CHECK constraint for frequency_days
-- ============================================================================

-- Ensure frequency_days is within valid bounds (7-180 days)
-- This matches the Zod validation in the API
ALTER TABLE store_subscriptions
ADD CONSTRAINT check_frequency_days
CHECK (frequency_days >= 7 AND frequency_days <= 180);

-- ============================================================================
-- Audit existing data for invalid values
-- ============================================================================

-- Update any invalid values to default (30 days)
-- This handles legacy data or direct DB modifications
UPDATE store_subscriptions
SET frequency_days = 30
WHERE frequency_days < 7 OR frequency_days > 180 OR frequency_days IS NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON CONSTRAINT check_frequency_days ON store_subscriptions IS
'SEC-010: Ensures subscription frequency is between 7-180 days.
Prevents scheduling issues from invalid values (0, negative, or extreme dates).';
