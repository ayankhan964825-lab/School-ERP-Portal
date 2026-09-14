-- ==============================================================================
-- MIGRATION: v28 - End-to-End Audit Fixes
-- Description: Adds checkout_reservations, location_updated_at, atomic digital delivery
-- ==============================================================================

-- 1. Rider GPS Teleportation Guard
ALTER TABLE riders 
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create RPC to update location with lag protection
CREATE OR REPLACE FUNCTION atomic_update_rider_location(
    p_rider_id UUID,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_timestamp TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
    v_rider RECORD;
BEGIN
    SELECT * INTO v_rider FROM riders WHERE id = p_rider_id FOR UPDATE LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rider not found');
    END IF;

    -- Ignore stale updates (teleportation protection)
    IF v_rider.location_updated_at IS NOT NULL AND v_rider.location_updated_at >= p_timestamp THEN
        RETURN jsonb_build_object('success', true, 'ignored', true, 'reason', 'Stale GPS packet');
    END IF;

    UPDATE riders 
    SET current_lat = p_lat, current_lng = p_lng, location_updated_at = p_timestamp, updated_at = NOW()
    WHERE id = p_rider_id;

    RETURN jsonb_build_object('success', true, 'ignored', false);
END;
$$ LANGUAGE plpgsql;

-- 2. Checkout Reservations (Thundering Herd Protection)
CREATE TABLE IF NOT EXISTS checkout_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_id TEXT NOT NULL,
    variant_id UUID NOT NULL,
    location_id UUID,
    quantity INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick active reservation lookup
CREATE INDEX IF NOT EXISTS idx_checkout_reservations_active 
ON checkout_reservations(variant_id, location_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_checkout_reservations_checkout 
ON checkout_reservations(checkout_id);

-- RPC to create soft reservations atomically
CREATE OR REPLACE FUNCTION atomic_create_checkout_reservations(
    p_checkout_id TEXT,
    p_items JSONB,
    p_expires_in_minutes INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_variant_id UUID;
    v_location_id UUID;
    v_qty INTEGER;
    v_available INTEGER;
    v_active_reservations INTEGER;
    v_track_inventory BOOLEAN;
BEGIN
    -- Delete existing reservations for this checkout to allow retry
    DELETE FROM checkout_reservations WHERE checkout_id = p_checkout_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_location_id := (v_item->>'location_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;
        v_track_inventory := COALESCE((v_item->>'track_inventory')::BOOLEAN, true);

        IF v_track_inventory THEN
            -- Check true availability (Raw Stock - Active Reservations)
            SELECT COALESCE(available, 0) INTO v_available
            FROM inventory_levels
            WHERE variant_id = v_variant_id AND location_id IS NOT DISTINCT FROM v_location_id
            FOR UPDATE;

            SELECT COALESCE(SUM(quantity), 0) INTO v_active_reservations
            FROM checkout_reservations
            WHERE variant_id = v_variant_id 
              AND location_id IS NOT DISTINCT FROM v_location_id 
              AND expires_at > NOW();

            IF (v_available - v_active_reservations) < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock for variant % at location %', v_variant_id, v_location_id;
            END IF;
            
            INSERT INTO checkout_reservations (checkout_id, variant_id, location_id, quantity, expires_at)
            VALUES (p_checkout_id, v_variant_id, v_location_id, v_qty, NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL);
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 3. Modify atomic_confirm_payment to clear reservations
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
    -- Already paid, idempotent return
    RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', v_master_order.display_id);
  END IF;

  -- B. Gather all items and coupons autonomously from orders
  FOR v_sub_order IN SELECT * FROM orders WHERE master_order_id = v_master_order.id
  LOOP
      -- Aggregate items with proper mapping
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

  -- C. Update master_orders
  UPDATE master_orders
  SET payment_status = 'paid', payment_id = COALESCE(p_razorpay_payment_id, payment_id)
  WHERE id = v_master_order.id;

  -- D. Update sub-orders
  -- Fix: If all items in a suborder are digital, update status to 'delivered' instead of 'confirmed'
  UPDATE orders
  SET payment_status = 'paid', 
      status = CASE 
                  WHEN (
                      SELECT COALESCE(bool_and(COALESCE((item->>'is_digital')::BOOLEAN, false)), false)
                      FROM jsonb_array_elements(orders.items) AS item
                  ) THEN 'delivered' 
                  ELSE 'confirmed' 
               END,
      razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_order_id)
  WHERE master_order_id = v_master_order.id;

  -- E. Clear Reservations & Deduct Inventory
  -- Clear reservations for this checkout_id since we are confirming
  DELETE FROM checkout_reservations WHERE checkout_id = p_lookup_id;

  IF jsonb_array_length(v_all_items) > 0 THEN
    PERFORM atomic_process_order_inventory(v_all_items, true, p_skip_deduction);
    PERFORM atomic_process_flash_sale_inventory(v_all_items);
  END IF;

  -- F. Increment Coupons
  IF array_length(v_all_coupons, 1) > 0 THEN
    FOREACH v_code IN ARRAY v_all_coupons LOOP
      PERFORM atomic_increment_coupon_usage(v_code, 1);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'already_paid', false, 'order_id', v_master_order.display_id, 'master_id', v_master_order.id);
END;
$$ LANGUAGE plpgsql;

-- 4. Atomic Digital Delivery in atomic_create_marketplace_order
CREATE OR REPLACE FUNCTION atomic_create_marketplace_order(
  p_master_order JSONB,
  p_sub_orders JSONB,
  p_items JSONB,
  p_skip_inventory BOOLEAN,
  p_allow_negative_stock BOOLEAN,
  p_skip_deduction BOOLEAN,
  p_coupons TEXT[] DEFAULT '{}',
  p_increment_coupons BOOLEAN DEFAULT false,
  p_increment_affiliate BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_master_id UUID;
  v_sub JSONB;
  v_sub_id UUID;
  v_created_subs JSONB = '[]'::JSONB;
  v_code TEXT;
  v_all_items_digital BOOLEAN;
  v_item JSONB;
BEGIN
  INSERT INTO master_orders (
    display_id,
    customer_info,
    shipping_address,
    subtotal,
    shipping_fee,
    total_amount,
    payment_method,
    payment_status,
    payment_id
  ) VALUES (
    p_master_order->>'displayId',
    p_master_order->'customer',
    p_master_order->'address',
    (p_master_order->>'subtotal')::NUMERIC,
    (p_master_order->>'shipping')::NUMERIC,
    (p_master_order->>'amount')::NUMERIC,
    p_master_order->>'paymentMethod',
    p_master_order->>'paymentStatus',
    p_master_order->>'paymentId'
  ) RETURNING id INTO v_master_id;

  FOR v_sub IN SELECT * FROM jsonb_array_elements(p_sub_orders)
  LOOP
      -- Check if ALL items in this sub-order are digital
      v_all_items_digital := true;
      IF jsonb_array_length(v_sub->'items') > 0 THEN
          FOR v_item IN SELECT * FROM jsonb_array_elements(v_sub->'items')
          LOOP
              IF COALESCE((v_item->>'is_digital')::BOOLEAN, false) = false THEN
                  v_all_items_digital := false;
                  EXIT;
              END IF;
          END LOOP;
      ELSE
          v_all_items_digital := false;
      END IF;

      INSERT INTO orders (
        order_id,
        master_order_id,
        store_id,
        customer,
        shipping_address,
        items,
        delivery_type,
        subtotal,
        shipping,
        discount,
        amount,
        payment_method,
        payment_status,
        status,
        razorpay_order_id,
        razorpay_payment_id,
        phonepe_transaction_id,
        coupon_code,
        affiliate_id,
        affiliate_commission
      ) VALUES (
        v_sub->>'orderId',
        v_master_id,
        (v_sub->>'storeId')::UUID,
        p_master_order->'customer',
        p_master_order->'address',
        v_sub->'items',
        v_sub->>'delivery_type',
        COALESCE((v_sub->>'subtotal')::NUMERIC, 0),
        COALESCE((v_sub->>'shipping')::NUMERIC, 0),
        COALESCE((v_sub->>'discount')::NUMERIC, 0),
        COALESCE((v_sub->>'amount')::NUMERIC, 0),
        p_master_order->>'paymentMethod',
        CASE WHEN v_all_items_digital AND p_master_order->>'paymentStatus' = 'paid' THEN 'paid' ELSE p_master_order->>'paymentStatus' END,
        CASE WHEN v_all_items_digital AND p_master_order->>'paymentStatus' = 'paid' THEN 'delivered' ELSE 'placed' END,
        p_master_order->>'paymentId',
        p_master_order->>'paymentId',
        p_master_order->>'paymentId',
        v_sub->>'couponCode',
        (v_sub->>'affiliate_id')::UUID,
        (v_sub->>'affiliate_commission')::NUMERIC
      ) RETURNING id INTO v_sub_id;

      IF NOT v_all_items_digital THEN
          INSERT INTO fulfillments (
            order_id,
            store_id,
            location_id,
            status,
            delivery_type,
            eta
          ) VALUES (
            v_sub->>'orderId',
            (v_sub->>'storeId')::UUID,
            NULL,
            'pending',
            v_sub->>'delivery_type',
            NOW() + INTERVAL '2 days'
          );
      END IF;

      v_created_subs := v_created_subs || jsonb_build_object(
          'id', v_sub_id,
          'order_id', v_sub->>'orderId',
          'store_id', v_sub->>'storeId',
          'is_digital', v_all_items_digital
      );
  END LOOP;

  IF NOT p_skip_inventory THEN
      PERFORM atomic_process_order_inventory(p_items, p_allow_negative_stock, p_skip_deduction);
      PERFORM atomic_process_flash_sale_inventory(p_items);
  END IF;

  IF p_increment_coupons AND array_length(p_coupons, 1) > 0 THEN
      FOREACH v_code IN ARRAY p_coupons LOOP
          PERFORM atomic_increment_coupon_usage(v_code, 1);
      END LOOP;
  END IF;

  RETURN jsonb_build_object(
      'success', true,
      'master_id', v_master_id,
      'sub_orders', v_created_subs
  );
END;
$$ LANGUAGE plpgsql;
