-- ==============================================================================
-- MIGRATION: v36 Checkout Reservations BOLA Fix (Pass 4)
-- DESCRIPTION: Prevents malicious tenants from locking competitor inventory 
-- by ensuring reserved variants belong strictly to the provided p_store_id.
-- ==============================================================================

BEGIN;

-- 1. Drop old unsecured function
DROP FUNCTION IF EXISTS atomic_create_checkout_reservations(TEXT, JSONB, INTEGER);
DROP FUNCTION IF EXISTS atomic_create_checkout_reservations(TEXT, JSONB);

-- 2. Create secured function
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
    -- Delete existing reservations for this checkout to allow retry
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

            -- Check true availability (Raw Stock - Active Reservations)
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
