-- ==============================================================================
-- V15 MASTER AUDIT FIXES: RPC TENANT ISOLATION
-- ==============================================================================
-- Run this ENTIRE script in Supabase SQL Editor.
-- 
-- DESCRIPTION:
-- Previous iterations of the transactional RPC functions bypassed Row Level 
-- Security (RLS) because they were invoked by `supabaseAdmin` for atomicity.
-- However, because these functions did not explicitly accept and enforce 
-- `p_store_id`, they were vulnerable to cross-tenant Insecure Direct Object 
-- Reference (IDOR) attacks if an ID was guessed.
--
-- This migration drops the insecure RPCs and redefines them with strict 
-- tenant-scoping bounds.
-- ==============================================================================

-- Drop old insecure functions
DROP FUNCTION IF EXISTS atomic_update_order_status(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_update_order_status(TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_increment_coupon_usage(TEXT, INTEGER);
DROP FUNCTION IF EXISTS increment_flash_sale_stock(TEXT, INTEGER);
DROP FUNCTION IF EXISTS atomic_process_flash_sale_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_restore_flash_sale_inventory(JSONB);
DROP FUNCTION IF EXISTS increment_affiliate_earnings(TEXT, NUMERIC);
DROP FUNCTION IF EXISTS atomic_create_marketplace_order(JSONB, JSONB, JSONB, BOOLEAN, BOOLEAN, BOOLEAN, TEXT[], BOOLEAN);
DROP FUNCTION IF EXISTS atomic_confirm_payment(TEXT, TEXT, BOOLEAN);

-- ═══════════════════════════════════════════════════════════
-- 1. Order Status Update (Tenant Scoped)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_update_order_status(
    p_order_id TEXT,
    p_new_status TEXT,
    p_store_id UUID,
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
    v_item JSONB;
BEGIN
    -- Lock the order row AND enforce tenant isolation
    SELECT * INTO v_order 
    FROM orders 
    WHERE order_id = p_order_id AND store_id = p_store_id
    FOR UPDATE LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found or unauthorized');
    END IF;

    -- Determine states
    v_is_old_cancelled := v_order.status IN ('cancelled', 'returned', 'rto');
    v_is_new_cancelled := p_new_status IN ('cancelled', 'returned', 'rto');

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(elem->>'product_id', split_part(elem->>'id', '-', 1)),
            'variant', elem->>'variant_name',
            'isB2B', COALESCE((elem->>'isB2B')::BOOLEAN, false),
            'quantity', (elem->>'quantity')::INTEGER,
            'isFlashSale', COALESCE((elem->>'isFlashSale')::BOOLEAN, false),
            'product_name', COALESCE(elem->>'product_name', '')
        )
    ) INTO v_mapped_items
    FROM jsonb_array_elements(v_order.items) AS elem;

    IF v_mapped_items IS NULL THEN
        v_mapped_items := '[]'::JSONB;
    END IF;

    -- Handle transitions
    IF NOT v_is_old_cancelled AND v_is_new_cancelled THEN
        -- ACTIVE -> CANCELLED
        PERFORM atomic_restore_order_inventory(v_mapped_items, p_store_id);
        PERFORM atomic_restore_flash_sale_inventory(v_mapped_items, p_store_id);
        
        IF v_order.affiliate_id IS NOT NULL AND v_order.affiliate_id != '' AND v_order.affiliate_commission > 0 THEN
            PERFORM increment_affiliate_earnings(v_order.affiliate_id, p_store_id, -v_order.affiliate_commission);
        END IF;

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN
                    PERFORM atomic_increment_coupon_usage(v_code, p_store_id, -1);
                END IF;
            END LOOP;
        END IF;

    ELSIF v_is_old_cancelled AND NOT v_is_new_cancelled THEN
        -- CANCELLED -> ACTIVE
        PERFORM atomic_process_order_inventory(v_mapped_items, p_store_id, true, p_skip_inventory);
        PERFORM atomic_process_flash_sale_inventory(v_mapped_items, p_store_id);

        IF v_order.affiliate_id IS NOT NULL AND v_order.affiliate_id != '' AND v_order.affiliate_commission > 0 THEN
            PERFORM increment_affiliate_earnings(v_order.affiliate_id, p_store_id, v_order.affiliate_commission);
        END IF;

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN
                    PERFORM atomic_increment_coupon_usage(v_code, p_store_id, 1);
                END IF;
            END LOOP;
        END IF;
    END IF;

    -- Finally, update the status
    UPDATE orders 
    SET status = p_new_status, updated_at = NOW() 
    WHERE order_id = p_order_id AND store_id = p_store_id;

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'old_status', v_order.status, 'new_status', p_new_status);
END;
$$;


-- ═══════════════════════════════════════════════════════════
-- 2. Coupon Increment (Tenant Scoped)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_increment_coupon_usage(p_code TEXT, p_store_id UUID, p_delta INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_usage_limit INTEGER;
    v_used_count INTEGER;
BEGIN
    SELECT usage_limit, used_count INTO v_usage_limit, v_used_count
    FROM coupons
    WHERE code = p_code AND store_id = p_store_id
    FOR UPDATE LIMIT 1;
    
    IF FOUND THEN
        IF p_delta > 0 AND v_usage_limit IS NOT NULL AND v_used_count + p_delta > v_usage_limit THEN
            RAISE EXCEPTION 'Coupon % usage limit exceeded', p_code;
        END IF;

        UPDATE coupons
        SET used_count = GREATEST(0, COALESCE(used_count, 0) + p_delta)
        WHERE code = p_code AND store_id = p_store_id;
    END IF;
END;
$$;


-- ═══════════════════════════════════════════════════════════
-- 3. Affiliate Earnings Increment (Tenant Scoped)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_affiliate_earnings(p_aff_id TEXT, p_store_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE affiliates 
  SET total_earnings = COALESCE(total_earnings, 0) + p_amount,
      unpaid_earnings = COALESCE(unpaid_earnings, 0) + p_amount
  WHERE id = p_aff_id AND store_id = p_store_id;
END;
$$;


-- ═══════════════════════════════════════════════════════════
-- 4. Flash Sale Inventory (Tenant Scoped)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_flash_sale_stock(p_product_name TEXT, p_store_id UUID, p_qty INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE flash_sales
    SET sold_stock = COALESCE(sold_stock, 0) + p_qty
    WHERE product = p_product_name AND store_id = p_store_id
      AND stock_type = 'real'
      AND end_date > NOW();
END;
$$;

CREATE OR REPLACE FUNCTION atomic_process_flash_sale_inventory(p_items JSONB, p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
    v_total_stock INTEGER;
    v_sold_stock INTEGER;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'isFlashSale')::BOOLEAN = true THEN
            -- Lock row and check limits
            SELECT total_stock, sold_stock INTO v_total_stock, v_sold_stock
            FROM flash_sales
            WHERE product = v_item->>'product_name' AND store_id = p_store_id
              AND stock_type = 'real'
              AND end_date > NOW()
            FOR UPDATE LIMIT 1;
            
            IF FOUND THEN
                IF v_sold_stock + (v_item->>'quantity')::INTEGER > v_total_stock THEN
                    RAISE EXCEPTION 'Flash sale stock exceeded for %', v_item->>'product_name';
                END IF;

                UPDATE flash_sales
                SET sold_stock = COALESCE(sold_stock, 0) + (v_item->>'quantity')::INTEGER
                WHERE product = v_item->>'product_name' AND store_id = p_store_id AND stock_type = 'real';
            END IF;
        END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION atomic_restore_flash_sale_inventory(p_items JSONB, p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'isFlashSale')::BOOLEAN = true THEN
            UPDATE flash_sales
            SET sold_stock = GREATEST(0, COALESCE(sold_stock, 0) - (v_item->>'quantity')::INTEGER)
            WHERE product = v_item->>'product_name' AND store_id = p_store_id
              AND stock_type = 'real';
        END IF;
    END LOOP;
END;
$$;


-- ═══════════════════════════════════════════════════════════
-- 5. Order Inventory Processor (Tenant Scoped)
-- ═══════════════════════════════════════════════════════════
-- Drop old un-scoped functions
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_restore_order_inventory(JSONB);

CREATE OR REPLACE FUNCTION atomic_process_order_inventory(
    p_items JSONB,
    p_store_id UUID,
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
            SELECT pv.id, pv.stock INTO v_variant_id, v_current_stock
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE p.store_id = p_store_id AND pv.product_id = v_product_id AND pv.is_b2b = v_is_b2b
            ORDER BY pv.created_at ASC LIMIT 1
            FOR UPDATE OF pv;
        ELSE
            SELECT pv.id, pv.stock INTO v_variant_id, v_current_stock
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE p.store_id = p_store_id AND pv.product_id = v_product_id AND pv.name = v_variant_name AND pv.is_b2b = v_is_b2b
            FOR UPDATE OF pv LIMIT 1;
        END IF;

        IF NOT FOUND THEN
            IF p_allow_negative_stock THEN
                CONTINUE; 
            ELSE
                RAISE EXCEPTION 'Product variant not found or unauthorized: % - %', v_product_id, v_variant_name;
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

CREATE OR REPLACE FUNCTION atomic_restore_order_inventory(p_items JSONB, p_store_id UUID)
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
            SELECT pv.id INTO v_variant_id
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE p.store_id = p_store_id AND pv.product_id = v_product_id AND pv.is_b2b = v_is_b2b
            ORDER BY pv.created_at ASC LIMIT 1
            FOR UPDATE OF pv;
        ELSE
            SELECT pv.id INTO v_variant_id
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE p.store_id = p_store_id AND pv.product_id = v_product_id AND pv.name = v_variant_name AND pv.is_b2b = v_is_b2b
            FOR UPDATE OF pv LIMIT 1;
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
-- 6. Atomic Marketplace Order Creation (Tenant Scoped)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_create_marketplace_order(
  p_master_order JSONB,
  p_sub_orders JSONB,
  p_items JSONB DEFAULT '[]'::JSONB, -- Array of {..., store_id}
  p_skip_inventory BOOLEAN DEFAULT false,
  p_allow_negative_stock BOOLEAN DEFAULT false,
  p_skip_deduction BOOLEAN DEFAULT false,
  p_coupons JSONB DEFAULT '[]'::JSONB, -- Array of {code, store_id}
  p_increment_coupons BOOLEAN DEFAULT false
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
    
    -- D. Increment affiliate earnings
    IF NULLIF(v_sub_order->>'affiliate_id', '') IS NOT NULL AND (v_sub_order->>'affiliate_commission')::NUMERIC > 0 THEN
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
-- 7. Atomic Payment Confirmation (Tenant Scoped)
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
  v_code TEXT;
  v_store_id UUID;
  v_items_by_store JSONB;
  v_coupon JSONB;
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

  RETURN jsonb_build_object('success', true, 'already_paid', false, 'order_id', v_master_order.display_id, 'master_id', v_master_order.id);
END;
$$ LANGUAGE plpgsql;

-- END OF FILE
