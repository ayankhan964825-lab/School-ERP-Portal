CREATE POLICY "Enable read access for all users" ON public.product_variants FOR SELECT USING (true);
