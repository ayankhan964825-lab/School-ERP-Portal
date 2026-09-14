-- =================================================================================
-- Combined Migration: v19 (Rider Email) & v20 (Auto-Pilot Logistics)
-- =================================================================================
-- Run this ENTIRE script in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This is SAFE to run on your existing database. It uses IF NOT EXISTS and default values.

-- 1. Add email column to riders table (v19)
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Add coordinates and auto-assign toggle to locations (v20 - Warehouses/Stores)
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS auto_assign_riders BOOLEAN DEFAULT true;

-- 3. Add geospatial distance calculation function (Haversine Formula)
-- Returns distance in Kilometers
CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $$
DECLARE
    radius float := 6371; -- Earth radius in kilometers
    dlat float;
    dlon float;
    a float;
    c float;
    d float;
BEGIN
    -- If any coordinate is null, return a large distance
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN 999999.0;
    END IF;

    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    a := sin(dlat/2) * sin(dlat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon/2) * sin(dlon/2);
         
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    d := radius * c;
    
    RETURN d;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
