-- =================================================================================
-- Migration v19: Add email to Riders
-- =================================================================================

ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS email VARCHAR(255);
