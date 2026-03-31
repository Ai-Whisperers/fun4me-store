-- Migration: Add user_preferences column to profiles
-- Created: 2026-01-14
-- Purpose: Store user preferences (reminders, default pet) in JSONB format
-- Fixes: TICKET-SEC-001 - Remove mock authentication system

-- Add user_preferences column
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS user_preferences JSONB DEFAULT '{}'::JSONB;

-- Add index for performance (GIN index for JSONB queries)
CREATE INDEX IF NOT EXISTS idx_profiles_user_preferences 
  ON profiles USING GIN (user_preferences);

-- Add comment
COMMENT ON COLUMN profiles.user_preferences IS 'User preferences stored as JSONB: defaultPetId, reminderType, reminderTimeBefore';

-- Example structure:
-- {
--   "defaultPetId": "uuid-here",
--   "reminderType": "email",
--   "reminderTimeBefore": "24h"
-- }
