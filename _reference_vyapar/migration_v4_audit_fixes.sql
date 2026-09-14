-- ==========================================
-- VyaparPe Migration v4 - System Audit Fixes
-- ==========================================
-- Run this script in the Supabase SQL Editor.
-- Fixes OTP Rate Limiting and Variant Inventory Locking Flaws.

-- 1. Create OTP Rate Limiting Table
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  identifier TEXT PRIMARY KEY,               -- Phone number or Email
  requests_count INTEGER DEFAULT 1,          -- Number of requests
  reset_time TIMESTAMPTZ NOT NULL,           -- When the limit resets
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: We add an index on reset_time to quickly clean up expired rows
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_reset_time ON auth_rate_limits(reset_time);

-- 2. Create Normalized Product Variants Table (CRITICAL: Fixes JSONB Lock Flaw)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,                  -- Links to products.id
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,                        -- e.g. "Size L", "250g"
  weight TEXT,                               -- Specific weight
  price NUMERIC NOT NULL,                    -- Variant price
  original_price NUMERIC,                    -- MRP
  stock INTEGER DEFAULT 0,                   -- True row-level locked stock
  sku TEXT,                                  -- Variant SKU
  is_b2b BOOLEAN DEFAULT false,              -- Whether this is a bulk B2B variant
  image TEXT,                                -- Variant specific image
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_store_id ON product_variants(store_id);

-- Enable RLS on the new table
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- 3. SQL Function to Migrate Existing JSONB Variants into New Table
CREATE OR REPLACE FUNCTION migrate_jsonb_variants() RETURNS VOID AS $$
DECLARE
  v_prod RECORD;
  v_variant JSONB;
BEGIN
  -- Loop through all existing products
  FOR v_prod IN SELECT id, store_id, variants, b2b_variants FROM products
  LOOP
    -- Insert B2C variants
    IF v_prod.variants IS NOT NULL THEN
      FOR v_variant IN SELECT * FROM jsonb_array_elements(v_prod.variants)
      LOOP
        INSERT INTO product_variants (product_id, store_id, name, weight, price, original_price, stock, sku, is_b2b)
        VALUES (
          v_prod.id, 
          v_prod.store_id, 
          COALESCE(v_variant->>'name', 'Default'), 
          v_variant->>'weight', 
          COALESCE((v_variant->>'price')::NUMERIC, 0), 
          (v_variant->>'originalPrice')::NUMERIC, 
          COALESCE((v_variant->>'stock')::INTEGER, 0), 
          v_variant->>'sku', 
          false
        );
      END LOOP;
    END IF;

    -- Insert B2B variants
    IF v_prod.b2b_variants IS NOT NULL THEN
      FOR v_variant IN SELECT * FROM jsonb_array_elements(v_prod.b2b_variants)
      LOOP
        INSERT INTO product_variants (product_id, store_id, name, weight, price, original_price, stock, sku, is_b2b)
        VALUES (
          v_prod.id, 
          v_prod.store_id, 
          COALESCE(v_variant->>'name', 'Default'), 
          v_variant->>'weight', 
          COALESCE((v_variant->>'price')::NUMERIC, 0), 
          (v_variant->>'originalPrice')::NUMERIC, 
          COALESCE((v_variant->>'stock')::INTEGER, 0), 
          v_variant->>'sku', 
          true
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Uncomment and run this ONCE to migrate data:
-- SELECT migrate_jsonb_variants();

-- 4. Rewrite Atomic Inventory Lock to use product_variants (Audit #12 Fix)
CREATE OR REPLACE FUNCTION atomic_process_order_inventory(
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_product_id TEXT;
    v_variant_name TEXT;
    v_is_b2b BOOLEAN;
    v_quantity INT;
    v_current_stock INT;
    v_variant_id UUID;
BEGIN
    -- Loop through all items and lock them
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := v_item->>'id';
        v_quantity := (v_item->>'quantity')::INT;
        
        -- Default extraction (Frontends will need to pass variant_name in the item payload)
        -- To preserve backwards compatibility with current payload, we match by name or fallback
        v_variant_name := v_item->>'variant';
        v_is_b2b := COALESCE((v_item->>'isB2B')::BOOLEAN, false);

        -- If variant name is missing, lock the FIRST variant of the product
        IF v_variant_name IS NULL OR v_variant_name = '' THEN
            SELECT id, stock INTO v_variant_id, v_current_stock
            FROM product_variants
            WHERE product_id = v_product_id AND is_b2b = v_is_b2b
            ORDER BY created_at ASC LIMIT 1
            FOR UPDATE;
        ELSE
            SELECT id, stock INTO v_variant_id, v_current_stock
            FROM product_variants
            WHERE product_id = v_product_id AND name = v_variant_name AND is_b2b = v_is_b2b
            FOR UPDATE;
        END IF;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product variant not found: % - %', v_product_id, v_variant_name;
        END IF;

        IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % - %', v_product_id, v_variant_name;
        END IF;

        -- Atomically decrement stock
        UPDATE product_variants 
        SET stock = stock - v_quantity,
            updated_at = now()
        WHERE id = v_variant_id;
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
