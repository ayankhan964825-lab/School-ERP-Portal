-- ==============================================================================
-- MIGRATION: v34 - Restore RPC Tenant Isolation
-- Description: Re-introduces p_store_id parameter to all critical RPCs
-- ==============================================================================

-- 1. atomic_update_order_status
DROP FUNCTION IF EXISTS atomic_update_order_status(text, text, boolean);

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

    IF NOT v_is_old_cancelled AND v_is_new_cancelled THEN
        -- ACTIVE -> CANCELLED
        PERFORM atomic_restore_order_inventory(v_mapped_items);
        PERFORM atomic_restore_flash_sale_inventory(v_mapped_items);

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
        PERFORM atomic_process_flash_sale_inventory(v_mapped_items);

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
$$;


-- 2. atomic_increment_coupon_usage
DROP FUNCTION IF EXISTS atomic_increment_coupon_usage(text, integer);

CREATE OR REPLACE FUNCTION atomic_increment_coupon_usage(p_code TEXT, p_store_id UUID, p_delta INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE coupons
    SET used_count = GREATEST(0, COALESCE(used_count, 0) + p_delta)
    WHERE code = p_code AND store_id = p_store_id;
END;
$$;


-- 3. increment_affiliate_earnings
DROP FUNCTION IF EXISTS increment_affiliate_earnings(text, numeric);
DROP FUNCTION IF EXISTS increment_affiliate_earnings(uuid, numeric);

CREATE OR REPLACE FUNCTION increment_affiliate_earnings(p_aff_id TEXT, p_store_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE affiliates
    SET total_earnings = COALESCE(total_earnings, 0) + p_amount
    WHERE id = p_aff_id AND store_id = p_store_id;
END;
$$;


-- 4. increment_flash_sale_stock
DROP FUNCTION IF EXISTS increment_flash_sale_stock(text, integer);

CREATE OR REPLACE FUNCTION increment_flash_sale_stock(p_product_name TEXT, p_store_id UUID, p_qty INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE flash_sales
    SET sold_stock = COALESCE(sold_stock, 0) + p_qty
    WHERE product = p_product_name
      AND store_id = p_store_id
      AND stock_type = 'real'
      AND end_date > NOW();
END;
$$;


-- 5. increment_flash_sale_sold_stock
DROP FUNCTION IF EXISTS increment_flash_sale_sold_stock(text, text, integer);

CREATE OR REPLACE FUNCTION increment_flash_sale_sold_stock(p_product_id TEXT, p_store_id UUID, p_variant_name TEXT DEFAULT NULL, p_qty INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE flash_sales
    SET sold_stock = GREATEST(0, COALESCE(sold_stock, 0) + p_qty)
    WHERE product = (SELECT title FROM products WHERE id = p_product_id LIMIT 1)
      AND store_id = p_store_id
      AND stock_type = 'real'
      AND end_date > NOW();
END;
$$;


-- 6. decrement_variant_stock
DROP FUNCTION IF EXISTS decrement_variant_stock(uuid, text, integer);

CREATE OR REPLACE FUNCTION decrement_variant_stock(p_product_id UUID, p_variant_name TEXT, p_store_id UUID, p_qty INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE product_variants
    SET stock = stock - p_qty
    WHERE product_id = p_product_id::text AND name = p_variant_name AND store_id = p_store_id;
END;
$$;


-- 7. decrement_product_stock
DROP FUNCTION IF EXISTS decrement_product_stock(uuid, integer);

CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID, p_store_id UUID, p_qty INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE product_variants
    SET stock = stock - p_qty
    WHERE product_id = p_product_id::text AND name = 'Default' AND store_id = p_store_id;
END;
$$;


-- 8. atomic_process_order_inventory (Overloaded internally)
DROP FUNCTION IF EXISTS atomic_process_order_inventory(jsonb, boolean, boolean);

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
    v_location_id UUID;
    v_location_available INTEGER;
BEGIN
    FOR v_item IN 
        SELECT * FROM jsonb_array_elements(p_items) AS elem
        ORDER BY COALESCE(elem->>'location_id', '') ASC, elem->>'id' ASC, COALESCE(elem->>'variant', '') ASC
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
            WHERE product_id = v_product_id AND is_b2b = v_is_b2b AND store_id = p_store_id
            ORDER BY created_at ASC LIMIT 1
            FOR UPDATE;
        ELSE
            SELECT id, stock INTO v_variant_id, v_current_stock
            FROM product_variants
            WHERE product_id = v_product_id AND name = v_variant_name AND is_b2b = v_is_b2b AND store_id = p_store_id
            FOR UPDATE;
        END IF;

        IF NOT FOUND THEN
            IF p_allow_negative_stock THEN
                CONTINUE; 
            ELSE
                RAISE EXCEPTION 'Product variant not found or access denied: % - %', v_product_id, v_variant_name;
            END IF;
        END IF;

        IF v_current_stock < v_quantity AND NOT p_allow_negative_stock THEN
            RAISE EXCEPTION 'Insufficient stock for product % variant %. Global Available: %, Requested: %', 
                v_product_id, v_variant_name, v_current_stock, v_quantity;
        END IF;

        IF v_item->>'location_id' IS NOT NULL THEN
            v_location_id := (v_item->>'location_id')::UUID;
        ELSE
            SELECT id INTO v_location_id
            FROM locations 
            WHERE store_id = p_store_id AND is_default = true
            LIMIT 1;
        END IF;

        SELECT available INTO v_location_available
        FROM inventory_levels
        WHERE variant_id = v_variant_id AND location_id = v_location_id
        FOR UPDATE;

        IF NOT FOUND THEN
            IF p_allow_negative_stock THEN
                INSERT INTO inventory_levels (variant_id, location_id, store_id, available, committed)
                VALUES (v_variant_id, v_location_id, p_store_id, 0, 0)
                ON CONFLICT DO NOTHING;
                v_location_available := 0;
            ELSE
                RAISE EXCEPTION 'Inventory level not found for variant %, location %', v_variant_id, v_location_id;
            END IF;
        END IF;

        IF v_location_available < v_quantity AND NOT p_allow_negative_stock THEN
            RAISE EXCEPTION 'Insufficient stock. Location Available: %, Requested: %', v_location_available, v_quantity;
        END IF;

        IF NOT p_skip_deduction THEN
            UPDATE product_variants
            SET stock = stock - v_quantity
            WHERE id = v_variant_id AND store_id = p_store_id;

            UPDATE inventory_levels
            SET available = available - v_quantity
            WHERE variant_id = v_variant_id AND location_id = v_location_id;
        END IF;

    END LOOP;
END;
$$;
