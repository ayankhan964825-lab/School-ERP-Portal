-- ==============================================================================
-- VyaparPe V5 Multi-Seller Checkout & Master Orders Migration
-- ==============================================================================

-- 1. Create master_orders table
-- This table tracks the top-level checkout by the customer (e.g. paying ₹1500 to VyaparPe)
CREATE TABLE IF NOT EXISTS master_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    shipping_address JSONB NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('razorpay', 'cod')),
    payment_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies for master_orders
ALTER TABLE master_orders ENABLE ROW LEVEL SECURITY;

-- Super Admin can see all master orders
CREATE POLICY "Super Admins can view all master orders" ON master_orders
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role') = 'super_admin'
        )
    );

-- 2. Modify existing orders table
-- Add master_order_id to link sub-orders to the top-level checkout
-- Add store_id if it doesn't exist to isolate orders per seller
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'master_order_id') THEN
        ALTER TABLE orders ADD COLUMN master_order_id UUID REFERENCES master_orders(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'store_id') THEN
        ALTER TABLE orders ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    END IF;
END $$;
