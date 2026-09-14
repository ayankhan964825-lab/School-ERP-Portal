-- ==========================================
-- VyaparPe Financial Engine & Wallet Locking
-- ==========================================
-- Run this script in the Supabase SQL Editor
-- It creates the atomic, lock-safe financial functions.

CREATE OR REPLACE FUNCTION process_wallet_transaction(
    p_store_id UUID,
    p_amount NUMERIC,
    p_type TEXT,
    p_reference_id TEXT,
    p_order_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Idempotency Check (Audit #17)
    -- If this reference_id already exists, we exit immediately to prevent double processing.
    IF EXISTS (SELECT 1 FROM wallet_transactions WHERE reference_id = p_reference_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction already processed (Idempotent)');
    END IF;

    -- 2. Row-Level Lock for Wallet (Audit #3)
    -- This guarantees no race conditions if 10 checkouts happen at the exact same millisecond
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM wallets
    WHERE store_id = p_store_id
    FOR UPDATE; -- This locks the row until this function completes

    IF NOT FOUND THEN
        -- Auto-create wallet if it doesn't exist
        INSERT INTO wallets (store_id, balance) VALUES (p_store_id, 0) RETURNING id INTO v_wallet_id;
        v_current_balance := 0;
    END IF;

    -- 3. Calculate new balance based on transaction type
    IF p_type IN ('prepaid_credit', 'cod_credit') THEN
        v_new_balance := v_current_balance + p_amount;
    ELSIF p_type IN ('commission_debit', 'shipping_debit', 'payout') THEN
        -- Allow negative balance for commission? Yes, VyaparPe bills the seller
        v_new_balance := v_current_balance - p_amount;
    ELSE
        RAISE EXCEPTION 'Invalid transaction type: %', p_type;
    END IF;

    -- 4. Update Wallet
    UPDATE wallets 
    SET balance = v_new_balance,
        last_updated = now()
    WHERE id = v_wallet_id;

    -- 5. Record Immutable Transaction
    INSERT INTO wallet_transactions (
        wallet_id, store_id, order_id, amount, type, reference_id, description
    ) VALUES (
        v_wallet_id, p_store_id, p_order_id, p_amount, p_type, p_reference_id, p_description
    );

    RETURN jsonb_build_object(
        'success', true, 
        'new_balance', v_new_balance,
        'transaction_id', p_reference_id
    );
END;
$$ LANGUAGE plpgsql;

-- Inventory Atomic Multi-Item Lock (Audit #12)
CREATE OR REPLACE FUNCTION atomic_process_order_inventory(
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_product_id TEXT;
    v_quantity INT;
    v_current_stock INT;
BEGIN
    -- Loop through all items and lock them
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := v_item->>'id';
        v_quantity := (v_item->>'quantity')::INT;

        SELECT stock INTO v_current_stock
        FROM products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            -- Rollback entire transaction
            RAISE EXCEPTION 'Product % not found', v_product_id;
        END IF;

        IF v_current_stock < v_quantity THEN
            -- Rollback entire transaction
            RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
        END IF;

        UPDATE products 
        SET stock = stock - v_quantity
        WHERE id = v_product_id;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
