-- ==============================================================================
-- MIGRATION: v31 - Restore V28 E2E Audit RPC & Integrate SLA
-- Description: Restores the complex 9-argument RPC that was accidentally overwritten by v30
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
  v_sub_id UUID;
  v_created_subs JSONB = '[]'::JSONB;
  v_code TEXT;
  v_all_items_digital BOOLEAN;
  v_has_eta_override BOOLEAN;
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
      v_has_eta_override := false;
      IF jsonb_array_length(v_sub->'items') > 0 THEN
          FOR v_item IN SELECT * FROM jsonb_array_elements(v_sub->'items')
          LOOP
              IF COALESCE((v_item->>'is_digital')::BOOLEAN, false) = false THEN
                  v_all_items_digital := false;
              END IF;
              IF v_item->>'eta_override' IS NOT NULL THEN
                  v_has_eta_override := true;
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
        NULLIF(v_sub->>'affiliate_id', '')::UUID,
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
            COALESCE(
               (v_sub->>'target_eta')::TIMESTAMPTZ,
               CASE 
                  WHEN v_has_eta_override THEN NOW() + INTERVAL '1 day'
                  WHEN (v_sub->>'delivery_type') = 'q_commerce_inhouse' THEN NOW() + INTERVAL '30 minutes'
                  ELSE NOW() + INTERVAL '2 days'
               END
            )
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
