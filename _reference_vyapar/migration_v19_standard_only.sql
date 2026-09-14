-- Migration: Add is_standard_only column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_standard_only BOOLEAN DEFAULT false;
