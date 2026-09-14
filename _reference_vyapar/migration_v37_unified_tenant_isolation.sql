-- ==============================================================================
-- MIGRATION: v37 Unified Tenant Isolation (Final Mega Script)
-- DESCRIPTION: Applies ALL strict BOLA fixes across the entire database in one go.
-- This script safely drops old insecure signatures and creates new secure ones.
-- ==============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. DROP ALL OLD INSECURE SIGNATURES (Aggressive)
-- ═══════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, UUID, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, UUID);

DROP FUNCTION IF EXISTS atomic_increment_coupon_usage(TEXT, INTEGER);
DROP FUNCTION IF EXISTS atomic_increment_coupon_usage(TEXT, UUID, INTEGER);

DROP FUNCTION IF EXISTS atomic_restore_order_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_restore_order_inventory(JSONB, UUID);

DROP FUNCTION IF EXISTS increment_flash_sale_stock(TEXT, INTEGER);
DROP FUNCTION IF EXISTS increment_flash_sale_stock(TEXT, INTEGER, UUID);

DROP FUNCTION IF EXISTS atomic_process_flash_sale_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_process_flash_sale_inventory(JSONB, UUID);

DROP FUNCTION IF EXISTS atomic_restore_flash_sale_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_restore_flash_sale_inventory(JSONB, UUID);

DROP FUNCTION IF EXISTS atomic_confirm_payment(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_confirm_payment(TEXT, TEXT, BOOLEAN, UUID);

DROP FUNCTION IF EXISTS atomic_update_order_status(TEXT, TEXT, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_update_order_status(TEXT, TEXT, BOOLEAN);

DROP FUNCTION IF EXISTS atomic_create_checkout_reservations(TEXT, JSONB, INTEGER);
DROP FUNCTION IF EXISTS atomic_create_checkout_reservations(TEXT, JSONB);
DROP FUNCTION IF EXISTS atomic_create_checkout_reservations(TEXT, JSONB, UUID, INTEGER);

-- ═══════════════════════════════════════════════════════════
-- 2. SECURE: atomic_process_order_inventory
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_process_order_inventory(
    p_items JSONB,
    p_store_id UUID,
    p_skip_b2b_check BOOLEAN DEFAULT false,
    p_skip_deduction BOOLEAN DEFAULT false
) RETURNS void AS $$
DECLARE
    v_item JSONB;
    v_variant_id UUID;
    v_qty INTEGER;
    v_is_b2b BOOLEAN;
    v_location_id UUID;
    v_available INTEGER;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;
        v_is_b2b := COALESCE((v_item->>'isB2B')::BOOLEAN, false);
        v_location_id := (v_item->>'location_id')::UUID;
        
        IF (v_item->>'track_inventory')::BOOLEAN = true THEN
            -- SECURITY: Ensure variant belongs to p_store_id
            PERFORM 1 FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE pv.id = v_variant_id AND p.store_id = p_store_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Variant % does not belong to store %', v_variant_id, p_store_id;
            END IF;

            IF NOT p_skip_deduction THEN
                SELECT COALESCE(available, 0) INTO v_available
                FROM inventory_levels
                WHERE variant_id = v_variant_id AND location_id IS NOT DISTINCT FROM v_location_id
                FOR UPDATE;
                
                IF v_available < v_qty THEN
                    RAISE EXCEPTION 'Insufficient stock for variant %', v_variant_id;
                END IF;
                
                UPDATE inventory_levels
                SET available = available - v_qty
                WHERE variant_id = v_variant_id AND location_id IS NOT DISTINCT FROM v_location_id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 3. SECURE: atomic_increment_coupon_usage
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_increment_coupon_usage(p_code TEXT, p_store_id UUID, p_increment_amount INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
    UPDATE coupons
    SET used_count = COALESCE(used_count, 0) + p_increment_amount
    WHERE code = p_code AND store_id = p_store_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 4. SECURE: atomic_restore_order_inventory
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_restore_order_inventory(p_items JSONB, p_store_id UUID)
RETURNS void AS $$
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
        ORDER BY elem->>'id' ASC, COALESCE(elem->>'variant', '') ASC
    LOOP
        v_product_id := COALESCE(v_item->>'product_id', split_part(v_item->>'id', '-', 1));
        v_variant_name := v_item->>'variant';
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_location_id := (v_item->>'location_id')::UUID;
        
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
            FOR UPDATE;
        ELSE
            SELECT pv.id INTO v_variant_id
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE p.store_id = p_store_id AND pv.product_id = v_product_id AND pv.name = v_variant_name AND pv.is_b2b = v_is_b2b
            FOR UPDATE;
        END IF;

        IF FOUND THEN
            -- Restore stock in new location-aware table or fallback to old if not using locations
            UPDATE inventory_levels
            SET available = available + v_quantity
            WHERE variant_id = v_variant_id AND (location_id IS NOT DISTINCT FROM v_location_id OR location_id IS NULL);
            
            -- Keep product_variants stock synced as fallback
            UPDATE product_variants SET stock = stock + v_quantity WHERE id = v_variant_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 5. SECURE: increment_flash_sale_stock
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_flash_sale_stock(p_product_name TEXT, p_qty INTEGER, p_store_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE flash_sales
    SET sold_stock = COALESCE(sold_stock, 0) + p_qty
    WHERE product = p_product_name
      AND store_id = p_store_id
      AND stock_type = 'real'
      AND end_date > NOW();
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 6. SECURE: atomic_process_flash_sale_inventory
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_process_flash_sale_inventory(p_items JSONB, p_store_id UUID)
RETURNS void AS $$
DECLARE
    v_item JSONB;
    v_total_stock INTEGER;
    v_sold_stock INTEGER;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'isFlashSale')::BOOLEAN = true THEN
            SELECT total_stock, sold_stock INTO v_total_stock, v_sold_stock
            FROM flash_sales
            WHERE product = v_item->>'product_name'
              AND store_id = p_store_id
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
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 7. SECURE: atomic_restore_flash_sale_inventory
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_restore_flash_sale_inventory(p_items JSONB, p_store_id UUID)
RETURNS void AS $$
DECLARE
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'isFlashSale')::BOOLEAN = true THEN
            UPDATE flash_sales
            SET sold_stock = GREATEST(0, COALESCE(sold_stock, 0) - (v_item->>'quantity')::INTEGER)
            WHERE product = v_item->>'product_name'
              AND store_id = p_store_id
              AND stock_type = 'real';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 8. SECURE: atomic_confirm_payment
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_confirm_payment(
  p_lookup_id TEXT,
  p_razorpay_payment_id TEXT,
  p_skip_deduction BOOLEAN,
  p_store_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_master_order RECORD;
  v_sub_order RECORD;
  v_mapped_items JSONB;
  v_all_items JSONB = '[]'::JSONB;
  v_all_coupons TEXT[] = '{}';
  v_code TEXT;
BEGIN
  -- A. Idempotency Check on Global master_orders
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

  -- B. Gather all items and coupons autonomously ONLY for this store's sub-orders
  FOR v_sub_order IN SELECT * FROM orders WHERE master_order_id = v_master_order.id AND store_id = p_store_id
  LOOP
      SELECT jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(elem->>'product_id', split_part(elem->>'id', '-', 1)),
            'variant_id', elem->>'variant_id',
            'location_id', elem->>'location_id',
            'variant', elem->>'variant_name',
            'isB2B', COALESCE((elem->>'isB2B')::BOOLEAN, false),
            'quantity', (elem->>'quantity')::INTEGER,
            'isFlashSale', COALESCE((elem->>'isFlashSale')::BOOLEAN, false),
            'product_name', COALESCE(elem->>'product_name', ''),
            'track_inventory', COALESCE((elem->>'track_inventory')::BOOLEAN, true)
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

  -- C. Update master_orders global state
  UPDATE master_orders
  SET payment_status = 'paid', payment_id = COALESCE(p_razorpay_payment_id, payment_id)
  WHERE id = v_master_order.id;

  -- D. Update sub-orders strictly for this tenant
  UPDATE orders
  SET payment_status = 'paid', status = 'confirmed', razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_order_id)
  WHERE master_order_id = v_master_order.id AND store_id = p_store_id;

  -- E. Deduct Inventory (Passing p_store_id down!)
  IF jsonb_array_length(v_all_items) > 0 THEN
    PERFORM atomic_process_order_inventory(v_all_items, p_store_id, true, p_skip_deduction);
    PERFORM atomic_process_flash_sale_inventory(v_all_items, p_store_id);
  END IF;

  -- F. Increment Coupons (Passing p_store_id down!)
  IF array_length(v_all_coupons, 1) > 0 THEN
    FOREACH v_code IN ARRAY v_all_coupons LOOP
      PERFORM atomic_increment_coupon_usage(v_code, p_store_id, 1);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'already_paid', false, 'order_id', v_master_order.display_id, 'master_id', v_master_order.id);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 9. SECURE: atomic_update_order_status
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_update_order_status(
    p_order_id TEXT,
    p_new_status TEXT,
    p_store_id UUID,
    p_skip_inventory BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_is_old_cancelled BOOLEAN;
    v_is_new_cancelled BOOLEAN;
    v_code TEXT;
    v_mapped_items JSONB;
BEGIN
    SELECT * INTO v_order 
    FROM orders 
    WHERE order_id = p_order_id AND store_id = p_store_id
    FOR UPDATE LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found or access denied');
    END IF;

    v_is_old_cancelled := v_order.status IN ('cancelled', 'returned', 'rto');
    v_is_new_cancelled := p_new_status IN ('cancelled', 'returned', 'rto');

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(elem->>'product_id', split_part(elem->>'id', '-', 1)),
            'variant_id', elem->>'variant_id',
            'location_id', elem->>'location_id',
            'variant', elem->>'variant_name',
            'isB2B', COALESCE((elem->>'isB2B')::BOOLEAN, false),
            'quantity', (elem->>'quantity')::INTEGER,
            'isFlashSale', COALESCE((elem->>'isFlashSale')::BOOLEAN, false),
            'product_name', COALESCE(elem->>'product_name', ''),
            'track_inventory', COALESCE((elem->>'track_inventory')::BOOLEAN, true)
        )
    ) INTO v_mapped_items
    FROM jsonb_array_elements(v_order.items) AS elem;

    IF v_mapped_items IS NULL THEN
        v_mapped_items := '[]'::JSONB;
    END IF;

    IF NOT v_is_old_cancelled AND v_is_new_cancelled THEN
        -- ACTIVE -> CANCELLED (RESTORE INVENTORY)
        PERFORM atomic_restore_order_inventory(v_mapped_items, p_store_id);
        PERFORM atomic_restore_flash_sale_inventory(v_mapped_items, p_store_id);

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN
                    PERFORM atomic_increment_coupon_usage(v_code, p_store_id, -1);
                END IF;
            END LOOP;
        END IF;

    ELSIF v_is_old_cancelled AND NOT v_is_new_cancelled THEN
        -- CANCELLED -> ACTIVE (DEDUCT INVENTORY)
        PERFORM atomic_process_order_inventory(v_mapped_items, p_store_id, true, p_skip_inventory);
        PERFORM atomic_process_flash_sale_inventory(v_mapped_items, p_store_id);

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN
                    PERFORM atomic_increment_coupon_usage(v_code, p_store_id, 1);
                END IF;
            END LOOP;
        END IF;
    END IF;

    UPDATE orders 
    SET status = p_new_status, updated_at = NOW() 
    WHERE order_id = p_order_id AND store_id = p_store_id;

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'old_status', v_order.status, 'new_status', p_new_status);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 10. SECURE: atomic_create_checkout_reservations
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_create_checkout_reservations(
    p_checkout_id TEXT,
    p_items JSONB,
    p_store_id UUID,
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
    DELETE FROM checkout_reservations WHERE checkout_id = p_checkout_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_location_id := (v_item->>'location_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;
        v_track_inventory := COALESCE((v_item->>'track_inventory')::BOOLEAN, true);

        IF v_track_inventory THEN
            -- SECURITY: Validate that the variant actually belongs to the requesting tenant
            PERFORM 1 FROM product_variants pv 
            JOIN products p ON p.id = pv.product_id
            WHERE pv.id = v_variant_id AND p.store_id = p_store_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Variant % does not belong to store %', v_variant_id, p_store_id;
            END IF;

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

COMMIT;
