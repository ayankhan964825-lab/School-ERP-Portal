-- ==============================================================================
-- VyaparPe V7 SaaS Billing Engine
-- ==============================================================================

-- 1. Add next_billing_date to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;

-- Initialize existing active stores next_billing_date if null (give them 30 days from now)
UPDATE stores SET next_billing_date = now() + interval '30 days' WHERE next_billing_date IS NULL AND status = 'active';

-- 2. Update wallet_transactions constraint to allow 'subscription_fee'
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
  CHECK (type IN ('cod_credit', 'prepaid_credit', 'commission_debit', 'shipping_debit', 'payout', 'adjustment', 'subscription_fee'));

-- 3. Update provision_new_tenant to set next_billing_date
DROP FUNCTION IF EXISTS provision_new_tenant(TEXT, TEXT, TEXT, TEXT, UUID, NUMERIC);
CREATE OR REPLACE FUNCTION provision_new_tenant(
    p_name TEXT,
    p_subdomain TEXT,
    p_owner_phone TEXT,
    p_owner_email TEXT,
    p_plan_id UUID,
    p_commission_rate NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_store_id UUID;
    v_next_billing_date TIMESTAMPTZ;
BEGIN
    -- Determine initial billing cycle (30 days from now)
    v_next_billing_date := now() + interval '30 days';

    -- 1. Insert Store
    INSERT INTO stores (
        name,
        subdomain,
        owner_phone,
        owner_email,
        status,
        plan_id,
        commission_rate,
        next_billing_date
    ) VALUES (
        p_name,
        p_subdomain,
        p_owner_phone,
        p_owner_email,
        'active',
        p_plan_id,
        p_commission_rate,
        v_next_billing_date
    ) RETURNING id INTO v_store_id;

    -- 2. Insert Settings
    INSERT INTO settings (
        store_id,
        store_name,
        currency,
        allow_overselling
    ) VALUES (
        v_store_id,
        p_name,
        'INR',
        false
    );

    -- 3. Insert Wallet
    INSERT INTO wallets (
        store_id,
        balance,
        total_earned,
        total_commission_paid,
        total_payouts
    ) VALUES (
        v_store_id,
        0,
        0,
        0,
        0
    );

    RETURN v_store_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the Daily Billing Engine RPC
CREATE OR REPLACE FUNCTION process_daily_billing()
RETURNS JSONB AS $$
DECLARE
    store_record RECORD;
    v_fee NUMERIC;
    v_wallet_id UUID;
    v_current_balance NUMERIC;
    v_processed_count INTEGER := 0;
BEGIN
    -- Loop over all active stores whose billing date is due
    FOR store_record IN 
        SELECT s.id as store_id, s.name, s.next_billing_date, p.price_monthly, p.price_yearly, p.plan_type
        FROM stores s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.status = 'active' 
          AND s.next_billing_date <= now()
          AND p.plan_type IN ('monthly', 'yearly')
    LOOP
        -- Determine the fee based on plan type
        IF store_record.plan_type = 'monthly' THEN
            v_fee := COALESCE(store_record.price_monthly, 0);
        ELSIF store_record.plan_type = 'yearly' THEN
            v_fee := COALESCE(store_record.price_yearly, 0);
        ELSE
            v_fee := 0;
        END IF;

        IF v_fee > 0 THEN
            -- Lock wallet to prevent race conditions
            SELECT id, balance INTO v_wallet_id, v_current_balance
            FROM wallets
            WHERE store_id = store_record.store_id
            FOR UPDATE;

            -- Deduct fee from wallet
            UPDATE wallets
            SET balance = balance - v_fee
            WHERE id = v_wallet_id;

            -- Record the transaction
            INSERT INTO wallet_transactions (
                wallet_id,
                store_id,
                amount,
                type,
                description
            ) VALUES (
                v_wallet_id,
                store_record.store_id,
                v_fee,
                'subscription_fee',
                'SaaS Subscription Fee Deduction'
            );
        END IF;

        -- Advance the next_billing_date
        IF store_record.plan_type = 'monthly' THEN
            UPDATE stores SET next_billing_date = next_billing_date + interval '1 month' WHERE id = store_record.store_id;
        ELSIF store_record.plan_type = 'yearly' THEN
            UPDATE stores SET next_billing_date = next_billing_date + interval '1 year' WHERE id = store_record.store_id;
        END IF;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'message', 'Daily billing processed successfully'
    );
EXCEPTION WHEN OTHERS THEN
    -- Rollback everything if an error occurs mid-loop
    RAISE;
END;
$$ LANGUAGE plpgsql;
