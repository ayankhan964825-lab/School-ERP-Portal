-- fix_product_variants_rls.sql
-- Enable Row Level Security (if not already enabled)
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Enable read access for all users" ON public.product_variants;

-- Create policy to allow anyone to read product variants
CREATE POLICY "Enable read access for all users" ON public.product_variants
    FOR SELECT
    USING (true);
