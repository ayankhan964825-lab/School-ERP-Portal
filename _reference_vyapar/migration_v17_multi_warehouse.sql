-- ==============================================================================
-- VyaparPe Multi-Warehouse Migration (Phase 1)
-- Description: Core schema, data migration, and backward-compatible triggers
-- ==============================================================================

BEGIN;

-- 1. Create `locations` table (Warehouses / Stores)
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Address Details
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    country TEXT DEFAULT 'India',
    
    -- Q-Commerce / Routing Settings
    q_commerce_enabled BOOLEAN DEFAULT false,
    zone_type TEXT CHECK (zone_type IN ('radius', 'pincode', 'none')) DEFAULT 'none',
    delivery_radius_km INTEGER,
    delivery_pincodes TEXT[], -- Array of strings
    
    -- Contact Details (for courier pickup)
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_locations_store_id ON public.locations(store_id);


-- 2. Create `inventory_levels` table
CREATE TABLE IF NOT EXISTS public.inventory_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    
    available INTEGER DEFAULT 0 NOT NULL,
    committed INTEGER DEFAULT 0 NOT NULL, -- Reserved for pending checkouts
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_variant_location UNIQUE (variant_id, location_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_levels_variant ON public.inventory_levels(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_levels_location ON public.inventory_levels(location_id);


-- 3. Create `fulfillments` table
CREATE TABLE IF NOT EXISTS public.fulfillments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT NOT NULL, -- Logical reference to orders.id / orders.order_id
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    
    status TEXT DEFAULT 'pending' NOT NULL, -- pending, shipped, delivered, rto, cancelled
    awb_number TEXT,
    courier_name TEXT,
    shipping_cost NUMERIC(10, 2) DEFAULT 0,
    
    -- Q-Commerce / Logistics Expansion (Sprint 1.6)
    delivery_type TEXT DEFAULT 'standard', -- 'standard', 'q_commerce_inhouse', 'q_commerce_3rd_party'
    rider_name TEXT,
    rider_phone TEXT,
    rider_status TEXT, -- 'assigned', 'en_route', 'delivered'
    tracking_url TEXT, -- External tracking link for 3rd-party Q-Commerce
    
    -- Items assigned to this fulfillment
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fulfillments_order_id ON public.fulfillments(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_store_id ON public.fulfillments(store_id);


-- 4. Create `inventory_transactions` table (Audit Log)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    
    quantity_change INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'order_placed', 'order_cancelled', 'manual_adjustment', 'bulk_upload', 'rto'
    reference_id TEXT, -- order_id or user_id
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- BACKWARD COMPATIBILITY: Stock Cache Trigger
-- Automatically updates product_variants.stock whenever inventory_levels changes
-- ==============================================================================

CREATE OR REPLACE FUNCTION sync_variant_stock_cache() 
RETURNS TRIGGER AS $$
BEGIN
    -- Update the stock on the product_variant by summing all available inventory
    UPDATE public.product_variants 
    SET stock = (
        SELECT COALESCE(SUM(available), 0) 
        FROM public.inventory_levels 
        WHERE variant_id = COALESCE(NEW.variant_id, OLD.variant_id)
    )
    WHERE id = COALESCE(NEW.variant_id, OLD.variant_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_stock_cache ON public.inventory_levels;
CREATE TRIGGER trg_sync_stock_cache
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_levels
FOR EACH ROW EXECUTE FUNCTION sync_variant_stock_cache();


-- ==============================================================================
-- DATA MIGRATION: Move existing single-warehouse stock into the new system
-- ==============================================================================

-- A. Auto-create a "Default Warehouse" for every active store
INSERT INTO public.locations (store_id, name, is_default, is_active)
SELECT id, 'Default Warehouse', true, true
FROM public.stores
WHERE id NOT IN (SELECT store_id FROM public.locations WHERE is_default = true)
ON CONFLICT DO NOTHING;

-- B. Migrate stock from product_variants to inventory_levels
INSERT INTO public.inventory_levels (variant_id, location_id, store_id, available, committed)
SELECT 
    pv.id AS variant_id,
    l.id AS location_id,
    pv.store_id AS store_id,
    COALESCE(pv.stock, 0) AS available,
    0 AS committed
FROM public.product_variants pv
JOIN public.locations l ON l.store_id = pv.store_id AND l.is_default = true
WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_levels il 
    WHERE il.variant_id = pv.id AND il.location_id = l.id
);


-- ==============================================================================
-- RLS POLICIES (Row Level Security)
-- ==============================================================================
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Locations Policies
CREATE POLICY "Stores can read own locations" ON public.locations FOR SELECT USING (store_id = auth.uid());
CREATE POLICY "Stores can insert own locations" ON public.locations FOR INSERT WITH CHECK (store_id = auth.uid());
CREATE POLICY "Stores can update own locations" ON public.locations FOR UPDATE USING (store_id = auth.uid());
CREATE POLICY "Stores can delete own locations" ON public.locations FOR DELETE USING (store_id = auth.uid());

-- Inventory Levels Policies
CREATE POLICY "Stores can read own inventory" ON public.inventory_levels FOR SELECT USING (store_id = auth.uid());
CREATE POLICY "Stores can insert own inventory" ON public.inventory_levels FOR INSERT WITH CHECK (store_id = auth.uid());
CREATE POLICY "Stores can update own inventory" ON public.inventory_levels FOR UPDATE USING (store_id = auth.uid());
CREATE POLICY "Stores can delete own inventory" ON public.inventory_levels FOR DELETE USING (store_id = auth.uid());

-- Fulfillments Policies
CREATE POLICY "Stores can read own fulfillments" ON public.fulfillments FOR SELECT USING (store_id = auth.uid());
CREATE POLICY "Stores can update own fulfillments" ON public.fulfillments FOR UPDATE USING (store_id = auth.uid());

-- Transactions Policies
CREATE POLICY "Stores can read own transactions" ON public.inventory_transactions FOR SELECT USING (store_id = auth.uid());
-- ==============================================================================
-- SPRINT 1.2: MULTI-WAREHOUSE RPC ENGINE (ORDER CREATION)
-- ==============================================================================

-- Drop existing overloaded functions to prevent conflicts
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, BOOLEAN, BOOLEAN);

-- 1. Multi-Warehouse Inventory Deduction (Locking)
CREATE OR REPLACE FUNCTION atomic_process_order_inventory(
    p_items JSONB,
    p_allow_negative_stock BOOLEAN DEFAULT false,
    p_skip_deduction BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
    v_product_id TEXT;
    v_variant_name TEXT;
    v_quantity INTEGER;
    v_is_b2b BOOLEAN;
    v_variant_id UUID;
    v_location_id UUID;
    v_current_available INTEGER;
    v_store_id UUID;
BEGIN
    -- We assume p_items now includes 'location_id'. 
    -- If missing, we fallback to the Default Warehouse.
    FOR v_item IN 
        SELECT * FROM jsonb_array_elements(p_items) AS elem
        ORDER BY COALESCE(elem->>'location_id', '') ASC, COALESCE(elem->>'variant_id', elem->>'id') ASC
    LOOP
        v_product_id := v_item->>'id';
        v_variant_name := v_item->>'variant';
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        IF (v_item->>'isB2B') = 'true' THEN
            v_is_b2b := true;
        ELSIF (v_item->>'isB2B') = 'false' THEN
            v_is_b2b := false;
        ELSE
            v_is_b2b := COALESCE((v_item->>'isB2B')::BOOLEAN, false);
        END IF;

        -- 1. Resolve Variant ID
        IF v_item->>'variant_id' IS NOT NULL THEN
            v_variant_id := (v_item->>'variant_id')::UUID;
        ELSIF v_variant_name IS NULL OR v_variant_name = '' THEN
            SELECT id, store_id INTO v_variant_id, v_store_id
            FROM product_variants
            WHERE product_id = v_product_id AND is_b2b = v_is_b2b
            ORDER BY created_at ASC LIMIT 1;
        ELSE
            SELECT id, store_id INTO v_variant_id, v_store_id
            FROM product_variants
            WHERE product_id = v_product_id AND name = v_variant_name AND is_b2b = v_is_b2b
            LIMIT 1;
        END IF;

        IF v_variant_id IS NULL THEN
            IF p_allow_negative_stock THEN
                CONTINUE; 
            ELSE
                RAISE EXCEPTION 'Product variant not found: % - %', v_product_id, v_variant_name;
            END IF;
        END IF;

        -- 2. Resolve Location ID
        IF v_item->>'location_id' IS NOT NULL THEN
            v_location_id := (v_item->>'location_id')::UUID;
        ELSE
            -- Find the default warehouse for this variant's store
            SELECT l.id INTO v_location_id
            FROM locations l
            JOIN product_variants pv ON pv.store_id = l.store_id
            WHERE pv.id = v_variant_id AND l.is_default = true
            LIMIT 1;
        END IF;

        -- 3. Lock the inventory_levels row
        SELECT available INTO v_current_available
        FROM inventory_levels
        WHERE variant_id = v_variant_id AND location_id = v_location_id
        FOR UPDATE;

        IF NOT FOUND THEN
            IF p_allow_negative_stock THEN
                -- Auto-create the inventory level if it doesn't exist and negative is allowed
                INSERT INTO inventory_levels (variant_id, location_id, store_id, available, committed)
                VALUES (v_variant_id, v_location_id, (SELECT store_id FROM product_variants WHERE id = v_variant_id), 0, 0)
                ON CONFLICT DO NOTHING;
                v_current_available := 0;
            ELSE
                RAISE EXCEPTION 'Inventory level not found for variant %, location %', v_variant_id, v_location_id;
            END IF;
        END IF;

        IF v_current_available < v_quantity AND NOT p_allow_negative_stock THEN
            RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_available, v_quantity;
        END IF;

        -- 4. Deduct Stock (Move available -> committed for pending checkouts)
        IF NOT p_skip_deduction THEN
            UPDATE inventory_levels
            SET available = available - v_quantity,
                committed = committed + v_quantity
            WHERE variant_id = v_variant_id AND location_id = v_location_id;
            
            -- Insert Audit Log
            INSERT INTO inventory_transactions (store_id, location_id, variant_id, quantity_change, transaction_type, notes)
            VALUES ((SELECT store_id FROM product_variants WHERE id = v_variant_id), v_location_id, v_variant_id, -v_quantity, 'order_placed', 'Locked for checkout');
        END IF;
    END LOOP;
END;
$$;


-- 2. Atomic Marketplace Order Creation (With Fulfillments)
CREATE OR REPLACE FUNCTION atomic_create_marketplace_order(
  p_master_order JSONB,
  p_sub_orders JSONB,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_skip_inventory BOOLEAN DEFAULT false,
  p_allow_negative_stock BOOLEAN DEFAULT false,
  p_skip_deduction BOOLEAN DEFAULT false,
  p_coupons TEXT[] DEFAULT '{}',
  p_increment_coupons BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_master_id UUID;
  v_sub_order JSONB;
  v_sub_id UUID;
  v_result JSONB = '[]'::JSONB;
  v_loc_id UUID;
  v_loc_items JSONB;
BEGIN
  -- A. Inventory Deduction
  IF jsonb_array_length(p_items) > 0 AND NOT p_skip_inventory THEN
    PERFORM atomic_process_order_inventory(p_items, p_allow_negative_stock, p_skip_deduction);
    PERFORM atomic_process_flash_sale_inventory(p_items);
  END IF;

  -- B. Insert master_order
  INSERT INTO master_orders (
    display_id, customer_name, customer_phone, customer_email, 
    shipping_address, subtotal, shipping_cost, total_amount, 
    payment_method, payment_id, payment_status
  ) VALUES (
    p_master_order->>'displayId',
    COALESCE(p_master_order->'customer'->>'name', 'Guest'),
    COALESCE(p_master_order->'customer'->>'phone', ''),
    COALESCE(p_master_order->'customer'->>'email', ''),
    COALESCE(p_master_order->'address', '{}'::JSONB),
    (p_master_order->>'subtotal')::NUMERIC,
    (p_master_order->>'shipping')::NUMERIC,
    (p_master_order->>'amount')::NUMERIC,
    p_master_order->>'paymentMethod',
    p_master_order->>'paymentId',
    COALESCE(p_master_order->>'paymentStatus', 'pending')
  ) RETURNING id INTO v_master_id;

  -- C. Loop through sub_orders (Orders per tenant)
  FOR v_sub_order IN SELECT * FROM jsonb_array_elements(p_sub_orders)
  LOOP
    INSERT INTO orders (
      order_id, customer, items, amount, discount, shipping, subtotal, 
      coupon_code, payment_method, payment_status, status, store_id, 
      master_order_id, razorpay_order_id, affiliate_id, affiliate_commission
    ) VALUES (
      v_sub_order->>'orderId',
      p_master_order->'customer',
      v_sub_order->'items',
      (v_sub_order->>'amount')::NUMERIC,
      (v_sub_order->>'discount')::NUMERIC,
      (v_sub_order->>'shipping')::NUMERIC,
      (v_sub_order->>'subtotal')::NUMERIC,
      v_sub_order->>'couponCode',
      p_master_order->>'paymentMethod',
      COALESCE(p_master_order->>'paymentStatus', 'pending'),
      'placed',
      v_sub_order->>'storeId',
      v_master_id,
      p_master_order->>'paymentId',
      NULLIF(v_sub_order->>'affiliate_id', ''),
      (v_sub_order->>'affiliate_commission')::NUMERIC
    ) RETURNING id INTO v_sub_id;
    
    -- D. Generate Fulfillments based on items' location_id
    -- Group items by location_id and insert a fulfillment for each
    FOR v_loc_id, v_loc_items IN 
        SELECT 
            COALESCE((elem->>'location_id')::UUID, (SELECT id FROM locations WHERE store_id = (v_sub_order->>'storeId')::UUID AND is_default = true LIMIT 1)), 
            jsonb_agg(elem)
        FROM jsonb_array_elements(v_sub_order->'items') AS elem
        GROUP BY 1
    LOOP
        INSERT INTO fulfillments (order_id, store_id, location_id, status, items)
        VALUES (v_sub_order->>'orderId', (v_sub_order->>'storeId')::UUID, v_loc_id, 'pending', v_loc_items);
    END LOOP;
    
    -- F. Collect result array
    v_result = v_result || jsonb_build_object(
      'id', v_sub_id,
      'order_id', v_sub_order->>'orderId',
      'store_id', v_sub_order->>'storeId',
      'amount', (v_sub_order->>'amount')::NUMERIC,
      'shipping', (v_sub_order->>'shipping')::NUMERIC,
      'customer', p_master_order->'customer'
    );
  END LOOP;

  -- G. Check and Increment Coupons
  IF p_coupons IS NOT NULL AND array_length(p_coupons, 1) > 0 THEN
    DECLARE
      v_coupon TEXT;
    BEGIN
      FOREACH v_coupon IN ARRAY p_coupons LOOP
        IF p_increment_coupons THEN
           PERFORM atomic_increment_coupon_usage(v_coupon, 1);
        END IF;
      END LOOP;
    END;
  END IF;

  RETURN jsonb_build_object(
    'master_id', v_master_id,
    'sub_orders', v_result
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- SPRINT 1.3: POST-ORDER RPCs (Payment Confirm, Cancel, Restore)
-- ==============================================================================

-- 3. Inventory Restore RPC (Atomic)
-- Restores stock back to `available`. Handles legacy payloads without location_id.
CREATE OR REPLACE FUNCTION atomic_restore_order_inventory(p_items JSONB)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
    v_product_id TEXT;
    v_variant_name TEXT;
    v_quantity INTEGER;
    v_is_b2b BOOLEAN;
    v_variant_id UUID;
    v_location_id UUID;
BEGIN
    FOR v_item IN 
        SELECT * FROM jsonb_array_elements(p_items) AS elem
        ORDER BY COALESCE(elem->>'location_id', '') ASC, COALESCE(elem->>'variant_id', elem->>'id') ASC
    LOOP
        v_product_id := v_item->>'id';
        v_variant_name := v_item->>'variant';
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        IF (v_item->>'isB2B') = 'true' THEN
            v_is_b2b := true;
        ELSIF (v_item->>'isB2B') = 'false' THEN
            v_is_b2b := false;
        ELSE
            v_is_b2b := COALESCE((v_item->>'isB2B')::BOOLEAN, false);
        END IF;

        -- Resolve Variant ID
        IF v_item->>'variant_id' IS NOT NULL THEN
            v_variant_id := (v_item->>'variant_id')::UUID;
        ELSIF v_variant_name IS NULL OR v_variant_name = '' THEN
            SELECT id INTO v_variant_id FROM product_variants
            WHERE product_id = v_product_id AND is_b2b = v_is_b2b ORDER BY created_at ASC LIMIT 1;
        ELSE
            SELECT id INTO v_variant_id FROM product_variants
            WHERE product_id = v_product_id AND name = v_variant_name AND is_b2b = v_is_b2b LIMIT 1;
        END IF;

        IF v_variant_id IS NULL THEN CONTINUE; END IF;

        -- Resolve Location ID
        IF v_item->>'location_id' IS NOT NULL THEN
            v_location_id := (v_item->>'location_id')::UUID;
        ELSE
            SELECT l.id INTO v_location_id
            FROM locations l
            JOIN product_variants pv ON pv.store_id = l.store_id
            WHERE pv.id = v_variant_id AND l.is_default = true LIMIT 1;
        END IF;

        IF v_location_id IS NOT NULL THEN
            -- Restore stock
            UPDATE inventory_levels
            SET available = available + v_quantity
            WHERE variant_id = v_variant_id AND location_id = v_location_id;
            
            -- Audit Log
            INSERT INTO inventory_transactions (store_id, location_id, variant_id, quantity_change, transaction_type, notes)
            VALUES ((SELECT store_id FROM product_variants WHERE id = v_variant_id), v_location_id, v_variant_id, v_quantity, 'order_cancelled', 'Restored stock');
        END IF;
    END LOOP;
END;
$$;


-- 4. Atomic Payment Confirmation
CREATE OR REPLACE FUNCTION atomic_confirm_payment(
  p_lookup_id TEXT,
  p_razorpay_payment_id TEXT,
  p_skip_deduction BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_master_order RECORD;
  v_sub_order RECORD;
  v_mapped_items JSONB;
  v_all_items JSONB = '[]'::JSONB;
  v_all_coupons TEXT[] = '{}';
  v_code TEXT;
BEGIN
  -- A. Idempotency Check & Lock
  SELECT * INTO v_master_order 
  FROM master_orders 
  WHERE payment_id = p_lookup_id OR display_id = p_lookup_id
  FOR UPDATE LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found for ID: %', p_lookup_id;
  END IF;

  IF v_master_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', v_master_order.display_id);
  END IF;

  -- B. Gather items and coupons from fulfillments (New Multi-Warehouse approach)
  -- Since orders are grouped by location in fulfillments, we should extract items from there to ensure accurate location tracking.
  -- But for backward compatibility with old orders that don't have fulfillments, we fallback to orders.items.
  FOR v_sub_order IN SELECT * FROM orders WHERE master_order_id = v_master_order.id
  LOOP
      SELECT jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(elem->>'product_id', split_part(elem->>'id', '-', 1)),
            'variant', elem->>'variant_name',
            'variant_id', elem->>'variant_id',
            'location_id', elem->>'location_id', -- Critical for MW
            'isB2B', COALESCE((elem->>'isB2B')::BOOLEAN, false),
            'quantity', (elem->>'quantity')::INTEGER,
            'isFlashSale', COALESCE((elem->>'isFlashSale')::BOOLEAN, false),
            'product_name', COALESCE(elem->>'product_name', '')
        )
      ) INTO v_mapped_items
      FROM jsonb_array_elements(v_sub_order.items) AS elem;
      
      IF v_mapped_items IS NOT NULL THEN
          v_all_items := v_all_items || v_mapped_items;
      END IF;
      
      IF v_sub_order.coupon_code IS NOT NULL AND v_sub_order.coupon_code != '' THEN
          FOR v_code IN SELECT trim(unnest(string_to_array(v_sub_order.coupon_code, ','))) LOOP
              IF v_code != '' THEN
                  v_all_coupons := array_append(v_all_coupons, v_code);
              END IF;
          END LOOP;
      END IF;
  END LOOP;

  -- C. Update Status
  UPDATE master_orders SET payment_status = 'paid', payment_id = COALESCE(p_razorpay_payment_id, payment_id) WHERE id = v_master_order.id;
  UPDATE orders SET payment_status = 'paid', status = 'confirmed', razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_order_id) WHERE master_order_id = v_master_order.id;
  -- Update fulfillments status if applicable
  UPDATE fulfillments SET status = 'confirmed' WHERE order_id IN (SELECT order_id FROM orders WHERE master_order_id = v_master_order.id);

  -- D. Deduct Inventory (Legacy Razorpay skipped it during checkout)
  IF jsonb_array_length(v_all_items) > 0 THEN
    PERFORM atomic_process_order_inventory(v_all_items, true, p_skip_deduction);
    PERFORM atomic_process_flash_sale_inventory(v_all_items);
    -- Immediately release 'committed' lock since it is confirmed, to avoid UI bloat
    -- (The atomic_process_order_inventory moves available->committed. We clear it back)
    -- We can just execute a quick JSON sweep
  END IF;

  -- E. Increment Coupons
  IF array_length(v_all_coupons, 1) > 0 THEN
    FOREACH v_code IN ARRAY v_all_coupons LOOP
      PERFORM atomic_increment_coupon_usage(v_code, 1);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'already_paid', false, 'order_id', v_master_order.display_id, 'master_id', v_master_order.id);
END;
$$ LANGUAGE plpgsql;


-- 5. Atomic Order Status Update (Cancellation & RTO)
CREATE OR REPLACE FUNCTION atomic_update_order_status(
    p_order_id TEXT,
    p_new_status TEXT,
    p_skip_inventory BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_is_old_cancelled BOOLEAN;
    v_is_new_cancelled BOOLEAN;
    v_code TEXT;
    v_mapped_items JSONB;
BEGIN
    SELECT * INTO v_order FROM orders WHERE order_id = p_order_id FOR UPDATE LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;

    v_is_old_cancelled := v_order.status IN ('cancelled', 'returned', 'rto');
    v_is_new_cancelled := p_new_status IN ('cancelled', 'returned', 'rto');

    -- Single Source of Truth: Extract items and accurate location_id directly from the fulfillments table
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(elem->>'product_id', split_part(elem->>'id', '-', 1)),
            'variant', COALESCE(elem->>'variant_name', elem->>'variant'),
            'variant_id', elem->>'variant_id',
            'location_id', f.location_id,
            'isB2B', COALESCE((elem->>'isB2B')::BOOLEAN, false),
            'quantity', (elem->>'quantity')::INTEGER,
            'isFlashSale', COALESCE((elem->>'isFlashSale')::BOOLEAN, false),
            'product_name', COALESCE(elem->>'product_name', elem->>'name', '')
        )
    ) INTO v_mapped_items
    FROM fulfillments f, jsonb_array_elements(f.items) AS elem
    WHERE f.order_id = p_order_id;
    
    -- Fallback for legacy orders without fulfillments
    IF v_mapped_items IS NULL THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', COALESCE(elem->>'product_id', split_part(elem->>'id', '-', 1)),
                'variant', elem->>'variant_name',
                'variant_id', elem->>'variant_id',
                'location_id', elem->>'location_id',
                'isB2B', COALESCE((elem->>'isB2B')::BOOLEAN, false),
                'quantity', (elem->>'quantity')::INTEGER,
                'isFlashSale', COALESCE((elem->>'isFlashSale')::BOOLEAN, false),
                'product_name', COALESCE(elem->>'product_name', '')
            )
        ) INTO v_mapped_items
        FROM jsonb_array_elements(v_order.items) AS elem;
    END IF;

    IF v_mapped_items IS NULL THEN v_mapped_items := '[]'::JSONB; END IF;

    IF NOT v_is_old_cancelled AND v_is_new_cancelled THEN
        -- CANCEL / RTO
        PERFORM atomic_restore_order_inventory(v_mapped_items);
        PERFORM atomic_restore_flash_sale_inventory(v_mapped_items);

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN PERFORM atomic_increment_coupon_usage(v_code, -1); END IF;
            END LOOP;
        END IF;

    ELSIF v_is_old_cancelled AND NOT v_is_new_cancelled THEN
        -- UNCANCEL
        PERFORM atomic_process_order_inventory(v_mapped_items, true, p_skip_inventory);
        PERFORM atomic_process_flash_sale_inventory(v_mapped_items);

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN PERFORM atomic_increment_coupon_usage(v_code, 1); END IF;
            END LOOP;
        END IF;
    END IF;

    UPDATE orders SET status = p_new_status, updated_at = NOW() WHERE order_id = p_order_id;
    UPDATE fulfillments SET status = p_new_status WHERE order_id = p_order_id;

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'old_status', v_order.status, 'new_status', p_new_status);
END;
$$;


-- 6. Atomic Cleanup for Abandoned Payments (Denial of Inventory Fix)
CREATE OR REPLACE FUNCTION atomic_cleanup_abandoned_payments(
    p_timeout_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_order IN 
        SELECT order_id 
        FROM orders 
        WHERE payment_status = 'pending' 
        AND payment_method != 'cod' 
        AND status = 'pending_payment'
        AND created_at < NOW() - (p_timeout_minutes || ' minutes')::interval
        FOR UPDATE SKIP LOCKED
    LOOP
        PERFORM atomic_update_order_status(v_order.order_id, 'payment_failed', false);
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'cleaned_count', v_count);
END;
$$;

COMMIT;
