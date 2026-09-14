-- migration_v41_fix_atomic_flash_sale.sql
-- Fixes cross-variant stock corruption in atomic checkout RPCs

DROP FUNCTION IF EXISTS atomic_process_flash_sale_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_process_flash_sale_inventory(JSONB, UUID);

-- 1. SECURE: atomic_process_flash_sale_inventory
CREATE OR REPLACE FUNCTION atomic_process_flash_sale_inventory(p_items JSONB, p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
    v_total_stock INTEGER;
    v_sold_stock INTEGER;
    v_variant_name TEXT;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'isFlashSale')::BOOLEAN = true THEN
            v_variant_name := COALESCE(v_item->>'variant', v_item->>'variant_name');
            
            -- Lock row and check limits
            SELECT total_stock, sold_stock INTO v_total_stock, v_sold_stock
            FROM flash_sales
            WHERE product = v_item->>'product_name'
              AND store_id = p_store_id
              AND (
                  variant = v_variant_name 
                  OR variant = 'all' 
                  OR variant IS NULL 
                  OR variant = ''
                  OR v_variant_name IS NULL
              )
              AND stock_type = 'real'
              AND end_date > NOW()
            FOR UPDATE LIMIT 1;
            
            IF FOUND THEN
                IF v_sold_stock + (v_item->>'quantity')::INTEGER > v_total_stock THEN
                    RAISE EXCEPTION 'Flash sale stock exceeded for % (Variant: %)', v_item->>'product_name', COALESCE(v_variant_name, 'all');
                END IF;

                UPDATE flash_sales
                SET sold_stock = COALESCE(sold_stock, 0) + (v_item->>'quantity')::INTEGER
                WHERE product = v_item->>'product_name' 
                  AND store_id = p_store_id 
                  AND (
                      variant = v_variant_name 
                      OR variant = 'all' 
                      OR variant IS NULL 
                      OR variant = ''
                      OR v_variant_name IS NULL
                  )
                  AND stock_type = 'real';
            END IF;
        END IF;
    END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS atomic_restore_flash_sale_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_restore_flash_sale_inventory(JSONB, UUID);

-- 2. SECURE: atomic_restore_flash_sale_inventory
CREATE OR REPLACE FUNCTION atomic_restore_flash_sale_inventory(p_items JSONB, p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
    v_variant_name TEXT;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'isFlashSale')::BOOLEAN = true THEN
            v_variant_name := COALESCE(v_item->>'variant', v_item->>'variant_name');
            
            UPDATE flash_sales
            SET sold_stock = GREATEST(0, COALESCE(sold_stock, 0) - (v_item->>'quantity')::INTEGER)
            WHERE product = v_item->>'product_name' 
              AND store_id = p_store_id 
              AND (
                  variant = v_variant_name 
                  OR variant = 'all' 
                  OR variant IS NULL 
                  OR variant = ''
                  OR v_variant_name IS NULL
              )
              AND stock_type = 'real';
        END IF;
    END LOOP;
END;
$$;
