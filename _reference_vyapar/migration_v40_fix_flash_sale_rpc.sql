-- migration_v40_fix_flash_sale_rpc.sql
-- Fixes cross-variant stock corruption in flash sales

DROP FUNCTION IF EXISTS increment_flash_sale_stock(TEXT, INTEGER, UUID);
DROP FUNCTION IF EXISTS increment_flash_sale_stock(TEXT, INTEGER, UUID, TEXT);

-- SECURE: increment_flash_sale_stock with variant isolation
CREATE OR REPLACE FUNCTION increment_flash_sale_stock(p_product_name TEXT, p_qty INTEGER, p_store_id UUID, p_variant_name TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
    UPDATE flash_sales
    SET sold_stock = COALESCE(sold_stock, 0) + p_qty
    WHERE product = p_product_name
      AND store_id = p_store_id
      AND (
          variant = p_variant_name 
          OR variant = 'all' 
          OR variant IS NULL 
          OR variant = ''
          OR p_variant_name IS NULL
      )
      AND stock_type = 'real'
      AND end_date > NOW();
END;
$$ LANGUAGE plpgsql;
