-- =================================================================================
-- Migration v18: Riders & Delivery Management (FIXED)
-- =================================================================================

-- 1. Create riders table
CREATE TABLE IF NOT EXISTS public.riders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'bike',
    vehicle_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    is_online BOOLEAN DEFAULT false,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, phone)
);

-- 2. Enable RLS
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

-- 3. Policies for riders (Fixed authentication logic)
CREATE POLICY "Stores can read own riders"
    ON public.riders FOR SELECT
    TO authenticated
    USING (store_id = auth.uid());

CREATE POLICY "Stores can insert own riders"
    ON public.riders FOR INSERT
    TO authenticated
    WITH CHECK (store_id = auth.uid());

CREATE POLICY "Stores can update own riders"
    ON public.riders FOR UPDATE
    TO authenticated
    USING (store_id = auth.uid());

CREATE POLICY "Stores can delete own riders"
    ON public.riders FOR DELETE
    TO authenticated
    USING (store_id = auth.uid());

-- 4. Add rider_id to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL;

-- 5. Create an index for rider_id on orders for faster querying
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.orders(rider_id);
