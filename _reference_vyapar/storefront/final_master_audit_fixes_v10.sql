-- ==============================================================================
-- V10 MASTER AUDIT FIXES: MULTI-TENANT CONCURRENCY & RACE CONDITIONS
-- ==============================================================================

-- ═══════════════════════════════════════════════════════════
-- 1. Atomic Wallet Payout Request (Fixes Infinite Payout Exploit)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_request_payout(
    p_store_id TEXT,
    p_amount NUMERIC,
    p_bank_name TEXT,
    p_bank_account_no TEXT,
    p_bank_ifsc TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_wallet RECORD;
    v_request_id TEXT;
BEGIN
    -- 1. Securely lock the wallet for this store
    SELECT * INTO v_wallet
    FROM wallets
    WHERE store_id = p_store_id
    FOR UPDATE LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    -- 2. Verify sufficient balance (No TOCTOU race conditions here)
    IF v_wallet.balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- 3. Create the payout request
    INSERT INTO payout_requests (store_id, wallet_id, amount, status, bank_name, bank_account_no, bank_ifsc)
    VALUES (p_store_id, v_wallet.id, p_amount, 'pending', p_bank_name, p_bank_account_no, p_bank_ifsc)
    RETURNING id INTO v_request_id;

    -- 4. Deduct balance and log transaction (Inline logic of update_wallet_balance)
    UPDATE wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    INSERT INTO wallet_transactions (store_id, wallet_id, type, amount, reference_id, description)
    VALUES (p_store_id, v_wallet.id, 'payout', -p_amount, v_request_id, 'Payout Request to ' || p_bank_name);

    RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. Atomic Affiliate Withdrawal (Fixes Double-Dip Exploit)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_affiliate_withdrawal(
    p_affiliate_id TEXT,
    p_payout_days INTEGER,
    p_payout_threshold NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_affiliate RECORD;
    v_pending_count INTEGER;
    v_earned NUMERIC := 0;
    v_available NUMERIC := 0;
    v_cutoff_date TIMESTAMP;
    v_order RECORD;
    v_upi_id TEXT;
BEGIN
    -- 1. Securely lock the affiliate
    SELECT * INTO v_affiliate
    FROM affiliates
    WHERE id = p_affiliate_id
    FOR UPDATE LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Affiliate not found');
    END IF;

    -- 2. Prevent Double-Dipping by checking for existing pending payouts UNDER LOCK
    SELECT COUNT(*) INTO v_pending_count
    FROM payouts
    WHERE affiliate_id = p_affiliate_id AND status = 'pending';

    IF v_pending_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'You already have a pending withdrawal request.');
    END IF;

    -- 3. Calculate earnings strictly from delivered orders past the payout_days threshold
    v_cutoff_date := NOW() - (p_payout_days || ' days')::interval;

    FOR v_order IN
        SELECT affiliate_commission
        FROM orders
        WHERE affiliate_id = p_affiliate_id
          AND status = 'delivered'
          AND created_at <= v_cutoff_date
    LOOP
        v_earned := v_earned + COALESCE(v_order.affiliate_commission, 0);
    END LOOP;

    v_available := GREATEST(0, v_earned - COALESCE(v_affiliate.paid_earnings, 0));

    IF v_available < p_payout_threshold THEN
        RETURN jsonb_build_object('success', false, 'error', 'Minimum threshold of ₹' || p_payout_threshold || ' not reached.');
    END IF;

    -- 4. Create payout request
    IF v_affiliate.upi_id IS NOT NULL AND v_affiliate.upi_id != '' THEN
        v_upi_id := v_affiliate.upi_id;
    ELSIF v_affiliate.bank_account_number IS NOT NULL AND v_affiliate.bank_account_number != '' THEN
        v_upi_id := v_affiliate.bank_account_number || ' (IFSC: ' || COALESCE(v_affiliate.bank_ifsc, '') || ')';
    ELSE
        v_upi_id := 'Not Provided';
    END IF;

    INSERT INTO payouts (affiliate_id, amount, status, transaction_id)
    VALUES (p_affiliate_id, v_available, 'pending', 'PENDING');

    RETURN jsonb_build_object('success', true, 'amount', v_available, 'affiliate_name', v_affiliate.name, 'upi_id', v_upi_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 3. Atomic Marketplace Apply (Fixes Multiple Pending Applications Exploit)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_marketplace_apply(
    p_store_id TEXT,
    p_business_name TEXT,
    p_gstin TEXT,
    p_pan TEXT,
    p_bank_name TEXT,
    p_bank_account_no TEXT,
    p_bank_ifsc TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_count INTEGER;
BEGIN
    -- Explicitly lock the store to serialize concurrent applications
    PERFORM 1 FROM stores WHERE id = p_store_id FOR UPDATE;

    SELECT COUNT(*) INTO v_existing_count
    FROM marketplace_applications
    WHERE store_id = p_store_id AND status != 'rejected';

    IF v_existing_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'You already have an active application.');
    END IF;

    INSERT INTO marketplace_applications (store_id, business_name, gstin, pan, bank_name, bank_account_no, bank_ifsc, status)
    VALUES (p_store_id, p_business_name, p_gstin, p_pan, p_bank_name, p_bank_account_no, p_bank_ifsc, 'pending');

    RETURN jsonb_build_object('success', true);
END;
$$;

-- END OF FILE
