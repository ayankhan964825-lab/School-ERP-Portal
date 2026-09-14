-- Inventory Management Migration

-- 1. Add track_inventory column to products
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'track_inventory') THEN
        ALTER TABLE products ADD COLUMN track_inventory BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Update atomic order inventory processor to respect track_inventory
CREATE OR REPLACE FUNCTION atomic_process_order_inventory(
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_product_id TEXT;
    v_variant_name TEXT;
    v_is_b2b BOOLEAN;
    v_quantity INT;
    v_current_stock INT;
    v_variant_id UUID;
    v_track_inventory BOOLEAN;
BEGIN
    -- Loop through all items and lock them
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := v_item->>'id';
        v_quantity := (v_item->>'quantity')::INT;
        v_variant_name := v_item->>'variant';
        v_is_b2b := COALESCE((v_item->>'isB2B')::BOOLEAN, false);

        -- Lookup track_inventory from products
        SELECT track_inventory INTO v_track_inventory
        FROM products WHERE id = v_product_id;

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
            RAISE EXCEPTION 'Product variant not found: % - %', v_product_id, v_variant_name;
        END IF;

        -- Enforce inventory if tracking is enabled
        IF v_track_inventory = true THEN
            IF v_current_stock < v_quantity THEN
                RAISE EXCEPTION 'Insufficient stock for product % - %', v_product_id, v_variant_name;
            END IF;
        END IF;

        -- Atomically decrement stock
        UPDATE product_variants 
        SET stock = stock - v_quantity,
            updated_at = now()
        WHERE id = v_variant_id;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
