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

        IF v_variant_name IS NULL OR v_variant_name = '' THEN
            SELECT id INTO v_variant_id
            FROM product_variants
            WHERE product_id = v_product_id AND is_b2b = v_is_b2b
            ORDER BY created_at ASC LIMIT 1;
        ELSE
            SELECT id INTO v_variant_id
            FROM product_variants
            WHERE product_id = v_product_id AND name = v_variant_name AND is_b2b = v_is_b2b;
        END IF;

        IF FOUND THEN
            UPDATE product_variants
            SET stock = stock + v_quantity
            WHERE id = v_variant_id;
        END IF;
    END LOOP;
END;
$$;
