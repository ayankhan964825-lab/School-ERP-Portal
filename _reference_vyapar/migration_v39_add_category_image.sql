-- Migration v39: Add image column to categories table
-- This allows storing category thumbnail images uploaded from the admin panel

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image TEXT;
