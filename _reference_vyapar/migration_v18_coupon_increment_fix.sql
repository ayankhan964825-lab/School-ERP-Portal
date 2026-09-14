-- ==============================================================================
-- V18 MASTER AUDIT FIXES: GLOBAL COUPON USAGE INCREMENT
-- ==============================================================================
-- Run this ENTIRE script in Supabase SQL Editor.
-- 
-- DESCRIPTION:
-- Fixes an issue where global (marketplace) coupons with `store_id IS NULL`
-- failed to increment their usage limit because the RPC was enforcing strict
-- `store_id` equality. Now handles both store-scoped and global coupons.
-- ==============================================================================

CREATE OR REPLACE FUNCTION atomic_increment_coupon_usage(p_code TEXT, p_store_id UUID, p_delta INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_usage_limit INTEGER;
    v_used_count INTEGER;
BEGIN
    SELECT usage_limit, used_count INTO v_usage_limit, v_used_count
    FROM coupons
    WHERE code = p_code AND (store_id = p_store_id OR store_id IS NULL)
    FOR UPDATE LIMIT 1;
    
    IF FOUND THEN
        IF p_delta > 0 AND v_usage_limit IS NOT NULL AND v_used_count + p_delta > v_usage_limit THEN
            RAISE EXCEPTION 'Coupon % usage limit exceeded', p_code;
        END IF;

        UPDATE coupons
        SET used_count = COALESCE(used_count, 0) + p_delta,
            updated_at = NOW()
        WHERE code = p_code AND (store_id = p_store_id OR store_id IS NULL);
    END IF;
END;
$$;
