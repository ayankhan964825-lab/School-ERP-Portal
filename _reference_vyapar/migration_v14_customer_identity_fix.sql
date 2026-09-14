-- ==============================================================================
-- V14 MASTER AUDIT FIXES: CUSTOMER IDENTITY DECOUPLING
-- ==============================================================================
-- Run this ENTIRE script in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- DESCRIPTION:
-- The VyaparPe storefront uses custom OTP sessions via Twilio/Email and 
-- generates internal customer IDs (e.g. 'CUST-171822...').
-- However, the legacy schema strictly enforced `customers.id` and 
-- `addresses.customer_id` as UUIDs with a Foreign Key referencing `auth.users`.
--
-- This legacy constraint completely blocked ALL new customer registrations, 
-- profile updates, and address saving during checkout in production, as 
-- Supabase would reject the non-UUID strings and throw Foreign Key violations.
-- 
-- This migration safely decouples storefront customers from the global Admin 
-- `auth.users` system and converts identity columns to TEXT.
-- ==============================================================================

DO $$ 
BEGIN
  -- 1. Drop legacy constraints linking to auth.users
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_id_fkey' AND conrelid = 'customers'::regclass) THEN
    ALTER TABLE customers DROP CONSTRAINT customers_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'addresses_customer_id_fkey' AND conrelid = 'addresses'::regclass) THEN
    ALTER TABLE addresses DROP CONSTRAINT addresses_customer_id_fkey;
  END IF;

  -- 2. Alter column types from UUID to TEXT to accept 'CUST-...' IDs
  ALTER TABLE customers ALTER COLUMN id TYPE TEXT USING id::text;
  
  -- The addresses table might not have customer_id in all environments
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addresses' AND column_name = 'customer_id') THEN
    ALTER TABLE addresses ALTER COLUMN customer_id TYPE TEXT USING customer_id::text;
  END IF;

  -- NOTE: The composite unique constraint UNIQUE(phone, store_id) added in V13 
  -- now functions perfectly to isolate customers per store.
  
END $$;

-- Success! The storefront checkout flow and customer authentication is now fully operational.
