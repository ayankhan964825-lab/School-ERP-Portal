-- Migration V5: Create Global Platform Settings Table

CREATE TABLE IF NOT EXISTS platform_settings (
    id integer PRIMARY KEY CHECK (id = 1),
    auth_mode text NOT NULL DEFAULT 'phone_only',
    resend_api_key text,
    twilio_account_sid text,
    twilio_auth_token text,
    platform_name text DEFAULT 'VyapaarPe',
    support_email text DEFAULT 'support@vyaparpe.com',
    platform_domain text DEFAULT 'https://vyaparpe.com',
    default_commission numeric(10, 2) DEFAULT 2.00,
    platform_tax numeric(10, 2) DEFAULT 18.00,
    razorpay_api_key text,
    razorpay_api_secret text,
    updated_at timestamp with time zone DEFAULT now()
);

-- Row Level Security
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users
CREATE POLICY "Allow public read access to platform settings"
  ON platform_settings FOR SELECT
  USING (true);

-- Insert default row
INSERT INTO platform_settings (id, auth_mode)
VALUES (1, 'phone_only')
ON CONFLICT (id) DO NOTHING;
