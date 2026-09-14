-- ==============================================================================
-- TASK 4A: Atomic Database Inserts via RPC (`create_marketplace_order`)
-- 
-- Replaces sequential insert logic with a single true ACID Postgres transaction
-- for master_orders and orders.
-- ==============================================================================

CREATE OR REPLACE FUNCTION atomic_create_marketplace_order(
  p_master_order JSONB,
  p_sub_orders JSONB
) RETURNS JSONB AS $$
DECLARE
  v_master_id UUID;
  v_sub_order JSONB;
  v_sub_id UUID;
  v_result JSONB = '[]'::JSONB;
BEGIN
  -- 1. Insert master_order
  INSERT INTO master_orders (
    display_id, 
    customer_name, 
    customer_phone, 
    customer_email, 
    shipping_address, 
    subtotal, 
    shipping_cost, 
    total_amount, 
    payment_method, 
    payment_id, 
    payment_status
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

  -- 2. Loop through sub_orders
  FOR v_sub_order IN SELECT * FROM jsonb_array_elements(p_sub_orders)
  LOOP
    INSERT INTO orders (
      order_id, 
      customer, 
      items, 
      amount, 
      discount, 
      shipping, 
      subtotal, 
      coupon_code, 
      payment_method, 
      payment_status, 
      status, 
      store_id, 
      master_order_id, 
      razorpay_order_id, 
      affiliate_id, 
      affiliate_commission
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
    
    -- 3. Increment affiliate earnings if applicable (Atomic)
    IF NULLIF(v_sub_order->>'affiliate_id', '') IS NOT NULL AND (v_sub_order->>'affiliate_commission')::NUMERIC > 0 THEN
      PERFORM increment_affiliate_earnings(NULLIF(v_sub_order->>'affiliate_id', ''), (v_sub_order->>'affiliate_commission')::NUMERIC);
    END IF;

    -- 4. Collect result array
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
