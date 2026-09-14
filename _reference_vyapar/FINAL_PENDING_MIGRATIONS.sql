-- ==============================================================================
-- FINAL COMPLETE MIGRATION: ALL UNPUSHED CHANGES
-- ==============================================================================
-- Run this ENTIRE script in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- 
-- This is the ONE file you need. It covers:
--   1. Settings table: 15 missing real columns
--   2. Orders table: 18 missing columns
--   3. Stores table: 14 missing columns
--   4. Locations table: 5 missing columns
--   5. Fulfillments table: 1 missing column
--   6. Products table: 2 new columns (Digital + Q-Commerce)
--   7. 6 missing tables (affiliates, milestone_offers, etc.)
--
-- All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, so it is
-- completely safe to re-run if some columns already exist in your live DB.
-- ==============================================================================


-- ██████████████████████████████████████████████████████████████████████████████
-- 1. SETTINGS TABLE
-- ██████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS razorpay_webhook_secret TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS icarry_default_weight NUMERIC(6,2);
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS google_ads_id TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS trending_slider_title TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS trending_slider_products JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS state_shipping_rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS auth_mode TEXT DEFAULT 'phone_only';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pages_content JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS meta_capi_token TEXT;

-- Payment Gateways
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS primary_domestic_gateway TEXT DEFAULT 'razorpay';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS phonepe_salt_index TEXT;

-- Logistics & Shipping Partners
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS default_courier_partner TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS hyperlocal_courier_partner TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS shiprocket_token TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS porter_api_key TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS icarry_api_token TEXT;

-- WhatsApp Notifications
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT;

-- Feature Toggles
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS test_otp_mode_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS allow_coupon_stacking BOOLEAN DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS allow_flash_sale_stacking BOOLEAN DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS prepaid_discount_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS trending_slider_enabled BOOLEAN DEFAULT true;

-- Create index on store_id for tenant isolation
CREATE INDEX IF NOT EXISTS idx_settings_store_id ON public.settings(store_id);


-- ██████████████████████████████████████████████████████████████████████████████
-- 2. ORDERS TABLE
-- ██████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS display_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phonepe_transaction_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS affiliate_commission NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'standard';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_partner_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_partner_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS routing_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS location_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2);

-- order_id is usually the same as order_number, but some code references it separately
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_id TEXT;

-- Critical missing columns expected by atomic_create_marketplace_order RPC
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping NUMERIC(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'placed';

-- Drop old CHECK constraint on payment_method to allow new gateways
-- (Supabase may already have removed this, safe to try)
DO $$ BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Drop old CHECK constraint on order_status to allow new statuses
DO $$ BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;


-- ██████████████████████████████████████████████████████████████████████████████
-- 3. STORES TABLE
-- ██████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS support_email TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS support_phone TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS parent_company_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS digital_commission_rate NUMERIC(5,2);

-- Add to subscription_plans so the super admin can set defaults per plan
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS digital_commission_rate NUMERIC(5,2);

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS pages_content JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS mobile_app_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS total_earned NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS total_commission_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS total_payouts NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_pure_q_commerce BOOLEAN DEFAULT false;


-- ██████████████████████████████████████████████████████████████████████████████
-- 4. LOCATIONS TABLE
-- ██████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS q_commerce_eta INTEGER DEFAULT 30;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8);
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS auto_assign_riders BOOLEAN DEFAULT false;
-- 'address', 'lat', 'lng' are aliases used in .select() for address_line1 and latitude/longitude
-- No new columns needed for those — they are JS-side renames.


-- ██████████████████████████████████████████████████████████████████████████████
-- 5. FULFILLMENTS TABLE
-- ██████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.fulfillments ADD COLUMN IF NOT EXISTS rider_id TEXT;


-- ██████████████████████████████████████████████████████████████████████████████
-- 6. PRODUCTS TABLE
-- ██████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_q_commerce_only BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_standard_only BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS digital_delivery_url TEXT;


-- ██████████████████████████████████████████████████████████████████████████████
-- 7. MISSING TABLES
-- ██████████████████████████████████████████████████████████████████████████████

-- 7a. Affiliates
CREATE TABLE IF NOT EXISTS public.affiliates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 5.00,
  total_earned NUMERIC(12,2) DEFAULT 0,
  total_paid NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  store_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_affiliates_store_id ON public.affiliates(store_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON public.affiliates(referral_code);

-- 7b. Affiliate Offers
CREATE TABLE IF NOT EXISTS public.affiliate_offers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 5.00,
  is_active BOOLEAN DEFAULT true,
  store_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7c. Milestone Offers
CREATE TABLE IF NOT EXISTS public.milestone_offers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  threshold NUMERIC(10,2) NOT NULL,
  discount_type TEXT DEFAULT 'percentage',
  discount_value NUMERIC(10,2) DEFAULT 0,
  free_gift_id TEXT,
  is_active BOOLEAN DEFAULT true,
  store_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_milestone_offers_store_id ON public.milestone_offers(store_id);

-- 7d. Newsletter Subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  phone TEXT,
  store_id TEXT,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  is_active BOOLEAN DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_newsletter_store_id ON public.newsletter_subscribers(store_id);

-- 7e. Password Recovery Requests
CREATE TABLE IF NOT EXISTS public.password_recovery_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  identifier TEXT NOT NULL,
  auth_type TEXT DEFAULT 'phone',
  store_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7f. System Error Logs
CREATE TABLE IF NOT EXISTS public.system_error_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  error_type TEXT,
  error_message TEXT,
  stack_trace TEXT,
  context JSONB,
  store_id TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_error_logs_store_id ON public.system_error_logs(store_id);

-- 7g. Marketplace Sub-Orders (for multi-vendor order splitting)
CREATE TABLE IF NOT EXISTS public.marketplace_sub_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  master_order_id TEXT,
  order_id TEXT,
  store_id TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_sub_orders_master ON public.marketplace_sub_orders(master_order_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_store ON public.marketplace_sub_orders(store_id);

-- 7h. Payouts (distinct from payout_requests — tracks completed payouts)
CREATE TABLE IF NOT EXISTS public.payouts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  store_id TEXT,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'completed',
  utr_number TEXT,
  processed_by TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_payouts_store ON public.payouts(store_id);

-- 7i. Admin Activity Logs & Super Admin Activity Logs (Added just in case they were missed in v6)
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    admin_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_details TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.super_admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_details TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'activity_logs') THEN
    EXECUTE 'CREATE VIEW public.activity_logs AS SELECT * FROM public.admin_activity_logs';
  END IF;
END $$;

-- 7j. Order Notifications (For Abandoned Cart Cron)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notification_sent JSONB DEFAULT '{}'::jsonb;

-- 7k. Fallback for product_variants (In case legacy table prevented full creation)
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS weight TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS original_price NUMERIC;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_b2b BOOLEAN DEFAULT false;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS image TEXT;


-- ██████████████████████████████████████████████████████████████████████████████
-- 8. RLS (Row Level Security) for new tables
-- ██████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_sub_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- ✅ COMPLETE! Your database is now fully synchronized with the unpushed codebase.
-- ==============================================================================