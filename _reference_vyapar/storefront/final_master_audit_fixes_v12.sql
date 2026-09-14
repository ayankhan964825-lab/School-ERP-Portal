-- Fix for Affiliate Negative Balance Blackhole (Level 6 Audit)
-- We defer affiliate payouts until delivery in Node.js, so Postgres should not proactively debit affiliates on cancellation.

CREATE OR REPLACE FUNCTION atomic_update_order_status(
    p_order_id TEXT,
    p_new_status TEXT,
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
    -- Lock the order row
    SELECT * INTO v_order 
    FROM orders 
    WHERE order_id = p_order_id 
    FOR UPDATE LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
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
        PERFORM atomic_restore_order_inventory(v_mapped_items);
        PERFORM atomic_restore_flash_sale_inventory(v_mapped_items);

        -- REMOVED: Affiliate Debit. This is now exclusively handled by Node.js in updateOrderStatus 
        -- ONLY if the order was previously 'delivered', to prevent Negative Balance Blackholes.

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN
                    PERFORM atomic_increment_coupon_usage(v_code, -1);
                END IF;
            END LOOP;
        END IF;

    ELSIF v_is_old_cancelled AND NOT v_is_new_cancelled THEN
        -- CANCELLED -> ACTIVE
        PERFORM atomic_process_order_inventory(v_mapped_items, true, p_skip_inventory);
        PERFORM atomic_process_flash_sale_inventory(v_mapped_items);

        -- REMOVED: Affiliate Credit. This is deferred until delivery via Node.js.

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN
                    PERFORM atomic_increment_coupon_usage(v_code, 1);
                END IF;
            END LOOP;
        END IF;
    END IF;

    -- Finally, update the status
    UPDATE orders 
    SET status = p_new_status, updated_at = NOW() 
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'old_status', v_order.status, 'new_status', p_new_status);
END;
$$;
