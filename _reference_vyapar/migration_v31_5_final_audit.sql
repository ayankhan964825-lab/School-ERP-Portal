-- ==============================================================================
-- MIGRATION: v31.5 - Final Schema-Aligned E2E Fix
-- Description: Restores V17 fulfillment grouping logic and aligns all columns with real schema
-- ==============================================================================

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
  v_created_subs JSONB = '[]'::JSONB;
  v_code TEXT;
  v_all_items_digital BOOLEAN;
  v_item JSONB;
  v_loc_id UUID;
  v_loc_items JSONB;
BEGIN
  -- 1. Insert Master Order (v5 schema)
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
    payment_status,
    payment_id
  ) VALUES (
    p_master_order->>'displayId',
    COALESCE(p_master_order->'customer'->>'name', 'Guest'),
    COALESCE(p_master_order->'customer'->>'phone', 'Unknown'),
    p_master_order->'customer'->>'email',
    p_master_order->'address',
    (p_master_order->>'subtotal')::NUMERIC,
    (p_master_order->>'shipping')::NUMERIC,
    (p_master_order->>'amount')::NUMERIC,
    p_master_order->>'paymentMethod',
    p_master_order->>'paymentStatus',
    p_master_order->>'paymentId'
  ) RETURNING id INTO v_master_id;

  -- 2. Process Sub Orders
  FOR v_sub IN SELECT * FROM jsonb_array_elements(p_sub_orders)
  LOOP
      v_all_items_digital := true;
      IF jsonb_array_length(v_sub->'items') > 0 THEN
          FOR v_item IN SELECT * FROM jsonb_array_elements(v_sub->'items')
          LOOP
              IF COALESCE((v_item->>'is_digital')::BOOLEAN, false) = false THEN
                  v_all_items_digital := false;
              END IF;
          END LOOP;
      ELSE
          v_all_items_digital := false;
      END IF;

      -- 3. Insert Order (Sub-order)
      -- NOTE: orders table has no 'id' or 'shipping_address' column
      INSERT INTO orders (
        order_id,
        master_order_id,
        store_id,
        customer,
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
        NULLIF(v_sub->>'affiliate_id', '')::UUID,
        (v_sub->>'affiliate_commission')::NUMERIC
      );

      -- 4. Create Fulfillments (V17 Logic)
      IF NOT v_all_items_digital THEN
          FOR v_loc_id, v_loc_items IN 
              SELECT 
                  COALESCE((elem->>'location_id')::UUID, (SELECT id FROM locations WHERE store_id = (v_sub->>'storeId')::UUID AND is_default = true LIMIT 1)), 
                  jsonb_agg(elem)
              FROM jsonb_array_elements(v_sub->'items') AS elem
              GROUP BY 1
          LOOP
             INSERT INTO fulfillments (
               order_id, 
               store_id, 
               location_id, 
               items, 
               status, 
               delivery_type
             ) VALUES (
               v_sub->>'orderId',
               (v_sub->>'storeId')::UUID,
               v_loc_id,
               v_loc_items,
               'pending',
               COALESCE(v_sub->>'delivery_type', 'standard')
             );
          END LOOP;
      END IF;

      v_created_subs := v_created_subs || jsonb_build_object(
          'order_id', v_sub->>'orderId',
          'store_id', v_sub->>'storeId',
          'is_digital', v_all_items_digital
      );
  END LOOP;

  -- 5. Inventory & Coupons
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

NOTIFY pgrst, 'reload schema';
