-- ==============================================================================
-- VyaparPe V3 Marketplace Migration
-- ==============================================================================

-- 1. Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    admin_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, product_id)
);

-- RLS Policies
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin has full access to marketplace_listings"
  ON marketplace_listings FOR ALL
  USING (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'super_admin');

CREATE POLICY "Tenants can view and insert their own marketplace_listings"
  ON marketplace_listings FOR SELECT
  USING (store_id = (current_setting('app.current_store_id', true))::uuid);

CREATE POLICY "Tenants can insert their own marketplace_listings"
  ON marketplace_listings FOR INSERT
  WITH CHECK (store_id = (current_setting('app.current_store_id', true))::uuid);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketplace_listings_modtime
BEFORE UPDATE ON marketplace_listings
FOR EACH ROW EXECUTE FUNCTION update_modified_column();
