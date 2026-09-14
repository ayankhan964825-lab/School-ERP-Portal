-- Drop the overloaded functions
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, BOOLEAN, BOOLEAN);

-- Recreate the correct function
CREATE OR REPLACE FUNCTION atomic_process_order_inventory(
    p_items JSONB,
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
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := v_item->>'id';
        v_variant_name := v_item->>'variant';
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        -- Handle both string and boolean forms of isB2B safely
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
            WHERE product_id = v_product_id AND is_b2b = v_is_b2b
            ORDER BY created_at ASC LIMIT 1
            FOR UPDATE;
        ELSE
            SELECT id, stock INTO v_variant_id, v_current_stock
            FROM product_variants
            WHERE product_id = v_product_id AND name = v_variant_name AND is_b2b = v_is_b2b
            FOR UPDATE;
        END IF;

        IF NOT FOUND THEN
            IF p_allow_negative_stock THEN
                CONTINUE; -- Skip if not found but negative stock allowed
            ELSE
                RAISE EXCEPTION 'Product variant not found: % - %', v_product_id, v_variant_name;
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
