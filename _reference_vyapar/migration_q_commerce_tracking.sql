-- VyaparPe Quick Commerce Tracking Update
-- Run this snippet in your Supabase SQL Editor

ALTER TABLE public.fulfillments 
ADD COLUMN IF NOT EXISTS last_known_location JSONB;
