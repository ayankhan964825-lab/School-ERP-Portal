-- ==========================================
-- MIGRATION V3: Managed Services Module
-- ==========================================
-- This script creates the table and policies required for the new
-- "One-Time Setup", "Extra Listings", and "Custom UX Theme" services.

-- 1. Create the table
CREATE TABLE IF NOT EXISTS store_service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL, -- 'one_time_setup', 'extra_listings', 'custom_theme'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    price DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE store_service_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Sellers can view their own requests
CREATE POLICY "Sellers can view own service requests" 
ON store_service_requests FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM staff_accounts WHERE store_id = store_service_requests.store_id));

-- Sellers can insert requests for their own store
CREATE POLICY "Sellers can create service requests" 
ON store_service_requests FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM staff_accounts WHERE store_id = store_service_requests.store_id));

-- Super Admins can do everything (handled by service_role key typically, but good to have explicit policy if using RLS)
CREATE POLICY "Super Admins can manage all service requests"
ON store_service_requests FOR ALL
USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

-- 4. Setup updated_at trigger (assuming handle_updated_at function exists from previous migrations)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_store_service_requests_updated_at') THEN
        CREATE TRIGGER set_store_service_requests_updated_at
            BEFORE UPDATE ON store_service_requests
            FOR EACH ROW
            EXECUTE FUNCTION handle_updated_at();
    END IF;
END
$$;
