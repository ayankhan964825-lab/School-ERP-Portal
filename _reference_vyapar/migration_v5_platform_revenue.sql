-- Migration V5: Platform Revenue RPC
-- Creates an RPC function to efficiently sum total platform revenue across all stores

CREATE OR REPLACE FUNCTION get_platform_total_revenue()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total
  FROM orders
  WHERE status != 'cancelled';
  
  RETURN total;
END;
$$;
