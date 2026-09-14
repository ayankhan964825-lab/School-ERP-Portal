-- ==============================================================================
-- V11 MASTER AUDIT FIXES: MULTI-TENANT WEBHOOKS & RECHARGE CONCURRENCY
-- ==============================================================================

-- ═══════════════════════════════════════════════════════════
-- 1. Atomic iCarry Webhook Processing (Fixes COD Double-Credit)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_process_icarry_webhook(
    p_awb_number TEXT,
    p_mapped_status TEXT,
    p_scan_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_store RECORD;
BEGIN
    -- 1. Securely lock the order row
    SELECT * INTO v_order
    FROM orders
    WHERE awb_number = p_awb_number
    FOR UPDATE LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- 2. Idempotency Check: If already in this status, ignore to prevent duplicate credits
    IF v_order.status = p_mapped_status THEN
        -- Still update tracking history just in case there are new scan events
        UPDATE orders
        SET tracking_history = p_scan_data
        WHERE id = v_order.id;
        
        RETURN jsonb_build_object('success', true, 'message', 'Webhook processed idempotently', 'order_id', v_order.order_id);
    END IF;

    -- 3. Update Order Status
    -- Note: inventory updates are handled outside this RPC or via triggers, 
    -- but we must update the status and tracking history safely.
    UPDATE orders
    SET status = p_mapped_status,
        tracking_history = p_scan_data,
        updated_at = NOW()
    WHERE id = v_order.id;

    -- 4. Financial Engine: COD Credit on Delivery
    IF p_mapped_status = 'delivered' AND v_order.payment_method = 'cod' THEN
        SELECT is_god_mode INTO v_store FROM stores WHERE id = v_order.store_id;
        
        IF NOT v_store.is_god_mode THEN
            -- Directly inline the wallet update to guarantee atomicity inside this single transaction
            UPDATE wallets
            SET balance = balance + COALESCE(v_order.amount, 0),
                total_earned = total_earned + COALESCE(v_order.amount, 0),
                updated_at = NOW()
            WHERE store_id = v_order.store_id;

            INSERT INTO wallet_transactions (store_id, type, amount, reference_id, description, order_id)
            VALUES (
                v_order.store_id, 
                'credit', 
                COALESCE(v_order.amount, 0), 
                'COD_REMIT_' || v_order.order_id, 
                'COD Remittance for Order #' || v_order.order_id,
                v_order.order_id
            );
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Webhook processed and status updated', 'order_id', v_order.order_id, 'old_status', v_order.status);
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. Atomic KYC Review (Fixes Split-Brain State)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_kyc_review(
    p_application_id UUID,
    p_store_id TEXT,
    p_decision TEXT,
    p_review_notes TEXT,
    p_admin_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_app RECORD;
BEGIN
    -- 1. Lock Application
    SELECT * INTO v_app
    FROM marketplace_applications
    WHERE id = p_application_id AND store_id = p_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Application not found');
    END IF;

    IF v_app.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Application is already ' || v_app.status);
    END IF;

    -- 2. Lock Store
    PERFORM 1 FROM stores WHERE id = p_store_id FOR UPDATE;

    -- 3. Update Application
    UPDATE marketplace_applications
    SET status = p_decision,
        review_notes = p_review_notes,
        reviewed_by = p_admin_name,
        reviewed_at = NOW()
    WHERE id = p_application_id;

    -- 4. Update Store
    IF p_decision = 'approved' THEN
        UPDATE stores
        SET marketplace_verified = true,
            marketplace_verified_at = NOW()
        WHERE id = p_store_id;
    ELSIF p_decision = 'rejected' THEN
        UPDATE stores
        SET marketplace_verified = false
        WHERE id = p_store_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 3. Recharge Requests Architecture (Fixes Infinite Fake Money Exploit)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recharge_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    utr_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    review_notes TEXT,
    reviewed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE recharge_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins can do everything on recharge_requests" ON recharge_requests;
DROP POLICY IF EXISTS "Stores can view their own recharge_requests" ON recharge_requests;
DROP POLICY IF EXISTS "Stores can insert their own recharge_requests" ON recharge_requests;

CREATE POLICY "Super Admins can do everything on recharge_requests" ON recharge_requests FOR ALL USING (true);
CREATE POLICY "Stores can view their own recharge_requests" ON recharge_requests FOR SELECT USING (store_id = (current_setting('request.jwt.claims', true)::json->>'store_id')::uuid);
CREATE POLICY "Stores can insert their own recharge_requests" ON recharge_requests FOR INSERT WITH CHECK (store_id = (current_setting('request.jwt.claims', true)::json->>'store_id')::uuid);

CREATE OR REPLACE FUNCTION atomic_request_recharge(
    p_store_id TEXT,
    p_amount NUMERIC,
    p_utr_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_request_id UUID;
    v_wallet RECORD;
BEGIN
    -- Verify Wallet Exists
    SELECT * INTO v_wallet FROM wallets WHERE store_id = p_store_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
    END IF;

    -- Insert request safely
    INSERT INTO recharge_requests (store_id, amount, utr_number, status)
    VALUES (p_store_id::uuid, p_amount, p_utr_number, 'pending')
    RETURNING id INTO v_request_id;

    RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
END;
$$;

CREATE OR REPLACE FUNCTION atomic_process_recharge(
    p_request_id UUID,
    p_decision TEXT, -- 'approved' or 'rejected'
    p_admin_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_req RECORD;
    v_wallet RECORD;
BEGIN
    -- Lock Request
    SELECT * INTO v_req FROM recharge_requests WHERE id = p_request_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;

    IF v_req.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request is already processed');
    END IF;

    -- Update Request
    UPDATE recharge_requests
    SET status = p_decision,
        reviewed_by = p_admin_name,
        updated_at = NOW()
    WHERE id = p_request_id;

    -- If approved, grant the money
    IF p_decision = 'approved' THEN
        -- Lock Wallet
        SELECT * INTO v_wallet FROM wallets WHERE store_id = v_req.store_id::text FOR UPDATE;

        -- Update Balance
        UPDATE wallets
        SET balance = balance + v_req.amount,
            updated_at = NOW()
        WHERE store_id = v_req.store_id::text;

        -- Log Transaction
        INSERT INTO wallet_transactions (store_id, wallet_id, type, amount, reference_id, description)
        VALUES (
            v_req.store_id::text, 
            v_wallet.id,
            'recharge', 
            v_req.amount, 
            'UTR_' || v_req.utr_number, 
            'Wallet Recharge (UTR: ' || v_req.utr_number || ')'
        );

        -- Also auto-activate the store if balance is now healthy
        IF (v_wallet.balance + v_req.amount) > -1000 THEN
            UPDATE stores SET is_active = true WHERE id = v_req.store_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- END OF FILE
