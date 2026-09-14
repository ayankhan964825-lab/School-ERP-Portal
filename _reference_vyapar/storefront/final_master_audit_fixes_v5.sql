-- ==============================================================================
-- FINAL MASTER AUDIT FIXES - COMPLETE ACID COMPLIANCE (ROUNDS 1, 2, 3, 4 AND 5)
-- Run this single file in Supabase SQL Editor.
-- ==============================================================================

-- Drop existing overloaded functions to prevent conflicts
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, BOOLEAN, BOOLEAN);

-- ═══════════════════════════════════════════════════════════
-- 1. Inventory Decrement RPC (Atomic)
-- ═══════════════════════════════════════════════════════════
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
    v_current_stock INTEGER;
BEGIN
    FOR v_item IN 
        SELECT * FROM jsonb_array_elements(p_items) AS elem
        ORDER BY elem->>'id' ASC, COALESCE(elem->>'variant', '') ASC
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

        IF v_variant_name IS NULL OR v_variant_name = '' THEN
            SELECT id, stock INTO v_variant_id, v_current_stock
            FROM product_variants
            WHERE product_id = v_product_id AND is_b2b = v_is_b2b
            ORDER BY created_at ASC LIMIT 1
            FOR UPDATE;
        ELSE
            SELECT id, stock INTO v_variant_id, v_current_stock
            FROM product_variants
            WHERE product_id = v_product_id AND name = v_variant_name AND is_b2b = v_is_b2b
            FOR UPDATE;
        END IF;

        IF NOT FOUND THEN
            IF p_allow_negative_stock THEN
                CONTINUE; 
            ELSE
                RAISE EXCEPTION 'Product variant not found: % - %', v_product_id, v_variant_name;
            END IF;
        END IF;

        IF v_current_stock < v_quantity AND NOT p_allow_negative_stock THEN
            RAISE EXCEPTION 'Insufficient stock for product % variant %. Available: %, Requested: %', 
                v_product_id, v_variant_name, v_current_stock, v_quantity;
        END IF;

        IF NOT p_skip_deduction THEN
            UPDATE product_variants
            SET stock = stock - v_quantity
            WHERE id = v_variant_id;
        END IF;
    END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. Coupon Increment RPC (Atomic)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_increment_coupon_usage(p_code TEXT, p_delta INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE coupons
    SET used_count = GREATEST(0, COALESCE(used_count, 0) + p_delta)
    WHERE code = p_code;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 3. Inventory Restore RPC (Atomic)
-- ═══════════════════════════════════════════════════════════
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
BEGIN
    FOR v_item IN 
        SELECT * FROM jsonb_array_elements(p_items) AS elem
        ORDER BY elem->>'id' ASC, COALESCE(elem->>'variant', '') ASC
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

        IF v_variant_name IS NULL OR v_variant_name = '' THEN
            SELECT id INTO v_variant_id
            FROM product_variants
            WHERE product_id = v_product_id AND is_b2b = v_is_b2b
            ORDER BY created_at ASC LIMIT 1
            FOR UPDATE;
        ELSE
            SELECT id INTO v_variant_id
            FROM product_variants
            WHERE product_id = v_product_id AND name = v_variant_name AND is_b2b = v_is_b2b
            FOR UPDATE;
        END IF;

        IF FOUND THEN
            UPDATE product_variants
            SET stock = stock + v_quantity
            WHERE id = v_variant_id;
        END IF;
    END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 4. Flash Sale Stock Increment
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_flash_sale_stock(p_product_name TEXT, p_qty INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE flash_sales
    SET sold_stock = COALESCE(sold_stock, 0) + p_qty
    WHERE product = p_product_name
      AND stock_type = 'real'
      AND end_date > NOW();
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 5. Affiliate Earnings Increment
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_affiliate_earnings(aff_id TEXT, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE affiliates 
  SET total_earnings = COALESCE(total_earnings, 0) + amount,
      unpaid_earnings = COALESCE(unpaid_earnings, 0) + amount
  WHERE id = aff_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 6. Atomic Marketplace Order Creation (Round 3 ACID version)
-- Includes synchronous inventory deduction to prevent split-brain DB drops.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_create_marketplace_order(
  p_master_order JSONB,
  p_sub_orders JSONB,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_skip_inventory BOOLEAN DEFAULT false,
  p_allow_negative_stock BOOLEAN DEFAULT false,
  p_skip_deduction BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_master_id UUID;
  v_sub_order JSONB;
  v_sub_id UUID;
  v_result JSONB = '[]'::JSONB;
BEGIN
  -- A. Inventory Deduction (Same Transaction)
  IF jsonb_array_length(p_items) > 0 AND NOT p_skip_inventory THEN
    PERFORM atomic_process_order_inventory(p_items, p_allow_negative_stock, p_skip_deduction);
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

  -- C. Loop through sub_orders
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
    
    -- D. Increment affiliate earnings
    IF NULLIF(v_sub_order->>'affiliate_id', '') IS NOT NULL AND (v_sub_order->>'affiliate_commission')::NUMERIC > 0 THEN
      PERFORM increment_affiliate_earnings(NULLIF(v_sub_order->>'affiliate_id', ''), (v_sub_order->>'affiliate_commission')::NUMERIC);
    END IF;

    -- E. Collect result array
    v_result = v_result || jsonb_build_object(
      'id', v_sub_id,
      'order_id', v_sub_order->>'orderId',
      'store_id', v_sub_order->>'storeId',
      'amount', (v_sub_order->>'amount')::NUMERIC,
      'shipping', (v_sub_order->>'shipping')::NUMERIC,
      'customer', p_master_order->'customer'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'master_id', v_master_id,
    'sub_orders', v_result
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 7. Atomic Payment Confirmation (Round 3 ACID version)
-- Prevents race conditions during webhook or success callbacks.
-- Handles updates to both orders, deducts inventory, and applies coupons in ONE go.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_confirm_payment(
  p_lookup_id TEXT,
  p_razorpay_payment_id TEXT,
  p_items JSONB,
  p_skip_deduction BOOLEAN,
  p_coupons TEXT[]
) RETURNS JSONB AS $$
DECLARE
  v_master_order RECORD;
  v_coupon TEXT;
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

  -- B. Update master_orders
  UPDATE master_orders
  SET payment_status = 'paid', payment_id = COALESCE(p_razorpay_payment_id, payment_id)
  WHERE id = v_master_order.id;

  -- C. Update sub-orders
  UPDATE orders
  SET payment_status = 'paid', status = 'confirmed', razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_order_id)
  WHERE master_order_id = v_master_order.id;

  -- D. Deduct Inventory (since it was skipped at checkout)
  IF jsonb_array_length(p_items) > 0 THEN
    -- Prepaid, so we allow negative stock to prevent blocking paid orders
    PERFORM atomic_process_order_inventory(p_items, true, p_skip_deduction);
  END IF;

  -- E. Increment Coupons
  IF p_coupons IS NOT NULL AND array_length(p_coupons, 1) > 0 THEN
    FOREACH v_coupon IN ARRAY p_coupons LOOP
      PERFORM atomic_increment_coupon_usage(v_coupon, 1);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'already_paid', false, 'order_id', v_master_order.display_id, 'master_id', v_master_order.id);
END;
$$ LANGUAGE plpgsql;
