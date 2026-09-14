-- ==============================================================================
-- VyaparPe V6 Atomic Tenant Provisioning
-- ==============================================================================

-- Drops the function if it exists so we can recreate it
DROP FUNCTION IF EXISTS provision_new_tenant(TEXT, TEXT, TEXT, TEXT, UUID, NUMERIC);

-- Make owner_phone nullable to support 'email_only' auth mode
ALTER TABLE stores ALTER COLUMN owner_phone DROP NOT NULL;

-- Atomic Provisioning RPC
-- This function wraps the creation of the store, settings, and wallet into a single atomic transaction.
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
BEGIN
    -- 1. Insert Store
    INSERT INTO stores (
        name,
        subdomain,
        owner_phone,
        owner_email,
        status,
        plan_id,
        commission_rate
    ) VALUES (
        p_name,
        p_subdomain,
        p_owner_phone,
        p_owner_email,
        'active',
        p_plan_id,
        p_commission_rate
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

    -- Return the newly created store ID
    RETURN v_store_id;
EXCEPTION WHEN OTHERS THEN
    -- If anything fails, Postgres automatically rolls back the entire transaction.
    RAISE;
END;
$$ LANGUAGE plpgsql;
