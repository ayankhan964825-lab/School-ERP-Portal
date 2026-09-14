-- Migration: v23 - Notifications Architecture & Global Garbage Collection

BEGIN;

-- Part 1: Notification Schema Updates
-- Add text arrays to track read and clear state per staff
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_by text[] DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS cleared_by text[] DEFAULT '{}';

-- Create GIN index for blazing fast array queries
CREATE INDEX IF NOT EXISTS idx_notifications_cleared_by ON notifications USING GIN (cleared_by);

-- Part 2: Atomic RPC Functions for Notifications

-- Function to mark a single notification as read by a staff member
CREATE OR REPLACE FUNCTION mark_notification_read(notif_id text, admin_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE notifications 
  SET read_by = array_append(read_by, admin_id) 
  WHERE id = notif_id AND NOT (admin_id = ANY(read_by));
$$;

-- Function to mark all notifications as read for a staff member (in a specific store)
CREATE OR REPLACE FUNCTION mark_all_notifications_read_for_staff(target_store_id uuid, admin_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE notifications 
  SET read_by = array_append(read_by, admin_id) 
  WHERE store_id = target_store_id 
  AND NOT (admin_id = ANY(read_by))
  AND NOT (admin_id = ANY(cleared_by));
$$;

-- Function to clear a single notification for a staff member
CREATE OR REPLACE FUNCTION clear_notification(notif_id text, admin_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE notifications 
  SET cleared_by = array_append(cleared_by, admin_id) 
  WHERE id = notif_id AND NOT (admin_id = ANY(cleared_by));
$$;

-- Function to clear all notifications for a staff member (in a specific store)
CREATE OR REPLACE FUNCTION clear_all_notifications_for_staff(target_store_id uuid, admin_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE notifications 
  SET cleared_by = array_append(cleared_by, admin_id) 
  WHERE store_id = target_store_id 
  AND NOT (admin_id = ANY(cleared_by));
$$;


-- Part 3: Global Garbage Collection Setup (pg_cron)

-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the Nightly Garbage Collection Job
-- Runs every night at 2:00 AM UTC
SELECT cron.schedule('vyaparpe-nightly-gc', '0 2 * * *', $$
  -- Delete old system error logs (older than 15 days)
  DELETE FROM system_error_logs WHERE created_at < NOW() - INTERVAL '15 days';
  
  -- Delete old password recovery requests & OTPs (older than 1 day)
  DELETE FROM password_recovery_requests WHERE created_at < NOW() - INTERVAL '1 day';
  
  -- Delete old auth rate limits (older than 2 days)
  DELETE FROM auth_rate_limits WHERE created_at < NOW() - INTERVAL '2 days';
  
  -- Delete old notifications (older than 30 days)
  DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete old activity logs (older than 90 days)
  DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days';
$$);

COMMIT;
