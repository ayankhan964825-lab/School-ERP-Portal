
-- ============================
-- migration_v33_activity_logs_store_id.sql
-- ============================

-- Migration V33: Secure Activity Logs for Multi-Tenancy
-- Adds store_id to activity logs to prevent cross-tenant data leakage.

BEGIN;

-- 1. Add store_id to activity_logs (if it is a table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs' AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
    ALTER TABLE public.activity_logs 
    ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES stores(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_activity_logs_store_id ON public.activity_logs(store_id);
  END IF;
END $$;

-- 2. Add store_id to admin_activity_logs (in case activity_logs is a view over it)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_logs' AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
    ALTER TABLE public.admin_activity_logs 
    ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES stores(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_store_id ON public.admin_activity_logs(store_id);
  END IF;
END $$;

-- 3. Add store_id to super_admin_activity_logs (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'super_admin_activity_logs' AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
    ALTER TABLE public.super_admin_activity_logs 
    ADD COLUMN IF NOT EXISTS store_id UUID DEFAULT '00000000-0000-0000-0000-000000000002' REFERENCES stores(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_super_admin_activity_logs_store_id ON public.super_admin_activity_logs(store_id);
  END IF;
END $$;

-- 4. Recreate the activity_logs VIEW only if it is already a view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs' AND table_schema = 'public' AND table_type = 'VIEW') THEN
    EXECUTE 'DROP VIEW IF EXISTS public.activity_logs;';
    EXECUTE 'CREATE VIEW public.activity_logs AS SELECT * FROM public.admin_activity_logs;';
  END IF;
END $$;

COMMIT;


-- ============================
-- migration_v34_restore_rpc_tenant_isolation.sql
-- ============================

-- ==============================================================================
-- MIGRATION: v34 - Restore RPC Tenant Isolation
-- Description: Re-introduces p_store_id parameter to all critical RPCs
-- ==============================================================================

-- 1. atomic_update_order_status
DROP FUNCTION IF EXISTS atomic_update_order_status(text, text, boolean);

CREATE OR REPLACE FUNCTION atomic_update_order_status(
    p_order_id TEXT,
    p_new_status TEXT,
    p_store_id UUID,
    p_skip_inventory BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_is_old_cancelled BOOLEAN;
    v_is_new_cancelled BOOLEAN;
    v_code TEXT;
    v_mapped_items JSONB;
BEGIN
    SELECT * INTO v_order 
    FROM orders 
    WHERE order_id = p_order_id AND store_id = p_store_id
    FOR UPDATE LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found or access denied');
    END IF;

    v_is_old_cancelled := v_order.status IN ('cancelled', 'returned', 'rto');
    v_is_new_cancelled := p_new_status IN ('cancelled', 'returned', 'rto');

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(elem->>'product_id', split_part(elem->>'id', '-', 1)),
            'variant', elem->>'variant_name',
            'isB2B', COALESCE((elem->>'isB2B')::BOOLEAN, false),
            'quantity', (elem->>'quantity')::INTEGER,
            'isFlashSale', COALESCE((elem->>'isFlashSale')::BOOLEAN, false),
            'product_name', COALESCE(elem->>'product_name', '')
        )
    ) INTO v_mapped_items
    FROM jsonb_array_elements(v_order.items) AS elem;

    IF v_mapped_items IS NULL THEN
        v_mapped_items := '[]'::JSONB;
    END IF;

    IF NOT v_is_old_cancelled AND v_is_new_cancelled THEN
        -- ACTIVE -> CANCELLED
        PERFORM atomic_restore_order_inventory(v_mapped_items);
        PERFORM atomic_restore_flash_sale_inventory(v_mapped_items);

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN
                    PERFORM atomic_increment_coupon_usage(v_code, p_store_id, -1);
                END IF;
            END LOOP;
        END IF;

    ELSIF v_is_old_cancelled AND NOT v_is_new_cancelled THEN
        -- CANCELLED -> ACTIVE
        PERFORM atomic_process_order_inventory(v_mapped_items, p_store_id, true, p_skip_inventory);
        PERFORM atomic_process_flash_sale_inventory(v_mapped_items);

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN
                    PERFORM atomic_increment_coupon_usage(v_code, p_store_id, 1);
                END IF;
            END LOOP;
        END IF;
    END IF;

    UPDATE orders 
    SET status = p_new_status, updated_at = NOW() 
    WHERE order_id = p_order_id AND store_id = p_store_id;

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'old_status', v_order.status, 'new_status', p_new_status);
END;
$$;


-- 2. atomic_increment_coupon_usage
DROP FUNCTION IF EXISTS atomic_increment_coupon_usage(text, integer);

CREATE OR REPLACE FUNCTION atomic_increment_coupon_usage(p_code TEXT, p_store_id UUID, p_delta INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE coupons
    SET used_count = GREATEST(0, COALESCE(used_count, 0) + p_delta)
    WHERE code = p_code AND store_id = p_store_id;
END;
$$;


-- 3. increment_affiliate_earnings
DROP FUNCTION IF EXISTS increment_affiliate_earnings(text, numeric);
DROP FUNCTION IF EXISTS increment_affiliate_earnings(uuid, numeric);

CREATE OR REPLACE FUNCTION increment_affiliate_earnings(p_aff_id TEXT, p_store_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE affiliates
    SET total_earnings = COALESCE(total_earnings, 0) + p_amount
    WHERE id = p_aff_id AND store_id = p_store_id;
END;
$$;


-- 4. increment_flash_sale_stock
DROP FUNCTION IF EXISTS increment_flash_sale_stock(text, integer);

CREATE OR REPLACE FUNCTION increment_flash_sale_stock(p_product_name TEXT, p_store_id UUID, p_qty INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE flash_sales
    SET sold_stock = COALESCE(sold_stock, 0) + p_qty
    WHERE product = p_product_name
      AND store_id = p_store_id
      AND stock_type = 'real'
      AND end_date > NOW();
END;
$$;


-- 5. increment_flash_sale_sold_stock
DROP FUNCTION IF EXISTS increment_flash_sale_sold_stock(text, text, integer);

CREATE OR REPLACE FUNCTION increment_flash_sale_sold_stock(p_product_id TEXT, p_store_id UUID, p_variant_name TEXT DEFAULT NULL, p_qty INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE flash_sales
    SET sold_stock = GREATEST(0, COALESCE(sold_stock, 0) + p_qty)
    WHERE product = (SELECT title FROM products WHERE id = p_product_id LIMIT 1)
      AND store_id = p_store_id
      AND stock_type = 'real'
      AND end_date > NOW();
END;
$$;


-- 6. decrement_variant_stock
DROP FUNCTION IF EXISTS decrement_variant_stock(uuid, text, integer);

CREATE OR REPLACE FUNCTION decrement_variant_stock(p_product_id UUID, p_variant_name TEXT, p_store_id UUID, p_qty INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE product_variants
    SET stock = stock - p_qty
    WHERE product_id = p_product_id::text AND name = p_variant_name AND store_id = p_store_id;
END;
$$;


-- 7. decrement_product_stock
DROP FUNCTION IF EXISTS decrement_product_stock(uuid, integer);

CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID, p_store_id UUID, p_qty INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE product_variants
    SET stock = stock - p_qty
    WHERE product_id = p_product_id::text AND name = 'Default' AND store_id = p_store_id;
END;
$$;


-- 8. atomic_process_order_inventory (Overloaded internally)
DROP FUNCTION IF EXISTS atomic_process_order_inventory(jsonb, boolean, boolean);

CREATE OR REPLACE FUNCTION atomic_process_order_inventory(
    p_items JSONB,
    p_store_id UUID,
    p_allow_negative_stock BOOLEAN DEFAULT false,
    p_skip_deduction BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
    v_product_id TEXT;
    v_variant_name TEXT;
    v_quantity INTEGER;
    v_is_b2b BOOLEAN;
    v_variant_id UUID;
    v_current_stock INTEGER;
    v_location_id UUID;
    v_location_available INTEGER;
BEGIN
    FOR v_item IN 
        SELECT * FROM jsonb_array_elements(p_items) AS elem
        ORDER BY COALESCE(elem->>'location_id', '') ASC, elem->>'id' ASC, COALESCE(elem->>'variant', '') ASC
    LOOP
        v_product_id := v_item->>'id';
        v_variant_name := v_item->>'variant';
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        IF (v_item->>'isB2B') = 'true' THEN
            v_is_b2b := true;
        ELSIF (v_item->>'isB2B') = 'false' THEN
            v_is_b2b := false;
        ELSE
            v_is_b2b := COALESCE((v_item->>'isB2B')::BOOLEAN, false);
        END IF;

        IF v_variant_name IS NULL OR v_variant_name = '' THEN
            SELECT id, stock INTO v_variant_id, v_current_stock
            FROM product_variants
            WHERE product_id = v_product_id AND is_b2b = v_is_b2b AND store_id = p_store_id
            ORDER BY created_at ASC LIMIT 1
            FOR UPDATE;
        ELSE
            SELECT id, stock INTO v_variant_id, v_current_stock
            FROM product_variants
            WHERE product_id = v_product_id AND name = v_variant_name AND is_b2b = v_is_b2b AND store_id = p_store_id
            FOR UPDATE;
        END IF;

        IF NOT FOUND THEN
            IF p_allow_negative_stock THEN
                CONTINUE; 
            ELSE
                RAISE EXCEPTION 'Product variant not found or access denied: % - %', v_product_id, v_variant_name;
            END IF;
        END IF;

        IF v_current_stock < v_quantity AND NOT p_allow_negative_stock THEN
            RAISE EXCEPTION 'Insufficient stock for product % variant %. Global Available: %, Requested: %', 
                v_product_id, v_variant_name, v_current_stock, v_quantity;
        END IF;

        IF v_item->>'location_id' IS NOT NULL THEN
            v_location_id := (v_item->>'location_id')::UUID;
        ELSE
            SELECT id INTO v_location_id
            FROM locations 
            WHERE store_id = p_store_id AND is_default = true
            LIMIT 1;
        END IF;

        SELECT available INTO v_location_available
        FROM inventory_levels
        WHERE variant_id = v_variant_id AND location_id = v_location_id
        FOR UPDATE;

        IF NOT FOUND THEN
            IF p_allow_negative_stock THEN
                INSERT INTO inventory_levels (variant_id, location_id, store_id, available, committed)
                VALUES (v_variant_id, v_location_id, p_store_id, 0, 0)
                ON CONFLICT DO NOTHING;
                v_location_available := 0;
            ELSE
                RAISE EXCEPTION 'Inventory level not found for variant %, location %', v_variant_id, v_location_id;
            END IF;
        END IF;

        IF v_location_available < v_quantity AND NOT p_allow_negative_stock THEN
            RAISE EXCEPTION 'Insufficient stock. Location Available: %, Requested: %', v_location_available, v_quantity;
        END IF;

        IF NOT p_skip_deduction THEN
            UPDATE product_variants
            SET stock = stock - v_quantity
            WHERE id = v_variant_id AND store_id = p_store_id;

            UPDATE inventory_levels
            SET available = available - v_quantity
            WHERE variant_id = v_variant_id AND location_id = v_location_id;
        END IF;

    END LOOP;
END;
$$;


-- ============================
-- migration_v35_final_rpc_isolation.sql
-- ============================

-- ==============================================================================
-- MIGRATION: v35 Final RPC Isolation (Pass 3)
-- DESCRIPTION: Enforces p_store_id across all remaining secondary RPCs to 
-- guarantee zero cross-tenant data modification leaks.
-- ==============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. Drop old insecure signatures
-- ═══════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS atomic_restore_order_inventory(JSONB);
DROP FUNCTION IF EXISTS increment_flash_sale_stock(TEXT, INTEGER);
DROP FUNCTION IF EXISTS atomic_process_flash_sale_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_restore_flash_sale_inventory(JSONB);
DROP FUNCTION IF EXISTS atomic_confirm_payment(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS atomic_update_order_status(TEXT, TEXT, UUID, BOOLEAN);

-- ═══════════════════════════════════════════════════════════
-- 2. Secure atomic_restore_order_inventory
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_restore_order_inventory(p_items JSONB, p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
    v_product_id TEXT;
    v_variant_name TEXT;
    v_quantity INTEGER;
    v_is_b2b BOOLEAN;
    v_variant_id UUID;
BEGIN
    FOR v_item IN 
        SELECT * FROM jsonb_array_elements(p_items) AS elem
        ORDER BY elem->>'id' ASC, COALESCE(elem->>'variant', '') ASC
    LOOP
        v_product_id := v_item->>'id';
        v_variant_name := v_item->>'variant';
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        IF (v_item->>'isB2B') = 'true' THEN
            v_is_b2b := true;
        ELSIF (v_item->>'isB2B') = 'false' THEN
            v_is_b2b := false;
        ELSE
            v_is_b2b := COALESCE((v_item->>'isB2B')::BOOLEAN, false);
        END IF;

        IF v_variant_name IS NULL OR v_variant_name = '' THEN
            SELECT pv.id INTO v_variant_id
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE p.store_id = p_store_id AND pv.product_id = v_product_id AND pv.is_b2b = v_is_b2b
            ORDER BY pv.created_at ASC LIMIT 1
            FOR UPDATE;
        ELSE
            SELECT pv.id INTO v_variant_id
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE p.store_id = p_store_id AND pv.product_id = v_product_id AND pv.name = v_variant_name AND pv.is_b2b = v_is_b2b
            FOR UPDATE;
        END IF;

        IF FOUND THEN
            UPDATE product_variants
            SET stock = stock + v_quantity
            WHERE id = v_variant_id;
        END IF;
    END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 3. Secure increment_flash_sale_stock
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_flash_sale_stock(p_product_name TEXT, p_qty INTEGER, p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE flash_sales
    SET sold_stock = COALESCE(sold_stock, 0) + p_qty
    WHERE product = p_product_name
      AND store_id = p_store_id
      AND stock_type = 'real'
      AND end_date > NOW();
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 4. Secure atomic_process_flash_sale_inventory
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_process_flash_sale_inventory(p_items JSONB, p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
    v_total_stock INTEGER;
    v_sold_stock INTEGER;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'isFlashSale')::BOOLEAN = true THEN
            -- Lock row and check limits
            SELECT total_stock, sold_stock INTO v_total_stock, v_sold_stock
            FROM flash_sales
            WHERE product = v_item->>'product_name'
              AND store_id = p_store_id
              AND stock_type = 'real'
              AND end_date > NOW()
            FOR UPDATE LIMIT 1;
            
            IF FOUND THEN
                IF v_sold_stock + (v_item->>'quantity')::INTEGER > v_total_stock THEN
                    RAISE EXCEPTION 'Flash sale stock exceeded for %', v_item->>'product_name';
                END IF;

                UPDATE flash_sales
                SET sold_stock = COALESCE(sold_stock, 0) + (v_item->>'quantity')::INTEGER
                WHERE product = v_item->>'product_name' AND store_id = p_store_id AND stock_type = 'real';
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 5. Secure atomic_restore_flash_sale_inventory
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_restore_flash_sale_inventory(p_items JSONB, p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'isFlashSale')::BOOLEAN = true THEN
            UPDATE flash_sales
            SET sold_stock = GREATEST(0, COALESCE(sold_stock, 0) - (v_item->>'quantity')::INTEGER)
            WHERE product = v_item->>'product_name'
              AND store_id = p_store_id
              AND stock_type = 'real';
        END IF;
    END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 6. Secure atomic_confirm_payment
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_confirm_payment(
  p_lookup_id TEXT,
  p_razorpay_payment_id TEXT,
  p_skip_deduction BOOLEAN,
  p_store_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_master_order RECORD;
  v_sub_order RECORD;
  v_mapped_items JSONB;
  v_all_items JSONB = '[]'::JSONB;
  v_all_coupons TEXT[] = '{}';
  v_code TEXT;
BEGIN
  -- A. Idempotency Check & Lock with store_id boundaries
  SELECT * INTO v_master_order 
  FROM master_orders 
  WHERE store_id = p_store_id AND (payment_id = p_lookup_id OR display_id = p_lookup_id)
  FOR UPDATE LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found for ID: %', p_lookup_id;
  END IF;

  IF v_master_order.payment_status = 'paid' THEN
    -- Already paid, idempotent return
    RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', v_master_order.display_id);
  END IF;

  -- B. Gather all items and coupons autonomously from orders
  FOR v_sub_order IN SELECT * FROM orders WHERE master_order_id = v_master_order.id AND store_id = p_store_id
  LOOP
      -- Aggregate items with proper mapping
      SELECT jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(elem->>'product_id', split_part(elem->>'id', '-', 1)),
            'variant', elem->>'variant_name',
            'isB2B', COALESCE((elem->>'isB2B')::BOOLEAN, false),
            'quantity', (elem->>'quantity')::INTEGER,
            'isFlashSale', COALESCE((elem->>'isFlashSale')::BOOLEAN, false),
            'product_name', COALESCE(elem->>'product_name', '')
        )
      ) INTO v_mapped_items
      FROM jsonb_array_elements(v_sub_order.items) AS elem;
      
      IF v_mapped_items IS NOT NULL THEN
          v_all_items := v_all_items || v_mapped_items;
      END IF;
      
      -- Extract coupons
      IF v_sub_order.coupon_code IS NOT NULL AND v_sub_order.coupon_code != '' THEN
          FOR v_code IN SELECT trim(unnest(string_to_array(v_sub_order.coupon_code, ','))) LOOP
              IF v_code != '' THEN
                  v_all_coupons := array_append(v_all_coupons, v_code);
              END IF;
          END LOOP;
      END IF;
  END LOOP;

  -- C. Update master_orders
  UPDATE master_orders
  SET payment_status = 'paid', payment_id = COALESCE(p_razorpay_payment_id, payment_id)
  WHERE id = v_master_order.id AND store_id = p_store_id;

  -- D. Update sub-orders
  UPDATE orders
  SET payment_status = 'paid', status = 'confirmed', razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_order_id)
  WHERE master_order_id = v_master_order.id AND store_id = p_store_id;

  -- E. Deduct Inventory (Passing p_store_id down!)
  IF jsonb_array_length(v_all_items) > 0 THEN
    PERFORM atomic_process_order_inventory(v_all_items, p_store_id, true, p_skip_deduction);
    PERFORM atomic_process_flash_sale_inventory(v_all_items, p_store_id);
  END IF;

  -- F. Increment Coupons (Passing p_store_id down!)
  IF array_length(v_all_coupons, 1) > 0 THEN
    FOREACH v_code IN ARRAY v_all_coupons LOOP
      PERFORM atomic_increment_coupon_usage(v_code, p_store_id, 1);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'already_paid', false, 'order_id', v_master_order.display_id, 'master_id', v_master_order.id);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- 7. Secure atomic_update_order_status
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION atomic_update_order_status(
    p_order_id TEXT,
    p_new_status TEXT,
    p_store_id UUID,
    p_skip_inventory BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_is_old_cancelled BOOLEAN;
    v_is_new_cancelled BOOLEAN;
    v_code TEXT;
    v_mapped_items JSONB;
BEGIN
    SELECT * INTO v_order 
    FROM orders 
    WHERE order_id = p_order_id AND store_id = p_store_id
    FOR UPDATE LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found or access denied');
    END IF;

    v_is_old_cancelled := v_order.status IN ('cancelled', 'returned', 'rto');
    v_is_new_cancelled := p_new_status IN ('cancelled', 'returned', 'rto');

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(elem->>'product_id', split_part(elem->>'id', '-', 1)),
            'variant', elem->>'variant_name',
            'isB2B', COALESCE((elem->>'isB2B')::BOOLEAN, false),
            'quantity', (elem->>'quantity')::INTEGER,
            'isFlashSale', COALESCE((elem->>'isFlashSale')::BOOLEAN, false),
            'product_name', COALESCE(elem->>'product_name', '')
        )
    ) INTO v_mapped_items
    FROM jsonb_array_elements(v_order.items) AS elem;

    IF v_mapped_items IS NULL THEN
        v_mapped_items := '[]'::JSONB;
    END IF;

    IF NOT v_is_old_cancelled AND v_is_new_cancelled THEN
        -- ACTIVE -> CANCELLED
        PERFORM atomic_restore_order_inventory(v_mapped_items, p_store_id);
        PERFORM atomic_restore_flash_sale_inventory(v_mapped_items, p_store_id);

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN
                    PERFORM atomic_increment_coupon_usage(v_code, p_store_id, -1);
                END IF;
            END LOOP;
        END IF;

    ELSIF v_is_old_cancelled AND NOT v_is_new_cancelled THEN
        -- CANCELLED -> ACTIVE
        PERFORM atomic_process_order_inventory(v_mapped_items, p_store_id, true, p_skip_inventory);
        PERFORM atomic_process_flash_sale_inventory(v_mapped_items, p_store_id);

        IF v_order.coupon_code IS NOT NULL AND v_order.coupon_code != '' THEN
            FOR v_code IN SELECT trim(unnest(string_to_array(v_order.coupon_code, ','))) LOOP
                IF v_code != '' THEN
                    PERFORM atomic_increment_coupon_usage(v_code, p_store_id, 1);
                END IF;
            END LOOP;
        END IF;
    END IF;

    UPDATE orders 
    SET status = p_new_status, updated_at = NOW() 
    WHERE order_id = p_order_id AND store_id = p_store_id;

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'old_status', v_order.status, 'new_status', p_new_status);
END;
$$;

COMMIT;


-- ============================
-- migration_v36_checkout_isolation.sql
-- ============================

-- ==============================================================================
-- MIGRATION: v36 Checkout Reservations BOLA Fix (Pass 4)
-- DESCRIPTION: Prevents malicious tenants from locking competitor inventory 
-- by ensuring reserved variants belong strictly to the provided p_store_id.
-- ==============================================================================

BEGIN;

-- 1. Drop old unsecured function
DROP FUNCTION IF EXISTS atomic_create_checkout_reservations(TEXT, JSONB, INTEGER);
DROP FUNCTION IF EXISTS atomic_create_checkout_reservations(TEXT, JSONB);

-- 2. Create secured function
CREATE OR REPLACE FUNCTION atomic_create_checkout_reservations(
    p_checkout_id TEXT,
    p_items JSONB,
    p_store_id UUID,
    p_expires_in_minutes INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_variant_id UUID;
    v_location_id UUID;
    v_qty INTEGER;
    v_available INTEGER;
    v_active_reservations INTEGER;
    v_track_inventory BOOLEAN;
BEGIN
    -- Delete existing reservations for this checkout to allow retry
    DELETE FROM checkout_reservations WHERE checkout_id = p_checkout_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_location_id := (v_item->>'location_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;
        v_track_inventory := COALESCE((v_item->>'track_inventory')::BOOLEAN, true);

        IF v_track_inventory THEN
            -- SECURITY: Validate that the variant actually belongs to the requesting tenant
            PERFORM 1 FROM product_variants pv 
            JOIN products p ON p.id = pv.product_id
            WHERE pv.id = v_variant_id AND p.store_id = p_store_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Variant % does not belong to store %', v_variant_id, p_store_id;
            END IF;

            -- Check true availability (Raw Stock - Active Reservations)
            SELECT COALESCE(available, 0) INTO v_available
            FROM inventory_levels
            WHERE variant_id = v_variant_id AND location_id IS NOT DISTINCT FROM v_location_id
            FOR UPDATE;

            SELECT COALESCE(SUM(quantity), 0) INTO v_active_reservations
            FROM checkout_reservations
            WHERE variant_id = v_variant_id 
              AND location_id IS NOT DISTINCT FROM v_location_id 
              AND expires_at > NOW();

            IF (v_available - v_active_reservations) < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock for variant % at location %', v_variant_id, v_location_id;
            END IF;
            
            INSERT INTO checkout_reservations (checkout_id, variant_id, location_id, quantity, expires_at)
            VALUES (p_checkout_id, v_variant_id, v_location_id, v_qty, NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL);
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

COMMIT;

