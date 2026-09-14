-- RPC function to aggregate platform wallet totals safely on the database side
CREATE OR REPLACE FUNCTION get_platform_wallet_totals()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_balance', COALESCE(SUM(balance), 0),
        'total_commission_paid', COALESCE(SUM(total_commission_paid), 0)
    )
    INTO result
    FROM wallets;
    
    RETURN result;
END;
$$;
