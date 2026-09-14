-- ==============================================================================
-- V13 MASTER AUDIT FIXES: COMPOSITE TENANT-SCOPED UNIQUE CONSTRAINTS
-- ==============================================================================
-- Run this ENTIRE script in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- 
-- DESCRIPTION:
-- The original single-tenant schema enforced global uniqueness on columns like 
-- product slugs, SKUs, and coupon codes. This prevents multiple stores from 
-- using the same common names (e.g., both Store A and Store B selling an "Apple" 
-- with slug "apple"). 
-- 
-- This script replaces the legacy global constraints with composite constraints
-- scoped to `store_id` (e.g., UNIQUE(slug, store_id)), allowing full tenant isolation.
-- ==============================================================================

-- 1. Drop Legacy Global Unique Constraints
-- Postgres auto-names these `tablename_columnname_key` when defined inline.
-- Using IF EXISTS to ensure the script doesn't fail if already dropped.
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_slug_key;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_slug_key;
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_sku_key;
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_code_key;
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_slug_key;
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_email_key;

-- 2. Add Composite Tenant-Scoped Constraints
-- This allows different stores to have the exact same slug/sku/code without collision.
ALTER TABLE categories ADD CONSTRAINT categories_slug_store_id_key UNIQUE (slug, store_id);
ALTER TABLE products ADD CONSTRAINT products_slug_store_id_key UNIQUE (slug, store_id);
ALTER TABLE product_variants ADD CONSTRAINT product_variants_sku_store_id_key UNIQUE (sku, store_id);
ALTER TABLE coupons ADD CONSTRAINT coupons_code_store_id_key UNIQUE (code, store_id);
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_slug_store_id_key UNIQUE (slug, store_id);
ALTER TABLE staff ADD CONSTRAINT staff_email_store_id_key UNIQUE (email, store_id);

-- Success! The schema is now fully capable of scaling to thousands of stores 
-- without data collisions or "duplicate key" errors.
