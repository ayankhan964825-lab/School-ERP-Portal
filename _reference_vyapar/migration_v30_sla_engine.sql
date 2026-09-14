-- ==============================================================================
-- MIGRATION: v30 - SLA Engine & ETA Builder (Phase 3.5)
-- Description: Adds SLA tracking capability to locations and updates RPC to use precise SLA timestamps.
-- ==============================================================================

-- 1. Add precise SLA minutes tracker to locations
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS q_commerce_sla_mins INT DEFAULT 30;

-- 2. Update RPC to accept precise target_eta from Node.js

CREATE OR REPLACE FUNCTION atomic_create_marketplace_order(
    p_master JSONB,
    p_suborders JSONB,
    p_skip_inventory BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
    v_master_id TEXT;
    v_sub RECORD;
    v_sub_id UUID;
    v_item RECORD;
    v_stock RECORD;
    v_variant_id UUID;
    v_location_id UUID;
    v_quantity INT;
    v_all_items_digital BOOLEAN;
    v_has_eta_override BOOLEAN;
BEGIN
    -- 1. Insert Master Order
    INSERT INTO master_orders (
        id,
        customer,
        address,
        subtotal,
        shipping,
        amount,
        payment_method,
        payment_id,
        payment_status
    ) VALUES (
        p_master->>'displayId',
        p_master->'customer',
        p_master->'address',
        (p_master->>'subtotal')::NUMERIC,
        (p_master->>'shipping')::NUMERIC,
        (p_master->>'amount')::NUMERIC,
        p_master->>'paymentMethod',
        p_master->>'paymentId',
        p_master->>'paymentStatus'
    ) RETURNING id INTO v_master_id;

    -- 2. Loop through Sub Orders
    FOR v_sub IN SELECT * FROM jsonb_array_elements(p_suborders) LOOP
      
      INSERT INTO orders (
        order_id,
        master_order_id,
        store_id,
        customer_id,
        items,
        subtotal,
        shipping,
        discount,
        amount,
        payment_method,
        payment_id,
        order_status,
        payment_status,
        coupon_code,
        affiliate_id,
        affiliate_commission,
        address
      ) VALUES (
        v_sub.value->>'orderId',
        v_master_id,
        (v_sub.value->>'storeId')::UUID,
        NULL,
        v_sub.value->'items',
        (v_sub.value->>'subtotal')::NUMERIC,
        (v_sub.value->>'shipping')::NUMERIC,
        (v_sub.value->>'discount')::NUMERIC,
        (v_sub.value->>'amount')::NUMERIC,
        p_master->>'paymentMethod',
        p_master->>'paymentId',
        CASE WHEN (p_master->>'paymentMethod') = 'cod' THEN 'processing' ELSE 'pending_payment' END,
        p_master->>'paymentStatus',
        v_sub.value->>'couponCode',
        NULLIF(v_sub.value->>'affiliate_id', '')::UUID,
        (v_sub.value->>'affiliate_commission')::NUMERIC,
        p_master->'address'
      ) RETURNING id INTO v_sub_id;

      -- Check if all items are digital
      v_all_items_digital := true;
      v_has_eta_override := false;
      
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_sub.value->'items') LOOP
          IF COALESCE((v_item.value->>'is_digital')::BOOLEAN, false) = false THEN
              v_all_items_digital := false;
          END IF;
          
          IF v_item.value->>'eta_override' IS NOT NULL THEN
              v_has_eta_override := true;
          END IF;

          IF p_skip_inventory = false AND COALESCE((v_item.value->>'track_inventory')::BOOLEAN, true) = true THEN
              v_variant_id := COALESCE(
                 NULLIF(v_item.value->>'variant_id', ''),
                 split_part(v_item.value->>'id', '-', 2)
              )::UUID;
              
              v_location_id := (v_item.value->>'location_id')::UUID;
              v_quantity := (v_item.value->>'quantity')::INT;

              IF v_variant_id IS NOT NULL AND v_location_id IS NOT NULL THEN
                  SELECT * INTO v_stock FROM inventory_levels 
                  WHERE variant_id = v_variant_id AND location_id = v_location_id FOR UPDATE;

                  IF NOT FOUND OR v_stock.available < v_quantity THEN
                      RAISE EXCEPTION 'Insufficient stock for variant % at location %', v_variant_id, v_location_id;
                  END IF;

                  UPDATE inventory_levels 
                  SET available = available - v_quantity 
                  WHERE variant_id = v_variant_id AND location_id = v_location_id;
              END IF;
          END IF;
      END LOOP;

      -- Create fulfillment if not fully digital
      IF NOT v_all_items_digital THEN
          INSERT INTO fulfillments (
            order_id,
            store_id,
            location_id,
            status,
            delivery_type,
            eta
          ) VALUES (
            v_sub.value->>'orderId',
            (v_sub.value->>'storeId')::UUID,
            NULL,
            'pending',
            v_sub.value->>'delivery_type',
            COALESCE(
               (v_sub.value->>'target_eta')::TIMESTAMPTZ,
               CASE 
                  WHEN v_has_eta_override THEN NOW() + INTERVAL '1 day'
                  WHEN (v_sub.value->>'delivery_type') = 'q_commerce_inhouse' THEN NOW() + INTERVAL '30 minutes'
                  ELSE NOW() + INTERVAL '2 days'
               END
            )
          );
      END IF;

    END LOOP;

    RETURN jsonb_build_object('success', true, 'master_id', v_master_id);
END;
$$ LANGUAGE plpgsql;
