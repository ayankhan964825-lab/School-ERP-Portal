ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_out_of_stock BOOLEAN DEFAULT false;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
