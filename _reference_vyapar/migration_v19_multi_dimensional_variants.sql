-- Migration V19: Add variant_options to products for multi-dimensional variants
ALTER TABLE products
ADD COLUMN variant_options JSONB DEFAULT '[]'::jsonb;
