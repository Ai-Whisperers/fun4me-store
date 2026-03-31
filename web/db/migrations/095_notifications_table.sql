-- Migration 095: Add notifications table for in-app notifications
-- Created: 2026-02-06
-- Description: Support for in-app notification system

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Indexes for performance
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_tenant_id (tenant_id),
  INDEX idx_notifications_read (user_id, read_at, created_at DESC),
  INDEX idx_notifications_type (tenant_id, type, created_at DESC)
);

-- Add tenant isolation
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can read their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Staff can read tenant notifications" ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id = notifications.tenant_id
      AND profiles.role IN ('admin', 'vet', 'staff')
    )
  );

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification type (appointment_reminder, lab_results_ready, etc.)';
COMMENT ON COLUMN notifications.data IS 'Additional data for the notification (JSON)';
COMMENT ON COLUMN notifications.action_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN notifications.read_at IS 'When the notification was read (NULL = unread)';

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read_at = now()
  WHERE id = notification_id
  AND user_id = auth.uid()
  AND read_at IS NULL;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id
  AND read_at IS NULL;
  
  RETURN unread_count;
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET read_at = now()
  WHERE user_id = p_user_id
  AND read_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Add notification cleanup policy (keep notifications for 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- Schedule cleanup (this would typically be done via pg_cron or external scheduler)
COMMENT ON FUNCTION cleanup_old_notifications() IS 'Clean up notifications older than 90 days. Should be called periodically.';