-- =================================================================================
-- Migration v21: Rider Email & Public Sign Up
-- =================================================================================

-- 1. Add email column to riders table
ALTER TABLE public.riders 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Add unique constraint so a rider cannot register multiple times with same email for the same store
ALTER TABLE public.riders 
DROP CONSTRAINT IF EXISTS riders_store_id_email_key;

ALTER TABLE public.riders 
ADD CONSTRAINT riders_store_id_email_key UNIQUE (store_id, email);
