-- ==============================================================================
-- V24 SECURITY FIX: ENABLE RLS ON PUBLICLY ACCESSIBLE TABLES
-- ==============================================================================
-- Run this ENTIRE script in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- 
-- DESCRIPTION:
-- Supabase Security Advisor flagged 5 critical issues because Row Level Security (RLS)
-- was disabled on sensitive tables. When RLS is disabled, anyone with the public Anon Key
-- can read/write data directly from the browser.
-- 
-- Since VyaparPe backend uses the Service Role Key (`supabaseAdmin`) in Astro API routes,
-- enabling RLS here blocks all public (anon) access without breaking the application logic!
-- ==============================================================================

BEGIN;

-- 1. Enable RLS on feedback table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on bulk_inquiries table
ALTER TABLE public.bulk_inquiries ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on affiliates table
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- 4. Enable RLS on affiliate_offers table
ALTER TABLE public.affiliate_offers ENABLE ROW LEVEL SECURITY;

-- 5. Enable RLS on payouts table
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Success! The database is now secure against unauthorized public access to these tables.

COMMIT;
