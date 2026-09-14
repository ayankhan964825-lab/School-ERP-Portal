CREATE OR REPLACE FUNCTION increment_flash_sale_stock(p_product_name text, p_qty int)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE flash_sales
    SET sold_stock = COALESCE(sold_stock, 0) + p_qty
    WHERE product = p_product_name
      AND stock_type = 'real'
      AND end_date > NOW();
END;
$$;
