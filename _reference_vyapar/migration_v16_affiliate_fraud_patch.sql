-- ==============================================================================
-- V16 AFFILIATE FRAUD FIX: DELAYED INCREMENTS
-- ==============================================================================
-- Run this ENTIRE script in Supabase SQL Editor.
-- 
-- DESCRIPTION:
-- Fixes a critical exploit where prepaid orders incorrectly credited affiliate 
-- commissions at checkout initialization before the payment was successful.
-- The commission logic is now decoupled and explicitly moved to the 
-- atomic_confirm_payment webhook phase, preventing infinite-money farming.
-- ==============================================================================

-- ═══════════════════════════════════════════════════════════
-- 1. Atomic Order Creation (With Optional Affiliate Increment)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_create_marketplace_order(
  p_master_order JSONB,
  p_sub_orders JSONB,
  p_items JSONB,
  p_skip_inventory BOOLEAN DEFAULT false,
  p_allow_negative_stock BOOLEAN DEFAULT false,
  p_skip_deduction BOOLEAN DEFAULT false,
  p_coupons JSONB DEFAULT '[]'::JSONB, -- Array of {code, store_id}
  p_increment_coupons BOOLEAN DEFAULT false,
  p_increment_affiliate BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_master_id UUID;
  v_sub_order JSONB;
  v_sub_id TEXT;
  v_result JSONB = '[]'::JSONB;
  v_store_id UUID;
  v_items_by_store JSONB;
  v_coupon JSONB;
BEGIN
  -- A. Inventory Deduction (Grouped by Store to allow using the store-scoped function)
  IF jsonb_array_length(p_items) > 0 AND NOT p_skip_inventory THEN
    FOR v_store_id IN SELECT DISTINCT (value->>'store_id')::UUID FROM jsonb_array_elements(p_items)
    LOOP
      SELECT jsonb_agg(elem) INTO v_items_by_store
      FROM jsonb_array_elements(p_items) AS elem
      WHERE (elem->>'store_id')::UUID = v_store_id;

      IF v_items_by_store IS NOT NULL THEN
        PERFORM atomic_process_order_inventory(v_items_by_store, v_store_id, p_allow_negative_stock, p_skip_deduction);
        PERFORM atomic_process_flash_sale_inventory(v_items_by_store, v_store_id);
      END IF;
    END LOOP;
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
      (v_sub_order->>'storeId')::UUID,
      v_master_id,
      p_master_order->>'paymentId',
      NULLIF(v_sub_order->>'affiliate_id', ''),
      (v_sub_order->>'affiliate_commission')::NUMERIC
    ) RETURNING order_id INTO v_sub_id;
    
    -- D. Increment affiliate earnings (ONLY IF REQUESTED)
    IF p_increment_affiliate AND NULLIF(v_sub_order->>'affiliate_id', '') IS NOT NULL AND (v_sub_order->>'affiliate_commission')::NUMERIC > 0 THEN
      PERFORM increment_affiliate_earnings(NULLIF(v_sub_order->>'affiliate_id', ''), (v_sub_order->>'storeId')::UUID, (v_sub_order->>'affiliate_commission')::NUMERIC);
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

  -- F. Check and Increment Coupons (Atomic TOCTOU prevention)
  IF p_coupons IS NOT NULL AND jsonb_array_length(p_coupons) > 0 THEN
    FOR v_coupon IN SELECT * FROM jsonb_array_elements(p_coupons) LOOP
        IF p_increment_coupons THEN
           PERFORM atomic_increment_coupon_usage(v_coupon->>'code', (v_coupon->>'store_id')::UUID, 1);
        END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'master_id', v_master_id,
    'sub_orders', v_result
  );
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════
-- 2. Atomic Payment Confirmation (Applies Affiliates)
-- ═══════════════════════════════════════════════════════════
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
  v_all_coupons JSONB = '[]'::JSONB;
  v_all_affiliates JSONB = '[]'::JSONB;
  v_code TEXT;
  v_store_id UUID;
  v_items_by_store JSONB;
  v_coupon JSONB;
  v_affiliate JSONB;
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

  -- B. Gather all items, coupons, and affiliates autonomously from orders
  FOR v_sub_order IN SELECT * FROM orders WHERE master_order_id = v_master_order.id
  LOOP
      -- Aggregate items with proper mapping, INCLUDING store_id
      SELECT jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(elem->>'product_id', split_part(elem->>'id', '-', 1)),
            'variant', elem->>'variant_name',
            'isB2B', COALESCE((elem->>'isB2B')::BOOLEAN, false),
            'quantity', (elem->>'quantity')::INTEGER,
            'isFlashSale', COALESCE((elem->>'isFlashSale')::BOOLEAN, false),
            'product_name', COALESCE(elem->>'product_name', ''),
            'store_id', v_sub_order.store_id
        )
      ) INTO v_mapped_items
      FROM jsonb_array_elements(v_sub_order.items) AS elem;
      
      IF v_mapped_items IS NOT NULL THEN
          v_all_items := v_all_items || v_mapped_items;
      END IF;
      
      -- Extract coupons
      IF v_sub_order.coupon_code IS NOT NULL AND v_sub_order.coupon_code != '' THEN
          FOR v_code IN SELECT trim(unnest(string_to_array(v_sub_order.coupon_code, ','))) LOOP
              IF v_code != '' THEN
                  v_all_coupons := v_all_coupons || jsonb_build_object('code', v_code, 'store_id', v_sub_order.store_id);
              END IF;
          END LOOP;
      END IF;
      
      -- Extract affiliate info
      IF v_sub_order.affiliate_id IS NOT NULL AND v_sub_order.affiliate_commission > 0 THEN
          v_all_affiliates := v_all_affiliates || jsonb_build_object(
              'id', v_sub_order.affiliate_id, 
              'store_id', v_sub_order.store_id, 
              'commission', v_sub_order.affiliate_commission
          );
      END IF;
  END LOOP;

  -- C. Update master_orders
  UPDATE master_orders
  SET payment_status = 'paid', payment_id = COALESCE(p_razorpay_payment_id, payment_id)
  WHERE id = v_master_order.id;

  -- D. Update sub-orders
  UPDATE orders
  SET payment_status = 'paid', status = 'confirmed', razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_order_id)
  WHERE master_order_id = v_master_order.id;

  -- E. Deduct Inventory (Grouped by Store)
  IF jsonb_array_length(v_all_items) > 0 THEN
    FOR v_store_id IN SELECT DISTINCT (value->>'store_id')::UUID FROM jsonb_array_elements(v_all_items)
    LOOP
      SELECT jsonb_agg(elem) INTO v_items_by_store
      FROM jsonb_array_elements(v_all_items) AS elem
      WHERE (elem->>'store_id')::UUID = v_store_id;

      IF v_items_by_store IS NOT NULL THEN
        PERFORM atomic_process_order_inventory(v_items_by_store, v_store_id, true, p_skip_deduction);
        PERFORM atomic_process_flash_sale_inventory(v_items_by_store, v_store_id);
      END IF;
    END LOOP;
  END IF;

  -- F. Increment Coupons
  IF jsonb_array_length(v_all_coupons) > 0 THEN
    FOR v_coupon IN SELECT * FROM jsonb_array_elements(v_all_coupons) LOOP
      PERFORM atomic_increment_coupon_usage(v_coupon->>'code', (v_coupon->>'store_id')::UUID, 1);
    END LOOP;
  END IF;
  
  -- G. Increment Affiliate Earnings
  IF jsonb_array_length(v_all_affiliates) > 0 THEN
    FOR v_affiliate IN SELECT * FROM jsonb_array_elements(v_all_affiliates) LOOP
      PERFORM increment_affiliate_earnings(v_affiliate->>'id', (v_affiliate->>'store_id')::UUID, (v_affiliate->>'commission')::NUMERIC);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'already_paid', false, 'order_id', v_master_order.display_id, 'master_id', v_master_order.id);
END;
$$ LANGUAGE plpgsql;

-- END OF FILE
