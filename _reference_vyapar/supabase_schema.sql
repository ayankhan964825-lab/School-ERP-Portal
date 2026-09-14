-- ==========================================
-- The NutriDry: Supabase Database Schema
-- ==========================================
-- Run this entire script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES TABLE
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. PRODUCTS TABLE
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  variant_options JSONB DEFAULT '[]'::jsonb,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  product_type TEXT,
  hsn_code TEXT,
  gst_rate DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  is_bestseller BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. PRODUCT VARIANTS TABLE
CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  cogs DECIMAL(10, 2),
  weight_grams INTEGER,
  is_out_of_stock BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. VARIANT MEDIA TABLE
CREATE TABLE variant_media (
  id TEXT PRIMARY KEY,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  file_size_bytes BIGINT,
  original_format TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. HERO SLIDES TABLE
CREATE TABLE hero_slides (
  id TEXT PRIMARY KEY,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'gif')),
  tagline TEXT,
  headline TEXT,
  headline_accent TEXT,
  description TEXT,
  button_text TEXT,
  button_link TEXT,
  secondary_button_text TEXT,
  secondary_button_link TEXT,
  button_style TEXT DEFAULT 'primary',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  duration_ms INTEGER DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. ORDERS TABLE
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  shipping_address JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  coupon_code TEXT,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('razorpay', 'phonepe', 'cod')),
  payment_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  order_status TEXT CHECK (order_status IN ('placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'ndr', 'rto', 'returned')) DEFAULT 'placed',
  dispatch_date TIMESTAMP WITH TIME ZONE,
  awb_number TEXT,
  courier_partner TEXT,
  invoice_url TEXT,
  invoice_number TEXT,
  notification_sent JSONB DEFAULT '{"email": false, "telegram": false, "admin": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. ORDER ITEMS TABLE
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  hsn_code TEXT,
  gst_rate DECIMAL(5,2)
);

-- 8. COUPONS TABLE
CREATE TABLE coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2),
  max_discount_amount DECIMAL(10, 2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  first_order_only BOOLEAN DEFAULT false,
  category_restriction TEXT,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. BLOG POSTS TABLE
CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image_url TEXT,
  category TEXT,
  tags TEXT[],
  author TEXT,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. FEEDBACKS & COMPLAINTS TABLE
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('feedback', 'complaint')),
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'resolved')) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. BULK ORDERS TABLE
CREATE TABLE bulk_inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  requirements TEXT NOT NULL,
  status TEXT CHECK (status IN ('new', 'contacted')) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. ADMIN NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  type TEXT CHECK (type IN ('order', 'feedback', 'bulk_order')),
  reference_id TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12.5. NDR LOGS TABLE
CREATE TABLE ndr_logs (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  action_taken TEXT,
  status TEXT CHECK (status IN ('pending', 'resolved', 'rto')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12.6. EXPENSES TABLE (Finance)
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  category TEXT CHECK (category IN ('ads', 'shipping', 'platform_fee', 'packaging', 'other')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12.7. REMITTANCES TABLE (Finance)
CREATE TABLE remittances (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, -- e.g., 'razorpay', 'phonepe', 'delhivery'
  utr_number TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  settlement_date DATE,
  status TEXT CHECK (status IN ('expected', 'settled')) DEFAULT 'expected',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 13. SETTINGS / API KEYS TABLE (Admin Only)
CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  -- Store Settings
  cod_enabled BOOLEAN DEFAULT true,
  razorpay_enabled BOOLEAN DEFAULT true,
  phonepe_enabled BOOLEAN DEFAULT true,
  free_shipping_threshold DECIMAL(10, 2) DEFAULT 499,
  flat_shipping_rate DECIMAL(10, 2) DEFAULT 60,
  minimum_order_amount DECIMAL(10, 2) DEFAULT 199,
  delivery_days_min INTEGER DEFAULT 3,
  delivery_days_max INTEGER DEFAULT 5,
  max_cod_amount DECIMAL(10, 2) DEFAULT 5000,
  restricted_pincodes TEXT,
  default_hsn_code TEXT DEFAULT '0813',
  default_gst_rate DECIMAL(5,2) DEFAULT 5.00,
  -- API Keys
  razorpay_key_id TEXT,
  razorpay_key_secret TEXT,
  phonepe_merchant_id TEXT,
  phonepe_salt_key TEXT,
  gemini_api_key TEXT,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  resend_api_key TEXT,
  admin_email TEXT,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  -- Tracking
  gtm_id TEXT,
  ga4_id TEXT,
  meta_pixel_id TEXT,
  google_ads_conversion_id TEXT,
  google_ads_conversion_label TEXT,
  global_seo_title TEXT,
  global_seo_desc TEXT,
  -- Branding & Assets
  logo_url TEXT,
  favicon_url TEXT,
  admin_logo_url TEXT,
  admin_favicon_url TEXT,
  admin_title TEXT,
  -- About Us Team
  team_visibility TEXT DEFAULT 'visible',
  team_members JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 14. SHIPPING ZONES
CREATE TABLE shipping_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pin_codes TEXT[] NOT NULL,
  delivery_time TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 15. REVIEWS
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 16. ADMIN USERS (Staff)
CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'super_admin')) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 17. SAVED ADDRESSES
CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT CHECK (label IN ('Home', 'Work', 'Other')),
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 18. CUSTOMERS EXTENSION
CREATE TABLE customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  total_orders INTEGER DEFAULT 0,
  first_order_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 19. FLASH SALES
CREATE TABLE flash_sales (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  variant TEXT,
  original_price DECIMAL(10, 2) NOT NULL,
  sale_price DECIMAL(10, 2) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('active', 'scheduled', 'expired')) DEFAULT 'scheduled',
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ndr_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;

-- 1. PUBLIC READ ACCESS (Anyone can view catalog and active blogs)
CREATE POLICY "Public profiles are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Public products viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Public variants viewable by everyone" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Public media viewable by everyone" ON variant_media FOR SELECT USING (true);
CREATE POLICY "Public hero slides viewable by everyone" ON hero_slides FOR SELECT USING (is_active = true);
CREATE POLICY "Public blogs viewable by everyone" ON blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Public approved reviews" ON reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "Public flash sales viewable by everyone" ON flash_sales FOR SELECT USING (status = 'active');

-- 2. CUSTOMER ACCESS (Users can only see their own data)
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own order items" ON order_items FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage their addresses" ON addresses FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Users can read own customer profile" ON customers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own customer profile" ON customers FOR UPDATE USING (auth.uid() = id);

-- 3. ADMIN ACCESS (Assuming Edge Functions / Admin Panel uses Service Role Key)
-- The Supabase Service Role Key bypasses RLS completely. So we do not need to write explicit 
-- policies for Admins if they are using the server-side Service Role Key in the Admin Panel.

-- Ensure Default Settings Row exists
INSERT INTO settings (id) VALUES ('default') ON CONFLICT DO NOTHING;
