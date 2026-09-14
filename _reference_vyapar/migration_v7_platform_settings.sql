-- Migration V7: Global Platform Settings
-- Ensures the table exists and has all required columns for the global settings page

CREATE TABLE IF NOT EXISTS platform_settings (
  id INT PRIMARY KEY DEFAULT 1,
  auth_mode TEXT NOT NULL DEFAULT 'phone_only',
  resend_api_key TEXT,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  platform_name TEXT,
  support_email TEXT,
  platform_domain TEXT,
  default_commission NUMERIC(5,2),
  platform_tax NUMERIC(5,2),
  razorpay_api_key TEXT,
  razorpay_api_secret TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ensure_single_row CHECK (id = 1)
);

-- Safely attempt to add columns in case the table existed but was missing fields
DO $$
BEGIN
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN auth_mode TEXT NOT NULL DEFAULT 'phone_only';
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN resend_api_key TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN twilio_account_sid TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN twilio_auth_token TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN platform_name TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN support_email TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN platform_domain TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN default_commission NUMERIC(5,2);
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN platform_tax NUMERIC(5,2);
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN razorpay_api_key TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE platform_settings ADD COLUMN razorpay_api_secret TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
END $$;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
