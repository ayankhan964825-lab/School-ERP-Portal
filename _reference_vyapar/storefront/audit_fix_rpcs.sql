-- ═══════════════════════════════════════════════════════════
-- C7 FIX: Atomic coupon usage increment/decrement
-- Prevents race conditions when two concurrent orders use same coupon
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
-- M6 FIX: Restore inventory RPC with FOR UPDATE lock
-- Prevents race conditions on concurrent cancel operations
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
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
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

        -- M6 FIX: Added FOR UPDATE lock
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
-- Flash sale atomic increment (created earlier, ensuring it exists)
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
