-- ==============================================================================
-- MIGRATION: v32 - Inventory Unification
-- Description: Unifies product_variants and inventory_levels deduction in a single RPC
-- ==============================================================================

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
    v_store_id UUID;
    v_location_id UUID;
    v_current_stock INTEGER;
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

        -- 1. Resolve Variant ID and Global Stock
        IF v_variant_name IS NULL OR v_variant_name = '' THEN
            SELECT id, stock, store_id INTO v_variant_id, v_current_stock, v_store_id
            FROM product_variants
            WHERE product_id = v_product_id AND is_b2b = v_is_b2b
            ORDER BY created_at ASC LIMIT 1
            FOR UPDATE;
        ELSE
            SELECT id, stock, store_id INTO v_variant_id, v_current_stock, v_store_id
            FROM product_variants
            WHERE product_id = v_product_id AND name = v_variant_name AND is_b2b = v_is_b2b
            FOR UPDATE;
        END IF;

        IF NOT FOUND THEN
            IF p_allow_negative_stock THEN
                CONTINUE; 
            ELSE
                RAISE EXCEPTION 'Product variant not found: % - %', v_product_id, v_variant_name;
            END IF;
        END IF;

        IF v_current_stock < v_quantity AND NOT p_allow_negative_stock THEN
            RAISE EXCEPTION 'Insufficient stock for product % variant %. Global Available: %, Requested: %', 
                v_product_id, v_variant_name, v_current_stock, v_quantity;
        END IF;

        -- 2. Resolve Location ID
        IF v_item->>'location_id' IS NOT NULL THEN
            v_location_id := (v_item->>'location_id')::UUID;
        ELSE
            -- Find the default warehouse for this variant's store
            SELECT id INTO v_location_id
            FROM locations 
            WHERE store_id = v_store_id AND is_default = true
            LIMIT 1;
        END IF;

        -- 3. Lock the inventory_levels row
        SELECT available INTO v_location_available
        FROM inventory_levels
        WHERE variant_id = v_variant_id AND location_id = v_location_id
        FOR UPDATE;

        IF NOT FOUND THEN
            IF p_allow_negative_stock THEN
                -- Auto-create the inventory level if it doesn't exist and negative is allowed
                INSERT INTO inventory_levels (variant_id, location_id, store_id, available, committed)
                VALUES (v_variant_id, v_location_id, v_store_id, 0, 0)
                ON CONFLICT DO NOTHING;
                v_location_available := 0;
            ELSE
                RAISE EXCEPTION 'Inventory level not found for variant %, location %', v_variant_id, v_location_id;
            END IF;
        END IF;

        IF v_location_available < v_quantity AND NOT p_allow_negative_stock THEN
            RAISE EXCEPTION 'Insufficient stock. Location Available: %, Requested: %', v_location_available, v_quantity;
        END IF;

        -- 4. Deduct Stock from BOTH tables
        IF NOT p_skip_deduction THEN
            -- Deduct global legacy stock
            UPDATE product_variants
            SET stock = stock - v_quantity
            WHERE id = v_variant_id;

            -- Deduct multi-warehouse stock
            UPDATE inventory_levels
            SET available = available - v_quantity,
                committed = committed + v_quantity
            WHERE variant_id = v_variant_id AND location_id = v_location_id;
            
            -- Insert Audit Log
            INSERT INTO inventory_transactions (store_id, location_id, variant_id, quantity_change, transaction_type, notes)
            VALUES (v_store_id, v_location_id, v_variant_id, -v_quantity, 'order_placed', 'Locked for checkout');
        END IF;
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
