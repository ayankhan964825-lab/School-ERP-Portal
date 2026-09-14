-- ==============================================================================
-- FINAL MASTER INVENTORY FIX
-- Description: Fixes the infinite stock bug by correctly routing deductions 
-- across multi-warehouse `inventory_levels` and syncing the global `product_variants.stock`.
-- Also fixes Bug 4: Respects the `track_inventory` toggle at the product level.
-- Run this in your Supabase SQL Editor!
-- ==============================================================================

DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_process_order_inventory(JSONB, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_restore_order_inventory(JSONB);

-- 1. ATOMIC PROCESS (Deducts stock across warehouses properly)
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
    v_qty_remaining INTEGER;
    v_location_record RECORD;
    v_track_inventory BOOLEAN;
BEGIN
    FOR v_item IN 
        SELECT * FROM jsonb_array_elements(p_items) AS elem
        ORDER BY elem->>'id' ASC, COALESCE(elem->>'variant', '') ASC
    LOOP
        v_product_id := v_item->>'id';
        v_variant_name := v_item->>'variant';
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_qty_remaining := v_quantity;
        
        -- BUG 4 FIX: Check if this specific product has inventory tracking disabled
        SELECT COALESCE((specifications->>'_track_inventory')::BOOLEAN, true) INTO v_track_inventory
        FROM products
        WHERE id = v_product_id;

        IF NOT v_track_inventory THEN
            CONTINUE; -- Skip inventory deduction entirely for this item since tracking is off
        END IF;

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
                CONTINUE; 
            ELSE
                RAISE EXCEPTION 'Product variant not found: % - %', v_product_id, v_variant_name;
            END IF;
        END IF;

        IF v_current_stock < v_quantity AND NOT p_allow_negative_stock THEN
            RAISE EXCEPTION 'Insufficient stock for product % variant %. Available: %, Requested: %', 
                v_product_id, v_variant_name, v_current_stock, v_quantity;
        END IF;

        IF NOT p_skip_deduction THEN
            -- 1. Deduct from specific inventory_levels (Multi-Warehouse logic)
            FOR v_location_record IN 
                SELECT id, available 
                FROM inventory_levels 
                WHERE variant_id = v_variant_id AND available > 0
                ORDER BY available DESC
                FOR UPDATE
            LOOP
                IF v_qty_remaining = 0 THEN
                    EXIT;
                END IF;

                IF v_location_record.available >= v_qty_remaining THEN
                    UPDATE inventory_levels 
                    SET available = available - v_qty_remaining
                    WHERE id = v_location_record.id;
                    v_qty_remaining := 0;
                ELSE
                    UPDATE inventory_levels 
                    SET available = 0
                    WHERE id = v_location_record.id;
                    v_qty_remaining := v_qty_remaining - v_location_record.available;
                END IF;
            END LOOP;

            IF v_qty_remaining > 0 AND NOT p_allow_negative_stock THEN
                RAISE EXCEPTION 'Insufficient warehouse-level stock for variant %. Missing: %', v_variant_name, v_qty_remaining;
            END IF;

            -- 2. Update global fallback stock
            UPDATE product_variants
            SET stock = stock - v_quantity
            WHERE id = v_variant_id;
        END IF;
    END LOOP;
END;
$$;


-- 2. ATOMIC RESTORE (Restores cancelled orders back to warehouse properly)
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
    v_target_location_id UUID;
    v_track_inventory BOOLEAN;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := v_item->>'id';
        v_variant_name := v_item->>'variant';
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        -- BUG 4 FIX: Check if this specific product has inventory tracking disabled
        SELECT COALESCE((specifications->>'_track_inventory')::BOOLEAN, true) INTO v_track_inventory
        FROM products
        WHERE id = v_product_id;

        IF NOT v_track_inventory THEN
            CONTINUE; -- Skip inventory restoration entirely for this item
        END IF;

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
            -- Find the first available location for this variant (or the primary warehouse)
            SELECT id INTO v_target_location_id 
            FROM inventory_levels 
            WHERE variant_id = v_variant_id 
            ORDER BY available DESC LIMIT 1;

            -- If a location exists, restore the stock there
            IF v_target_location_id IS NOT NULL THEN
                UPDATE inventory_levels
                SET available = available + v_quantity
                WHERE id = v_target_location_id;
            END IF;

            -- Restore global fallback stock
            UPDATE product_variants
            SET stock = stock + v_quantity
            WHERE id = v_variant_id;
        END IF;
    END LOOP;
END;
$$;
