-- =============================================================================
-- 023_ADD_REMINDER_CHANNELS.SQL
-- =============================================================================
-- Adds channels field to reminders table for multi-channel delivery
-- =============================================================================

-- Add channels column to reminders table
ALTER TABLE public.reminders
ADD COLUMN IF NOT EXISTS channels TEXT[] DEFAULT ARRAY['email'];

-- Add column to track sent channels (for multi-channel sends)
ALTER TABLE public.reminders
ADD COLUMN IF NOT EXISTS channels_sent TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Comment
COMMENT ON COLUMN public.reminders.channels IS 'Channels to send this reminder on: email, sms, whatsapp';
COMMENT ON COLUMN public.reminders.channels_sent IS 'Channels that have been successfully sent';

-- Backfill existing reminders with default email channel
UPDATE public.reminders
SET channels = ARRAY['email']
WHERE channels IS NULL;
