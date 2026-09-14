-- ==============================================================================
-- VyaparPe V8 Domain Redirects Migration
-- ==============================================================================

-- 1. Add redirect_domains array column to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS redirect_domains JSONB DEFAULT '[]'::jsonb;

-- 2. Update get_store_by_custom_domain to also check redirect_domains
--    Note: Since Vercel handles the redirection at the Edge network, our app backend 
--    won't usually receive requests for the redirect_domains directly. But it's safe 
--    to update this function just in case we need to look up a store by its redirect domain.
DROP FUNCTION IF EXISTS get_store_by_custom_domain(TEXT);

CREATE OR REPLACE FUNCTION get_store_by_custom_domain(p_domain TEXT)
RETURNS SETOF stores AS $$
  SELECT * FROM stores 
  WHERE (custom_domain = p_domain OR redirect_domains ? p_domain)
  AND domain_status = 'active' 
  AND status = 'active' 
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 3. Update the FINAL_MULTI_TENANT_MIGRATION schema definition for future reference
-- (This does not execute, just a comment to remind us)
-- ALTER TABLE stores ADD COLUMN redirect_domains JSONB DEFAULT '[]'::jsonb;
