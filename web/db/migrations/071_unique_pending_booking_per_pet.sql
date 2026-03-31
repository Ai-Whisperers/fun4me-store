-- Migration 071: Prevent duplicate pending booking requests per pet
-- AUDIT-107: Fixes TOCTOU race condition in booking request creation

-- Create partial unique index to prevent duplicate pending booking requests
-- This ensures only one pending_scheduling request per pet at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_booking_per_pet
ON appointments (pet_id)
WHERE scheduling_status = 'pending_scheduling'
  AND status != 'cancelled'
  AND deleted_at IS NULL;

COMMENT ON INDEX idx_unique_pending_booking_per_pet IS
  'AUDIT-107: Ensures only one pending booking request per pet at a time (TOCTOU protection)';
