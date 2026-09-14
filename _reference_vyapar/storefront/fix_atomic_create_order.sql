-- Fix atomic_create_marketplace_order to support tenant isolation introduced in v37
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
  v_store_id UUID;
BEGIN
  -- We don't process p_items globally here anymore, we do it per sub-order to enforce tenant isolation.
  IF jsonb_array_length(p_items) > 0 AND NOT p_skip_inventory THEN
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

  -- C. Loop through sub_orders
  FOR v_sub_order IN SELECT * FROM jsonb_array_elements(p_sub_orders)
  LOOP
    v_store_id := (v_sub_order->>'storeId')::UUID;

    -- Inventory Deduction for this specific sub-order's items
    IF NOT p_skip_inventory THEN
      PERFORM atomic_process_order_inventory(v_sub_order->'items', v_store_id, false, p_skip_deduction);
    END IF;

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
      v_store_id,
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
      'store_id', v_store_id,
      'amount', (v_sub_order->>'amount')::NUMERIC,
      'shipping', (v_sub_order->>'shipping')::NUMERIC,
      'customer', p_master_order->'customer'
    );
  END LOOP;

  -- F. Check and Increment Coupons (Atomic TOCTOU prevention)
  IF p_coupons IS NOT NULL AND array_length(p_coupons, 1) > 0 THEN
    DECLARE
      v_coupon TEXT;
      v_first_store_id UUID;
    BEGIN
      -- Grab the store ID from the first sub-order to use for coupons
      v_first_store_id := (p_sub_orders->0->>'storeId')::UUID;

      FOREACH v_coupon IN ARRAY p_coupons LOOP
        IF p_increment_coupons THEN
           PERFORM atomic_increment_coupon_usage(v_coupon, v_first_store_id, 1);
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
