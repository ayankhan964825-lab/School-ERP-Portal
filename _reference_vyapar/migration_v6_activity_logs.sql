-- Migration V6: Admin Activity Logs
-- Creates a table to securely track and audit all actions performed by Super Admins and Staff

CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    admin_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_details TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster sorting and filtering on the dashboard
CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs (created_at DESC);
CREATE INDEX idx_admin_activity_logs_admin_id ON admin_activity_logs (admin_id);
CREATE INDEX idx_admin_activity_logs_action ON admin_activity_logs (action);

-- Enable RLS but restrict all access to service role only for security
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
